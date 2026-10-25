<template>
 <view v-if="modal" class="word-sheet-scrim" aria-hidden="true" @click="$emit('close')"/>
 <view class="word-detail-panel" :class="{'word-detail-sheet':modal,'detail-stack':panelWidth<300||layout.fontScale>=1.6||word.word.length>24}" :role="modal?'dialog':'region'" :aria-modal="modal||undefined" :aria-label="word.word+' 单词详情'">
  <view class="word-detail-heading"><view class="detail-heading-title"><WordDetailArtwork name="heading"/><text class="section-title">单词详情</text></view><WPIconButton v-if="modal" class="word-detail-close" label="关闭单词详情" @click="$emit('close')">×</WPIconButton></view>
  <view class="detail-hero-card">
   <view class="detail-word-hero">
    <view class="detail-word-copy"><text class="detail-word" :class="{'detail-phrase':/\s/.test(word.word)}">{{word.word}}</text><text v-if="word.ipa" class="ipa muted">{{word.ipa}}</text><view class="detail-meaning"><text v-if="word.pos" class="small muted">{{word.pos}}</text><text>{{word.meaning}}</text></view><WPAudioButton class="detail-main-audio" :url="word.audio" :icon-src="wordDetailIcon('speaker')" @click="play()" :label="'播放 '+word.word+' 的标准发音'" text="听标准发音"/></view>
    <WordDetailPicture :key="imageKey" :word="word"/>
   </view>
   <text class="wordbook-source detail-primary-source">{{primarySource}}</text>
  </view>
  <view v-if="pronunciations.length" class="detail-pronunciations"><view v-for="item in pronunciations" :key="item.label"><WPAudioButton v-if="item.url" :url="item.url" :icon-src="wordDetailIcon('speaker')" @click="play(item.url)" :label="'播放 '+word.word+' 的'+item.label" :text="item.label"/><text v-else class="small muted">{{item.label}}</text><text v-if="item.ipa" class="ipa muted">{{item.ipa}}</text></view></view>
  <text v-if="word.tags?.includes('offline-system-en-us')" class="small muted block">离线英语合成语音 · 美式</text>
  <text v-if="audioError" class="notice error" role="alert">{{audioError}}</text>
  <view v-if="examples.length" class="detail-example"><view class="detail-section-label"><WordDetailArtwork name="example"/><text class="strong">例句</text></view><view v-for="(example,index) in examples" :key="index" class="detail-example-row"><text>{{example.en}}</text><text v-if="example.zh" class="small muted">{{example.zh}}</text></view></view>
  <view class="detail-memory-summary">
   <view class="detail-memory-item detail-familiarity"><WordDetailArtwork name="familiarity"/><view><text class="small muted block">熟知度</text><text class="strong" :data-level="familiarity.level">{{familiarity.label}}</text></view></view>
   <view class="detail-memory-item"><WordDetailArtwork name="nextReview"/><view><text class="small muted block">下次复习</text><text class="strong detail-next-review">{{nextReviewLabel(card?.due,new Date(now))}}</text></view></view>
   <WPButton class="detail-status-toggle" kind="quiet" :aria-expanded="familiarityOpen" @click="familiarityOpen=!familiarityOpen"><WordDetailArtwork name="help"/><text>为什么是这个状态</text><text aria-hidden="true">{{familiarityOpen?'⌃':'⌄'}}</text></WPButton>
   <text v-if="familiarityOpen" class="detail-status-reason small muted block" role="status">{{familiarity.reason}} 这不是考试评分。</text>
  </view>
  <view class="detail-action-grid">
   <WPButton class="detail-action detail-action-sources" kind="secondary" :aria-expanded="sourcesOpen" @click="sourcesOpen=!sourcesOpen"><WordDetailArtwork name="sources"/><view><text class="strong block">教材来源</text><text class="small muted block">{{memberships.length}} 个位置</text></view><text aria-hidden="true">{{sourcesOpen?'⌃':'›'}}</text></WPButton>
   <WPButton v-if="phonics?.data.chunks.length" class="detail-action detail-action-phonics" kind="secondary" :aria-expanded="phonicsOpen" @click="phonicsOpen=!phonicsOpen"><WordDetailArtwork name="phonics"/><text class="strong">拼读帮助</text><text aria-hidden="true">{{phonicsOpen?'⌃':'›'}}</text></WPButton>
   <WPButton class="detail-action detail-action-favorite" kind="secondary" :selected="favorite" :label="favorite?'取消我的重点':'标记为我的重点'" @click="$emit('favorite')"><WordDetailArtwork name="favorite"/><text class="strong">{{favorite?'已加入重点':'我的重点'}}</text><text aria-hidden="true">{{favorite?'✓':'›'}}</text></WPButton>
   <WPButton class="detail-action detail-action-practice" kind="secondary" @click="$emit('practice')"><WordDetailArtwork name="practice"/><text class="strong">{{practiceLabel||'练习这个单词'}}</text><text aria-hidden="true">›</text></WPButton>
  </view>
  <view v-if="sourcesOpen" class="detail-source detail-expanded"><text class="strong">教材来源</text><text v-if="!memberships.length" class="small muted">暂无可用教材位置，保留原词条记录。</text><view v-for="membership in memberships" :key="membership.position.id"><text class="wordbook-source">{{wordSourceLabel(membership.title,membership.position)}}{{archiveStatus[membership.position.courseId]?' · 已归档':''}}</text></view></view>
  <view v-if="phonicsOpen&&phonics" class="detail-expanded"><text class="strong">拼读帮助</text><WPPhonicsBreakdown :phonics="phonics.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/><text class="small muted">听标准发音时，可以跟着音块读一读。</text></view>
  <WPButton v-if="hasMemoryDetails" class="detail-more-toggle" kind="quiet" :aria-expanded="moreOpen" @click="moreOpen=!moreOpen"><WordDetailArtwork name="more"/><text>更多记忆信息</text><text aria-hidden="true">{{moreOpen?'⌃':'›'}}</text></WPButton>
  <view v-if="hasMemoryDetails&&moreOpen" class="detail-facts detail-expanded">
   <view v-if="lastLearning" class="detail-record-row"><WordDetailArtwork name="lastStudy"/><text class="small muted">上次学习</text><text>{{formatLocalDate(lastLearning)}}</text></view>
   <view v-if="card" class="detail-record-row"><WordDetailArtwork name="reviewDate"/><text class="small muted">复习日期</text><text>{{formatLocalDate(card.due)}}</text></view>
   <view v-if="card"><text class="small muted">复习次数</text><text>{{card.reps}} 次</text></view><view v-if="history.length"><text class="small muted">回答准确率</text><text>{{Math.round(history.filter(a=>a.correct).length/history.length*100)}}%</text></view>
   <WPButton kind="quiet" @click="$emit('later')">{{later?'已收至稍后 · 取消':'稍后再看'}}</WPButton><text class="small muted block">“稍后”只标记查看顺序，复习日期不变。</text>
  </view>
  <WPButton v-if="!hasMemoryDetails" class="detail-later" kind="quiet" @click="$emit('later')">稍后再看</WPButton>
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
import WPButton from '../wp-button/WPButton.vue'
import WordDetailArtwork from './WordDetailArtwork.vue'
import WordDetailPicture from './WordDetailPicture.vue'
import {detailExamples,detailPronunciations,wordDetailIcon} from '../../services/word-detail-presentation'
import {nextReviewLabel} from '../../services/study-presentation'
import {formatLocalDate} from '../../services/date'
import {stopAudio} from '../../services/audio'
import {PhonicsPlaybackController} from '../../services/audio/PhonicsPlaybackController'
import WPPhonicsBreakdown from '../phonics/WPPhonicsBreakdown.vue'
const props=defineProps<{word:Word;card?:MemoryCard;history:Answer[];favorite:boolean;later:boolean;modal:boolean;occurrence?:CourseOccurrence;practiceLabel?:string}>()
const emit=defineEmits<{close:[];favorite:[];later:[];practice:[]}>(),audioError=ref('')
const sourcesOpen=ref(false),moreOpen=ref(false),phonicsOpen=ref(false),controller=new PhonicsPlaybackController()
const now=ref(Date.now()),familiarityOpen=ref(false),familiarity=computed(()=>familiarityFor(props.word.id,props.card,props.history,now.value))
const panelWidth=ref(360),instance=getCurrentInstance()
const imageKey=computed(()=>[props.occurrence?.id,props.word.id,props.word.image].join(':'))
const examples=computed(()=>detailExamples(props.word)),pronunciations=computed(()=>detailPronunciations(props.word))
const hasMemoryDetails=computed(()=>!!props.card||props.history.length>0||props.later)
const lastLearning=computed(()=>props.history.map(row=>row.at).filter(at=>Number.isFinite(Date.parse(at))).sort((a,b)=>Date.parse(b)-Date.parse(a))[0])
let clock:ReturnType<typeof setInterval>|undefined,playRequest=0
onMounted(()=>{clock=setInterval(()=>now.value=Date.now(),30000)})
const primarySource=computed(()=>{const position=props.occurrence||memberships.value[0]?.position;return wordSourceLabel(position?courseRegistry[position.courseId]?.title||courseMemberships(props.word.id).find(row=>row.courseId===position.courseId)?.courseTitle||'原教材':'原教材',position)})
function measurePanel(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.word-detail-panel').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)panelWidth.value=rect.width}).exec()})}
watch(()=>[layout.width,layout.fontScale,props.modal],measurePanel);onMounted(measurePanel)
const {phonics,activeChunkIndex,playbackState}=controller
const memberships=computed(()=>[...new Set(courseMemberships(props.word.id).map(row=>row.courseId))].filter(isCourseReadable).sort((a,b)=>a.localeCompare(b,'en',{numeric:true})).flatMap(id=>occurrences(courseRegistry[id]).filter(position=>position.lexemeId===props.word.id).map(position=>({title:courseRegistry[id].title,position}))))
function play(url?:string){const request=++playRequest;audioError.value='';void controller.play(url?{...props.word,audio:url}:props.word).catch(error=>{if(request===playRequest)audioError.value=(error as Error).message})}
watch(()=>[props.occurrence?.id,props.word.id,props.word.image,props.word.audio].join(':'),()=>{playRequest++;now.value=Date.now();audioError.value='';sourcesOpen.value=false;moreOpen.value=false;phonicsOpen.value=false;familiarityOpen.value=false;controller.setWord(props.word);stopAudio();measurePanel()},{immediate:true})
// #ifdef H5
let previousFocus:HTMLElement|null=null,previousOverflow=''
function focusDialog(){if(!props.modal)return;previousFocus=document.activeElement as HTMLElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';nextTick(()=>document.querySelector<HTMLElement>('.word-detail-sheet .word-detail-close')?.focus())}
function release(){document.body.style.overflow=previousOverflow;previousFocus?.focus({preventScroll:true});previousFocus=null}
function keyboard(event:KeyboardEvent){if(!props.modal)return;if(event.key==='Escape'){emit('close');return}if(event.key!=='Tab')return;const controls=Array.from(document.querySelectorAll<HTMLElement>('.word-detail-sheet [role="button"]'));const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
watch(()=>props.modal,value=>{if(value)focusDialog();else release()})
onMounted(()=>{focusDialog();window.addEventListener('keydown',keyboard)})
onUnmounted(()=>{if(props.modal)release();window.removeEventListener('keydown',keyboard)})
// #endif
onUnmounted(()=>{playRequest++;clearInterval(clock);controller.dispose();stopAudio()})
</script>

