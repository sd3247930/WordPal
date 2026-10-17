<template>
 <view v-if="open" class="sheet-backdrop" @click.self="$emit('cancel')">
  <view class="sheet-panel" role="dialog" aria-modal="true" aria-label="裁剪内容源确认">
   <text class="section-title">裁剪《{{title}}》的内容源？</text>
   <text class="muted block">裁剪后该册将从教材库彻底消失，只能重新导入原课程包才能再用。已学词仍保留，可继续复习。</text>
   <text class="small muted block">保留：已学 {{learnedWords}} 词、复习排程、星标、灵石与宠物成长。</text>
   <view class="button-row">
    <WPButton kind="quiet" @click="$emit('cancel')">取消</WPButton>
    <WPButton kind="danger" @click="$emit('confirm')">确认裁剪内容源</WPButton>
   </view>
  </view>
 </view>
</template>
<script setup lang="ts">
import WPButton from '../wp-button/WPButton.vue'
withDefaults(defineProps<{open:boolean;title?:string;learnedWords?:number}>(),{title:'',learnedWords:0})
defineEmits<{cancel:[];confirm:[]}>()
</script>
