<template>
 <view class="course-gallery">
 <view class="page-heading course-gallery-heading">
  <view><text class="page-title">选择教材</text><text class="page-subtitle">先选一册，再确认应用。</text></view>
  <WPButton kind="quiet" @click="close">返回学习</WPButton>
 </view>

 <view v-if="course.selectionBlocked" class="notice error" role="alert">
  <text class="block">⚠️ 档案升级未完成或处于只读状态，暂无法切换教材。</text>
  <WPButton kind="secondary" @click="migrationOpen=true">查看处理方式</WPButton>
 </view>

 <view v-if="textbooks.length" class="course-gallery-filters">
  <picker :range="seriesOptions" range-key="name" :value="seriesIndex" aria-label="筛选教材系列" @change="selectedSeries=seriesOptions[+($event as any).detail.value].id;gradeIndex=0;termIndex=0">
   <view class="course-picker small">{{seriesOptions[seriesIndex].name}} ⌄</view>
  </picker>
  <picker :range="gradeOptions" :value="gradeIndex" aria-label="筛选教材年级" @change="gradeIndex=+($event as any).detail.value">
   <view class="course-picker small">{{gradeOptions[gradeIndex]}} ⌄</view>
  </picker>
  <picker :range="termOptions" :value="termIndex" aria-label="筛选教材册次" @change="termIndex=+($event as any).detail.value">
   <view class="course-picker small">{{termOptions[termIndex]}} ⌄</view>
  </picker>
 </view>

 <course-card v-for="pack in filtered" :key="pack.courseId" :pack="pack" :selected="selectedId===pack.courseId" :current="course.currentId===pack.courseId" :archived="!!archiveStatus[pack.courseId]" @select="select"/>
 <text v-if="!textbooks.length" class="empty-small">本机还没有安装教材。可在家长中心的课程管理导入课程包，或继续使用原创课程。</text>
 <text v-else-if="!filtered.length" class="empty-small">没有匹配的教材，请调整筛选条件。</text>

 <view v-if="selection" class="course-review-panel" role="status">
  <text class="strong">{{selection.pack.title}}{{selection.summary.needsReview?' · 待核对':''}}</text>
  <text class="small muted block">共 {{selection.summary.words}} 词 · {{selection.summary.units}} 单元 · {{selection.summary.lessons}} 课 · {{selection.summary.levels||'未标注等级'}}</text>
  <text v-if="selection.summary.needsReview" class="notice">{{courseReviewNote(selection.pack)}}</text>
  <WPActionTile v-if="selection.summary.needsReview" class="course-check" :selected="confirmed" :aria-pressed="confirmed" @click="confirmed=!confirmed">
   <text aria-hidden="true">{{confirmed?'✓':'○'}}</text><text>我确认使用此册</text>
  </WPActionTile>
  <view v-if="selection.pack.units.length" class="course-unit-preview">
   <text class="small strong block">单元预览</text>
   <view v-for="unit in selection.pack.units" :key="unit.id" class="course-unit-row">
    <text class="small">{{unit.title}} · {{unit.lessons.length}} 课</text>
    <WPButton kind="quiet" :disabled="!canSubmit" @click="startFromUnit(unit.id)">从这一单元开始</WPButton>
   </view>
  </view>
 </view>

 <text v-if="message" class="notice" :class="{error:fault}" role="status">{{message}}</text>

 <view v-if="selection" class="course-gallery-confirm">
  <WPButton v-if="!isSelectedArchived" :disabled="!canSubmit" @click="requestApply">确认并应用</WPButton>
  <WPButton v-else :disabled="!canSubmit" @click="restoreAndApply">恢复并使用</WPButton>
 </view>

 <view v-if="queueOpen" class="sheet-backdrop" @click.self="queueOpen=false">
  <view class="sheet-panel" role="dialog" aria-modal="true" aria-label="排队切换教材">
   <text class="section-title">当前学习进行中</text>
   <text class="muted block">确认后将在本轮结束后切换到《{{selection?.pack.title}}》。当前的输入和评分会保留。</text>
   <view class="button-row">
    <WPButton @click="queue">继续排队</WPButton>
    <WPButton kind="quiet" @click="queueOpen=false">取消</WPButton>
   </view>
  </view>
 </view>

 <DBMigrationSheet :open="migrationOpen" @close="migrationOpen=false"/>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPActionTile from '../../components/button/WPActionTile.vue'
