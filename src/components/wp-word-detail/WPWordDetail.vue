<template>
 <view v-if="modal" class="word-sheet-scrim" aria-hidden="true" @click="$emit('close')"/>
 <view class="word-detail-panel" :class="{'word-detail-sheet':modal,'detail-stack':panelWidth<300||layout.fontScale>=1.6}" :role="modal?'dialog':'region'" :aria-modal="modal||undefined" :aria-label="word.word+' 单词详情'">
  <view class="word-detail-heading"><text class="section-title">单词详情</text><WPIconButton v-if="modal" class="word-detail-close" label="关闭单词详情" @click="$emit('close')">×</WPIconButton></view>
  <view class="detail-word-hero"><view class="detail-word-copy"><text class="detail-word" :class="{'detail-phrase':/\s/.test(word.word)}">{{word.word}}</text><text v-if="word.ipa" class="ipa muted">{{word.ipa}}</text></view><view class="detail-image-frame"><image v-if="word.image&&!imageFailed" :key="imageKey" class="detail-illustration detail-picture" :src="word.image" :alt="word.word+'：'+word.meaning" mode="aspectFit" @load="imageLoaded" @error="imageFailed=true"/><view v-else class="detail-image-placeholder" role="img" :aria-label="word.image?'配图暂时无法显示':'暂无配图'"><text aria-hidden="true">{{wordIllustrations[word.id]||'📖'}}</text><text class="small muted">{{word.image?'配图暂时无法显示':'暂无配图'}}</text><WPButton v-if="word.image" kind="quiet" @click="retryImage">重试配图</WPButton></view></view></view>
  <view class="detail-meaning"><text v-if="word.pos" class="small muted">{{word.pos}}</text><text>{{word.meaning}}</text></view>
  <text class="wordbook-source detail-primary-source">{{primarySource}}</text>
  <text v-if="lowResolution" class="small muted block">当前原图分辨率较低，保留原始配图。</text>
  <WPAudioButton :url="word.audio" @click="play" :label="'播放 '+word.word+' 的标准发音'" text="听标准发音"/>
  <view v-if="word.audioUK||word.audioUS" class="button-row"><WPAudioButton v-if="word.audioUK" :url="word.audioUK" @click="play(word.audioUK)" :label="'播放 '+word.word+' 的英式发音'" text="英式发音"/><WPAudioButton v-if="word.audioUS" :url="word.audioUS" @click="play(word.audioUS)" :label="'播放 '+word.word+' 的美式发音'" text="美式发音"/></view>
  <text v-if="word.phoneticUK||word.phoneticUS" class="small muted block">{{word.phoneticUK?'英 '+word.phoneticUK+' ':''}}{{word.phoneticUS?'美 '+word.phoneticUS:''}}</text>
  <text v-if="word.tags?.includes('offline-system-en-us')" class="small muted block">离线英语合成语音 · 美式</text>
  <text v-if="audioError" class="notice error" role="alert">{{audioError}}</text>
  <view class="detail-example"><text class="eyebrow">读一读</text><text>{{word.example||'例句正在补充，可以先记住单词和词义。'}}</text><text v-if="word.examples?.[0]?.zh" class="small muted">{{word.examples[0].zh}}</text></view>
  <view class="detail-familiarity"><text class="strong">熟知度：{{familiarity.label}}</text><WPButton kind="quiet" :aria-expanded="familiarityOpen" @click="familiarityOpen=!familiarityOpen">为什么是这个状态 {{familiarityOpen?'⌃':'⌄'}}</WPButton><text v-if="familiarityOpen" class="small muted block" role="status">{{familiarity.reason}} 这不是考试评分。</text></view>
  <view class="detail-facts"><view><text class="small muted">下次复习</text><text>{{nextReviewLabel(card?.due)}}</text></view><view v-if="history.length"><text class="small muted">上次学习</text><text>{{formatLocalDate(history[history.length-1].at)}}</text></view></view>
  <text v-if="card" class="small muted block">复习日期 {{formatLocalDate(card.due)}}</text>
  <WPButton kind="quiet" :aria-expanded="sourcesOpen" @click="sourcesOpen=!sourcesOpen">教材来源 · {{memberships.length}} 个位置 {{sourcesOpen?'⌃':'⌄'}}</WPButton>
  <view v-if="sourcesOpen" class="detail-source"><view v-for="membership in memberships" :key="membership.position.id"><text class="wordbook-source">{{wordSourceLabel(membership.title,membership.position)}}{{archiveStatus[membership.position.courseId]?' · 已归档':''}}</text></view></view>
  <WPButton kind="quiet" :aria-expanded="phonicsOpen" @click="phonicsOpen=!phonicsOpen">拼读帮助 {{phonicsOpen?'⌃':'⌄'}}</WPButton>
  <WPPhonicsBreakdown v-if="phonicsOpen&&phonics" :phonics="phonics.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/>
  <view class="detail-mark-actions"><WPButton kind="secondary" :label="favorite?'取消我的重点':'标记为我的重点'" @click="$emit('favorite')">{{favorite?'★ 已加入重点':'☆ 我的重点'}}</WPButton><WPButton kind="secondary" @click="$emit('practice')">{{practiceLabel||'轻松练习这个单词'}}</WPButton></view>
  <WPButton kind="quiet" :aria-expanded="moreOpen" @click="moreOpen=!moreOpen">更多记忆信息 {{moreOpen?'⌃':'⌄'}}</WPButton>
  <view v-if="moreOpen" class="detail-facts"><view><text class="small muted">复习次数</text><text>{{card?.reps||0}} 次</text></view><view><text class="small muted">回答准确率</text><text>{{history.length?Math.round(history.filter(a=>a.correct).length/history.length*100)+'%':'暂无记录'}}</text></view><WPButton kind="quiet" @click="$emit('later')">{{later?'已收至稍后 · 取消':'稍后再看'}}</WPButton><text class="small muted block">“稍后”只标记查看顺序，复习日期不变。</text></view>
 </view>
