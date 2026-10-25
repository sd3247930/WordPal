<template>
 <WPCard v-if="!activity.state" class="activity-menu">
  <view class="activity-menu-heading"><image class="activity-heading-icon" :src="compactStudyIcons.practice" mode="aspectFit" aria-hidden="true"/><text class="section-title">轻松练习</text></view>
  <text class="activity-menu-note">只记练习进度，不影响复习与奖励</text>
  <view class="activity-grid">
   <view v-for="item in activities" :key="item.id" class="activity-cell" :data-activity="item.id">
    <WPButton kind="secondary" class="activity-tile study-card-feedback" hover-class="study-card-pressed" :hover-start-time="0" :hover-stay-time="120" :class="{'activity-locked':item.disabled}" :label="item.name" :disabled="item.disabled||opening" :aria-describedby="item.disabled?'activity-reason-'+item.id:undefined" @click="start(item.id)">
     <image v-if="!failedIcons.has(iconFor(item.id,item.disabled))" class="activity-menu-icon" :src="iconFor(item.id,item.disabled)" mode="aspectFit" aria-hidden="true" @error="failedIcons.add(iconFor(item.id,item.disabled))"/>
     <view class="activity-menu-copy"><text class="activity-menu-name">{{item.name}}</text><text v-if="item.disabled" :id="'activity-reason-'+item.id" class="activity-reason">{{item.reason}}</text></view>
     <text class="activity-menu-arrow" aria-hidden="true">›</text>
    </WPButton>
   </view>
  </view>
  <text v-if="activity.error" class="notice warning" role="status">⚠️ {{activity.error}}</text>
 </WPCard>
 <WPCard v-else class="activity-workspace">
  <view class="section-heading"><text class="section-title">{{title}}</text><WPButton kind="quiet" @click="closePractice">收起练习</WPButton></view>
  <text class="small muted block">{{courseRegistry[activity.state.courseId]?.title}} · 已保存 {{activity.state.contentVersion}} 内容</text>
  <template v-if="activity.state.completed"><text class="page-title">练习完成啦！</text><text class="block">{{correct}} / {{activity.total}} 个回答正确</text><text v-if="activity.state.kind==='check'" class="notice">{{correct/activity.total>=.8?'整课检查通过，可学习下一课。':'再熟悉一下，整课检查达到 80% 后通过。'}}</text><text class="small muted block">{{activity.state.recorded?'活动记录已保存。':'记录尚未保存，请重试。'}}复习日期与灵石保持。</text><view class="button-row"><WPButton v-if="!activity.state.recorded" @click="activity.record()">重试保存记录</WPButton><WPButton kind="secondary" @click="closePractice">回到学习</WPButton></view></template>
  <template v-else-if="activity.current">
   <WPProgress :value="activity.state.index" :total="activity.total" label="独立活动进度"/>
   <text class="small muted block">{{activity.state.index+1}} / {{activity.total}}</text>
   <text v-if="activity.state.kind==='challenge'" class="notice">连续记住 {{run}} 个 · 本轮最好 {{bestRun}} 个；慢慢想，答错后继续。</text>
   <view v-if="activity.state.kind==='speed'&&!answer" class="notice"><text class="strong block">剩余 {{Math.ceil(remaining/1000)}} 秒</text><text class="small muted block">每题 15 秒，收起页面会暂停；随时可以休息。</text><WPButton kind="secondary" @click="activity.state.timer?.runningSince===null?activity.resumeTimer():activity.pauseTimer()">{{activity.state.timer?.runningSince===null?'准备好，开始计时':'暂停计时'}}</WPButton></view>
   <template v-if="activity.state.kind==='story'">
    <text class="section-title">{{activity.state.storySnapshot?.title}}</text>
    <view class="story-sentence" v-for="(sentence,i) in activity.state.storySnapshot?.sentences" :key="i"><template v-for="(part,j) in storyParts(sentence)" :key="j"><WPActionTile v-if="part.word" class="story-word" :aria-label="'查看 '+part.text+' 的词义'" @click="lookup=part.word.id">{{part.text}}</WPActionTile><text v-else>{{part.text}}</text></template></view>
    <text v-if="lookup" class="notice">{{activity.state.words[lookup]?.word}} · {{activity.state.words[lookup]?.meaning}}</text>
    <text class="instruction">{{question?.question||'读完故事，和它见一面。'}}</text>
    <view class="choice-grid" v-if="question"><WPActionTile v-for="(option,i) in question.options" :key="i" class="answer-choice" :selected="activity.state.selected===String(i)" :disabled="!!answer" @click="activity.select(String(i))">{{option}}</WPActionTile></view>
   </template>
   <template v-else>
    <text v-if="!['picture','listen-picture','letters','cloze'].includes(activity.state.kind)" class="detail-word">{{activity.current.word}}</text>
    <image v-if="activity.state.kind==='picture'" class="activity-picture" :src="activity.current.image" mode="aspectFit" :alt="'本课词图'"/>
    <WPAudioButton :icon-src="theme.settings.themeId==='clay'?practiceSpeaker:''" v-if="activity.current.audio" :url="activity.current.audio" :text="activity.state.kind==='listen-picture'?'再听一次':'听标准发音'" @click="playWord(activity.current)"/>
    <text v-if="activity.state.kind==='letters'" class="instruction">{{activity.current.meaning}} · 把字母拼起来</text>
    <template v-if="activity.state.kind==='sentence'"><text class="instruction">把词块排成一句话</text><text class="small muted block">{{activity.current.meaning}}</text></template>
    <text v-if="activity.state.kind==='cloze'" class="instruction">{{cloze}}</text>
    <view v-if="['check','pair','picture','listen-picture','challenge','speed'].includes(activity.state.kind)" class="choice-grid" :class="{'activity-image-choices':activity.state.kind==='listen-picture'}"><WPActionTile v-for="choice in activity.choices" :key="choice.id" class="answer-choice" :selected="activity.state.selected===choice.id" :disabled="!!answer||activity.state.kind==='speed'&&activity.state.timer?.runningSince===null" @click="activity.select(choice.id)"><image v-if="activity.state.kind==='listen-picture'&&choice.image" class="activity-picture small-picture" :src="choice.image" mode="aspectFit"/><text>{{activity.state.kind==='picture'?choice.word:choice.meaning}}</text></WPActionTile></view>
    <LetterBlockInput v-if="activity.state.kind==='letters'" :word="activity.current" :model-value="activity.state.input" mode="spell" :question-key="[activity.state.id,activity.current.id,activity.state.index].join(':')" :letter-draft="activity.state.letterDraft" default-tiles :disabled="!!answer" :correct="answer?.correct" @change="activity.blockInput" @ready="letterReady=$event" @confirm="activity.submit()"/><template v-if="activity.state.kind==='sentence'"><view class="token-answer">{{activity.state.input||'点击词块，在这里拼装'}}</view><view class="token-bank"><WPButton v-for="token in tokens" :key="token.id" kind="secondary" :disabled="!!answer||usedToken(token.id)" @click="addToken(token.id)">{{token.text===' '?'空格':token.text}}</WPButton></view><WPButton kind="quiet" :disabled="!!answer||!activity.state.input" @click="undo">退回一步</WPButton></template>
    <input v-if="activity.state.kind==='cloze'" class="spelling-input" :value="activity.state.input" :disabled="!!answer" :maxlength="100" aria-label="输入句子缺少的单词" @input="activity.input(($event as any).detail.value)"/>
    <template v-if="activity.state.kind==='phonics'"><view v-for="rule in rules" :key="rule.id" class="notice"><text class="strong">{{rule.graphemes.join(' / ')}} · {{rule.phonemes.join(' / ')}}</text><text class="small block">{{rule.explanation}}</text><text v-if="rule.prerequisites?.length" class="small muted block">建议先认识：{{rule.prerequisites.join('、')}}</text></view><view class="phonics-row"><view v-for="segment in segments(activity.current)" :key="segment.letters+segment.sound" class="phonics-segment"><text>{{segment.letters}}</text><text class="small muted">{{segment.sound}}</text></view></view><text class="small muted block">拼读为人工审核片段；跟读仅作自我对照，不自动评分。</text><WPPronunciationPractice :word="activity.current"/></template>
   </template>
   <view v-if="answer" class="answer-feedback" :class="answer.correct?'correct':'incorrect'" role="status"><text>{{answer.correct?'✓ 很棒，记住啦！':'一起再认识一次。'}}</text><text v-if="!answer.correct&&!question" class="block">{{activity.state.kind==='sentence'?activity.current.example:activity.current.word+' · '+activity.current.meaning}}</text><text v-if="!answer.correct&&question">{{question.options[question.answer]}}</text><WPButton v-if="activity.state.kind==='letters'&&!answer.correct" kind="secondary" @click="activity.retry()">再拼一次</WPButton><WPButton @click="next">{{activity.state.index+1===activity.total?'完成练习':'下一题'}}</WPButton></view>
   <view v-else class="button-row"><WPButton :disabled="!canSubmit" @click="activity.submit()">{{activity.state.kind==='phonics'||activity.state.kind==='story'&&!question?'我练习过了':'确认答案'}}</WPButton><WPButton v-if="activity.state.kind!=='check'" kind="quiet" @click="activity.hint()">查看提示</WPButton></view>
   <text v-if="activity.state.revealed&&!answer" class="notice">{{activity.current.word}} · {{activity.current.meaning}} {{activity.state.kind==='sentence'?activity.current.example:''}}</text>
  </template>
  <text v-if="activity.error" class="notice error" role="alert">{{activity.error}}</text>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,nextTick} from 'vue'
