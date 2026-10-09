<template>
 <view class="page-heading study-heading"><view><text class="page-title">今日学习</text><text class="page-subtitle">今天，记住一点点。</text><text class="small muted block">{{displayLessonTitle}}</text></view><text class="study-estimate small muted">{{view.revisiting?'本轮错词回看':'预计 '+estimate+' 分钟'}}</text></view>
 <PendingBanner :pending="courseStore.pendingCourse" @cancel="cancelPending" @progress="showProgress"/>
 <view class="current-course-card">
  <view class="current-course-head">
   <view class="current-course-copy">
    <view class="course-gallery-title"><text class="strong">当前教材</text><text v-if="courseSummaryData.needsReview" class="course-review-badge">待核对</text></view>
    <text class="small muted block">{{courseStore.current.title}} · {{courseSummaryData.words}} 词 · {{courseSummaryData.units}} 单元 · {{courseSummaryData.levels||'未标注等级'}}</text>
   </view>
   <WPButton @click="openGallery">选择教材</WPButton>
  </view>
  <text class="study-effective-line">当前生效：L{{parent.settings.entryLevel}} · 每日新词 {{parent.settings.dailyNewWordLimit}}</text>
 </view>
 <view v-if="!extraActive" class="study-formal">
 <view class="study-today"><view><text class="study-count">{{learning.newToday}}</text><text class="small muted">今日已学新词</text></view><view><text class="study-count">{{review.due.length}}</text><text class="small muted">待复习</text></view><view><text class="study-count">{{progress}}</text><text class="small muted">本轮进度</text></view></view>
 <view v-if="!learning.session" class="empty-card study-ready"><WPNavIcon name="learn" :active="true" :size="40"/><text class="section-title">{{learning.newWords.length||review.due.length?'和单词，见一面':'今天的任务已经完成'}}</text><text class="muted">{{review.due.length?'先和老朋友打个招呼，再认识新朋友。':'听一听、连一连、拼一拼，题型会自动安排。'}}</text><WPButton v-if="learning.newWords.length||review.due.length||learning.needsConsolidation" @click="beginStudy">开始今日学习</WPButton><WPButton v-else kind="secondary" @click="activities.start('check')">整课检查</WPButton></view>
 <view v-else-if="view.completed" class="empty-card completion study-completion"><WPPetAvatar :element="pet.current.element" :size="64"/><text class="eyebrow">每一点努力，都留下来了</text><text class="page-title">这一轮，完成啦！</text><view class="completion-counts"><view><text>{{learning.session.answers.filter(a=>a.correct).length}} / {{learning.session.answers.length}}</text><text class="small muted">正式回答正确</text></view><view><text>{{view.state.queue.length}}</text><text class="small muted">额外回看错词</text></view><view v-if="learning.session.kind!=='practice'&&view.earnedExp!==null"><text>+{{view.earnedExp}} XP</text><text class="small muted">伙伴经验增长</text></view></view><text class="muted">学习进度已保存。{{view.state.answers.length?'回看 '+view.state.answers.filter(a=>a.correct).length+' / '+view.state.answers.length+' 个回答正确，不重复发奖。':''}}</text><text v-if="learning.needsConsolidation" class="notice">这一课再熟悉一下，下次会更有把握。</text><view class="button-row"><WPButton @click="another">{{review.due.length?'继续到期复习':learning.needsConsolidation?'巩固这一课':learning.newWords.length?'继续今日学习':'再轻松练一轮'}}</WPButton><WPButton kind="secondary" @click="navigate('home')">回到今日任务</WPButton></view></view>
 <view v-else-if="view.current" class="learn-workspace study-space">
  <view class="learn-modes study-modes"><text class="eyebrow">{{view.revisiting?'再试一次':'学习方式'}}</text><WPSegmentedButton class="mode-selector" :model-value="view.mode" :options="modeOptions" label="选择学习方式" :disabled="!!view.answer||view.revisiting" :scrollable="true" @update:model-value="view.chooseMode($event as LearningMode)"/><WPActionTile v-if="!view.revisiting" role="button" tabindex="0" class="auto-mode-button" :class="{selected:!view.state.manual}" :disabled="!!view.answer" :aria-pressed="!view.state.manual" @click="view.automatic()">{{view.state.manual?'恢复自动编排':'✓ 自动编排中'}}</WPActionTile><text class="small muted">{{view.revisiting?'每词回看一次，不改变复习日期。':!view.current?.audio?'这个单词暂无离线音频，文字题型可继续学习。':!feedback.settings.sound?'声音已关闭，开启后可使用听音和听写。':'想换一种方式？随时在这里选择。'}}</text></view>
  <view class="learn-main study-main"><view class="session-header"><text class="element-chip">{{view.revisiting?'错词回看':learning.currentSource==='review_due'?'到期复习':learning.currentSource==='practice'?'轻松练习':'今日新词'}}</text><text class="small muted">{{view.index+1}} / {{view.total}}</text></view><WPProgress :value="view.index+(view.answer?1:0)" :total="view.total" label="本轮学习进度"/>
   <WPWordCard :word="view.current" :conceal="conceal" :show-meaning="view.revealed" :reveal-meaning="view.mode==='spell'" :phonics="resolvedPhonics?.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"><WPAudioButton :url="view.current.audio" :text="['listen','dictation'].includes(view.mode)?'再听一次':'听发音'" label="播放当前单词的标准发音" @click="play"/><text v-if="view.revealed && view.mode==='flash'" class="small muted">{{view.current.example}}</text></WPWordCard>
   <view class="answer-panel"><text class="instruction">{{modeInfo.description}}</text>
    <view v-if="view.mode==='connect'||view.mode==='listen'" class="choice-grid"><WPActionTile role="button" tabindex="0" v-for="(choice,i) in learning.choices" :key="choice.id" class="answer-choice" :class="{selected:view.selected===choice.id}" :aria-pressed="view.selected===choice.id" :disabled="!!view.answer" @click="view.select(choice.id)"><text class="choice-index">{{i+1}}</text><text>{{view.mode==='connect'?choice.meaning:choice.word}}</text><text v-if="view.selected===choice.id">✓</text></WPActionTile></view>
    <view v-else-if="view.mode==='spell'||view.mode==='dictation'"><input class="spelling-input" :value="view.input" :disabled="!!view.answer" :aria-label="view.mode==='spell'?'输入中文对应的英文单词':'输入听到的英文单词'" placeholder="在这里输入英文单词" :maxlength="40" :adjust-position="true" :cursor-spacing="24" @input="updateInput" @confirm="submit"/><text class="small muted">不用担心出错，记忆就是从练习开始的。</text></view>
    <view v-if="!view.answer" class="answer-actions"><template v-if="view.mode==='flash'"><view v-if="!view.revealed" class="recall-action"><text class="small muted block">回想好了？</text><WPButton @click="view.reveal()">查看答案</WPButton></view><view v-else class="rating-grid"><WPButton v-for="(label,i) in childRatings" :key="label" :kind="i===2?'primary':'secondary'" @click="view.submit((i+1) as ReviewRating)">{{label}}</WPButton></view></template><template v-else><WPButton :disabled="!canSubmit" @click="submit">确认答案 →</WPButton><WPButton kind="quiet" :disabled="view.revealed" @click="view.hint()">{{view.revealed?'提示已显示':view.revisiting?'查看提示':'查看提示 · 1 灵石'}}</WPButton></template></view>
    <view v-else class="answer-feedback" :class="view.answer.correct?'correct':'incorrect'" role="status" aria-live="polite"><text class="strong">{{view.answer.correct?'✓ 很棒，记住啦！':'↻ 我们一起再认识它：'+view.current.word+' · '+view.current.meaning}}</text><text class="small">{{view.revisiting||learning.currentSource==='practice'?'练习不会改变复习日期。':'下次见面：'+nextReviewLabel(profile.db.cards[view.current.id]?.due)}}</text><WPButton @click="view.next()">{{view.index===view.total-1?view.revisiting?'完成回看':'完成这一轮':'下一个单词'}} →</WPButton></view>
   </view>
  </view>
  <view class="learn-context study-context"><WPCard v-if="view.answer?.correct" variant="muted" class="learning-pet-feedback"><WPPetAvatar :element="pet.current.element" :size="48"/><view><text class="strong">{{pet.info.name}}为你加油</text><text class="small muted block">{{correctRun>=3?'连续答对 '+correctRun+' 次，一点点努力都留下来了！':'太棒了，又记住一个小世界。'}}</text></view></WPCard><WPCard class="study-phonics-card"><view class="section-heading"><text>自然拼读音块</text><text>◌</text></view><template v-if="!conceal&&resolvedPhonics"><WPPhonicsBreakdown :phonics="resolvedPhonics.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/><text v-if="resolvedPhonics.source==='whole'" class="small muted block">拼读拆分正在审核，先听完整发音。</text><view v-if="resolvedPhonics.data.syllables?.length" class="context-line"><text class="small muted">音节</text><text>{{resolvedPhonics.data.syllables.join(' · ')}}</text></view><view class="example-box"><text class="small muted">读一读</text><text>{{view.current.example||'例句正在补充，可以先记住单词和词义。'}}</text></view><text class="small muted block phonics-timing-note" :data-timing="timing">{{timingNote}}</text></template><text v-else class="muted">先听一听或拼一拼，回答后一起拆解这个单词。</text></WPCard><WPCard><WPPronunciationPractice :word="view.current"/></WPCard></view>
 </view>
 </view>
 <ActivityWorkspace v-if="!learning.session||!!learning.session.completedAt"/>
 <text v-if="audioError||view.error" class="notice error" role="alert">{{audioError||view.error}}</text>
