<template>
 <view class="custom-practice-workspace study-space" :class="{'custom-training-focus':custom.screen==='training'}" :data-custom-screen="custom.screen" :style="{'--custom-action-space':studyInput.keyboardRaised?'24px':footerHeight+'px',paddingBottom:studyInput.overlap?studyInput.overlap+110+'px':undefined}">
  <StudySessionHeading v-if="custom.screen==='training'&&custom.session&&custom.progress" :title="CUSTOM_MODE_NAMES[custom.mode]" :mode="custom.mode" :index="custom.session.index+1" :total="custom.progress.total" :value="custom.session.results[custom.mode].completedWordIds.length" :caption="'额外练习 · 第 '+(custom.session.modeIndex+1)+'/'+custom.session.modes.length+' 项'" @custom="custom.openConfig()"><template #back><WPButton kind="quiet" label="返回学习或暂停自定义练习" @click="custom.back()">‹ 返回</WPButton></template></StudySessionHeading>
  <view v-else class="custom-heading"><WPButton kind="quiet" label="返回学习或暂停自定义练习" @click="custom.back()">‹ 返回</WPButton><view><text class="page-title"><image class="easy-practice-badge" :src="custom.screen==='config'?customPracticeArtwork.title:customResultArtwork.heading" mode="aspectFit" aria-hidden="true"/>{{title}}</text><text class="small muted block">{{custom.screen==='summary'?'额外练习已保存 · 不计今日任务':'额外练习 · 不计今日任务'}}</text></view></view>
  <text v-if="custom.error" class="notice error" role="alert">{{custom.error}}</text>
  <template v-if="custom.screen==='config'">
   <CustomPracticeConfig/>
  </template>
  <template v-else-if="custom.session&&custom.progress">
   <view v-if="custom.screen!=='training'" class="custom-session-summary"><image :src="customResultArtwork.course" mode="aspectFit" aria-hidden="true"/><view><text class="strong block">{{custom.session.courseTitle}}</text><text class="small muted block">{{custom.session.scopeLabel}} · {{custom.progress.total}} 词 · {{custom.session.modes.length}} 项模式</text></view></view>
   <template v-if="custom.screen==='overview'">
    <WPCard class="custom-plan-card"><view class="custom-plan-status"><image :src="customResultArtwork.overview" mode="aspectFit" aria-hidden="true"/><view><text class="strong block">同一组 {{custom.progress.total}} 词，按顺序练习</text><text class="small muted block">随时暂停，下次继续</text></view></view><view class="custom-section-heading"><text class="section-title">训练步骤</text><text class="small muted">完成 {{custom.progress.completedModes}}/{{custom.session.modes.length}}</text></view><CustomPracticeRoute :session="custom.session"/></WPCard>
   </template>
   <template v-else-if="custom.screen==='training'">
    <text v-if="custom.resumeProblem" class="notice error" role="alert">{{custom.resumeProblem}}</text>
    <view class="custom-training-layout"><CustomPracticeRoute v-if="custom.session.modes.length>1" :session="custom.session" compact/>
     <view class="custom-training-main compact-custom-main">
      <template v-if="custom.current">
       <WPWordCard :correct="custom.session.answer?.correct" :practice="theme.settings.themeId==='clay'" :mode="custom.mode" :word="custom.current" :heading="CUSTOM_MODE_NAMES[custom.mode]" :variant="custom.mode==='flash'?'flash':'default'" :conceal="['listen','spell','dictation'].includes(custom.mode)&&!custom.session.answer" :show-meaning="custom.session.revealed||!!custom.session.answer" :reveal-meaning="custom.mode==='spell'" :phonics="phonics?.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"><WPAudioButton class="practice-audio" :icon-src="practiceSpeaker" :url="custom.current.audio" :text="['listen','dictation'].includes(custom.mode)?'再听一次':'听发音'" label="播放当前练习单词的发音" @click="play"/></WPWordCard>
       <CustomPracticeMatch v-if="custom.mode==='connect'"/><view v-if="custom.mode==='listen'" class="choice-grid study-choice-options" :class="{'choice-locked':choiceLocked}" role="group" aria-label="选择听到的单词"><WPActionTile v-for="choice in custom.choices" :key="choice.id" toggle-highlight class="answer-choice" :selected="custom.session.selected===choice.id" :disabled="!!custom.session.answer||choiceLocked" :data-word-id="choice.id" @click="guardChoice(()=>custom.patch({selected:choice.id}))" @cancel="guardChoice(()=>custom.patch({selected:''}))">{{choice.word}}</WPActionTile></view>
       <LetterBlockInput compact :word="custom.current" :letter-draft="custom.session.letterDraft" :default-tiles="theme.settings.themeId==='clay'" :correct="custom.session.answer?.correct" v-if="['spell','dictation'].includes(custom.mode)" :model-value="custom.session.input" :mode="custom.mode" :disabled="!!custom.session.answer" :question-key="custom.token" @change="custom.patch($event)" @confirm="submit()"/>
      </template>
      <text v-if="audioError" class="notice error" role="alert">{{audioError}}</text>
      <view v-if="custom.current&&!custom.resumeProblem" class="answer-panel">
       <view v-if="custom.session.answer" class="answer-feedback" :class="custom.session.answer.correct?'correct':'incorrect'" role="status" aria-live="polite"><text class="strong">{{custom.session.answer.correct?'很棒，记住啦！':'再试一次：'+custom.current.word+' · '+custom.current.meaning}}</text><text class="small">额外练习已保存，不改变正式任务和复习日期。</text><WPButton @click="custom.next()">{{!custom.session.answer.correct?'再试一次':custom.session.index===custom.progress.total-1?custom.session.modeIndex===custom.session.modes.length-1?'查看本次总结':'进入下一模式':'下一个单词'}} →</WPButton></view>
       <view v-else class="answer-actions"><template v-if="custom.mode==='flash'"><WPButton v-if="!custom.session.revealed" @click="custom.patch({revealed:true})">开始自评</WPButton><view v-else class="rating-grid"><WPButton v-for="(label,index) in childRatings" :key="label" :kind="index===2?'primary':'secondary'" @click="submit((index+1) as ReviewRating)">{{label}}</WPButton></view></template><WPButton v-else :disabled="!canSubmit" @click="submit()">确认答案 →</WPButton></view>
      </view>
     </view>
    </view>
   </template>
   <template v-else-if="custom.screen==='paused'">
    <WPCard class="custom-plan-card custom-paused-card"><view class="custom-section-heading"><text class="section-title">进度已保存</text><text class="small muted">完成 {{custom.progress.completedModes}}/{{custom.session.modes.length}}</text></view><WPProgress :value="custom.progress.steps" :total="custom.progress.totalSteps" label="整体训练步骤"/><text class="small muted block custom-paused-progress">训练步骤 {{custom.progress.steps}}/{{custom.progress.totalSteps}} · {{custom.progress.percent}}%</text><CustomPracticeRoute :session="custom.session"/><text v-if="custom.resumeProblem" class="notice error" role="alert">{{custom.resumeProblem}}</text></WPCard>
   </template>
   <template v-else-if="custom.screen==='summary'">
    <WPCard v-if="results" class="custom-complete-card"><view class="custom-result-heading"><image class="custom-result-art" :src="customResultArtwork.complete" mode="aspectFit" aria-hidden="true"/><view><text class="section-title">完成 {{results.completedWordCount}} 个词</text><text class="small muted block">已完成 {{results.completedModes}}/{{results.selectedModeCount}} 项 · 用时 {{elapsed}}</text></view></view><view class="custom-result-stats"><view class="custom-result-stat"><image :src="customResultArtwork.completed" mode="aspectFit" aria-hidden="true"/><view><text class="strong block">{{results.completedWordCount}}/{{results.selectedWordCount}}</text><text class="small muted block">已完成词条</text></view></view><view class="custom-result-stat"><image :src="results.accuracy===null?customResultArtwork.completed:customResultArtwork.accuracy" mode="aspectFit" aria-hidden="true"/><view><text class="strong block">{{results.accuracy===null?results.completionRate:results.accuracy}}%</text><text class="small muted block">{{results.accuracy===null?'完成率':'正确率'}}</text></view></view></view><text v-if="results.gradedAnswered" class="small muted block custom-score-caption">可评分作答 {{results.gradedCorrect}}/{{results.gradedAnswered}} 次 · 含重试</text><view class="custom-section-heading"><text class="section-title">本次练习</text><text class="small muted">{{results.selectedModeCount}} 项模式</text></view><CustomPracticeRoute :session="custom.session"/></WPCard>
   </template>
  </template>
  <view v-show="!studyInput.keyboardRaised" class="custom-action-bar"><view class="custom-action-inner">
   <template v-if="custom.screen==='config'"><WPButton :disabled="!!custom.startProblem" @click="start()">{{custom.selectedModes.length>1?'开始连续训练':'开始练习'}}</WPButton></template>
   <template v-else-if="custom.screen==='overview'"><WPButton :disabled="!!custom.resumeProblem" @click="custom.resume()">开始连续训练</WPButton></template>
   <template v-else-if="custom.screen==='training'"><WPButton kind="secondary" @click="pause()">暂停练习</WPButton><WPButton kind="quiet" @click="requestEnd()">结束练习</WPButton></template>
   <template v-else-if="custom.screen==='paused'"><WPButton :disabled="!!custom.resumeProblem" @click="custom.resume()">继续练习</WPButton><WPButton kind="secondary" @click="requestEnd()">结束本次练习</WPButton></template>
   <template v-else-if="custom.screen==='summary'"><WPButton @click="custom.openConfig()"><image class="custom-repeat-icon" :src="customResultArtwork.repeat" mode="aspectFit" aria-hidden="true"/>再练一次</WPButton><WPButton kind="secondary" @click="custom.leave()">返回学习页</WPButton></template>
  </view></view>
  <view v-if="custom.confirmation" class="custom-confirm-backdrop" @click="cancelConfirmation"><view class="custom-confirm-dialog" role="dialog" aria-modal="true" :aria-label="custom.confirmation==='end'?'结束本次自定义练习':'重新开始自定义练习'" @click.stop><text class="section-title">{{custom.confirmation==='end'?'要结束本次练习吗？':'已有一份待续练习'}}</text><text class="muted block">{{custom.confirmation==='end'?'已作答记录会保留，当前练习将结束，之后不能继续此断点。':'重新开始会替换上次断点。已作答记录和正式学习任务都会保留。'}}</text><view class="button-row"><WPButton kind="secondary" @click="cancelConfirmation">{{custom.confirmation==='end'?'继续当前练习':'保留上次练习'}}</WPButton><WPButton @click="confirm()">{{custom.confirmation==='end'?'确认结束':'重新开始'}}</WPButton></view></view></view>
 </view>
