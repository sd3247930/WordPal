<template>
 <view class="course-gallery">
 <view class="page-heading course-gallery-heading"><view><text class="page-title">选择教材</text><text class="page-subtitle">点击已安装教材立即使用，学习进度分别保存。</text></view></view>
 <view v-if="course.selectionBlocked" class="notice error" role="alert"><text>档案升级未完成或处于只读状态，暂无法切换教材。</text><WPButton kind="secondary" @click="migrationOpen=true">查看处理方式</WPButton></view>
 <view class="gallery-tools" role="group" aria-label="教材选择功能">
  <WPActionTile class="gallery-tool" aria-label="返回学习" @click="returnToStudy">
   <view class="gallery-tool-top"><view class="gallery-tool-icon"><CourseToolIcon name="return"/></view><text class="gallery-tool-badge">继续</text></view>
   <text class="gallery-tool-title">返回学习</text><text class="gallery-tool-note">继续当前学习</text>
  </WPActionTile>
  <WPActionTile class="gallery-tool" :class="{active:tab==='installed'}" :selected="tab==='installed'" aria-label="已安装" aria-controls="gallery-course-results" @click="showInstalled">
   <view class="gallery-tool-top"><view class="gallery-tool-icon"><CourseToolIcon name="installed"/></view><text class="gallery-tool-badge">{{installedCount}} 本</text></view>
   <text class="gallery-tool-title">已安装</text><text class="gallery-tool-note">查看本机教材</text>
  </WPActionTile>
  <WPActionTile class="gallery-tool" :class="{active:tab==='discover'}" :selected="tab==='discover'" aria-label="查找教材" aria-controls="gallery-course-results" @click="showDiscover">
   <view class="gallery-tool-top"><view class="gallery-tool-icon"><CourseToolIcon name="search"/></view><text class="gallery-tool-badge">搜索</text></view>
   <text class="gallery-tool-title">查找教材</text><text class="gallery-tool-note">按名称或版本查找</text>
  </WPActionTile>
  <WPActionTile class="gallery-tool" :class="{active:batchOpen}" :selected="batchOpen" :disabled="!canManageBatch&&!batchOpen" aria-label="逐册卸载" :aria-expanded="batchOpen" aria-controls="gallery-batch-panel" aria-describedby="gallery-batch-note" @click="toggleBatch">
   <view class="gallery-tool-top"><view class="gallery-tool-icon"><CourseToolIcon name="uninstall"/></view><text class="gallery-tool-badge">{{batchOpen?'已展开':removableCount+' 本'}}</text></view>
   <text class="gallery-tool-title">逐册卸载</text><text id="gallery-batch-note" class="gallery-tool-note">{{batchOpen?'再次点击，收起管理':batchUnavailable||'保留记录，按册管理'}}</text>
  </WPActionTile>
 </view>
 <view v-if="tab==='installed'&&batchOpen" id="gallery-batch-panel"><CourseBatchUninstallPanel/></view>
 <view class="gallery-search" role="search" aria-label="教材搜索">
  <view class="gallery-search-symbol" aria-hidden="true"/>
  <input class="gallery-search-input" v-model="keyword" :focus="searchFocus" aria-label="搜索教材" placeholder="搜索教材名称、出版社或版本" :maxlength="100" confirm-type="search" @blur="searchFocus=false"/>
  <WPButton v-if="keyword" kind="quiet" label="清空教材搜索" @click="keyword=''">清空</WPButton>
 </view>
 <view class="gallery-results-heading"><text class="strong">{{tab==='installed'?'已安装教材':'教材目录'}}</text><text class="small muted" role="status" aria-live="polite">{{filtered.length}} 本{{keyword.trim()?'匹配教材':''}}</text></view>
 <view v-if="filtered.length>1" class="course-gallery-filters">
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
 <view id="gallery-course-results" role="region" :aria-label="tab==='installed'?'已安装教材列表':'教材查找结果'"><course-card v-for="pack in filtered" :key="pack.courseId" :pack="pack" :selected="selectedId===pack.courseId" :current="course.currentId===pack.courseId" :archived="!!archiveStatus[pack.courseId]" @select="select"/></view>
 <text v-if="!filtered.length" class="empty-small">没有匹配的教材，可调整筛选条件或到家长中心导入合法课程包。</text>
 <view v-if="selection" class="course-review-panel" role="status">
  <text class="strong">{{selection.title}}</text>
  <text class="small muted block">共 {{selection.wordCount}} 词 · {{selection.units.length}} 单元 · {{selection.units.reduce((n,u)=>n+u.lessons,0)}} 课 · {{selection.abilityLevels.join(' / ')}}</text>
  <text class="small muted block">{{selection.publisher||'WordPal 原创'}} · {{selection.edition||selection.editionYear||selection.contentVersion}}{{selection.startGrade?' · '+selection.startGrade+' 年级起点':''}}</text>
  <text v-if="resourceStatus[selection.courseId]" class="notice error">{{resourceStatus[selection.courseId]}}</text><view class="course-resource-coverage"><text class="small strong">离线资源覆盖（按词条）</text><text class="small muted block">词表 {{installed?'可用':'未安装'}} · 音频 {{selection.coverage.audio}}/{{selection.wordCount}} · 图片 {{selection.coverage.image}}/{{selection.wordCount}} · 例句 {{selection.coverage.example}}/{{selection.wordCount}}</text><text class="small muted block">清单媒体 {{(selection.coverage.bytes/1048576).toFixed(1)}} MB · {{installationLabel(selection.courseId)}}</text><text class="small muted block">{{canReinstall(selection.courseId)?'随应用提供的内容可停用、重新启用；不减少应用安装体积。':'删除后需要重新导入原课程包。'}} 缺少音频时使用文字练习。</text></view>
  <view class="course-unit-preview"><text class="small strong block">单元预览</text><picker :range="previewUnitOptions" range-key="title" :value="previewUnitIndex" aria-label="筛选预览 Unit" @change="previewUnitIndex=+($event as any).detail.value"><view class="course-picker small">{{previewUnitOptions[previewUnitIndex]?.title}} ⌄</view></picker><view v-for="unit in previewUnits" :key="unit.id" class="course-unit-row"><text class="small">{{unit.title}} · {{unit.lessons}} 课</text><WPButton kind="quiet" :disabled="!installed||!canSubmit" @click="startFromUnit(unit.id)">从这一单元开始</WPButton></view></view>
  <WPButton v-if="installed&&selection.courseId!=='starter'" kind="quiet" @click="removeOpen=true;replacementIndex=0">管理下载 · {{isBundledCourse(selection?.courseId||'')?'卸载':'删除'}}教材</WPButton>
 </view>
 <text v-if="message" class="notice" :class="{error:fault}" role="status">{{message}}</text>
 <view v-if="selection" class="course-gallery-confirm">
  <template v-if="installed"><WPButton :disabled="!canSubmit" @click="requestApply">确认并应用</WPButton><WPButton v-if="selection.courseId===course.currentId" kind="quiet" @click="navigate('learn')">继续当前课程</WPButton></template>
  <WPButton v-else-if="archiveStatus[selection.courseId]" :disabled="!canSubmit" @click="restore">恢复并使用</WPButton>
  <WPButton v-else-if="canReinstall(selection.courseId)" :disabled="!canSubmit||busy" @click="install">安装教材</WPButton>
  <text v-else class="small muted">请在家长中心重新导入原课程包，完成资源校验后即可安装。</text>
 </view>
 <CourseDeleteConfirmSheet :open="removeOpen" :title="selection?.title" :word-count="selection?.wordCount||0" :media-count="(selection?.coverage?.audio||0)+(selection?.coverage?.image||0)" :bundled="isBundledCourse(selection?.courseId||'')" :candidates="replacements" :needs-replacement="selection?.courseId===course.currentId" :learned-words="removeLearnedWords" :blocked-reason="removeBlockedReason" @cancel="removeOpen=false" @confirm="remove"/>
 <DBMigrationSheet :open="migrationOpen" @close="migrationOpen=false"/>
 </view>
