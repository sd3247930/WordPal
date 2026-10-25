<template><view class="course-tools-artwork" aria-hidden="true"><image v-if="!failed" :src="source" mode="aspectFit" @error="failed=true"/></view></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {courseToolsArtworkSrc,courseCoverSrc,type CourseToolsArtworkName} from '../../services/course-tools-artwork'
const props=defineProps<{name?:CourseToolsArtworkName;courseId?:string}>(),failed=ref(false),source=computed(()=>props.courseId?courseCoverSrc(props.courseId):courseToolsArtworkSrc(props.name||'courses'))
watch(source,()=>failed.value=false)
</script>
