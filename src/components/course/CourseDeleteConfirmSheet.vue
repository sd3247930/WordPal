<template>
 <view v-if="open" class="sheet-backdrop" @click.self="$emit('cancel')">
  <view class="sheet-panel" role="dialog" aria-modal="true" :aria-label="actionLabel+'教材确认'">
   <text class="section-title">{{actionLabel}}《{{title}}》？</text>
   <text class="muted block">{{summary}}</text>

   <view v-if="blockedReason" class="notice warning" role="alert">⚠️ {{blockedReason}}</view>
   <template v-else>
    <view v-if="needsReplacement" class="course-replacement">
     <text class="small strong block">当前课程是《{{title}}》，请先选择替代教材：</text>
     <WPActionTile v-for="item in candidates" :key="item.courseId" role="button" class="course-check" :selected="replacementId===item.courseId" :aria-pressed="replacementId===item.courseId" @click="replacementId=item.courseId">
      <text aria-hidden="true">{{replacementId===item.courseId?'●':'○'}}</text><text>{{item.title}}</text>
     </WPActionTile>
     <text v-if="!candidates.length" class="notice warning">至少需要保留一份已安装教材。请先安装其他教材。</text>
    </view>

    <text class="small muted block">输入「{{actionLabel}}」以确认：</text>
    <input class="spelling-input" :value="typed" :aria-label="actionLabel+'确认文字'" :placeholder="actionLabel" @input="typed=($event as any).detail.value"/>
   </template>

   <view class="button-row">
    <WPButton kind="quiet" @click="$emit('cancel')">取消</WPButton>
    <WPButton kind="danger" :disabled="!canConfirm" @click="$emit('confirm', replacementId)">确认{{actionLabel}}</WPButton>
   </view>
  </view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import type {CoursePack} from '../../../packages/content_schema/course'
const props=withDefaults(defineProps<{
 open:boolean
 title?:string;wordCount?:number;mediaCount?:number
 bundled:boolean
 candidates?:CoursePack[]
 needsReplacement:boolean
 learnedWords:number
 blockedReason?:string
}>(),{candidates:()=>[],blockedReason:''})
const emit=defineEmits<{cancel:[];confirm:[replacementId:string]}>()
const typed=ref(''),replacementId=ref('')
// Bundled courses are uninstalled (re-installable); imported courses are真 deleted.
const actionLabel=computed(()=>props.bundled?'卸载':'删除')
const summary=computed(()=>{
 const words=props.wordCount||0,media=props.mediaCount||0
 return props.bundled
  ?`卸载教材包并清除本册章节、学习会话与练习进度（${words} 词、${media} 个媒体）。单词记忆与复习排程保留，已学 ${props.learnedWords} 词仍会参加到期复习。`
  :`删除本地教材媒体并清除本册章节、学习会话与练习进度（${words} 词、${media} 个媒体）。单词记忆与复习排程保留，已学 ${props.learnedWords} 词仍会参加到期复习。`
})
const canConfirm=computed(()=>!props.blockedReason&&typed.value.trim()===actionLabel.value&&(!props.needsReplacement||!!replacementId.value))
watch(()=>[props.open,props.title],()=>{typed.value='';replacementId.value=props.candidates[0]?.courseId||''})
watch(()=>props.candidates,list=>{if(!list.some(item=>item.courseId===replacementId.value))replacementId.value=list[0]?.courseId||''})
defineExpose({actionLabel})
</script>
