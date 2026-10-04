<template>
 <view class="page-heading study-heading"><view><text class="page-title">今天，记住一点点</text><text class="page-subtitle">原创启蒙课程 · {{course.unit}} · {{course.name}}</text></view><text class="study-estimate small muted">{{view.revisiting?'本轮错词回看':'预计 '+estimate+' 分钟'}}</text></view>
 <view class="study-today"><view><text class="study-count">{{learning.newToday}}</text><text class="small muted">今日已学新词</text></view><view><text class="study-count">{{review.due.length}}</text><text class="small muted">待复习</text></view><view><text class="study-count">{{progress}}</text><text class="small muted">本轮进度</text></view></view>
 <view v-if="!learning.session" class="empty-card study-ready"><WPNavIcon name="learn" :active="true" :size="40"/><text class="section-title">{{learning.newWords.length||review.due.length?'和单词，见一面':'今天的任务已经完成'}}</text><text class="muted">{{review.due.length?'先和老朋友打个招呼，再认识新朋友。':'听一听、连一连、拼一拼，题型会自动安排。'}}</text><WPButton v-if="learning.newWords.length||review.due.length||learning.needsConsolidation" @click="learning.start()">开始今日学习</WPButton><WPButton v-else kind="secondary" @click="learning.start(learning.lesson.wordIds)">练习当前课程</WPButton></view>
 <view v-else-if="view.completed" class="empty-card completion study-completion"><WPPetAvatar :element="pet.current.element" :size="64"/><text class="eyebrow">每一点努力，都留下来了</text><text class="page-title">这一轮，完成啦！</text><view class="completion-counts"><view><text>{{learning.session.answers.filter(a=>a.correct).length}} / {{learning.session.answers.length}}</text><text class="small muted">正式回答正确</text></view><view><text>{{view.state.queue.length}}</text><text class="small muted">额外回看错词</text></view><view v-if="learning.session.kind!=='practice'&&view.earnedExp!==null"><text>+{{view.earnedExp}} XP</text><text class="small muted">伙伴经验增长</text></view></view><text class="muted">学习进度已保存。{{view.state.answers.length?'回看 '+view.state.answers.filter(a=>a.correct).length+' / '+view.state.answers.length+' 个回答正确，不重复发奖。':''}}</text><text v-if="learning.needsConsolidation" class="notice">这一课再熟悉一下，下次会更有把握。</text><view class="button-row"><WPButton @click="another">{{review.due.length?'继续到期复习':learning.needsConsolidation?'巩固这一课':learning.newWords.length?'继续今日学习':'再轻松练一轮'}}</WPButton><WPButton kind="secondary" @click="navigate('home')">回到今日任务</WPButton></view></view>
 <view v-else-if="view.current" class="learn-workspace study-space">
  <view class="learn-modes study-modes"><text class="eyebrow">{{view.revisiting?'再试一次':'学习方式'}}</text><view class="mode-list mode-selector" role="group" aria-label="选择学习方式"><button role="button" tabindex="0" v-for="mode in modes" :key="mode.id" class="mode-button" :class="{selected:view.mode===mode.id}" :disabled="!!view.answer||view.revisiting" :aria-label="modeTitles[mode.id]+'，'+mode.description" :aria-pressed="view.mode===mode.id" @click="view.chooseMode(mode.id)"><text class="mode-title">{{modeTitles[mode.id]}}</text><text v-if="view.mode===mode.id" class="mode-check" aria-hidden="true">✓</text></button></view><button v-if="!view.revisiting" role="button" tabindex="0" class="auto-mode-button" :class="{selected:!view.state.manual}" :disabled="!!view.answer" :aria-pressed="!view.state.manual" @click="view.automatic()">{{view.state.manual?'恢复自动编排':'✓ 自动编排中'}}</button><text class="small muted">{{view.revisiting?'每词回看一次，不改变复习日期。':'想换一种方式？随时在这里选择。'}}</text></view>
  <view class="learn-main study-main"><view class="session-header"><text class="element-chip">{{view.revisiting?'错词回看':learning.session.kind==='review_due'?'到期复习':learning.session.kind==='practice'?'轻松练习':'今日新词'}}</text><text class="small muted">{{view.index+1}} / {{view.total}}</text></view><WPProgress :value="view.index+(view.answer?1:0)" :total="view.total" label="本轮学习进度"/>
   <WPWordCard :word="view.current" :conceal="conceal" :show-meaning="view.revealed" :reveal-meaning="view.mode==='spell'"><WPButton kind="secondary" label="播放当前单词的标准发音" @click="play">听发音</WPButton><text v-if="view.revealed && view.mode==='flash'" class="small muted">{{view.current.example}}</text></WPWordCard>
   <view class="answer-panel"><text class="instruction">{{modeInfo.description}}</text>
    <view v-if="view.mode==='connect'||view.mode==='listen'" class="choice-grid"><button role="button" tabindex="0" v-for="(choice,i) in learning.choices" :key="choice.id" class="answer-choice" :class="{selected:view.selected===choice.id}" :aria-pressed="view.selected===choice.id" :disabled="!!view.answer" @click="view.select(choice.id)"><text class="choice-index">{{i+1}}</text><text>{{view.mode==='connect'?choice.meaning:choice.word}}</text><text v-if="view.selected===choice.id">✓</text></button></view>
    <view v-else-if="view.mode==='spell'||view.mode==='dictation'"><input class="spelling-input" :value="view.input" :disabled="!!view.answer" :aria-label="view.mode==='spell'?'输入中文对应的英文单词':'输入听到的英文单词'" placeholder="在这里输入英文单词" :maxlength="40" :adjust-position="true" :cursor-spacing="24" @input="updateInput" @confirm="submit"/><text class="small muted">不用担心出错，记忆就是从练习开始的。</text></view>
    <view v-if="!view.answer" class="answer-actions"><template v-if="view.mode==='flash'"><WPButton v-if="!view.revealed" @click="view.reveal()">回想好了，查看答案</WPButton><view v-else class="rating-grid"><WPButton v-for="(label,i) in childRatings" :key="label" :kind="i===2?'primary':'secondary'" @click="view.submit((i+1) as ReviewRating)">{{label}}</WPButton></view></template><template v-else><WPButton :disabled="!canSubmit" @click="submit">确认答案 →</WPButton><WPButton kind="quiet" :disabled="view.revealed" @click="view.hint()">{{view.revealed?'提示已显示':view.revisiting?'查看提示':'查看提示 · 1 灵石'}}</WPButton></template></view>
    <view v-else class="answer-feedback" :class="view.answer.correct?'correct':'incorrect'" role="status" aria-live="polite"><text class="strong">{{view.answer.correct?'✓ 很棒，记住啦！':'↻ 我们一起再认识它：'+view.current.word+' · '+view.current.meaning}}</text><text class="small">{{view.revisiting||learning.session.kind==='practice'?'练习不会改变复习日期。':'下次见面：'+nextReviewLabel(profile.db.cards[view.current.id]?.due)}}</text><WPButton @click="view.next()">{{view.index===view.total-1?view.revisiting?'完成回看':'完成这一轮':'下一个单词'}} →</WPButton></view>
   </view>
  </view>
  <view class="learn-context study-context"><WPCard v-if="view.answer?.correct" variant="muted" class="learning-pet-feedback"><WPPetAvatar :element="pet.current.element" :size="48"/><view><text class="strong">{{pet.info.name}}为你加油</text><text class="small muted block">{{correctRun>=3?'连续答对 '+correctRun+' 次，一点点努力都留下来了！':'太棒了，又记住一个小世界。'}}</text></view></WPCard><WPCard><view class="section-heading"><text>自然拼读</text><text>◌</text></view><template v-if="!conceal"><view class="phonics-row"><view v-for="segment in segments(view.current)" :key="segment.letters+segment.sound" class="phonics-segment"><text>{{segment.letters}}</text><text class="small muted">{{segment.sound}}</text></view></view><view class="context-line"><text class="small muted">音节</text><text>{{view.current.syllables.join(' · ')}}</text></view><view class="example-box"><text class="small muted">读一读</text><text>{{view.current.example}}</text></view><text class="small muted">拼读帮助建立音形联系，以完整单词的标准发音为准。</text></template><text v-else class="muted">先听一听或拼一拼，回答后一起拆解这个单词。</text></WPCard><WPCard><WPPronunciationPractice :word="view.current"/></WPCard></view>
 </view>
 <text v-if="audioError||view.error" class="notice error" role="alert">{{audioError||view.error}}</text>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted} from 'vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPProgress from '../../components/wp-progress/WPProgress.vue'
