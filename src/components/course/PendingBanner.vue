<template>
 <view v-if="title" class="pending-banner" role="status" aria-live="polite">
  <text class="strong">⏳ 本轮结束后将切换到《{{title}}》</text>
  <view class="button-row">
   <WPButton kind="secondary" @click="$emit('progress')">查看本轮进度</WPButton>
   <WPButton kind="quiet" @click="$emit('cancel')">取消排队</WPButton>
  </view>
 </view>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import type {CoursePack} from '../../../packages/content_schema/course'
const props=defineProps<{pending?:CoursePack}>()
defineEmits<{cancel:[];progress:[]}>()
const title=computed(()=>props.pending?.title||'')
</script>
