<template>
 <view v-if="modal" class="word-sheet-scrim" aria-hidden="true" @click="$emit('close')"/>
 <view class="word-detail-panel" :class="{'word-detail-sheet':modal}" :role="modal?'dialog':'region'" :aria-modal="modal||undefined" :aria-label="word.word+' 单词详情'">
  <view class="word-detail-heading"><text class="section-title">单词详情</text><WPIconButton v-if="modal" class="word-detail-close" label="关闭单词详情" @click="$emit('close')">×</WPIconButton></view>
  <view class="detail-word-hero"><view class="detail-word-copy"><text class="detail-word">{{word.word}}</text><text class="ipa muted">{{word.ipa}}</text><text>{{word.pos}} · {{word.meaning}}</text></view><text class="detail-illustration" aria-hidden="true">{{wordIllustrations[word.id]||'📖'}}</text></view>
  <WPAudioButton :url="word.audio" @click="play" :label="'播放 '+word.word+' 的标准发音'" text="听标准发音"/>
  <text v-if="audioError" class="notice error" role="alert">{{audioError}}</text>
  <view class="detail-example"><text class="eyebrow">读一读</text><text>{{word.example}}</text></view>
  <WPMemoryMeter :card="card"/>
  <view class="detail-facts"><view><text class="small muted">复习次数</text><text>{{card?.reps||0}} 次</text></view><view><text class="small muted">回答准确率</text><text>{{history.length?Math.round(history.filter(a=>a.correct).length/history.length*100)+'%':'暂无记录'}}</text></view><view><text class="small muted">下次复习</text><text>{{nextReviewLabel(card?.due)}}</text></view></view>
  <text v-if="card" class="small muted block">复习日期 {{formatLocalDate(card.due)}}</text>
  <view class="detail-source"><view v-for="membership in memberships" :key="membership.courseId+membership.lessonId"><text class="small muted">{{membership.courseTitle}} · {{membership.unitTitle}}{{archiveStatus[membership.courseId]?' · 已归档':''}}</text><text class="block">{{membership.lessonTitle}}</text></view></view>
  <view class="detail-mark-actions"><WPButton kind="secondary" :label="favorite?'取消我的重点':'标记为我的重点'" @click="$emit('favorite')">{{favorite?'★ 已加入重点':'☆ 我的重点'}}</WPButton><WPButton kind="quiet" @click="$emit('later')">{{later?'已收至稍后 · 取消':'稍后再看'}}</WPButton></view>
  <text class="small muted block">“稍后”只标记查看顺序，复习日期不变。</text>
  <WPButton kind="secondary" @click="$emit('practice')">轻松练习这个单词</WPButton>
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
import {playWord,stopAudio} from '../../services/audio'
const props=defineProps<{word:Word;card?:MemoryCard;history:Answer[];favorite:boolean;later:boolean;modal:boolean}>()
const emit=defineEmits<{close:[];favorite:[];later:[];practice:[]}>(),audioError=ref('')
const lessonName=computed(()=>lessons.find(lesson=>lesson.id===props.word.lesson)?.name||props.word.lesson)
const memberships=computed(()=>courseMemberships(props.word.id))
function play(){audioError.value='';playWord(props.word,message=>audioError.value=message)}
watch(()=>props.word.id,()=>{audioError.value='';stopAudio()})
// #ifdef H5
let previousFocus:HTMLElement|null=null,previousOverflow=''
function focusDialog(){if(!props.modal)return;previousFocus=document.activeElement as HTMLElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';nextTick(()=>document.querySelector<HTMLElement>('.word-detail-sheet .word-detail-close')?.focus())}
function release(){document.body.style.overflow=previousOverflow;previousFocus?.focus();previousFocus=null}
function keyboard(event:KeyboardEvent){if(!props.modal)return;if(event.key==='Escape'){emit('close');return}if(event.key!=='Tab')return;const controls=Array.from(document.querySelectorAll<HTMLElement>('.word-detail-sheet [role="button"]'));const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
watch(()=>props.modal,value=>{if(value)focusDialog();else release()})
onMounted(()=>{focusDialog();window.addEventListener('keydown',keyboard)})
onUnmounted(()=>{if(props.modal)release();window.removeEventListener('keydown',keyboard)})
// #endif
onUnmounted(stopAudio)
</script>

