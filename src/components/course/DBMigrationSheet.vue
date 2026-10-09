<template>
 <view v-if="open" class="sheet-backdrop" @click.self="$emit('close')">
  <view class="sheet-panel" role="dialog" aria-modal="true" aria-label="档案升级提示">
   <text class="section-title">档案升级未完成</text>
   <text class="muted block">当前学习档案还没有升级到新版本，暂无法切换教材。已学单词、复习排程和奖励都保留在本机，不会丢失。</text>
   <text v-if="message" class="notice" :class="{error:fault}" role="status">{{message}}</text>
   <view class="button-row">
    <WPButton :loading="busy" @click="retry">重试升级</WPButton>
    <WPButton kind="secondary" :disabled="busy" @click="snapshot">导出故障快照</WPButton>
    <WPButton kind="quiet" :disabled="busy" @click="$emit('close')">稍后再说</WPButton>
   </view>
   <text class="small muted block">故障快照只包含本机学习档案，不含录音、课程媒体或任何账号信息。</text>
  </view>
 </view>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import {useProfileStore} from '../../stores/profile'
defineProps<{open:boolean}>()
const emit=defineEmits<{close:[]}>()
const profile=useProfileStore(),busy=ref(false),message=ref(''),fault=ref(false)
async function retry(){
 busy.value=true;fault.value=false;message.value=''
 try{
  const ok=profile.retryMigration()
  message.value=ok?'✓ 档案已升级，现在可以切换教材。':'档案仍未升级成功。请确认设备有足够存储空间后再试一次。'
  fault.value=!ok
  if(ok)emit('close')
 }finally{busy.value=false}
}
async function snapshot(){
 busy.value=true;fault.value=false;message.value=''
 try{
  const result=await profile.faultSnapshot()
  message.value=result==='failed'?'故障快照导出失败，请确认设备存储后重试。':result==='file'?'故障快照已保存到本机应用文件区。':'故障快照已复制到剪贴板，请粘贴保存。'
  fault.value=result==='failed'
 }finally{busy.value=false}
}
</script>