import {activityAvailability,activityNames} from '../../services/course/ActivityAvailability'
import {compactStudyIcons,activityMenuIcons} from '../../services/study-compact-icons'
import {useActivitiesStore,type ActivityKind} from '../../stores/activities'
import {useCourseStore} from '../../stores/course'
import {useProfileStore} from '../../stores/profile'
import {useReviewStore} from '../../stores/review'
import {courseRegistry,getCourseWord,courseSnapshot} from '../../services/content/ContentRegistry'
import {segments} from '../../../packages/phonics'
import {playWord,stopAudio} from '../../services/audio'
import LetterBlockInput from '../study/LetterBlockInput.vue'
import {practiceSpeaker} from '../../services/study-mode-icons'
import {useThemeStore} from '../../stores/theme'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPAudioButton from '../button/WPAudioButton.vue'
import WPCard from '../wp-card/WPCard.vue'
import WPProgress from '../wp-progress/WPProgress.vue'
import WPPronunciationPractice from '../WPPronunciationPractice.vue'
const activity=useActivitiesStore(),course=useCourseStore(),lookup=ref(''),theme=useThemeStore(),letterReady=ref(false)
const profile=useProfileStore(),review=useReviewStore()
const names=activityNames,failedIcons=ref(new Set<string>()),opening=ref(false)
const activities=computed(()=>{
 const pool=course.wordIds.flatMap(id=>{const word=getCourseWord(course.currentId,id);return word?[word]:[]}),dueIds=review.due.filter(card=>course.wordIds.includes(card.wordId)).map(card=>card.wordId)
 return Object.entries(names).map(([id,name])=>{const kind=id as ActivityKind,availability=activityAvailability(kind,course.current,course.lesson,pool,profile.db.cards,dueIds);return {id:kind,name,disabled:!availability.available,reason:availability.reason}})
})
function iconFor(kind:ActivityKind,disabled:boolean){const icon=activityMenuIcons[kind];return disabled&&icon.locked?icon.locked:icon.src}
let menuScroll=0
watch(()=>activity.state?.id,()=>{opening.value=false})
const title=computed(()=>activity.state?names[activity.state.kind]:''),answer=computed(()=>activity.state?.retrying?activity.state.retryAnswer:activity.state?.answers[activity.state.index]),correct=computed(()=>activity.state?.answers.filter(a=>a.correct).length||0),question=computed(()=>activity.state?.storySnapshot?.questions?.[activity.state.index])
const rules=computed(()=>{const state=activity.state;if(!state)return [];const pack=courseSnapshot(state.courseId,state.contentVersion),lesson=pack?.units.flatMap(unit=>unit.lessons).find(item=>item.id===state.lessonId);return pack?.phonicsRules?.filter(rule=>lesson?.phonicsRuleIds?.includes(rule.id))||[]})
const canSubmit=computed(()=>!!activity.state&&(activity.state.kind!=='speed'||activity.state.timer?.runningSince!==null)&&(activity.state.kind==='letters'?letterReady.value:activity.state.kind==='phonics'?true:activity.state.kind==='story'?!question.value||!!activity.state.selected:['check','pair','picture','listen-picture','challenge','speed'].includes(activity.state.kind)?!!activity.state.selected:!!activity.state.input.trim()))
const run=computed(()=>{let n=0;for(const a of [...(activity.state?.answers||[])].reverse()){if(!a.correct)break;n++}return n}),bestRun=computed(()=>{let n=0,best=0;for(const a of activity.state?.answers||[]){n=a.correct?n+1:0;best=Math.max(n,best)}return best})
const clock=ref(Date.now()),remaining=computed(()=>activity.remainingMs(clock.value))
let ticker:ReturnType<typeof setInterval>|undefined
onMounted(()=>{ticker=setInterval(()=>{clock.value=Date.now();if(activity.state?.timer?.runningSince!==null&&activity.state?.kind==='speed')activity.expireTimer(clock.value)},250)})
onUnmounted(()=>{clearInterval(ticker);activity.pauseTimer()})
const tokens=computed(()=>{const text=activity.state?.kind==='sentence'?activity.current?.example||'':activity.current?.word||'',parts=activity.state?.kind==='sentence'?text.split(/\s+/):[...text];return parts.map((text,id)=>({text,id})).sort((a,b)=>(a.id*7%11)-(b.id*7%11))})
const chosen=computed(()=>{let rest=activity.state?.input||'',ids:number[]=[];while(rest){const token=tokens.value.find(t=>!ids.includes(t.id)&&(rest===t.text||rest.startsWith(t.text+(activity.state?.kind==='sentence'?' ':''))));if(!token)break;ids.push(token.id);rest=rest.slice(token.text.length);if(activity.state?.kind==='sentence')rest=rest.trimStart()}return ids})
function usedToken(id:number){return chosen.value.includes(id)}
function addToken(id:number){const token=tokens.value.find(t=>t.id===id);if(token&&activity.state)activity.input(activity.state.input+(activity.state.kind==='sentence'&&activity.state.input?' ':'')+token.text)}
function undo(){if(activity.state)activity.input(activity.state.kind==='sentence'?activity.state.input.split(' ').slice(0,-1).join(' '):activity.state.input.slice(0,-1))}
const cloze=computed(()=>{const w=activity.current;if(!w)return '';return w.example.replace(new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'_____')})
function storyParts(sentence:string){return sentence.split(/(\s+|[.,!?;:])/).map(text=>({text,word:Object.values(activity.state?.words||{}).find(w=>w.word.toLowerCase()===text.toLowerCase())}))}
function start(kind:ActivityKind){
 if(activity.state||opening.value||activities.value.find(item=>item.id===kind)?.disabled)return
 opening.value=true;stopAudio()
 uni.createSelectorQuery().selectViewport().scrollOffset(()=>{}).exec(result=>{menuScroll=result[0]?.scrollTop||0;if(!activity.start(kind))opening.value=false})
}
function closePractice(){
 stopAudio()
 if(activity.close())void nextTick(()=>{
  // App renders across a native bridge; measure the restored menu before moving the viewport.
  uni.createSelectorQuery().select('.activity-menu').boundingClientRect(()=>{}).exec(()=>uni.pageScrollTo?.({scrollTop:menuScroll,duration:0}))
 })
}
function next(){stopAudio();lookup.value='';activity.next()}
watch(()=>[activity.state?.id,activity.state?.index].join('\u001f'),()=>{stopAudio();if(activity.state?.kind==='listen-picture'&&activity.current)playWord(activity.current)})
</script>