</template>
<script setup lang="ts">
import WPAudioButton from "../button/WPAudioButton.vue"
import WPIconButton from "../button/WPIconButton.vue"
import {courseMemberships,archiveStatus,courseRegistry,isCourseReadable} from '../../services/content/ContentRegistry'
import {familiarityFor} from '../../services/content/FamiliaritySelector'
import {occurrences,type CourseOccurrence} from '../../services/content/IdentityModel'
import {wordSourceLabel} from '../../services/content/WordSourcePosition'
import {windowLayout as layout} from '../../services/window'

import {computed,ref,onMounted,onUnmounted,nextTick,watch,getCurrentInstance} from 'vue'
import type {Word,MemoryCard,Answer} from '../../../packages/core_learning'
import {lessons} from '../../../packages/content_schema'
import {wordIllustrations} from '../wp-word-card/illustrations'
import WPButton from '../wp-button/WPButton.vue'
import WPMemoryMeter from '../wp-memory-meter/WPMemoryMeter.vue'
import {nextReviewLabel} from '../../services/study-presentation'
import {formatLocalDate} from '../../services/date'
import {stopAudio} from '../../services/audio'
import {PhonicsPlaybackController} from '../../services/audio/PhonicsPlaybackController'
import WPPhonicsBreakdown from '../phonics/WPPhonicsBreakdown.vue'
const props=defineProps<{word:Word;card?:MemoryCard;history:Answer[];favorite:boolean;later:boolean;modal:boolean;occurrence?:CourseOccurrence;practiceLabel?:string}>()
const emit=defineEmits<{close:[];favorite:[];later:[];practice:[]}>(),audioError=ref('')
const sourcesOpen=ref(false),moreOpen=ref(false),phonicsOpen=ref(false),controller=new PhonicsPlaybackController()
const familiarityOpen=ref(false),imageFailed=ref(false),familiarity=computed(()=>familiarityFor(props.word.id,props.card,props.history))
const panelWidth=ref(360),imageEpoch=ref(0),lowResolution=ref(false),instance=getCurrentInstance()
const imageKey=computed(()=>[props.occurrence?.id,props.word.id,props.word.image,imageEpoch.value].join(':'))
const primarySource=computed(()=>{const position=props.occurrence||memberships.value[0]?.position;return wordSourceLabel(position?courseRegistry[position.courseId]?.title||courseMemberships(props.word.id).find(row=>row.courseId===position.courseId)?.courseTitle||'原教材':'原教材',position)})
function measurePanel(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.word-detail-panel').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)panelWidth.value=rect.width}).exec()})}
watch(()=>[layout.width,layout.fontScale,props.modal],measurePanel);onMounted(measurePanel)
function retryImage(){imageEpoch.value++;imageFailed.value=false;lowResolution.value=false}
function imageLoaded(event:any){lowResolution.value=Math.max(Number(event.detail?.width)||0,Number(event.detail?.height)||0)>0&&Math.max(Number(event.detail?.width)||0,Number(event.detail?.height)||0)<256}
const {phonics,activeChunkIndex,playbackState}=controller
const lessonName=computed(()=>lessons.find(lesson=>lesson.id===props.word.lesson)?.name||props.word.lesson)
const memberships=computed(()=>[...new Set(courseMemberships(props.word.id).map(row=>row.courseId))].filter(isCourseReadable).sort((a,b)=>a.localeCompare(b,'en',{numeric:true})).flatMap(id=>occurrences(courseRegistry[id]).filter(position=>position.lexemeId===props.word.id).map(position=>({title:courseRegistry[id].title,position}))))
function play(url?:string){audioError.value='';void controller.play(url?{...props.word,audio:url}:props.word).catch(error=>audioError.value=(error as Error).message)}
watch(()=>[props.occurrence?.id,props.word.id,props.word.image,props.word.audio].join(':'),()=>{audioError.value='';sourcesOpen.value=false;moreOpen.value=false;phonicsOpen.value=false;familiarityOpen.value=false;imageFailed.value=false;imageEpoch.value++;lowResolution.value=false;controller.setWord(props.word);stopAudio();measurePanel()},{immediate:true})
// #ifdef H5
let previousFocus:HTMLElement|null=null,previousOverflow=''
function focusDialog(){if(!props.modal)return;previousFocus=document.activeElement as HTMLElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';nextTick(()=>document.querySelector<HTMLElement>('.word-detail-sheet .word-detail-close')?.focus())}
function release(){document.body.style.overflow=previousOverflow;previousFocus?.focus({preventScroll:true});previousFocus=null}
function keyboard(event:KeyboardEvent){if(!props.modal)return;if(event.key==='Escape'){emit('close');return}if(event.key!=='Tab')return;const controls=Array.from(document.querySelectorAll<HTMLElement>('.word-detail-sheet [role="button"]'));const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
watch(()=>props.modal,value=>{if(value)focusDialog();else release()})
onMounted(()=>{focusDialog();window.addEventListener('keydown',keyboard)})
onUnmounted(()=>{if(props.modal)release();window.removeEventListener('keydown',keyboard)})
// #endif
onUnmounted(()=>{controller.dispose();stopAudio()})
</script>