</template>
<script setup lang="ts">
import {computed,nextTick,ref,watch} from 'vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPActionTile from '../../components/button/WPActionTile.vue'
import CourseToolIcon from '../../components/course/CourseToolIcon.vue'
import CourseCard from '../../components/course/CourseCard.vue'
import DBMigrationSheet from '../../components/course/DBMigrationSheet.vue'
import {useCourseStore} from '../../stores/course'
import {useLearningStore} from '../../stores/learning'
import {useProfileStore} from '../../stores/profile'
import {archiveStatus,courseRegistry,isCourseInstalled,resourceStatus} from '../../services/content/ContentRegistry'
import {courseDirectory,installationLabel,canReinstall} from '../../services/content/CourseDirectory'
import {isBundledCourse} from '../../services/content/ContentRegistry'
import CourseDeleteConfirmSheet from '../../components/course/CourseDeleteConfirmSheet.vue'
import CourseBatchUninstallPanel from '../../components/course/CourseBatchUninstallPanel.vue'
import {enableBundledCourse} from '../../services/content/StorageRepository'
import {courseReviewNote,courseSeriesKey,courseSeriesLabel} from '../../services/course/CourseSelection'
import {closeCourseGallery,navigate,consumeGalleryCourseId} from '../../services/navigation'
import type {CoursePack} from '../../../packages/content_schema/course'
const course=useCourseStore(),profile=useProfileStore(),tab=ref('installed'),selectedSeries=ref('all'),gradeIndex=ref(0),termIndex=ref(0),keyword=ref(''),searchFocus=ref(false)
const installedCount=computed(()=>courseDirectory.value.filter(pack=>isCourseInstalled(pack.courseId)||archiveStatus[pack.courseId]).length)
const removableCount=computed(()=>course.installed.filter(pack=>pack.courseId!=='starter').length)
const batchUnavailable=computed(()=>course.selectionBlocked?'档案恢复后可管理教材':!removableCount.value?'暂无可卸载教材':'')
const canManageBatch=computed(()=>!batchUnavailable.value)
const seriesOptions=computed(()=>[{id:'all',name:'全部教材'},...courseDirectory.value.filter((pack,index,all)=>all.findIndex(other=>courseSeriesKey(other as unknown as CoursePack)===courseSeriesKey(pack as unknown as CoursePack))===index).map(pack=>({id:courseSeriesKey(pack as unknown as CoursePack),name:courseSeriesLabel(pack as unknown as CoursePack)}))])
const seriesIndex=computed(()=>Math.max(0,seriesOptions.value.findIndex(item=>item.id===selectedSeries.value)))
const gradeOptions=['所有年级',...Array.from({length:9},(_,i)=>(i+1)+' 年级')],termOptions=['所有册次','上册','下册']
const advancedFilters=ref(false),publisherIndex=ref(0),editionIndex=ref(0),startIndex=ref(0),starts=['全部起点','1 年级起点','3 年级起点'],previewUnitIndex=ref(0)
const publishers=computed(()=>['全部出版社',...[...new Set(courseDirectory.value.map(p=>p.publisher||'WordPal 原创'))].sort()]),editions=computed(()=>['全部版本',...[...new Set(courseDirectory.value.map(p=>p.edition||String(p.editionYear||p.contentVersion)))].sort()])
const filtered=computed(()=>courseDirectory.value.filter(pack=>(tab.value==='discover'||isCourseInstalled(pack.courseId)||archiveStatus[pack.courseId])&&(!keyword.value.trim()||[pack.title,pack.publisher,pack.edition,pack.editionYear,pack.grade?pack.grade+'年级':'',pack.semester].filter(Boolean).join(' ').toLowerCase().includes(keyword.value.trim().toLowerCase()))&&(selectedSeries.value==='all'||courseSeriesKey(pack as unknown as CoursePack)===selectedSeries.value)&&(!gradeIndex.value||pack.grade===gradeIndex.value)&&(!termIndex.value||pack.semester===termOptions[termIndex.value])&&(!publisherIndex.value||(pack.publisher||'WordPal 原创')===publishers.value[publisherIndex.value])&&(!editionIndex.value||(pack.edition||String(pack.editionYear||pack.contentVersion))===editions.value[editionIndex.value])&&(!startIndex.value||pack.startGrade===(startIndex.value===1?1:3))))
const selectedId=ref(consumeGalleryCourseId()),removeOpen=ref(false),migrationOpen=ref(false),message=ref(''),fault=ref(false),busy=ref(false),replacementIndex=ref(0),batchOpen=ref(false)
if(selectedId.value&&!isCourseInstalled(selectedId.value)&&!archiveStatus[selectedId.value])tab.value='discover'
watch(filtered,()=>{if(!filtered.value.some(p=>p.courseId===selectedId.value))selectedId.value=(filtered.value.find(p=>p.courseId===course.currentId)||filtered.value[0])?.courseId||''},{immediate:true})
watch(selectedId,()=>{removeOpen.value=false;previewUnitIndex.value=0})
function select(id:string){selectedId.value=id;message.value='';fault.value=false;if(isCourseInstalled(id))applyNow()}
const selection=computed(()=>filtered.value.find(p=>p.courseId===selectedId.value)),selectedPack=computed(()=>courseRegistry[selectedId.value])
const installed=computed(()=>isCourseInstalled(selectedId.value)),canSubmit=computed(()=>!course.selectionBlocked)
const replacements=computed(()=>course.installed.filter(p=>p.courseId!==selectedId.value))
const previewUnitOptions=computed(()=>[{id:'',title:'全部 Unit'},...(selection.value?.units||[])]),previewUnits=computed(()=>(selection.value?.units||[]).filter(u=>!previewUnitIndex.value||u.id===previewUnitOptions.value[previewUnitIndex.value]?.id))
function close(){closeCourseGallery()}
function returnToStudy(){const pages=getCurrentPages();if(pages[pages.length-2]?.route==='pages/learn/index')close();else navigate('learn')}
function showInstalled(){tab.value='installed';batchOpen.value=false}
async function showDiscover(){tab.value='discover';batchOpen.value=false;searchFocus.value=false;await nextTick();searchFocus.value=true}
function toggleBatch(){if(!canManageBatch.value&&!batchOpen.value)return;tab.value='installed';batchOpen.value=!batchOpen.value}
function requireReview(){if(canSubmit.value)return true;message.value='学习档案暂时只读，请先恢复档案。';fault.value=true;return false}
function applyNow(){if(!requireReview())return;const result=course.applyCourseSelection(selectedId.value);message.value=result.message||'';fault.value=!result.ok;if(result.ok)close()}
function requestApply(){applyNow()}
function restore(){if(!requireReview())return;const result=course.restoreCourse(selectedId.value);if(result.ok){uni.showToast?.({title:'已恢复《'+selection.value?.title+'》',icon:'none'});requestApply()}else{message.value=result.message||'';fault.value=true}}
function install(){if(!requireReview())return;busy.value=true;try{enableBundledCourse(selectedId.value);message.value='教材已安装。需要时再设为当前课程。';fault.value=false}catch(error){message.value=(error as Error).message;fault.value=true}finally{busy.value=false}}
const removeLearnedWords=computed(()=>{const id=selection.value?.courseId;if(!id)return 0;const pack=courseRegistry[id];return pack?pack.vocabulary.filter(word=>!!profile.db.cards[word.id]).length:0})
const removeBlockedReason=computed(()=>{
 if(!selection.value)return ''
 if(selection.value.courseId==='starter')return '原创启蒙课程不可卸载，作为兜底保留。'
 if(profile.readOnly)return '档案处于只读状态，暂无法卸载。'
 if(profile.db.session&&!profile.db.session.completedAt&&(profile.db.session.courseId===selection.value.courseId||course.currentId===selection.value.courseId))return '当前有未完成的学习，请先完成或保存进度。'
 if(selection.value.courseId===course.currentId&&!replacements.value.length)return '至少需要保留一份已安装教材。请先安装其他教材。'
 return ''
})
async function remove(replacementId?:string){busy.value=true;const id=selectedId.value;try{const result=await course.uninstall(id,true,replacementId||replacements.value[replacementIndex.value]?.courseId);removeOpen.value=false;tab.value='discover';selectedId.value=id;message.value=result.pendingCleanup?'已删除教材，部分媒体待清理，重启后自动重试。':'已卸载或删除教材，学习记录与复习排程保留。';fault.value=false}catch(error){message.value=(error as Error).message;fault.value=true;removeOpen.value=false}finally{busy.value=false}}
function startFromUnit(unitId:string){
 if(!requireReview()||!installed.value||!selectedPack.value)return
 const result=course.applyCourseSelection(selectedId.value);if(!result.ok){message.value=result.message||'';fault.value=true;return}
 const lesson=selectedPack.value.units.find(u=>u.id===unitId)?.lessons[0]
 if(lesson&&!course.chooseLesson(lesson.id)){message.value='课节起点未保存，请重试。';fault.value=true;return}
 if(useLearningStore().start())navigate('learn');else message.value='今日新词已完成，可到单词本复习已学词。'
}
</script>
