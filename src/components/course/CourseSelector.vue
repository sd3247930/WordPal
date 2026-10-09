<template>
 <view class="course-selector">
  <text class="small muted">{{course.current.title}} · {{course.current.abilityLevels.join(' / ')}}</text>
  <view v-if="textbooks.length" class="course-filters">
   <picker :range="seriesOptions" range-key="name" :value="seriesIndex" aria-label="筛选教材系列与起始年级" @change="selectedSeries=seriesOptions[+($event as any).detail.value].id;gradeIndex=0;termIndex=0"><view class="course-picker small">{{seriesOptions[seriesIndex].name}} ⌄</view></picker>
   <picker :range="gradeOptions" :value="gradeIndex" aria-label="筛选教材年级" @change="gradeIndex=+($event as any).detail.value"><view class="course-picker small">{{gradeOptions[gradeIndex]}} ⌄</view></picker>
   <picker :range="termOptions" :value="termIndex" aria-label="筛选教材册次" @change="termIndex=+($event as any).detail.value"><view class="course-picker small">{{termOptions[termIndex]}} ⌄</view></picker>
  </view>
  <picker :range="filtered" range-key="title" :value="Math.max(0,index)" aria-label="选择学习课程" @change="choose"><view class="course-picker"><text>{{index>=0?course.current.title:'选择筛选结果中的课程（'+filtered.length+'）'}}</text><text aria-hidden="true">⌄</text></view></picker>
  <text v-if="!filtered.length" class="small muted block">没有匹配课程，请调整筛选条件。</text>
  <text v-if="course.current.route==='textbook'" class="small muted block">{{course.current.edition||course.current.editionYear}} · {{course.current.startGrade?course.current.startGrade+' 年级起点':'起始年级待核对'}} · {{course.current.grade}} 年级{{course.current.semester}} · 单元归属请与正在使用的课本核对</text>
  <picker v-if="course.current.route==='textbook'" :range="course.current.units" range-key="title" :value="unitIndex" aria-label="选择课程单元" @change="chooseUnit"><view class="course-picker small">{{course.current.units[unitIndex]?.title}} ⌄</view></picker>
  <picker :range="lessonChoices" range-key="name" :value="lessonIndex" aria-label="选择课节起点" @change="course.chooseLesson(lessonChoices[+($event as any).detail.value].id)"><view class="course-picker small"><text>{{course.lesson?.unit}} · {{course.lesson?.name}}</text><text aria-hidden="true">⌄</text></view></picker>
  <text class="small muted">能力起点 L{{course.recommendation.entryLevel}} · {{course.recommendation.meta.title}} · {{course.recommendation.currentMatches?'当前课程适合此起点':'可请家长选择匹配此起点的课程'}}</text>
  <text class="small muted block">{{course.recommendation.courses.length?'推荐课程：'+course.recommendation.courses.slice(0,3).map(c=>c.title).join('、'):'暂无匹配此起点的已安装课程，可继续当前课程。'}}</text>
  <text v-if="course.current.route==='textbook'" class="small muted block">L1–L5 是学习起点建议，不代表教材标准；可在家长设置调整。</text>
  <text v-if="error" class="notice error" role="alert">{{error}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useCourseStore} from '../../stores/course'
import {courseNeedsReview,courseSeriesKey as seriesKey,courseSeriesLabel} from '../../services/course/CourseSelection'
import {openCourseGallery} from '../../services/navigation'
import type {CoursePack} from '../../../packages/content_schema/course'
const course=useCourseStore(),selectedSeries=ref('all'),gradeIndex=ref(0),termIndex=ref(0),error=ref('')
const textbooks=computed(()=>course.installed.filter(c=>c.route==='textbook'))
const seriesOptions=computed(()=>[{id:'all',name:'所有课程与教材'},...textbooks.value.filter((c,i,all)=>all.findIndex(other=>seriesKey(other)===seriesKey(c))===i).map(c=>({id:seriesKey(c),name:courseSeriesLabel(c)}))])
const seriesIndex=computed(()=>Math.max(0,seriesOptions.value.findIndex(item=>item.id===selectedSeries.value)))
watch(seriesOptions,()=>{if(!seriesOptions.value.some(item=>item.id===selectedSeries.value))selectedSeries.value='all'},{flush:'sync'})
const gradeOptions=['所有年级','1 年级','2 年级','3 年级','4 年级','5 年级','6 年级'],termOptions=['所有册次','上册','下册']
const filtered=computed(()=>course.installed.filter(c=>(selectedSeries.value==='all'||seriesKey(c)===selectedSeries.value)&&(!gradeIndex.value||c.grade===gradeIndex.value)&&(!termIndex.value||c.semester===termOptions[termIndex.value])))
const index=computed(()=>filtered.value.findIndex(c=>c.courseId===course.currentId)),unitIndex=computed(()=>Math.max(0,course.current.units.findIndex(u=>u.id===course.lesson?.unitId)))
const lessonChoices=computed(()=>course.current.route==='textbook'?course.lessons.filter(l=>l.unitId===course.current.units[unitIndex.value]?.id):course.lessons)
const lessonIndex=computed(()=>Math.max(0,lessonChoices.value.findIndex(l=>l.id===course.lesson?.id)))
function choose(event:any){const id=filtered.value[+event.detail.value]?.courseId;if(!id)return;if(filtered.value[+event.detail.value]?.route==='textbook'&&courseNeedsReview(filtered.value[+event.detail.value])){openCourseGallery(id);return}const result=course.applyCourseSelection(id);error.value=result.ok?'':result.message||''}
function chooseUnit(event:any){const id=course.current.units[+event.detail.value]?.lessons[0]?.id;if(id)course.chooseLesson(id)}
</script>
