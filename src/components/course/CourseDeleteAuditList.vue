<template>
 <view class="delete-audit" role="status">
  <text class="section-title">删除审计</text>
  <text v-for="row in rows" :key="row.courseId" class="small block">{{row.title}}：{{row.summary}}</text>
  <text v-if="!rows.length" class="small muted block">暂无裁剪记录。</text>
  <view class="button-row">
   <WPButton kind="quiet" :disabled="!rows.length" @click="copy">复制 JSON</WPButton>
   <WPButton kind="quiet" :disabled="!rows.length" @click="save">导出 JSON</WPButton>
   <WPButton v-if="pendingCleanup" kind="secondary" @click="$emit('retry')">重试媒体清理</WPButton>
  </view>
  <text v-if="note" class="notice" role="status">{{note}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import {downloadLocalFile} from '../../services/course-import/FilePicker'
import type {TrimResult} from '../../services/course/CourseSourceTrimmer'
import {isUserDeleted} from '../../services/content/ContentRegistry'
const props=withDefaults(defineProps<{results?:TrimResult[];titles?:Record<string,string>;pendingCleanup?:number}>(),{results:()=>[],titles:()=>({}),pendingCleanup:0})
defineEmits<{retry:[]}>()
const note=ref('')
const labels:Record<string,string>={catalogEntry:'安装目录条目',directoryDescriptor:'目录描述符',archiveKey:'归档键',cleanupEntry:'待清理队列',installationKey:'安装态残留键',packKey:'课程包键',mediaDirectory:'媒体目录'}
const rows=computed(()=>props.results.map(result=>({courseId:result.courseId,title:isUserDeleted(result.courseId)?'已删除教材':props.titles[result.courseId]||result.courseId,
 summary:Object.entries(result.cleaned).map(([field,done])=>`${labels[field]}${done?'已清理':'无残留'}`).join(' · ')+` · 保留共享词 ${result.retainedWordCount} 词`})))
function payload(){return JSON.stringify({generatedAt:new Date().toISOString(),results:props.results},null,1)}
function copy(){uni.setClipboardData?.({data:payload()});note.value='审计 JSON 已复制。'}
async function save(){note.value=await downloadLocalFile('wordpal-course-trim-audit.json',payload())?'审计 JSON 已保存到本机应用文件区。':'此平台暂不能保存文件。'}
</script>
