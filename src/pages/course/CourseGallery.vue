<template>
 <view class="course-gallery">
 <view class="page-heading course-gallery-heading"><view><text class="page-title">选择教材</text><text class="page-subtitle">安装教材，再选择当前课程。</text></view><WPButton kind="quiet" @click="close">返回学习</WPButton></view>
 <view v-if="course.selectionBlocked" class="notice error" role="alert"><text>档案升级未完成或处于只读状态，暂无法切换教材。</text><WPButton kind="secondary" @click="migrationOpen=true">查看处理方式</WPButton></view>
 <WPSegmentedButton :model-value="tab" :options="[{id:'installed',name:'已安装'},{id:'discover',name:'查找教材'}]" label="教材库范围" @update:model-value="tab=$event"/>
 <view class="course-gallery-filters">
  <picker :range="seriesOptions" range-key="name" :value="seriesIndex" aria-label="筛选教材系列" @change="selectedSeries=seriesOptions[+($event as any).detail.value].id;gradeIndex=0;termIndex=0"><view class="course-picker small">{{seriesOptions[seriesIndex].name}} ⌄</view></picker>
  <picker :range="gradeOptions" :value="gradeIndex" aria-label="筛选教材年级" @change="gradeIndex=+($event as any).detail.value"><view class="course-picker small">{{gradeOptions[gradeIndex]}} ⌄</view></picker>
  <picker :range="termOptions" :value="termIndex" aria-label="筛选教材册次" @change="termIndex=+($event as any).detail.value"><view class="course-picker small">{{termOptions[termIndex]}} ⌄</view></picker>
 </view>
 <WPButton kind="quiet" :aria-expanded="advancedFilters" @click="advancedFilters=!advancedFilters">出版社 / 版本 / 起点筛选 {{advancedFilters?'⌃':'⌄'}}</WPButton>
 <view v-if="advancedFilters" class="course-gallery-filters">
  <picker :range="publishers" :value="publisherIndex" aria-label="筛选教材出版社" @change="publisherIndex=+($event as any).detail.value"><view class="course-picker small">{{publishers[publisherIndex]}} ⌄</view></picker>
  <picker :range="editions" :value="editionIndex" aria-label="筛选教材版本" @change="editionIndex=+($event as any).detail.value"><view class="course-picker small">{{editions[editionIndex]}} ⌄</view></picker>
  <picker :range="starts" :value="startIndex" aria-label="筛选教材起点" @change="startIndex=+($event as any).detail.value"><view class="course-picker small">{{starts[startIndex]}} ⌄</view></picker>
 </view>
 <course-card v-for="pack in filtered" :key="pack.courseId" :pack="pack" :selected="selectedId===pack.courseId" :current="course.currentId===pack.courseId" :archived="!!archiveStatus[pack.courseId]" @select="select"/>
 <text v-if="!filtered.length" class="empty-small">没有匹配的教材，可调整筛选条件或到家长中心导入合法课程包。</text>
 <view v-if="selection" class="course-review-panel" role="status">
  <text class="strong">{{selection.title}}{{needsReview?' · 待核对':''}}</text>
  <text class="small muted block">共 {{selection.wordCount}} 词 · {{selection.units.length}} 单元 · {{selection.units.reduce((n,u)=>n+u.lessons,0)}} 课 · {{selection.abilityLevels.join(' / ')}}</text>
  <text class="small muted block">{{selection.publisher||'WordPal 原创'}} · {{selection.edition||selection.editionYear||selection.contentVersion}}{{selection.startGrade?' · '+selection.startGrade+' 年级起点':''}}</text>
  <text v-if="needsReview" class="notice">{{courseReviewNote(selectedPack)}}</text>
  <WPActionTile v-if="needsReview" class="course-check" :selected="confirmed" :aria-pressed="confirmed" @click="confirmed=!confirmed"><text>{{confirmed?'✓':'○'}}</text><text>我确认使用此册</text></WPActionTile>
  <text v-if="resourceStatus[selection.courseId]" class="notice error">{{resourceStatus[selection.courseId]}}</text><view class="course-resource-coverage"><text class="small strong">离线资源覆盖（按词条）</text><text class="small muted block">词表 {{installed?'可用':'未安装'}} · 音频 {{selection.coverage.audio}}/{{selection.wordCount}} · 图片 {{selection.coverage.image}}/{{selection.wordCount}} · 例句 {{selection.coverage.example}}/{{selection.wordCount}}</text><text class="small muted block">清单媒体 {{(selection.coverage.bytes/1048576).toFixed(1)}} MB · {{installationLabel(selection.courseId)}}</text><text class="small muted block">{{canReinstall(selection.courseId)?'随应用提供的内容可停用、重新启用；不减少应用安装体积。':'移除下载后需要重新导入原课程包。'}} 缺少音频时使用文字练习。</text></view>
  <view class="course-unit-preview"><text class="small strong block">单元预览</text><picker :range="previewUnitOptions" range-key="title" :value="previewUnitIndex" aria-label="筛选预览 Unit" @change="previewUnitIndex=+($event as any).detail.value"><view class="course-picker small">{{previewUnitOptions[previewUnitIndex]?.title}} ⌄</view></picker><view v-for="unit in previewUnits" :key="unit.id" class="course-unit-row"><text class="small">{{unit.title}} · {{unit.lessons}} 课</text><WPButton kind="quiet" :disabled="!installed||!canSubmit" @click="startFromUnit(unit.id)">从这一单元开始</WPButton></view></view>
  <WPButton v-if="installed&&selection.courseId!=='starter'" kind="quiet" @click="removeOpen=true;replacementIndex=0">管理下载 · 移除教材</WPButton>
 </view>
 <text v-if="message" class="notice" :class="{error:fault}" role="status">{{message}}</text>
 <view v-if="selection" class="course-gallery-confirm">
  <template v-if="installed"><WPButton :disabled="!canSubmit" @click="requestApply">确认并应用</WPButton><WPButton v-if="selection.courseId===course.currentId" kind="quiet" @click="navigate('learn')">继续当前课程</WPButton></template>
  <WPButton v-else-if="archiveStatus[selection.courseId]" :disabled="!canSubmit" @click="restore">恢复并使用</WPButton>
  <WPButton v-else-if="canReinstall(selection.courseId)" :disabled="!canSubmit||busy" @click="install">安装教材</WPButton>
  <text v-else class="small muted">请在家长中心重新导入原课程包，完成资源校验后即可安装。</text>
 </view>
 <view v-if="queueOpen" class="sheet-backdrop" @click.self="queueOpen=false"><view class="sheet-panel" role="dialog" aria-modal="true" aria-label="排队切换教材"><text class="section-title">当前学习进行中</text><text class="muted block">本轮结束后切换到《{{selection?.title}}》，当前输入和评分会保留。</text><view class="button-row"><WPButton @click="queueOpen=false;applyNow()">继续排队</WPButton><WPButton kind="quiet" @click="queueOpen=false">取消</WPButton></view></view></view>
 <view v-if="removeOpen" class="sheet-backdrop" @click.self="removeOpen=false"><view class="sheet-panel" role="dialog" aria-modal="true" aria-label="移除教材确认"><text class="section-title">移除《{{selection?.title}}》？</text><text class="muted block">仅移除本地教材包，保留历史学习记录、星标、课程进度与宠物奖励。</text><picker v-if="selection?.courseId===course.currentId" :range="replacements" range-key="title" :value="replacementIndex" aria-label="替代当前教材" @change="replacementIndex=+($event as any).detail.value"><view class="course-picker">新的当前课程：{{replacements[replacementIndex]?.title}} ⌄</view></picker><view class="button-row"><WPButton :disabled="busy" @click="remove">确认移除教材</WPButton><WPButton kind="quiet" @click="removeOpen=false">取消</WPButton></view></view></view>
 <DBMigrationSheet :open="migrationOpen" @close="migrationOpen=false"/>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPActionTile from '../../components/button/WPActionTile.vue'
