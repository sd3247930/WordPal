<template>
 <WPActionTile role="button" class="course-gallery-card" :class="{selected,current,archived}" :selected="selected" :aria-label="label" @click="$emit('select',pack.courseId)">
  <view class="course-gallery-copy">
   <view class="course-gallery-title">
    <text class="strong">{{pack.title}}</text>
    <text v-if="summary.needsReview" class="course-review-badge">待核对</text>
    <text v-if="archived" class="course-archive-badge">已归档</text>
    <text v-if="current" class="course-current-mark">✓ 当前使用</text>
   </view>
   <text class="small muted block">{{editionLabel}}</text>
   <view class="course-gallery-meta">
    <text class="small muted">{{summary.words}} 词</text>
    <text class="small muted">{{summary.units}} 单元</text>
    <text class="small muted">{{summary.lessons}} 课</text>
    <text v-if="summary.levels" class="small muted">{{summary.levels}}</text>
   </view>
  </view>
 </WPActionTile>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import type {CoursePack} from '../../../packages/content_schema/course'
import {courseEditionLabel,courseSummary} from '../../services/course/CourseSelection'
const props=withDefaults(defineProps<{pack:CoursePack;selected?:boolean;current?:boolean;archived?:boolean}>(),{selected:false,current:false,archived:false})
defineEmits<{select:[id:string]}>()
const summary=computed(()=>courseSummary(props.pack)),editionLabel=computed(()=>courseEditionLabel(props.pack))
const label=computed(()=>`${props.pack.title}，${summary.value.words} 词，${summary.value.units} 单元${summary.value.needsReview?'，待核对':''}${props.archived?'，已归档':''}${props.current?'，当前使用':''}`)
</script>
