<template>
 <CustomPracticeWorkspace v-if="custom.isOpen"/>
 <template v-else>
 <StudySessionHeading v-if="focusPractice" :title="view.revisiting?'错词回看 · '+modeTitles[view.mode]:learning.session?.flow?.step==='consolidate'?'复习巩固':modeTitles[view.mode]" :mode="view.mode" :index="view.index+1" :total="view.total" :value="view.index+(view.answer?1:0)" :position="currentPosition" :caption="learning.isDaily?'今日任务':'额外练习'" @custom="independentPractice"/>
 <view v-show="!focusPractice||overviewOpen" class="page-heading study-heading"><view><text class="page-title">今日学习</text><text class="page-subtitle">今天，记住一点点。</text><text class="small muted block">{{headingSourceLabel}}</text></view><text class="study-estimate small muted">{{view.revisiting?'本轮错词回看':'预计 '+estimate+' 分钟'}}</text><CustomPracticeEntry v-if="!focusPractice" @click="independentPractice"/></view>
 <StudyPetCompanion v-show="!focusPractice||overviewOpen" :pet="profile.db.pets[profile.db.companion]" :unavailable="!!profile.bootError"><template v-if="!learning.session&&!extraActive" #default><view class="study-ready"><text class="section-title">{{learning.studyWords.length||learning.due.length?'和单词，见一面':'今天的任务已经完成'}}</text><text class="small muted">{{learning.studyWords.length?'按教材顺序逐词学习，题型会自动安排。':'只复习当前教材中的单词。'}}</text><WPButton v-if="learning.studyWords.length||learning.due.length||learning.needsConsolidation" @click="beginReady">开始今日学习</WPButton><WPButton v-else kind="secondary" @click="activities.start('check')">整课检查</WPButton></view></template></StudyPetCompanion>
 <PendingBanner :pending="courseStore.pendingCourse" @cancel="cancelPending" @progress="showProgress"/>
 <StudyCurrentCourseCard v-show="!focusPractice||overviewOpen" v-if="theme.settings.themeId==='clay'" :pack="courseStore.current" :plan="learning.todayPlan" :progress="learning.textbookProgress" :entry-level="parent.settings.entryLevel" :today="statsDate" :unavailable="!!profile.bootError" :problem="learning.planProblem" @choose="openGallery"><template v-if="learning.planProblem||learning.todayPlan&&(learning.todayPlan.flow&&learning.todayPlan.wordIds.length<learning.todayPlan.flow.target||!learning.todayPlan.completedAt&&learning.todayPlan.date!==statsDate)" #default><text v-if="learning.todayPlan?.flow&&learning.todayPlan.wordIds.length<learning.todayPlan.flow.target" class="small muted block">教材剩余不足目标，今天学习 {{learning.todayPlan.wordIds.length}} 词。</text><text v-if="learning.todayPlan&&!learning.todayPlan.completedAt&&learning.todayPlan.date!==statsDate" class="notice">待续学 · 完成上次任务后，下一学习日再安排新词。</text><text v-if="learning.planProblem" class="notice error" role="alert">{{learning.planProblem}}</text></template></StudyCurrentCourseCard>
 <view v-else v-show="!focusPractice||overviewOpen" class="current-course-card">
  <view class="current-course-head">
   <view class="current-course-copy">
    <view class="course-gallery-title"><text class="strong">当前教材</text></view>
    <text class="small muted block">{{courseStore.current.title}} · {{courseSummaryData.words}} 词 · {{courseSummaryData.units}} 单元 · {{courseSummaryData.levels||'未标注等级'}}</text>
   </view>
   <WPButton @click="openGallery">选择教材</WPButton>
  </view>
  <text class="study-effective-line">L{{learning.todayPlan?.flow?.entryLevel||parent.settings.entryLevel}} · 今日{{learning.todayPlan?.wordIds.length||0}}词 · 全书已完整学习 {{learning.textbookProgress.learned}} / {{learning.textbookProgress.total}}（{{learning.textbookProgress.percent}}%）</text><WPProgress :value="learning.textbookProgress.learned" :total="learning.textbookProgress.total" label="当前教材完整学习进度"/><text v-if="learning.todayPlan?.flow&&learning.todayPlan.wordIds.length<learning.todayPlan.flow.target" class="small muted block">教材剩余不足目标，今天学习 {{learning.todayPlan.wordIds.length}} 词。</text><text v-if="learning.todayPlan&&!learning.todayPlan.completedAt&&learning.todayPlan.date!==localDate()" class="notice">待续学 · 完成上次任务后，下一学习日再安排新词。</text><text v-if="learning.planProblem" class="notice error" role="alert">{{learning.planProblem}}</text>
 </view>
 <text v-if="custom.notice" class="notice study-practice-entry" role="status">{{custom.notice}}</text>
 <view v-if="!extraActive" class="study-formal">
 <StudyStatsRow v-show="!focusPractice||overviewOpen" :today="learning.newToday" :due="learning.due.length" :round="roundProgress" :daily="learning.isDaily" :today-open="todayOpen" :ready-hint="learning.studyWords.length?'开始今日学习':learning.due.length?'开始到期复习':'查看教材单词'" @today="todayOpen=!todayOpen" @review="openDueReview" @round="resumeRound"/>
 <WPCard v-if="todayOpen" class="study-today-details" role="region" aria-label="今日已学新词明细"><view class="section-heading"><text class="strong">今日已学新词 · {{learning.newToday}} 词</text><WPButton kind="quiet" @click="todayOpen=false">收起明细</WPButton></view><text class="small muted block">当前教材 · 今天完整完成六环节的单词</text><view v-if="todayWords.length" class="study-today-words"><view v-for="word in todayWords" :key="word.id" class="study-today-word"><text class="strong">{{word.word}}</text><text class="muted">{{word.meaning}}</text></view></view><text v-else class="muted block">今天还没有新学单词，完成今日学习后会显示在这里。</text></WPCard>
 <view v-if="learning.session&&view.completed" class="empty-card completion study-completion"><WPPetAvatar :element="pet.current.element" :size="64"/><text class="eyebrow">每一点努力，都留下来了</text><text class="page-title">{{learning.isDaily?'今日六环节，完成啦！':'这一轮，完成啦！'}}</text><view class="completion-counts"><view><text>{{learning.session.answers.filter(a=>a.correct).length}} / {{learning.session.answers.length}}</text><text class="small muted">正式回答正确</text></view><view><text>{{view.state.queue.length}}</text><text class="small muted">额外回看错词</text></view><view v-if="learning.session.kind!=='practice'&&view.earnedExp!==null"><text>+{{view.earnedExp}} XP</text><text class="small muted">伙伴经验增长</text></view></view><text class="muted">学习进度已保存。{{view.state.answers.length?'回看 '+view.state.answers.filter(a=>a.correct).length+' / '+view.state.answers.length+' 个回答正确，不重复发奖。':''}}</text><text v-if="learning.needsConsolidation" class="notice">这一课再熟悉一下，下次会更有把握。</text><view class="button-row"><WPButton v-if="!learning.isDaily" @click="another">{{learning.studyWords.length?'继续今日学习':learning.due.length?'继续到期复习':learning.needsConsolidation?'巩固这一课':'再轻松练一轮'}}</WPButton><WPButton kind="secondary" @click="navigate('home')">回到今日任务</WPButton></view></view>
 <view v-else-if="learning.session&&view.current" class="learn-workspace study-space" :class="{'has-study-context':view.revealed&&exploreOpen,'study-focus-workspace':focusPractice,'study-typing':studyInput.keyboardRaised}" :style="{paddingBottom:studyInput.overlap?studyInput.overlap+'px':undefined}">
  <view class="learn-main study-main"><view v-if="learning.isDaily" class="daily-step-list" aria-label="六环节学习进度"><view v-for="(title,step) in learning.stepTitles" :key="step" class="daily-step" :class="{active:learning.session?.flow?.step===step,done:learning.session?.flow?.completed[step].length===view.total}"><text>{{title}}</text><text>{{learning.session?.flow?.completed[step].length}}/{{view.total}}</text></view></view><view v-if="!focusPractice" class="practice-round-card"><view class="session-header"><text class="element-chip"><image v-if="theme.settings.themeId==='clay'&&learning.currentSource==='practice'" class="easy-practice-badge" :src="practiceBadge" mode="aspectFit" aria-hidden="true"/>{{view.revisiting?'错词回看':learning.session?.sequenceWordIds?.includes(view.current.id)?'本册学习':learning.currentSource==='review_due'?'到期复习':learning.currentSource==='practice'?'轻松练习':'今日新词'}}</text><text class="small muted">本轮 {{view.index+1}} / {{view.total}}</text></view><text v-if="currentPosition" class="study-word-position small muted block" role="status" aria-live="polite">教材词序：第 {{currentPosition.index}} / {{currentPosition.total}} 词</text><WPProgress :value="view.index+(view.answer?1:0)" :total="view.total" label="本轮学习进度"/></view>
   <WPWordCard :correct="view.answer?.correct" :practice="theme.settings.themeId==='clay'" :mode="view.mode" :word="view.current" :heading="learning.session?.flow?.step==='consolidate'?'复习巩固':modeTitles[view.mode]" :variant="view.mode==='flash'?'flash':'default'" :entry-level="sessionLevel" :prompt-picture="false" :data-phase="view.answer?'rated':view.revealed?'revealed':'prompting'" :conceal="conceal" :show-meaning="view.revealed&&!conceal" :reveal-meaning="view.mode==='spell'" :phonics="resolvedPhonics?.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"><WPAudioButton class="practice-audio" :icon-src="practiceSpeaker" :url="view.current.audio" :text="['listen','dictation'].includes(view.mode)?'再听一次':systemVoice?'系统朗读':'听发音'" :label="systemVoice?'播放当前单词的离线系统朗读':'播放当前单词的标准发音'" @click="play"/><text v-if="systemVoice" class="muted audio-source-note">离线系统朗读 · 美式英语</text></WPWordCard>
   <view class="answer-panel">
    <view v-if="view.mode==='connect'||view.mode==='listen'" class="choice-grid study-choice-options" :class="{'choice-locked':choiceLocked,'long-choices':longChoices}" role="group" :aria-label="view.mode==='connect'?'选择对应词义':'选择听到的单词'"><WPActionTile v-for="(choice,i) in learning.choices" :key="choice.id" toggle-highlight class="answer-choice" :selected="view.selected===choice.id" :aria-pressed="view.selected===choice.id" :disabled="!!view.answer||choiceLocked" @click="guardChoice(()=>view.select(choice.id))" @cancel="guardChoice(()=>view.select(''))"><text class="choice-index">{{i+1}}</text><text>{{view.mode==='connect'?choice.meaning:choice.word}}</text></WPActionTile></view>
    <LetterBlockInput compact :word="view.current" :letter-draft="view.revisiting||view.retrying?view.state.letterDraft:learning.session?.letterDraft" :default-tiles="theme.settings.themeId==='clay'&&!learning.isDaily&&!view.revisiting" :correct="view.answer?.correct" v-else-if="view.mode==='spell'||view.mode==='dictation'" :model-value="view.input" :mode="view.mode" :disabled="!!view.answer" :question-key="[learning.session?.id,view.current.id,view.mode,view.index].join(':')" @change="view.updateSpellingInput" @confirm="submit"/>
    <view v-if="!view.answer&&hintOpen" id="study-hint" class="study-hint" role="status" aria-live="polite"><text class="strong">一点小提示</text><text>{{hintText}}</text></view><text v-if="hintFailure" class="notice error" role="alert">{{hintFailure}}</text>
    <view v-if="!view.answer" class="answer-actions"><template v-if="view.mode==='flash'"><view v-if="!view.revealed" class="recall-action"><WPButton @click="view.reveal()">开始自评</WPButton></view><view v-else class="rating-grid"><WPButton v-for="(label,i) in childRatings" :key="label" :kind="i===2?'primary':'secondary'" @click="view.submit((i+1) as ReviewRating)">{{label}}</WPButton></view></template><template v-else><WPButton :disabled="!canSubmit" @click="submit">确认答案 →</WPButton></template><WPButton kind="quiet" class="study-hint-button" :aria-expanded="hintOpen" aria-controls="study-hint" @click="toggleHint">{{hintOpen?'收起提示':view.hinted?'再看提示':view.revisiting||view.retrying?'查看提示':'提示 · 1 灵石'}}</WPButton></view>
    <view v-else class="answer-feedback" :class="view.answer.correct?'correct':'incorrect'" role="status" aria-live="polite"><text class="strong">{{view.answer.correct?'✓ 很棒，记住啦！':'↻ 我们一起再认识它：'+view.current.word+' · '+view.current.meaning}}</text><text class="small">{{view.retrying?'重试不改变首次作答结果、进度或奖励。':view.revisiting||learning.currentSource==='practice'?'练习不会改变复习日期。':'下次见面：'+nextReviewLabel(profile.db.cards[view.current.id]?.due)}}</text><WPButton v-if="!view.answer.correct&&!learning.isDaily&&!view.revisiting&&['spell','dictation'].includes(view.mode)" kind="secondary" @click="view.retry();hintOpen=false;hintFailure=''">再拼一次</WPButton><WPButton @click="view.next()">{{learning.isDaily&&!view.answer.correct?'再试一次':view.index===view.total-1?learning.isDaily?'继续下一环节':view.revisiting?'完成回看':'完成这一轮':'下一个单词'}} →</WPButton></view>
   </view>
   <WPButton v-if="view.revealed" kind="quiet" :aria-expanded="exploreOpen" @click="exploreOpen=!exploreOpen">{{exploreOpen?'收起自然拼读与例句':'展开自然拼读与例句'}}</WPButton>
  </view>
  <view class="learn-modes study-modes" aria-label="学习题型与设置">
   <WPButton kind="quiet" class="study-overview-toggle" :aria-expanded="overviewOpen" @click="overviewOpen=!overviewOpen">{{overviewOpen?'收起学习概览':'查看学习概览'}}</WPButton>
   <WPButton v-if="learning.isDaily" kind="quiet" class="study-round-tools" @click="openRoundTools">本轮题型工具</WPButton>
   <template v-else>
    <WPButton kind="quiet" class="study-practice-toggle" :aria-expanded="customOpen" aria-controls="study-custom-practice" @click="toggleCustomPractice">切换题型 · {{modeTitles[view.mode]}} {{customOpen?'⌃':'⌄'}}</WPButton>
    <view v-show="customOpen" id="study-custom-practice" class="custom-practice compact-mode-settings" role="region" aria-label="自定义练习内容">
     <StudyModeSelector compact :model-value="view.mode" :options="modeOptions" :disabled="!!view.answer||view.revisiting||view.retrying" :locked-reason="view.revisiting?'回看期间不可切换':'进入下一词后可切换'" @update:model-value="view.chooseMode"/>
     <WPActionTile v-if="!view.revisiting" role="button" tabindex="0" class="auto-mode-button" :class="{selected:!view.state.manual}" :disabled="!!view.answer||view.retrying" :aria-pressed="!view.state.manual" @click="view.automatic()">{{view.state.manual?'恢复自动编排':'自动编排中'}}</WPActionTile>
     <text class="small muted">{{view.revisiting?'每词回看一次，不改变复习日期。':!view.current?.audio?'这个单词暂无离线音频，文字题型可继续学习。':!feedback.settings.sound?'声音已关闭，开启后可使用听音和听写。':systemVoice?'此词使用离线系统朗读，已有录音优先。':'重练不重复计分'}}</text>
     <WPButton kind="secondary" class="study-practice-return" @click="beginStudy">返回今日六环节</WPButton>
    </view>
   </template>
  </view>
  <view v-if="view.revealed&&exploreOpen" class="learn-context study-context"><WPCard v-if="view.answer?.correct" variant="muted" class="learning-pet-feedback"><WPPetAvatar :element="pet.current.element" :size="48"/><view><text class="strong">{{pet.info.name}}为你加油</text><text class="small muted block">{{correctRun>=3?'连续答对 '+correctRun+' 次，一点点努力都留下来了！':'太棒了，又记住一个小世界。'}}</text></view></WPCard><WPCard class="study-phonics-card"><view class="section-heading"><text>自然拼读音块</text><text>◌</text></view><template v-if="!conceal&&resolvedPhonics"><WPPhonicsBreakdown :phonics="resolvedPhonics.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/><text v-if="resolvedPhonics.source==='whole'" class="small muted block">拼读拆分正在审核，先听完整发音。</text><view v-if="resolvedPhonics.data.syllables?.length" class="context-line"><text class="small muted">音节</text><text>{{resolvedPhonics.data.syllables.join(' · ')}}</text></view><view class="example-box"><text class="small muted">读一读</text><text>{{view.current.example||'例句正在补充，可以先记住单词和词义。'}}</text></view><text class="small muted block phonics-timing-note" :data-timing="timing">{{timingNote}}</text></template></WPCard><WPCard><WPPronunciationPractice :word="view.current"/></WPCard></view>
 </view>
 </view>
 <view v-if="!learning.isDaily&&learning.session&&(extraActive||view.completed)" class="button-row daily-entry-actions"><WPButton kind="secondary" @click="beginStudy">返回今日六环节</WPButton></view>
 <ActivityWorkspace v-if="!learning.session||!!learning.session.completedAt"/>
 <text v-if="audioError||view.error" class="notice error" role="alert">{{audioError||view.error}}</text>
 </template>