<style scoped>
.activity-menu.wp-card{display:flex;gap:0;min-width:0;padding:16px;margin-top:16px;border:1px solid var(--wp-border);background:var(--wp-surface);container-type:inline-size}
.activity-menu-heading{display:flex;align-items:center;gap:8px;min-width:0}
.activity-heading-icon{flex:0 0 40px;width:40px;height:40px}
.activity-menu-heading .section-title{font-size:var(--wp-font-section);line-height:1.4}
.activity-menu-note{display:block;margin:4px 0 12px;font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.activity-menu .activity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}
.activity-menu .activity-cell{min-width:0}
.activity-menu .activity-tile.wp-button.secondary{display:grid;grid-template-columns:40px minmax(0,1fr) 10px;align-items:center;gap:5px;width:100%;min-width:0;min-height:92px;height:100%;margin:0;padding:8px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);color:var(--wp-foreground);background:var(--wp-surface-raised);text-align:left;line-height:1.4;white-space:normal;box-shadow:var(--wp-elevation)}
.activity-menu-icon{display:block;width:40px;height:44px;min-width:0}
.activity-menu-copy{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.activity-menu-name{display:block;min-width:0;max-width:100%;font-size:var(--wp-font-small);font-weight:600;line-height:1.45;overflow-wrap:anywhere}
.activity-menu-arrow{color:var(--wp-primary);font-size:24px;line-height:1}
.activity-menu .activity-tile.wp-button[disabled]{opacity:1;color:var(--wp-muted-foreground);background:var(--wp-surface-soft);box-shadow:none}
.activity-locked .activity-menu-icon{filter:grayscale(.45);opacity:.8}
.activity-locked .activity-menu-arrow{color:var(--wp-muted-foreground)}
.activity-menu .activity-reason{display:block;max-width:100%;padding:2px 5px;border-radius:var(--wp-radius-chip);background:var(--wp-secondary);color:var(--wp-muted-foreground);font-size:var(--wp-font-caption);font-weight:400;line-height:1.5;overflow-wrap:anywhere}
.theme-clay .activity-menu .activity-tile.wp-button:not([disabled]){background:var(--wp-clay-task)}
.activity-menu .activity-tile.wp-button:not([disabled]):active{transform:translateY(1px)}
.high-contrast .activity-menu .activity-tile.wp-button{border-width:2px;box-shadow:none}
.reduce-motion .activity-menu .activity-tile.wp-button:not([disabled]):active{transform:none}
@container(max-width:280px){.activity-menu .activity-tile.wp-button.secondary{grid-template-columns:40px minmax(0,1fr);row-gap:4px;min-height:104px}.activity-menu-copy{grid-row:2;grid-column:1/-1}.activity-menu-arrow{grid-column:2;grid-row:1;justify-self:end}.activity-menu-icon{height:36px}}
@media(max-width:359px){.activity-menu .activity-tile.wp-button.secondary{grid-template-columns:40px minmax(0,1fr);row-gap:4px;min-height:104px}.activity-menu-copy{grid-row:2;grid-column:1/-1}.activity-menu-arrow{grid-column:2;grid-row:1;justify-self:end}.activity-menu-icon{height:36px}}
</style>
