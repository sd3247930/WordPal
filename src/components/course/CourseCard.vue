<template>
 <WPActionTile role="button" class="course-gallery-card" :class="{selected,current,archived}" :selected="selected" :aria-label="label" @click="$emit('select',pack.courseId)">
  <view class="course-gallery-copy">
   <view class="course-gallery-title">
    <text class="strong">{{pack.title}}</text>
    <text v-if="archived" class="course-archive-badge">已归档</text>
    <text v-if="current" class="course-current-mark">✓ 当前使用</text>
    <text class="small course-install-state">{{installationLabel(pack.courseId)}}</text>
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
import {installationLabel,type CourseDescriptor} from '../../services/content/CourseDirectory'
const props=withDefaults(defineProps<{pack:CoursePack|CourseDescriptor;selected?:boolean;current?:boolean;archived?:boolean}>(),{selected:false,current:false,archived:false})
defineEmits<{select:[id:string]}>()
const summary=computed(()=> 'wordCount' in props.pack?{words:props.pack.wordCount,units:props.pack.units.length,lessons:props.pack.units.reduce((n,u)=>n+u.lessons,0),levels:props.pack.abilityLevels.join(' / '),needsReview:props.pack.sources.some(s=>s.rightsStatus!=='redistribution-approved')||/待核对/.test(props.pack.title)}:courseSummary(props.pack)),editionLabel=computed(()=>courseEditionLabel(props.pack as CoursePack))
const label=computed(()=>`${props.pack.title}，${summary.value.words} 词，${summary.value.units} 单元${props.archived?'，已归档':''}${props.current?'，当前使用':''}`)
</script>