</template>
<script setup lang="ts">
import StudySessionHeading from './StudySessionHeading.vue'
import {computed,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onHide,onShow} from '@dcloudio/uni-app'
import {useCustomPracticeStore} from '../../stores/custom-practice'
import {CUSTOM_MODE_NAMES,customResults} from '../../services/learning/CustomPractice'
import {childRatings} from '../../services/study-presentation'
import {PhonicsPlaybackController} from '../../services/audio/PhonicsPlaybackController'
import {audioPlayback} from '../../services/audio'
import {warmUpcomingAudio} from '../../services/audio/AudioPreload'
import WPButton from '../wp-button/WPButton.vue'
import WPCard from '../wp-card/WPCard.vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPProgress from '../wp-progress/WPProgress.vue'
import LetterBlockInput from './LetterBlockInput.vue'
import {spellingInputReady} from '../../../packages/phonics/letter-blocks'
import {studyInput} from '../../services/study-input'
import {practiceSpeaker} from '../../services/study-mode-icons'
import {customPracticeArtwork,customResultArtwork} from '../../services/custom-practice-artwork'
import WPWordCard from '../wp-word-card/WPWordCard.vue'
import WPAudioButton from '../button/WPAudioButton.vue'
import CustomPracticeConfig from './CustomPracticeConfig.vue'
import CustomPracticeRoute from './CustomPracticeRoute.vue'
import CustomPracticeMatch from './CustomPracticeMatch.vue'
import type {ReviewRating} from '../../../packages/core_learning'
import {windowLayout} from '../../services/window'
import {useThemeStore} from '../../stores/theme'
import {ref} from 'vue'
import {useChoiceGuard} from '../../composables/useChoiceGuard'
const custom=useCustomPracticeStore(),audioMessage=ref(''),controller=new PhonicsPlaybackController()
const results=computed(()=>custom.session?customResults(custom.session):null)
const audioError=computed(()=>audioMessage.value||(custom.screen==='training'&&audioPlayback.currentUrl.value===custom.current?.audio?audioPlayback.error.value?.message||'':''))
const footerHeight=ref(112),instance=getCurrentInstance(),theme=useThemeStore()
const {phonics,activeChunkIndex,playbackState}=controller
const {locked:choiceLocked,choose:guardChoice}=useChoiceGuard(()=>custom.token)
let timer:ReturnType<typeof setTimeout>|undefined,playEpoch=0
let measureTimer:ReturnType<typeof setTimeout>|undefined,footerPageVisible=true,footerDisposed=false
function measureFooter(){clearTimeout(measureTimer);if(!footerPageVisible||footerDisposed)return;measureTimer=setTimeout(()=>{void nextTick(()=>{if(!footerPageVisible||footerDisposed||!instance?.proxy)return;uni.createSelectorQuery().in(instance.proxy).select('.custom-action-bar').boundingClientRect(rect=>{if(footerPageVisible&&!footerDisposed&&rect&&!Array.isArray(rect)&&typeof rect.height==='number'&&rect.height>0)footerHeight.value=Math.ceil(rect.height)+20}).exec()})},80)}
watch(()=>[custom.screen,windowLayout.width,windowLayout.height,windowLayout.fontScale,theme.settings.largeText],measureFooter)
onMounted(measureFooter)
const title=computed(()=>({config:'自定义练习',overview:'连续训练总览',training:CUSTOM_MODE_NAMES[custom.mode]+'练习',paused:'暂停与续练',summary:'练习完成',closed:'自定义练习'}[custom.screen]))
const elapsed=computed(()=>{const seconds=Math.floor((custom.session?.elapsedMs||0)/1000);return seconds<60?`${seconds} 秒`:`${Math.floor(seconds/60)} 分 ${seconds%60} 秒`})
const canSubmit=computed(()=>!custom.resumeProblem&&!custom.session?.answer&&(['connect','listen'].includes(custom.mode)?!!custom.session?.selected:!!custom.current&&spellingInputReady(custom.session?.input||'',custom.current,custom.session?.letterDraft))&&(!['listen','dictation'].includes(custom.mode)||!audioError.value&&custom.heardToken===custom.token))
function clear(){clearTimeout(timer);timer=undefined;playEpoch++;controller.stop();warmUpcomingAudio([])}
async function play(){const word=custom.current,token=custom.token,epoch=++playEpoch;if(!word)return;audioMessage.value='';try{await controller.play(word);if(epoch===playEpoch&&token===custom.token&&custom.screen==='training'&&['playing','ended'].includes(playbackState.value))custom.heardToken=token}catch(error){if(epoch===playEpoch&&token===custom.token)audioMessage.value=(error as Error).message}}
function submit(rating?:ReviewRating){if(custom.session?.answer||custom.mode!=='flash'&&!canSubmit.value)return;uni.hideKeyboard?.();custom.submit(rating)}
function start(){if(custom.start()==='confirm')custom.confirmation='replace'}
function pause(){clear();if(custom.pause())custom.showPaused()}
function requestEnd(){clearTimeout(timer);timer=undefined;controller.stop();playEpoch++;custom.confirmation='end'}
function cancelConfirmation(){custom.confirmation=''}
function confirm(){const action=custom.confirmation;if(action==='end'){if(custom.end())custom.confirmation=''}else if(custom.start(true)==='started')custom.confirmation=''}
watch(()=>[custom.token,custom.screen].join(':'),async()=>{
 clear();audioMessage.value='';custom.heardToken='';controller.setWord(custom.current)
 const token=custom.token
 if(custom.screen==='training'&&custom.current){const next=custom.session?.wordSnapshot[custom.session.wordIds[custom.session.index+1]];warmUpcomingAudio([custom.current.audio,next?.audio||'']);await nextTick();if(!footerDisposed&&footerPageVisible&&token===custom.token&&custom.screen==='training'&&['listen','dictation'].includes(custom.mode)&&!custom.session?.answer)void play()}
},{immediate:true})
watch(()=>audioPlayback.error.value,error=>{if(error&&audioPlayback.currentUrl.value===custom.current?.audio)custom.heardToken=''})
watch(()=>[custom.session?.answer?.id,custom.confirmation].join(':'),()=>{
 clearTimeout(timer);timer=undefined
 if(custom.screen!=='training'||custom.confirmation||!custom.session?.answer?.correct||custom.mode!=='connect'&&custom.session.index!==custom.session.wordIds.length-1)return
 const token=custom.token;timer=setTimeout(()=>{if(custom.screen==='training'&&!custom.confirmation&&custom.token===token)custom.next()},700)
},{immediate:true})
watch(()=>custom.resumeProblem,problem=>{if(problem&&custom.screen==='training'){clear();if(custom.pause())custom.showPaused()}})
onShow(()=>{footerPageVisible=true;measureFooter()})
onHide(()=>{footerPageVisible=false;clearTimeout(measureTimer);clear()})
onUnmounted(()=>{footerDisposed=true;clear();clearTimeout(measureTimer);controller.dispose()})
// #ifdef H5
let previousOverflow='',confirmationFocus:HTMLElement|null=null,dialogLocked=false
function dialogKey(event:KeyboardEvent){
 if(document.querySelector('.spirit-stone-panel,.install-panel'))return
 if(event.key==='Escape'){event.preventDefault();if(custom.confirmation)custom.confirmation='';else custom.back();return}
 if(!custom.confirmation||event.key!=='Tab')return
 const buttons=Array.from(document.querySelectorAll<HTMLElement>('.custom-confirm-dialog button,.custom-confirm-dialog uni-button')).filter(button=>!button.hasAttribute('disabled'))
 const first=buttons[0],last=buttons[buttons.length-1];if(!first||!last)return
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
watch(()=>custom.confirmation,async(value,previous)=>{
 if(value&&!previous){previousOverflow=document.body.style.overflow;confirmationFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;document.body.style.overflow='hidden';dialogLocked=true;await nextTick();document.querySelector<HTMLElement>('.custom-confirm-dialog button,.custom-confirm-dialog uni-button')?.focus()}
 else if(!value&&previous){document.body.style.overflow=previousOverflow;dialogLocked=false;if(confirmationFocus?.isConnected)confirmationFocus.focus()}
})
onMounted(()=>document.addEventListener('keydown',dialogKey))
onUnmounted(()=>{document.removeEventListener('keydown',dialogKey);if(dialogLocked)document.body.style.overflow=previousOverflow})
// #endif
</script>