import WPWordCard from '../../components/wp-word-card/WPWordCard.vue'
import WPNavIcon from '../../components/wp-nav-icon/WPNavIcon.vue'
import WPPetAvatar from '../../components/wp-pet-avatar/WPPetAvatar.vue'
import WPPronunciationPractice from '../../components/WPPronunciationPractice.vue'
import {successHaptic} from '../../services/feedback'
import {nextReviewLabel,childRatings} from '../../services/study-presentation'
import {useThemeStore} from '../../stores/theme'
import {useLearningStore,modes} from '../../stores/learning'
import {useStudyPresentation} from '../../stores/study-presentation'
import {useReviewStore} from '../../stores/review'
import {useProfileStore} from '../../stores/profile'
import {usePetStore} from '../../stores/pet'
import {lessons} from '../../../packages/content_schema'
import {segments} from '../../../packages/phonics'
import type {ReviewRating} from '../../../packages/core_learning'
import {playWord,stopAudio} from '../../services/audio'
import {navigate} from '../../services/navigation'
const learning=useLearningStore(),review=useReviewStore(),profile=useProfileStore(),pet=usePetStore(),theme=useThemeStore(),view=useStudyPresentation(),audioError=ref('')
const modeTitles={flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写'}
const course=computed(()=>lessons.find(lesson=>lesson.wordIds.includes(learning.session?.wordIds[0]||''))||learning.lesson)
const estimate=computed(()=>Math.max(1,Math.ceil((view.total||review.due.length||learning.newWords.length||5)*.7)))
const progress=computed(()=>learning.session?learning.session.answers.length+'/'+learning.session.wordIds.length:'待开始')
const correctRun=computed(()=>{let count=0;const answers=view.revisiting?view.state.answers:learning.session?.answers||[];for(const answer of [...answers].reverse()){if(!answer.correct)break;count++}return count})
const modeInfo=computed(()=>modes.find(mode=>mode.id===view.mode)??modes[0])
const conceal=computed(()=>!view.revealed&&['listen','spell','dictation'].includes(view.mode))
const canSubmit=computed(()=>view.mode==='connect'||view.mode==='listen'?!!view.selected:!!view.input.trim())
watch(()=>[learning.session?.id,learning.session?.index,learning.session?.completedAt],()=>view.sync(),{immediate:true})
watch(()=>view.current?.id,stopAudio)
watch(()=>view.answer,answer=>{if(answer?.correct)successHaptic(theme.reduced)})
function play(){if(view.current){audioError.value='';playWord(view.current,message=>audioError.value=message)}}
function updateInput(event:any){view.updateInput(event.detail?.value??event.target?.value??'')}
function submit(){if(view.answer)view.next();else view.submit(view.mode==='flash'?3:undefined)}
function another(){learning.start(learning.newWords.length||review.due.length||learning.needsConsolidation?undefined:learning.lesson.wordIds)}
function shortcut(event:{key:string;metaKey?:boolean;ctrlKey?:boolean}){
 if(event.metaKey||event.ctrlKey)return
 if(event.key===' ')play()
 else if(event.key==='Enter'){if(view.mode==='flash'&&!view.revealed)view.reveal();else submit()}
 else if(event.key==='ArrowLeft'&&!view.revisiting)learning.previous()
 else if(event.key==='ArrowRight')view.next()
 else if(/^[1-4]$/.test(event.key)){const index=+event.key-1;if(view.mode==='flash'&&view.revealed)view.submit(+event.key as ReviewRating);else if(!view.revisiting&&learning.choices[index])view.select(learning.choices[index].id)}
}
onMounted(()=>uni.$on('wp-shortcut',shortcut))
onUnmounted(()=>{uni.$off('wp-shortcut',shortcut);stopAudio()})
</script>