import WPSegmentedButton from '../../components/button/WPSegmentedButton.vue'
import CourseCard from '../../components/course/CourseCard.vue'
import DBMigrationSheet from '../../components/course/DBMigrationSheet.vue'
import {useCourseStore} from '../../stores/course'
import {useLearningStore} from '../../stores/learning'
import {useProfileStore} from '../../stores/profile'
import {archiveStatus,courseRegistry,isCourseInstalled,resourceStatus} from '../../services/content/ContentRegistry'
import {courseDirectory,installationLabel,canReinstall} from '../../services/content/CourseDirectory'
import {enableBundledCourse} from '../../services/content/StorageRepository'
import {courseReviewNote,courseSeriesKey,courseSeriesLabel} from '../../services/course/CourseSelection'
import {closeCourseGallery,navigate,consumeGalleryCourseId} from '../../services/navigation'
import type {CoursePack} from '../../../packages/content_schema/course'
const course=useCourseStore(),profile=useProfileStore(),tab=ref('installed'),selectedSeries=ref('all'),gradeIndex=ref(0),termIndex=ref(0)
const seriesOptions=computed(()=>[{id:'all',name:'全部教材'},...courseDirectory.value.filter((pack,index,all)=>all.findIndex(other=>courseSeriesKey(other as unknown as CoursePack)===courseSeriesKey(pack as unknown as CoursePack))===index).map(pack=>({id:courseSeriesKey(pack as unknown as CoursePack),name:courseSeriesLabel(pack as unknown as CoursePack)}))])
const seriesIndex=computed(()=>Math.max(0,seriesOptions.value.findIndex(item=>item.id===selectedSeries.value)))
const gradeOptions=['所有年级',...Array.from({length:9},(_,i)=>(i+1)+' 年级')],termOptions=['所有册次','上册','下册']
const advancedFilters=ref(false),publisherIndex=ref(0),editionIndex=ref(0),startIndex=ref(0),starts=['全部起点','1 年级起点','3 年级起点'],previewUnitIndex=ref(0)
const publishers=computed(()=>['全部出版社',...[...new Set(courseDirectory.value.map(p=>p.publisher||'WordPal 原创'))].sort()]),editions=computed(()=>['全部版本',...[...new Set(courseDirectory.value.map(p=>p.edition||String(p.editionYear||p.contentVersion)))].sort()])
const filtered=computed(()=>courseDirectory.value.filter(pack=>(tab.value==='discover'||isCourseInstalled(pack.courseId)||archiveStatus[pack.courseId])&&(selectedSeries.value==='all'||courseSeriesKey(pack as unknown as CoursePack)===selectedSeries.value)&&(!gradeIndex.value||pack.grade===gradeIndex.value)&&(!termIndex.value||pack.semester===termOptions[termIndex.value])&&(!publisherIndex.value||(pack.publisher||'WordPal 原创')===publishers.value[publisherIndex.value])&&(!editionIndex.value||(pack.edition||String(pack.editionYear||pack.contentVersion))===editions.value[editionIndex.value])&&(!startIndex.value||pack.startGrade===(startIndex.value===1?1:3))))
const selectedId=ref(consumeGalleryCourseId()),confirmed=ref(false),queueOpen=ref(false),removeOpen=ref(false),migrationOpen=ref(false),message=ref(''),fault=ref(false),busy=ref(false),replacementIndex=ref(0)
if(selectedId.value&&!isCourseInstalled(selectedId.value)&&!archiveStatus[selectedId.value])tab.value='discover'
watch(filtered,()=>{if(!filtered.value.some(p=>p.courseId===selectedId.value))selectedId.value=(filtered.value.find(p=>p.courseId===course.currentId)||filtered.value[0])?.courseId||''},{immediate:true})
watch(selectedId,()=>{confirmed.value=false;removeOpen.value=false;previewUnitIndex.value=0})
function select(id:string){selectedId.value=id;message.value='';fault.value=false}
const selection=computed(()=>filtered.value.find(p=>p.courseId===selectedId.value)),selectedPack=computed(()=>courseRegistry[selectedId.value])
const installed=computed(()=>isCourseInstalled(selectedId.value)),needsReview=computed(()=>!!selection.value&&(selection.value.sources.some(s=>s.rightsStatus!=='redistribution-approved')||/待核对/.test([selection.value.title,selection.value.edition,selection.value.publisher].join(' '))))
const canSubmit=computed(()=>!needsReview.value||confirmed.value),sessionRunning=computed(()=>!!profile.db.session&&!profile.db.session.completedAt)
const replacements=computed(()=>course.installed.filter(p=>p.courseId!==selectedId.value))
const previewUnitOptions=computed(()=>[{id:'',title:'全部 Unit'},...(selection.value?.units||[])]),previewUnits=computed(()=>(selection.value?.units||[]).filter(u=>!previewUnitIndex.value||u.id===previewUnitOptions.value[previewUnitIndex.value]?.id))
function close(){closeCourseGallery()}
function requireReview(){if(canSubmit.value)return true;message.value='请先勾选"我确认使用此册"。';fault.value=true;return false}
function applyNow(){if(!requireReview())return;const result=course.applyCourseSelection(selectedId.value);message.value=result.message||'';fault.value=!result.ok;if(result.ok)close()}
function requestApply(){if(!requireReview())return;if(sessionRunning.value){queueOpen.value=true;return}applyNow()}
function restore(){if(!requireReview())return;const result=course.restoreCourse(selectedId.value);if(result.ok){uni.showToast?.({title:'已恢复《'+selection.value?.title+'》',icon:'none'});requestApply()}else{message.value=result.message||'';fault.value=true}}
function install(){if(!requireReview())return;busy.value=true;try{enableBundledCourse(selectedId.value);message.value='教材已安装。需要时再设为当前课程。';fault.value=false}catch(error){message.value=(error as Error).message;fault.value=true}finally{busy.value=false}}
async function remove(){busy.value=true;const id=selectedId.value;try{const result=await course.uninstall(id,true,replacements.value[replacementIndex.value]?.courseId);removeOpen.value=false;tab.value='discover';selectedId.value=id;message.value=result.pendingCleanup?'教材已移除，部分文件待清理，重启后自动重试。':'教材已移除，历史学习记录已保留。';fault.value=false}catch(error){message.value=(error as Error).message;fault.value=true;removeOpen.value=false}finally{busy.value=false}}
function startFromUnit(unitId:string){
 if(!requireReview()||!installed.value||!selectedPack.value)return
 if(sessionRunning.value){course.applyCourseSelection(selectedId.value);message.value='本轮结束后切换教材；完成后可选择单元。';return}
 const result=course.applyCourseSelection(selectedId.value);if(!result.ok){message.value=result.message||'';fault.value=true;return}
 const lesson=selectedPack.value.units.find(u=>u.id===unitId)?.lessons[0]
 if(lesson&&!course.chooseLesson(lesson.id)){message.value='课节起点未保存，请重试。';fault.value=true;return}
 if(useLearningStore().start())navigate('learn');else message.value='今日新词已完成，可到单词本复习已学词。'
}
</script>