</template>
<script setup lang="ts">
import StudySessionHeading from '../../components/study/StudySessionHeading.vue'
import PendingBanner from '../../components/course/PendingBanner.vue'
import CustomPracticeWorkspace from '../../components/study/CustomPracticeWorkspace.vue'
import {useCustomPracticeStore} from '../../stores/custom-practice'
import StudyPetCompanion from '../../components/pet-house/StudyPetCompanion.vue'
import StudyStatsRow from '../../components/study/StudyStatsRow.vue'
import StudyCurrentCourseCard from '../../components/study/StudyCurrentCourseCard.vue'
import {studyRoundProgress} from '../../services/learning/StudyStats'
import ActivityWorkspace from '../../components/course/ActivityWorkspace.vue'
import {useCourseStore} from '../../stores/course'
import {useActivitiesStore} from '../../stores/activities'
import {availableModes} from '../../../packages/content_schema/course'
import {useFeedbackStore} from '../../stores/feedback'
import StudyModeSelector from "../../components/study/StudyModeSelector.vue"
import WPAudioButton from "../../components/button/WPAudioButton.vue"
import {onHide,onShow} from "@dcloudio/uni-app"
import WPActionTile from "../../components/button/WPActionTile.vue"

import {computed,ref,watch,onMounted,onUnmounted,nextTick} from 'vue'
import {studyHint} from '../../services/learning/StudyHint'
import WPButton from '../../components/wp-button/WPButton.vue'
import CustomPracticeEntry from '../../components/study/CustomPracticeEntry.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPProgress from '../../components/wp-progress/WPProgress.vue'
import {useChoiceGuard} from '../../composables/useChoiceGuard'
import LetterBlockInput from '../../components/study/LetterBlockInput.vue'
import {spellingInputReady} from '../../../packages/phonics/letter-blocks'
import {studyInput} from '../../services/study-input'
import {practiceSpeaker,practiceBadge} from '../../services/study-mode-icons'
import WPWordCard from '../../components/wp-word-card/WPWordCard.vue'
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
import {localDate,type ReviewRating,type LearningMode} from '../../../packages/core_learning'
import {stopAudio} from '../../services/audio'
import {warmUpcomingAudio} from '../../services/audio/AudioPreload'
import {resolveFrozenWord,getCourseWord} from '../../services/content/ContentRegistry'
import {navigate,openCourseGallery,consumeStudyPractice} from '../../services/navigation'
import {courseSummary as summarizeCourse} from '../../services/course/CourseSelection'
import {windowLayout} from '../../services/window'
const learning=useLearningStore(),review=useReviewStore(),profile=useProfileStore(),pet=usePetStore(),theme=useThemeStore(),view=useStudyPresentation(),audioError=ref(''),courseStore=useCourseStore(),activities=useActivitiesStore(),feedback=useFeedbackStore(),parent=useParentSettingsStore()
const custom=useCustomPracticeStore()
const {locked:choiceLocked,choose:guardChoice}=useChoiceGuard(()=>[learning.session?.id,view.current?.id,view.mode,view.index].join(':'))
const phonicsController=new PhonicsPlaybackController()
let stepTimer:ReturnType<typeof setTimeout>|undefined
function clearStepTimer(){if(stepTimer)clearTimeout(stepTimer);stepTimer=undefined}
watch(()=>learning.isDaily?learning.session?.answers[learning.session.index]?.id:undefined,()=>{
 const answer=view.answer
 clearStepTimer()
 if(custom.isOpen||!learning.isDaily||!answer?.correct||view.index!==view.total-1)return
 const id=learning.session?.id,step=learning.session?.flow?.step,index=view.index
 stepTimer=setTimeout(()=>{if(learning.session?.id===id&&learning.session?.flow?.step===step&&view.index===index){view.next()}},700)
})
onUnmounted(clearStepTimer)
onHide(clearStepTimer)
const overviewOpen=ref(false),pageActive=ref(true)
const focusPractice=computed(()=>!custom.isOpen&&!!learning.session&&!!view.current&&!view.completed)
watch(focusPractice,(active,wasActive)=>{if(active&&!wasActive)void nextTick(()=>uni.pageScrollTo?.({scrollTop:0,duration:0}))})
const systemVoice=computed(()=>!!view.current?.tags?.includes('offline-system-fallback-en-us'))
const practiceEntry=consumeStudyPractice(),customOpen=ref(false),exploreOpen=ref(false)
let practiceEntryHandled=false
const hintOpen=ref(false),hintFailure=ref('')
const hintText=computed(()=>view.current?studyHint(view.current,view.mode):'暂时没有更多提示，可以先听一遍发音。')
function toggleHint(){if(hintOpen.value){hintOpen.value=false;return}if(view.hint()){hintOpen.value=true;hintFailure.value=''}else hintFailure.value=profile.db.gems<1?'灵石不足，查看提示需要 1 灵石。':'提示暂时无法保存，请稍后重试。'}
watch(()=>[learning.session?.id,view.current?.id,view.index,view.mode].join(':'),()=>{hintOpen.value=view.hinted;hintFailure.value=''},{immediate:true})
const currentPosition=computed(()=>learning.positionFor(view.current?.id))
const sessionLevel=computed(()=>learning.session?.plannerConfig?.entryLevel||parent.settings.entryLevel)
const {phonics:resolvedPhonics,activeChunkIndex,playbackState,timing}=phonicsController
const timingNote=computed(()=>resolvedPhonics.value?.source==='whole'?'以完整单词的标准发音为准。':timing.value==='exact'?'音块跟随已标注的发音时间亮起。':timing.value==='weighted'?'按整词时长估算音块位置，仅作跟读提示。':'音块依次亮起，仅作跟读提示，以实际发音为准。')
const extraActive=computed(()=>!!activities.state&&(!learning.session||!!learning.session.completedAt))
const modeOptions=computed(()=>{const allowed=view.current?availableModes(view.current,Object.values(learning.session?.wordSnapshot||{}),feedback.settings.sound,learning.session?.plannerConfig?.entryLevel):[];return modes.map(mode=>({...mode,disabled:!allowed.includes(mode.id)}))})
const practiceEntryHint=computed(()=>{
 if(extraActive.value)return '正在进行轻松练习，收起练习后可选择拼写或听写。'
 if(!learning.session)return '开始自定义练习后，可选择拼写或听写；练习不计入今日任务。'
 if(view.revisiting)return '正在回看本轮错词，完成后可继续选择练习。'
 if(view.completed)return '本轮已经完成，继续学习后可选择拼写或听写。'
 if(view.answer)return '本词已经作答，进入下一词后可选择拼写或听写。'
 if(!modeOptions.value.some(mode=>!mode.disabled&&['spell','dictation'].includes(mode.id)))return '当前能力起点尚未开放拼写或听写，可先完成现有练习。'
 if(modeOptions.value.some(mode=>mode.id==='dictation'&&!mode.disabled))return '已打开自定义练习，可选择拼写或听写。'
 return sessionLevel.value<4?'已打开自定义练习，可选择拼写；听写会随能力起点开放。':'已打开自定义练习，可选择拼写；听写需要可用发音并开启声音。'
})
const modeTitles={flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写'}
/** lesson.name already embeds the unit for imported courses; never repeat it twice in the heading. */
const displayLessonTitle=computed(()=>{
 const lesson=course.value
 if(!lesson)return ''
 const name=String(lesson.name||''),unit=String(lesson.unit||'')
 return unit&&name&&!name.includes(unit)?`${unit} · ${name}`:(name||unit)
})
/** Courses that carry one lesson per unit show the unit itself, not a lesson number. */
const unitOnlyCourse=computed(()=>{const units=courseStore.current.units;return units.length>0&&units.every(unit=>unit.lessons.length===1)})
const headingSourceLabel=computed(()=>unitOnlyCourse.value?`当前单元：${course.value?.unit||displayLessonTitle.value}`:displayLessonTitle.value)
const courseSummaryData=computed(()=>summarizeCourse(courseStore.current))
function cancelPending(){if(courseStore.clearPending())uni.showToast?.({title:'已取消排队',icon:'none'})}
function showProgress(){uni.pageScrollTo?.({selector:'.study-formal',duration:200})}
function openGallery(){courseStore.applyPending();openCourseGallery()}
async function scrollPracticeIntoView(){
 await nextTick()
 const query=uni.createSelectorQuery()
 query.select('.study-modes').boundingClientRect()
 query.selectViewport().scrollOffset(()=>{})
 query.exec(result=>{
  const bounds=result[0],viewport=result[1]
  if(bounds&&viewport)uni.pageScrollTo?.({scrollTop:Math.max(0,viewport.scrollTop+bounds.top-windowLayout.safeTop-12),duration:theme.reduced?0:150})
 })
}
function independentPractice(){clearStepTimer();stopQuestionAudio();custom.openConfig();uni.pageScrollTo?.({scrollTop:0,duration:0})}
// Retain the existing current-word-group tools for legacy independent/review sessions.
function openRoundTools(){clearStepTimer();phonicsController.stop();stopAudio();if(learning.startPractice()){customOpen.value=true;view.sync();void scrollPracticeIntoView()}}
function toggleCustomPractice(){customOpen.value=!customOpen.value;if(customOpen.value)void scrollPracticeIntoView()}
function beginStudy(){courseStore.applyPending();learning.start()}
function beginReady(){beginStudy()}
const course=computed(()=>learning.lesson)
const estimate=computed(()=>Math.max(1,Math.ceil((view.total||learning.due.length||learning.studyWords.length||5)*.7)))
const roundProgress=computed(()=>studyRoundProgress(learning.session)),todayOpen=ref(false)
const todayWords=computed(()=>learning.newTodayWordIds.flatMap(id=>{const word=getCourseWord(courseStore.currentId,id);return word?[word]:[]}))
watch(()=>courseStore.currentId,()=>{todayOpen.value=false})
async function resumeRound(){
 overviewOpen.value=true
 if(!learning.session){
  if(learning.studyWords.length)beginReady()
  else if(learning.due.length){await openDueReview();return}
  else{navigate('review');return}
 }
 await nextTick()
 if(learning.session)uni.pageScrollTo?.({selector:view.completed?'.study-completion':'.study-main',duration:theme.reduced?0:150})
}
async function openDueReview(){
 review.refresh()
 if(!learning.due.length){navigate('review');return}
 if(learning.session&&(!learning.session.completedAt||view.revisiting)){
  uni.showToast?.({title:'先继续当前学习，完成后再开始到期复习',icon:'none'})
  await resumeRound();return
 }
 if(learning.startDue(learning.due.map(card=>card.wordId))){view.sync();await resumeRound()}
}
const statsDate=ref(localDate())
let statsTimer:ReturnType<typeof setInterval>|undefined
function refreshStats(){statsDate.value=localDate();learning.refreshDay();review.refresh()}
function stopStatsTimer(){if(statsTimer)clearInterval(statsTimer);statsTimer=undefined}
onShow(()=>{refreshStats();stopStatsTimer();statsTimer=setInterval(refreshStats,30000)})
onHide(stopStatsTimer)
onUnmounted(stopStatsTimer)
const correctRun=computed(()=>{let count=0;const answers=view.revisiting?view.state.answers:learning.session?.answers||[];for(const answer of [...answers].reverse()){if(!answer.correct)break;count++}return count})
const longChoices=computed(()=>learning.choices.some(choice=>Array.from(view.mode==='connect'?choice.meaning:choice.word).length>(view.mode==='connect'?12:18)))
const conceal=computed(()=>!view.answer&&['listen','spell','dictation'].includes(view.mode))
const canSubmit=computed(()=>view.mode==='connect'||view.mode==='listen'?!!view.selected:!!view.current&&spellingInputReady(view.input,view.current,view.revisiting||view.retrying?view.state.letterDraft:learning.session?.letterDraft))
watch(()=>[learning.session?.id,learning.session?.index,learning.session?.flow?.step,learning.session?.completedAt],()=>view.sync(),{immediate:true})
watch(()=>view.current,word=>{phonicsController.setWord(word)},{immediate:true})
watch([()=>learning.session?.id,()=>view.current?.id,()=>view.index,()=>view.mode],()=>{exploreOpen.value=false})
watch(()=>[view.current?.audio,learning.session?.index].join('\u001f'),()=>{const session=learning.session,id=session?.wordIds[(session.index||0)+1],next=id?resolveFrozenWord(session?.wordSnapshot?.[id],session?.courseId,session?.contentVersion):undefined;warmUpcomingAudio([view.current?.audio||'',next?.audio||''])},{immediate:true})
watch(()=>[learning.session?.id,view.index,view.current?.id,view.current?.audio,view.mode].join('\u001f'),()=>{stopQuestionAudio();audioError.value='';if(pageActive.value&&!custom.isOpen&&['listen','dictation'].includes(view.mode)&&!view.answer)void play()})
onShow(()=>{pageActive.value=true;learning.prepareDaily();if(practiceEntry&&!practiceEntryHandled){practiceEntryHandled=true;independentPractice()}view.sync()})
onHide(()=>{pageActive.value=false;stopQuestionAudio();activities.pauseTimer();custom.leave()})
watch(()=>view.answer,answer=>{if(answer?.correct)successHaptic(theme.reduced)})
let playEpoch=0
const questionAudioKey=()=>[learning.session?.id,view.current?.id,view.mode,view.index].join(':')
function stopQuestionAudio(){playEpoch++;phonicsController.stop();stopAudio()}
async function play(){const word=view.current,key=questionAudioKey(),epoch=++playEpoch;if(!word||custom.isOpen||!pageActive.value)return;audioError.value='';try{await phonicsController.play(word)}catch(error){if(epoch===playEpoch&&key===questionAudioKey()&&!custom.isOpen&&pageActive.value)audioError.value=(error as Error).message}}
function submit(){if(view.answer||view.mode!=='flash'&&!canSubmit.value)return;uni.hideKeyboard?.();view.submit(view.mode==='flash'?3:undefined)}
function another(){stopAudio();courseStore.applyPending();if(learning.studyWords.length||learning.due.length||learning.needsConsolidation)learning.start();else activities.start('check')}
function shortcut(event:{key:string;metaKey?:boolean;ctrlKey?:boolean}){
 if(custom.isOpen||event.metaKey||event.ctrlKey)return
 if(event.key===' ')play()
 else if(event.key==='Enter'){if(view.answer)view.next();else if(view.mode==='flash'&&!view.revealed)view.reveal();else submit()}
 else if(event.key==='ArrowLeft'&&!view.revisiting)learning.previous()
 else if(event.key==='ArrowRight')view.next()
 else if(/^[1-4]$/.test(event.key)){const index=+event.key-1;if(view.mode==='flash'&&view.revealed)view.submit(+event.key as ReviewRating);else if(!view.revisiting&&learning.choices[index])view.select(learning.choices[index].id)}
}
onMounted(()=>uni.$on('wp-shortcut',shortcut))
onUnmounted(()=>{uni.$off('wp-shortcut',shortcut);stopQuestionAudio();phonicsController.dispose()})
</script>



<style scoped>.audio-source-note{font-size:var(--wp-font-caption);line-height:1.5}</style>


<style scoped>
.daily-step-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:16px}.daily-step{display:flex;justify-content:space-between;gap:4px;padding:8px;border-radius:var(--wp-radius-sm);background:var(--wp-surface-tonal);font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground);flex-wrap:wrap}.daily-step.active{outline:1px solid var(--wp-primary);color:var(--wp-primary);font-weight:700}.daily-step.done{color:var(--wp-success)}@media(min-width:900px){.daily-step-list{grid-template-columns:repeat(6,minmax(0,1fr))}}@media(max-width:359px){.daily-step-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>



<style scoped>
.study-hint{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface-tonal);font-size:var(--wp-font-small);line-height:1.6;overflow-wrap:anywhere;margin:12px 0;scroll-margin-bottom:calc(var(--wp-bottom-nav-space) + 20px)}
.study-hint-button{min-height:48px}.answer-actions{scroll-margin-bottom:calc(var(--wp-bottom-nav-space) + 20px)}
.study-today-details{margin-bottom:18px}.study-today-details .section-heading{gap:12px;flex-wrap:wrap}.study-today-words{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));gap:10px;margin-top:12px}.study-today-word{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);overflow-wrap:anywhere;font-size:var(--wp-font-body)}
.study-space.learn-workspace{width:100%;min-width:0;max-width:1360px;grid-template-columns:minmax(0,1fr);grid-template-areas:"main" "modes";align-items:stretch}
.study-space.learn-workspace.has-study-context{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);grid-template-areas:"main context" "modes modes"}
.study-space>.study-main{grid-area:main;grid-column:1;min-width:0;width:100%;max-width:100%}
.study-space>.study-modes{grid-area:modes;min-width:0;width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;gap:6px;scroll-margin-top:calc(var(--wp-native-top,0px) + 12px);scroll-margin-bottom:calc(var(--wp-bottom-nav-space) + 16px)}
.study-space>.study-context{grid-area:context;min-width:0;width:100%;max-width:100%;overflow-wrap:anywhere}
.study-modes>.study-practice-toggle,.study-modes>.study-practice-entry-button{align-self:flex-start;max-width:100%;white-space:normal;text-align:left}
.study-modes>.custom-practice{width:100%;min-width:0;max-width:100%;box-sizing:border-box;background:var(--wp-surface);overflow:visible}
.custom-practice>.study-practice-return{align-self:stretch;width:100%;margin:0}
.study-main .choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.study-main .answer-choice{min-width:0;max-width:100%}
.study-main .choice-picture{flex-shrink:0;max-width:60%}
@media(max-width:839px){.study-space.learn-workspace,.study-space.learn-workspace.has-study-context{display:flex;flex-direction:column}.study-space>.study-main{order:0}.study-space>.study-modes{order:1}.study-space>.study-context{order:2;grid-column:1}}
</style>
