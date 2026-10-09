<template>
 <view v-if="modal" class="word-sheet-scrim" aria-hidden="true" @click="$emit('close')"/>
 <view class="word-detail-panel" :class="{'word-detail-sheet':modal}" :role="modal?'dialog':'region'" :aria-modal="modal||undefined" :aria-label="word.word+' 单词详情'">
  <view class="word-detail-heading"><text class="section-title">单词详情</text><WPIconButton v-if="modal" class="word-detail-close" label="关闭单词详情" @click="$emit('close')">×</WPIconButton></view>
  <view class="detail-word-hero"><view class="detail-word-copy"><text class="detail-word">{{word.word}}</text><text class="ipa muted">{{word.ipa}}</text><text>{{word.pos}} · {{word.meaning}}</text></view><text class="detail-illustration" aria-hidden="true">{{wordIllustrations[word.id]||'📖'}}</text></view>
  <WPAudioButton :url="word.audio" @click="play" :label="'播放 '+word.word+' 的标准发音'" text="听标准发音"/>
  <view v-if="word.audioUK||word.audioUS" class="button-row"><WPAudioButton v-if="word.audioUK" :url="word.audioUK" @click="play(word.audioUK)" :label="'播放 '+word.word+' 的英式发音'" text="英式发音"/><WPAudioButton v-if="word.audioUS" :url="word.audioUS" @click="play(word.audioUS)" :label="'播放 '+word.word+' 的美式发音'" text="美式发音"/></view>
  <text v-if="word.phoneticUK||word.phoneticUS" class="small muted block">{{word.phoneticUK?'英 '+word.phoneticUK+' ':''}}{{word.phoneticUS?'美 '+word.phoneticUS:''}}</text>
  <text v-if="word.tags?.includes('offline-system-en-us')" class="small muted block">离线英语合成语音 · 美式</text>
  <text v-if="audioError" class="notice error" role="alert">{{audioError}}</text>
  <view class="detail-example"><text class="eyebrow">读一读</text><text>{{word.example||'例句正在补充，可以先记住单词和词义。'}}</text><text v-if="word.examples?.[0]?.zh" class="small muted">{{word.examples[0].zh}}</text></view>
  <WPMemoryMeter :card="card"/>
  <view class="detail-facts"><view><text class="small muted">下次复习</text><text>{{nextReviewLabel(card?.due)}}</text></view><view v-if="history.length"><text class="small muted">上次学习</text><text>{{formatLocalDate(history[history.length-1].at)}}</text></view></view>
  <text v-if="card" class="small muted block">复习日期 {{formatLocalDate(card.due)}}</text>
  <WPButton kind="quiet" :aria-expanded="sourcesOpen" @click="sourcesOpen=!sourcesOpen">教材来源 · {{memberships.length}} 个位置 {{sourcesOpen?'⌃':'⌄'}}</WPButton>
  <view v-if="sourcesOpen" class="detail-source"><view v-for="membership in memberships" :key="membership.courseId+membership.lessonId"><text class="small muted">{{membership.courseTitle}} · {{membership.unitTitle}}{{archiveStatus[membership.courseId]?' · 已归档':''}}</text><text class="block">{{membership.lessonTitle}}</text></view></view>
  <WPButton kind="quiet" :aria-expanded="phonicsOpen" @click="phonicsOpen=!phonicsOpen">拼读帮助 {{phonicsOpen?'⌃':'⌄'}}</WPButton>
  <WPPhonicsBreakdown v-if="phonicsOpen&&phonics" :phonics="phonics.data" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/>
  <view class="detail-mark-actions"><WPButton kind="secondary" :label="favorite?'取消我的重点':'标记为我的重点'" @click="$emit('favorite')">{{favorite?'★ 已加入重点':'☆ 我的重点'}}</WPButton><WPButton kind="secondary" @click="$emit('practice')">轻松练习这个单词</WPButton></view>
  <WPButton kind="quiet" :aria-expanded="moreOpen" @click="moreOpen=!moreOpen">更多记忆信息 {{moreOpen?'⌃':'⌄'}}</WPButton>
  <view v-if="moreOpen" class="detail-facts"><view><text class="small muted">复习次数</text><text>{{card?.reps||0}} 次</text></view><view><text class="small muted">回答准确率</text><text>{{history.length?Math.round(history.filter(a=>a.correct).length/history.length*100)+'%':'暂无记录'}}</text></view><WPButton kind="quiet" @click="$emit('later')">{{later?'已收至稍后 · 取消':'稍后再看'}}</WPButton><text class="small muted block">“稍后”只标记查看顺序，复习日期不变。</text></view>
 </view>
</template>
<script setup lang="ts">
import WPAudioButton from "../button/WPAudioButton.vue"
import WPIconButton from "../button/WPIconButton.vue"
import {courseMemberships,archiveStatus} from '../../services/content/ContentRegistry'

import {computed,ref,onMounted,onUnmounted,nextTick,watch} from 'vue'
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
const props=defineProps<{word:Word;card?:MemoryCard;history:Answer[];favorite:boolean;later:boolean;modal:boolean}>()
const emit=defineEmits<{close:[];favorite:[];later:[];practice:[]}>(),audioError=ref('')
const sourcesOpen=ref(false),moreOpen=ref(false),phonicsOpen=ref(false),controller=new PhonicsPlaybackController()
const {phonics,activeChunkIndex,playbackState}=controller
const lessonName=computed(()=>lessons.find(lesson=>lesson.id===props.word.lesson)?.name||props.word.lesson)
const memberships=computed(()=>[...new Map(courseMemberships(props.word.id).map(row=>[row.courseId+':'+row.unitId,row])).values()])
function play(url?:string){audioError.value='';void controller.play(url?{...props.word,audio:url}:props.word).catch(error=>audioError.value=(error as Error).message)}
watch(()=>props.word.id,()=>{audioError.value='';sourcesOpen.value=false;moreOpen.value=false;phonicsOpen.value=false;controller.setWord(props.word);stopAudio()},{immediate:true})
// #ifdef H5
let previousFocus:HTMLElement|null=null,previousOverflow=''
function focusDialog(){if(!props.modal)return;previousFocus=document.activeElement as HTMLElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';nextTick(()=>document.querySelector<HTMLElement>('.word-detail-sheet .word-detail-close')?.focus())}
function release(){document.body.style.overflow=previousOverflow;previousFocus?.focus();previousFocus=null}
function keyboard(event:KeyboardEvent){if(!props.modal)return;if(event.key==='Escape'){emit('close');return}if(event.key!=='Tab')return;const controls=Array.from(document.querySelectorAll<HTMLElement>('.word-detail-sheet [role="button"]'));const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
watch(()=>props.modal,value=>{if(value)focusDialog();else release()})
onMounted(()=>{focusDialog();window.addEventListener('keydown',keyboard)})
onUnmounted(()=>{if(props.modal)release();window.removeEventListener('keydown',keyboard)})
// #endif
onUnmounted(()=>{controller.dispose();stopAudio()})
</script>

