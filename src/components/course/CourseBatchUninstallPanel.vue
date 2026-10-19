<template>
 <view class="batch-uninstall">
  <text class="section-title">导入课程逐册卸载</text>
  <text class="small muted block">一次处理一册；备份并清理本册专属记录，保留其他教材共享的词卡与全局奖励。已删除教材不再出现在教材库。</text>
  <text class="block">第 {{position}} / {{progress.total}} 册</text>
  <text class="small muted block">{{summary}}</text>
  <view class="course-list">
   <view v-for="id in progress.targets" :key="id" class="course-item batch-row" :data-batch-state="trimStateOf(id)">
    <text class="strong">{{titleOf(id)}}</text>
    <text class="small muted block">{{trimLabel(id)}}</text>
    <WPButton v-if="canTrim(id)" kind="quiet" :disabled="busy" @click="askTrim(id)">裁剪内容源</WPButton>
   </view>
  </view>
  <text v-for="item in progress.errors" :key="item.courseId" class="notice warning" role="alert">{{titleOf(item.courseId)}}：{{item.reason}}</text>
  <CourseDeleteAuditList :results="results" :titles="titles" :pending-cleanup="pendingCleanup" @retry="retryCleanup"/>
  <CourseTrimConfirmSheet :open="!!trimTarget" :title="titleOf(trimTarget||'')" :learned-words="trimLearned" @cancel="trimTarget=''" @confirm="confirmTrim"/>
  <view class="button-row">
   <WPButton :disabled="!current||busy" @click="step">{{busy?'卸载中…':'卸载当前册'}}</WPButton>
   <WPButton kind="secondary" :disabled="!current||busy" @click="runAll">全部卸载</WPButton>
   <WPButton kind="quiet" :disabled="busy" @click="retainLearned">备份可用教材词条</WPButton>
   <WPButton kind="quiet" @click="finish">结束本次</WPButton>
  </view>
  <text v-if="message" class="notice" role="status">{{message}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,onMounted,ref} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import CourseDeleteAuditList from './CourseDeleteAuditList.vue'
import CourseTrimConfirmSheet from './CourseTrimConfirmSheet.vue'
import {useCourseStore} from '../../stores/course'
import {courseRegistry,isUserDeleted} from '../../services/content/ContentRegistry'
import {pendingCleanupCount,retryCourseCleanup} from '../../services/content/StorageRepository'
import {readTrimAudit,trimCourseSource,type TrimResult} from '../../services/course/CourseSourceTrimmer'
import {applyBatchError,applyBatchResult,alignBatchProgress,openBatchProgress,batchSummary,clearBatchProgress,emptyBatchProgress,nextBatchTarget,readBatchProgress,writeBatchProgress,type BatchUninstallProgress} from '../../services/course/CourseBatchUninstall'
const course=useCourseStore()
const busy=ref(false),message=ref(''),titles=ref<Record<string,string>>({}),progress=ref<BatchUninstallProgress>(emptyBatchProgress([]))
const trimTarget=ref(''),trimLearned=ref(0),results=ref<TrimResult[]>([]),pendingCleanup=ref(0)
const installedIds=computed(()=>course.installed.map(pack=>pack.courseId))
const batchIds=computed(()=>installedIds.value.filter(id=>id!=='starter'))
const current=computed(()=>nextBatchTarget(progress.value,batchIds.value))
const position=computed(()=>Math.min(progress.value.total,progress.value.done.length+1))
const summary=computed(()=>batchSummary(progress.value))
function remember(ids:string[]){for(const id of ids)if(courseRegistry[id])titles.value[id]=titles.value[id]||courseRegistry[id].title}
function titleOf(id:string){return isUserDeleted(id)?'已删除教材':titles.value[id]||id}
function stateOf(id:string){return progress.value.done.includes(id)?'done':progress.value.errors.some(item=>item.courseId===id)?'skipped':id===current.value?'current':'pending'}
function stateLabel(id:string){const state=stateOf(id);return state==='done'?'已卸载':state==='skipped'?'已跳过（见下方原因）':state==='current'?'待卸载 · 当前册':'待卸载'}
function replacementFor(id:string){const others=installedIds.value.filter(item=>item!==id);return others.includes('starter')?'starter':others[0]||''}
function refresh(){progress.value=alignBatchProgress(progress.value,batchIds.value)}
function trimmed(id:string){return results.value.some(result=>result.courseId===id&&result.ok)}
/** 导入课程卸载后会从注册表移除；随包提供的册次同样移出注册表，裁剪仅负责历史残留。 */
function canTrim(id:string){return progress.value.done.includes(id)&&!courseRegistry[id]&&!trimmed(id)}
function trimStateOf(id:string){return trimmed(id)?'trimmed':canTrim(id)?'trimmable':stateOf(id)}
function trimLabel(id:string){
 if(trimmed(id))return '内容源已裁剪 · 不再显示'
 if(canTrim(id))return '已卸载 · 可裁剪内容源'
 if(progress.value.done.includes(id))return '已卸载 · 专属内容已移除'
 return stateLabel(id)
}
function askTrim(id:string){trimTarget.value=id;trimLearned.value=progress.value.retainedWordCount}
function refreshCleanup(){try{pendingCleanup.value=pendingCleanupCount()}catch{pendingCleanup.value=0}}
async function confirmTrim(){
 const id=trimTarget.value
 if(!id)return
 busy.value=true
 try{const result=await trimCourseSource(id);results.value=[...results.value.filter(item=>item.courseId!==id),result];message.value=result.message}
 catch(error){message.value=(error as Error).message}
 finally{busy.value=false;trimTarget.value='';refreshCleanup()}
}
async function retryCleanup(){
 try{pendingCleanup.value=await retryCourseCleanup();message.value=pendingCleanup.value?'媒体清理仍未完成，稍后再试。':'媒体清理完成。'}
 catch{message.value='媒体清理仍未完成，稍后再试。'}
}
async function step(){
 const id=current.value
 if(!id||busy.value)return
 const label=titleOf(id)
 busy.value=true
 let note=''
 try{
  const result=await course.uninstall(id,true,id===course.currentId?replacementFor(id)||undefined:undefined) as {retainedWordCount?:number}
  progress.value=applyBatchResult(progress.value,id,result?.retainedWordCount||0)
  delete titles.value[id]
  note=`教材已清理，${batchSummary(progress.value)}`
 }catch(error){
  progress.value=applyBatchError(progress.value,id,(error as Error).message)
  note=`《${label}》未卸载：${(error as Error).message}`
 }
 finally{
  busy.value=false
  remember(progress.value.targets)
  refresh()
  writeBatchProgress(progress.value)
  message.value=note
 }
}
async function runAll(){
 let guard=progress.value.targets.length+1
 while(current.value&&guard-->0)await step()
 // 仅备份剩余可用教材的已学词，不为已删除教材补回词条。
 retainLearned()
}
/** 把已学词条从仍可用的课程复制到保留词条，裁剪内容源后单词本与到期复习仍有词义。 */
function retainLearned(){
 const added=course.retainLearnedWords()
 message.value=added?`已备份可用教材的 ${added} 个已学词条。`:'可用教材词条已备份。'
 return added
}
function finish(){clearBatchProgress();progress.value=emptyBatchProgress(batchIds.value);remember(batchIds.value);message.value='已结束本次逐册卸载。'}
onMounted(()=>{
 const stored=readBatchProgress()
 const available=batchIds.value
 progress.value=openBatchProgress(stored,available)
 remember(stored?stored.targets.concat(available):available)
 results.value=readTrimAudit()
 refreshCleanup()
})
defineExpose({current,progress,step})
</script>