</template>
<script setup lang="ts">
import PendingBanner from '../../components/course/PendingBanner.vue'
import ActivityWorkspace from '../../components/course/ActivityWorkspace.vue'
import {useCourseStore} from '../../stores/course'
import {useActivitiesStore} from '../../stores/activities'
import {availableModes} from '../../../packages/content_schema/course'
import {useFeedbackStore} from '../../stores/feedback'
import WPSegmentedButton from "../../components/button/WPSegmentedButton.vue"
import WPAudioButton from "../../components/button/WPAudioButton.vue"
import {onHide} from "@dcloudio/uni-app"
import WPActionTile from "../../components/button/WPActionTile.vue"

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
import {useParentSettingsStore} from '../../stores/parent-settings'
import {useStudyPresentation} from '../../stores/study-presentation'
import {useReviewStore} from '../../stores/review'
import {useProfileStore} from '../../stores/profile'
import {usePetStore} from '../../stores/pet'
import {lessons} from '../../../packages/content_schema'
import WPPhonicsBreakdown from '../../components/phonics/WPPhonicsBreakdown.vue'
import {PhonicsPlaybackController} from '../../services/audio/PhonicsPlaybackController'
import type {ReviewRating,LearningMode} from '../../../packages/core_learning'
import {stopAudio} from '../../services/audio'
import {warmUpcomingAudio} from '../../services/audio/AudioPreload'
import {resolveFrozenWord} from '../../services/content/ContentRegistry'
import {navigate,openCourseGallery} from '../../services/navigation'
import {courseSummary as summarizeCourse} from '../../services/course/CourseSelection'
const learning=useLearningStore(),review=useReviewStore(),profile=useProfileStore(),pet=usePetStore(),theme=useThemeStore(),view=useStudyPresentation(),audioError=ref(''),courseStore=useCourseStore(),activities=useActivitiesStore(),feedback=useFeedbackStore(),parent=useParentSettingsStore()
const phonicsController=new PhonicsPlaybackController()
const {phonics:resolvedPhonics,activeChunkIndex,playbackState,timing}=phonicsController
const timingNote=computed(()=>resolvedPhonics.value?.source==='whole'?'以完整单词的标准发音为准。':timing.value==='exact'?'音块跟随已标注的发音时间亮起。':timing.value==='weighted'?'按整词时长估算音块位置，仅作跟读提示。':'音块依次亮起，仅作跟读提示，以实际发音为准。')
const extraActive=computed(()=>!!activities.state&&(!learning.session||!!learning.session.completedAt))
const modeOptions=computed(()=>{const allowed=view.current?availableModes(view.current,Object.values(learning.session?.wordSnapshot||{}),feedback.settings.sound,learning.session?.plannerConfig?.entryLevel):[];return modes.map(mode=>({...mode,disabled:!allowed.includes(mode.id)}))})
const modeTitles={flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写'}
/** lesson.name already embeds the unit for imported courses; never repeat it twice in the heading. */
const displayLessonTitle=computed(()=>{
 const lesson=course.value
 if(!lesson)return ''
 const name=String(lesson.name||''),unit=String(lesson.unit||'')
 return unit&&name&&!name.includes(unit)?`${unit} · ${name}`:(name||unit)
})
const courseSummaryData=computed(()=>summarizeCourse(courseStore.current))
function cancelPending(){if(courseStore.clearPending())uni.showToast?.({title:'已取消排队',icon:'none'})}
function showProgress(){uni.pageScrollTo?.({selector:'.study-formal',duration:200})}
function openGallery(){courseStore.applyPending();openCourseGallery()}
function beginStudy(){courseStore.applyPending();learning.start()}
const course=computed(()=>learning.lesson)
const estimate=computed(()=>Math.max(1,Math.ceil((view.total||review.due.length||learning.newWords.length||5)*.7)))
const progress=computed(()=>learning.session?learning.session.answers.length+'/'+learning.session.wordIds.length:'待开始')
const correctRun=computed(()=>{let count=0;const answers=view.revisiting?view.state.answers:learning.session?.answers||[];for(const answer of [...answers].reverse()){if(!answer.correct)break;count++}return count})
const modeInfo=computed(()=>modes.find(mode=>mode.id===view.mode)??modes[0])
const conceal=computed(()=>!view.revealed&&['listen','spell','dictation'].includes(view.mode))
const canSubmit=computed(()=>view.mode==='connect'||view.mode==='listen'?!!view.selected:!!view.input.trim())
watch(()=>[learning.session?.id,learning.session?.index,learning.session?.completedAt],()=>view.sync(),{immediate:true})
watch(()=>view.current,word=>phonicsController.setWord(word),{immediate:true})
watch(()=>[view.current?.audio,learning.session?.index],()=>{const session=learning.session,id=session?.wordIds[(session.index||0)+1],next=id?resolveFrozenWord(session?.wordSnapshot?.[id],session?.courseId,session?.contentVersion):undefined;warmUpcomingAudio([view.current?.audio||'',next?.audio||''])},{immediate:true})
watch(()=>[view.current?.id,view.current?.audio,view.mode],()=>{stopAudio();audioError.value='';if(['listen','dictation'].includes(view.mode)&&!view.answer)play()})
onHide(()=>{phonicsController.stop();stopAudio();activities.pauseTimer()})
watch(()=>view.answer,answer=>{if(answer?.correct)successHaptic(theme.reduced)})
function play(){if(view.current){audioError.value='';void phonicsController.play(view.current).catch(error=>audioError.value=(error as Error).message)}}
function updateInput(event:any){view.updateInput(event.detail?.value??event.target?.value??'')}
function submit(){if(view.answer)view.next();else view.submit(view.mode==='flash'?3:undefined)}
function another(){stopAudio();courseStore.applyPending();if(learning.newWords.length||review.due.length||learning.needsConsolidation)learning.start();else activities.start('check')}
function shortcut(event:{key:string;metaKey?:boolean;ctrlKey?:boolean}){
 if(event.metaKey||event.ctrlKey)return
 if(event.key===' ')play()
 else if(event.key==='Enter'){if(view.mode==='flash'&&!view.revealed)view.reveal();else submit()}
 else if(event.key==='ArrowLeft'&&!view.revisiting)learning.previous()
 else if(event.key==='ArrowRight')view.next()
 else if(/^[1-4]$/.test(event.key)){const index=+event.key-1;if(view.mode==='flash'&&view.revealed)view.submit(+event.key as ReviewRating);else if(!view.revisiting&&learning.choices[index])view.select(learning.choices[index].id)}
}
onMounted(()=>uni.$on('wp-shortcut',shortcut))
onUnmounted(()=>{uni.$off('wp-shortcut',shortcut);phonicsController.dispose();stopAudio()})
</script>


