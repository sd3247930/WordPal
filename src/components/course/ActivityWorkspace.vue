<template>
 <WPCard v-if="!activity.state" class="activity-menu">
  <text class="section-title">轻松练习</text><text class="small muted block">练习只保存活动进度，不改变复习日期或重复发奖。</text>
<view class="activity-grid"><view v-for="item in activities" :key="item.id" class="activity-cell"><WPButton kind="secondary" :disabled="item.disabled" @click="start(item.id)">{{item.name}}</WPButton><text v-if="item.disabled&&item.reason" class="small muted block activity-reason">{{item.reason}}</text></view></view>
  <text v-if="activity.error" class="notice warning" role="status">⚠️ {{activity.error}}</text>
 </WPCard>
 <WPCard v-else class="activity-workspace">
  <view class="section-heading"><text class="section-title">{{title}}</text><WPButton kind="quiet" @click="activity.close();stopAudio()">收起练习</WPButton></view>
  <text class="small muted block">{{courseRegistry[activity.state.courseId]?.title}} · 已保存 {{activity.state.contentVersion}} 内容</text>
  <template v-if="activity.state.completed"><text class="page-title">练习完成啦！</text><text class="block">{{correct}} / {{activity.total}} 个回答正确</text><text v-if="activity.state.kind==='check'" class="notice">{{correct/activity.total>=.8?'整课检查通过，可学习下一课。':'再熟悉一下，整课检查达到 80% 后通过。'}}</text><text class="small muted block">{{activity.state.recorded?'活动记录已保存。':'记录尚未保存，请重试。'}}复习日期与灵石保持。</text><view class="button-row"><WPButton v-if="!activity.state.recorded" @click="activity.record()">重试保存记录</WPButton><WPButton kind="secondary" @click="activity.close()">回到学习</WPButton></view></template>
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
import {computed,ref,watch,onMounted,onUnmounted} from 'vue'
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
/** Unavailable practice items stay visible, but say why (see 练习菜单原因映射). */
const practiceReasons:Partial<Record<ActivityKind,string>>={check:'本课还有未学词，先完成新词学习',story:'本课暂无已审核故事',picture:'本课暂无已审核词图','listen-picture':'本课暂无已审核词图或音频',phonics:'本课暂无已审核拼读规则'}
/** A whole course without any image asset is still being prepared, not simply missing this lesson's art. */
const courseHasImages=computed(()=>course.current.vocabulary.some(entry=>!!entry.assetRefs?.image||!!entry.image))
const names:Record<ActivityKind,string>={check:'整课检查',pair:'词义配对',letters:'字母拼装',sentence:'句子排序',cloze:'句子填空',story:'故事阅读',picture:'看图选词','listen-picture':'听音选图',phonics:'自然拼读与跟读',challenge:'连胜挑战',speed:'闪电判断'}
const activities=computed(()=>Object.entries(names).map(([id,name])=>{
 const kind=id as ActivityKind
 const available=kind==='check'
  ?!review.due.some(card=>course.wordIds.includes(card.wordId))&&course.lesson.wordIds.every(wordId=>!!profile.db.cards[wordId])
  :course.lesson.wordIds.some(wordId=>{const w=getCourseWord(course.currentId,wordId);if(!w)return false;const example=course.lesson.examples?.[wordId]||w.example;return id==='picture'?!!w.image:id==='listen-picture'?!!w.image&&!!w.audio:id==='phonics'?!!w.audio&&!!w.phonics.length:id==='cloze'?example.toLowerCase().split(/[^a-z'-]+/).includes(w.word.toLowerCase()):id==='sentence'?!!example:id==='story'?!!course.lesson.storyId:true})
 const base=practiceReasons[kind]||''
 const reason=!courseHasImages.value&&(kind==='picture'||kind==='listen-picture')?'本册资源正在准备中':base
 return {id:kind,name,disabled:!available,reason:available?'':reason}
}))
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
function start(kind:ActivityKind){stopAudio();activity.start(kind)}
function next(){stopAudio();lookup.value='';activity.next()}
watch(()=>[activity.state?.id,activity.state?.index].join('\u001f'),()=>{stopAudio();if(activity.state?.kind==='listen-picture'&&activity.current)playWord(activity.current)})
</script>