import CourseCard from '../../components/course/CourseCard.vue'
import DBMigrationSheet from '../../components/course/DBMigrationSheet.vue'
import {useCourseStore} from '../../stores/course'
import {useLearningStore} from '../../stores/learning'
import {useProfileStore} from '../../stores/profile'
import {archiveStatus} from '../../services/content/ContentRegistry'
import {courseSummary,courseReviewNote,courseSeriesKey,courseSeriesLabel} from '../../services/course/CourseSelection'
import {closeCourseGallery,navigate,consumeGalleryCourseId} from '../../services/navigation'
import type {CoursePack} from '../../../packages/content_schema/course'
const course=useCourseStore(),profile=useProfileStore()
const textbooks=computed<CoursePack[]>(()=>course.textbooks)
const selectedSeries=ref('all'),gradeIndex=ref(0),termIndex=ref(0)
const seriesOptions=computed(()=>[{id:'all',name:'全部教材'},...textbooks.value.filter((pack,index,all)=>all.findIndex(other=>courseSeriesKey(other)===courseSeriesKey(pack))===index).map(pack=>({id:courseSeriesKey(pack),name:courseSeriesLabel(pack)}))])
const seriesIndex=computed(()=>Math.max(0,seriesOptions.value.findIndex(item=>item.id===selectedSeries.value)))
watch(seriesOptions,()=>{if(!seriesOptions.value.some(item=>item.id===selectedSeries.value))selectedSeries.value='all'},{flush:'sync'})
const gradeOptions=['所有年级','1 年级','2 年级','3 年级','4 年级','5 年级','6 年级'],termOptions=['所有册次','上册','下册']
const filtered=computed(()=>textbooks.value.filter(pack=>(selectedSeries.value==='all'||courseSeriesKey(pack)===selectedSeries.value)&&(!gradeIndex.value||pack.grade===gradeIndex.value)&&(!termIndex.value||pack.semester===termOptions[termIndex.value])))
const selectedId=ref(consumeGalleryCourseId()),confirmed=ref(false),queueOpen=ref(false),migrationOpen=ref(false),message=ref(''),fault=ref(false)
watch([filtered,()=>course.currentId],()=>{
 if(!filtered.value.some(pack=>pack.courseId===selectedId.value))selectedId.value=(filtered.value.find(pack=>pack.courseId===course.currentId)||filtered.value[0])?.courseId||''
 if(!filtered.value.length)selectedId.value=''
},{immediate:true})
watch(selectedId,()=>{confirmed.value=false;message.value='';fault.value=false})
const selection=computed(()=>{const pack=filtered.value.find(item=>item.courseId===selectedId.value);return pack?{pack,summary:courseSummary(pack)}:undefined})
const sessionRunning=computed(()=>!!profile.db.session&&!profile.db.session.completedAt)
const isSelectedArchived=computed(()=>!!selectedId.value&&!!archiveStatus[selectedId.value])
/** The review checkbox is only required for "待核对" courses; verified courses need no extra gate. */
const canSubmit=computed(()=>!selection.value?.summary.needsReview||confirmed.value)
function confirmReview(){if(canSubmit.value)return true;message.value='请先勾选"我确认使用此册"。';fault.value=true;return false}
function select(id:string){selectedId.value=id}
function close(){closeCourseGallery()}
function applyNow(){
 const target=selection.value
 if(!target||!confirmReview())return
 const result=course.applyCourseSelection(target.pack.courseId)
 message.value=result.message||'';fault.value=!result.ok
 if(result.ok)close()
}
function requestApply(){
 const target=selection.value
 if(!target)return
 if(target.summary.needsReview&&!confirmed.value){message.value='请先勾选"我确认使用此册"。';fault.value=true;return}
 if(sessionRunning.value){queueOpen.value=true;return}
 applyNow()
}
function queue(){
 queueOpen.value=false
 const target=selection.value
 if(!target||!confirmReview())return
 const result=course.applyCourseSelection(target.pack.courseId)
 message.value=result.message||'';fault.value=!result.ok
 if(result.ok)close()
}
/**
 * Decision B: archived courses stay listed, and the primary action restores and applies in one step.
 */
function restoreAndApply(){
 const target=selection.value
 if(!target)return
 if(!canSubmit.value){message.value='请先勾选"我确认使用此册"。';fault.value=true;return}
 const restored=course.restoreCourse(target.pack.courseId)
 if(!restored.ok){message.value=restored.message||'';fault.value=true;return}
 if(sessionRunning.value){queueOpen.value=true;return}
 const result=course.choose(target.pack.courseId)
 if(!result.ok){message.value=result.message||'';fault.value=true;return}
 uni.showToast?.({title:`已恢复《${target.pack.title}》并切换为当前教材`,icon:'none'})
 close()
}
function startFromUnit(unitId:string){
 const target=selection.value
 if(!target||!confirmReview())return
 if(archiveStatus[target.pack.courseId]){
  const restored=course.restoreCourse(target.pack.courseId)
  if(!restored.ok){message.value=restored.message||'';fault.value=true;return}
 }
 if(sessionRunning.value){message.value='本轮结束后生效：已排队《'+target.pack.title+'》。';fault.value=false;course.applyCourseSelection(target.pack.courseId);return}
 const result=course.applyCourseSelection(target.pack.courseId)
 if(!result.ok){message.value=result.message||'';fault.value=true;return}
 const lesson=target.pack.units.find(unit=>unit.id===unitId)?.lessons[0]
 if(lesson&&!course.chooseLesson(lesson.id)){message.value='课节起点未保存，请重试。';fault.value=true;return}
 if(!useLearningStore().start()){message.value='今日新词已完成，可到单词本复习已学词。';fault.value=false;return}
 navigate('learn')
}
</script>
