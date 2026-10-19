<template>
 <view class="course-card-browser">
  <view class="page-heading"><view><text class="page-title">课程单词卡</text><text class="page-subtitle">{{pack?.title||'教材暂不可用'}}</text></view><WPButton kind="quiet" @click="$emit('close')">返回我的单词本</WPButton></view>
  <view v-if="!result.available" class="empty-small"><text>当前教材尚未安装或已移除，暂不能浏览完整词卡。</text><WPButton @click="openCourseGallery(courseId)">前往教材库</WPButton><text class="small muted">已有记忆仍可在全局已学词中查看。</text></view>
  <template v-else>
   <text v-if="resourceStatus[courseId]" class="notice" role="status">{{resourceStatus[courseId]}}</text>
   <view v-if="pack" class="notice course-complete-summary" role="status"><text class="strong">全书完整学习 {{fullProgress.learned}} / {{fullProgress.total}} · {{fullProgress.percent}}%</text><text class="small muted block">{{fullProgress.position}} · 今日六环节 {{fullProgress.today}} / 6</text></view>
   <view class="course-card-counts"><text>词条 {{result.summary.totalOccurrences}}</text><text>已学 {{result.summary.learnedOccurrences}}</text><text>到期 {{result.summary.dueUniqueLexemes}} 词</text></view>
   <WPButton kind="quiet" :aria-expanded="summaryOpen" @click="summaryOpen=!summaryOpen">{{summaryOpen?'收起':'查看'}}范围熟知度</WPButton>
   <WPFamiliaritySummary v-if="summaryOpen" :summary="result.summary" :unit-title="unitOptions[unitIndex]?.title"/>
   <view class="course-card-controls">
    <picker selector-type="select" role="button" tabindex="0" :range="unitOptions" range-key="title" :value="unitIndex" aria-label="课程词卡单元" @change="unitIndex=Number(($event as any).detail.value)"><view class="course-picker">{{unitOptions[unitIndex]?.title}} ⌄</view></picker>
    <view class="wordbook-search"><text aria-hidden="true">⌕</text><input :value="keyword" placeholder="搜索英文、中文或单元" aria-label="搜索教材词卡" :maxlength="80" @input="keyword=($event as any).detail.value"/><WPButton v-if="keyword" kind="quiet" @click="keyword=''">清除</WPButton></view>
    <WPSegmentedButton :model-value="quickFilter" :options="quickOptions" label="教材词卡快捷筛选" @update:model-value="setQuick($event)"/>
    <WPButton kind="quiet" :aria-expanded="optionsOpen" @click="optionsOpen=!optionsOpen">筛选与排序 · {{filterOptions[filterIndex].title}} · {{sortOptions[sortIndex].title}}</WPButton>
    <view v-if="optionsOpen" class="course-card-options">
     <picker selector-type="select" role="button" tabindex="0" :range="filterOptions" range-key="title" :value="filterIndex" aria-label="教材词卡更多筛选" @change="filterIndex=Number(($event as any).detail.value)"><view class="course-picker">筛选：{{filterOptions[filterIndex].title}} ⌄</view></picker>
     <picker selector-type="select" role="button" tabindex="0" :range="sortOptions" range-key="title" :value="sortIndex" aria-label="教材词卡排序" @change="sortIndex=Number(($event as any).detail.value)"><view class="course-picker">排序：{{sortOptions[sortIndex].title}} ⌄</view></picker>
     <WPButton kind="quiet" :aria-pressed="merge" @click="merge=!merge">{{merge?'按独立单词合并':'显示重复教材出现'}}</WPButton>
     <WPButton kind="quiet" :aria-pressed="grid" @click="grid=!grid">{{grid?'卡片布局':'列表布局'}}</WPButton>
    </view>
   </view>
   <view class="course-card-actions"><text role="status">筛选结果 {{result.totalRows}} {{merge?'个独立词':'个词条'}}<text class="small muted"> · 教材出现位置 {{result.summary.totalOccurrences}}</text></text><WPButton kind="quiet" @click="clearFilters">清除筛选</WPButton><WPButton kind="secondary" @click="beginUnit">{{unitIndex?'开始本 Unit 学习':'继续当前课程'}}</WPButton><WPButton v-if="result.summary.dueUniqueLexemes" @click="beginDue">复习筛选到期词 · {{result.summary.dueUniqueLexemes}}</WPButton></view>
   <view class="course-card-workspace" :class="{'course-card-dual':dual}">
    <view class="course-card-list" :class="{'course-card-grid':grid}">
     <view v-if="!result.totalRows" class="empty-small"><text>{{pack?.units.length&&result.summary.totalOccurrences===0&&!keyword&&filterIndex===0&&!unitIndex?'本教材暂无可用单词':'该范围暂无符合条件的单词'}}</text><WPButton kind="quiet" @click="clearFilters">清除筛选</WPButton></view>
     <template v-for="(row,index) in result.pageRows" :key="row.occurrence.id">
      <view v-if="request.sort==='courseOrder'&&(index===0||result.pageRows[index-1].occurrence.unitId!==row.occurrence.unitId)" class="course-unit-heading"><text>{{row.occurrence.unitTitle}}</text><text class="small muted">{{result.rows.filter(item=>item.occurrence.unitId===row.occurrence.unitId).length}} {{merge?'词':'词条'}}</text></view>
      <view class="course-word-row" :class="{selected:selectedId===row.occurrence.id}" :data-occurrence="row.occurrence.id" :data-familiarity="row.familiarity.level">
       <WPActionTile toggle-highlight class="course-word-open" role="button" tabindex="0" :aria-label="row.word.word+'，'+row.word.meaning+'，'+row.familiarity.label+'，预览词卡'" :aria-pressed="selectedId===row.occurrence.id" @click="open(row)" @cancel="selectedId='';closeDetail()">
        <image v-if="row.word.image&&!failedImages.has(row.word.id)" class="course-word-thumb" :src="row.word.image" :alt="row.word.meaning" mode="aspectFit" :lazy-load="true" @error="failedImages.add(row.word.id)"/><text v-else class="course-word-placeholder" aria-hidden="true">{{wordIllustrations[row.word.id]||'📖'}}</text>
        <view class="course-word-copy"><text class="review-word">{{row.word.word}}</text><text class="small muted">{{row.word.ipa}}</text><text>{{row.word.meaning}}</text><text class="familiarity-label">{{row.familiarity.label}} · {{row.due?'今日到期':nextReviewLabel(profile.db.cards[row.word.id]?.due)}}</text><text v-if="request.sort!=='courseOrder'" class="small muted">{{row.occurrence.unitTitle}}</text></view>
       </WPActionTile>
       <view class="course-word-tools"><WPAudioButton :url="row.word.audio" :label="'播放 '+row.word.word+' 的教材发音'" text="听音" @click="play(row)"/><WPIconButton :label="(row.starred?'取消重点 ':'标记重点 ')+row.word.word" :aria-pressed="row.starred" @click="book.toggle('favorites',row.word.id)">{{row.starred?'★':'☆'}}</WPIconButton></view>
      </view>
     </template>
     <view class="wordbook-pagination"><WPButton kind="quiet" :disabled="result.pageIndex===0" @click="changePage(result.pageIndex-1)">上一页</WPButton><text class="small muted">{{result.pageIndex+1}} / {{result.pages}}</text><WPButton kind="quiet" :disabled="result.pageIndex+1>=result.pages" @click="changePage(result.pageIndex+1)">下一页</WPButton></view>
    </view>
    <WPWordDetail v-if="detail&&(dual||detailOpen)" :word="detail.word" :card="profile.db.cards[detail.word.id]" :history="book.historyByWord[detail.word.id]||[]" :favorite="detail.starred" :later="book.preferences.later.includes(detail.word.id)" :modal="!dual" :occurrence="detail.occurrence" practice-label="学习这个词" @close="closeDetail" @favorite="book.toggle('favorites',detail.word.id)" @later="book.toggle('later',detail.word.id)" @practice="beginWord"/>
    <view v-else-if="dual" class="wordbook-detail-placeholder"><text class="section-title">预览教材词卡</text><text>选一个单词，看看发音、自然拼读和熟知度依据。</text><text class="small muted">浏览不会消耗新词名额。</text></view>
   </view>
   <text v-if="audioError||book.error" class="notice error" role="alert">{{audioError||book.error}}</text>
  </template>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,onUnmounted,nextTick} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPSegmentedButton from '../button/WPSegmentedButton.vue'
import WPIconButton from '../button/WPIconButton.vue'
import WPAudioButton from '../button/WPAudioButton.vue'
import WPWordDetail from '../wp-word-detail/WPWordDetail.vue'
import WPFamiliaritySummary from './WPFamiliaritySummary.vue'
import {wordIllustrations} from '../wp-word-card/illustrations'
import {useWordbookStore} from '../../stores/wordbook'
import {useProfileStore} from '../../stores/profile'
import {useLearningStore} from '../../stores/learning'
import {useCourseStore} from '../../stores/course'
import {useReviewStore} from '../../stores/review'
import {courseRegistry,resourceStatus} from '../../services/content/ContentRegistry'
import {fullCourseWords,completedPrefix,STUDY_STEPS,selectDailyPlan} from '../../services/learning/DailyLearningPlan'
import {orderedCourseWords} from '../../services/learning/CourseStudySequence'
import {familiarityLevels,familiarityLabels,type FamiliarityLevel} from '../../services/content/FamiliaritySelector'
import type {CourseCardQuery,CourseCardRow} from '../../services/content/WordbookQueryBuilder'
import {windowLayout as layout} from '../../services/window'
import {PhonicsPlaybackController} from '../../services/audio/PhonicsPlaybackController'
import {stopAudio} from '../../services/audio'
import {navigate,openCourseGallery} from '../../services/navigation'
import {nextReviewLabel} from '../../services/study-presentation'
const props=defineProps<{courseId:string}>(),emit=defineEmits<{close:[]}>()
const book=useWordbookStore(),profile=useProfileStore(),learning=useLearningStore(),course=useCourseStore(),review=useReviewStore()
const pack=computed(()=>courseRegistry[props.courseId]),unitIndex=ref(0),keyword=ref(''),filterIndex=ref(0),sortIndex=ref(0),merge=ref(false),grid=ref(false),pageIndex=ref(0),selectedId=ref(''),detailOpen=ref(false),failedImages=ref(new Set<string>()),audioError=ref('')
const fullProgress=computed(()=>{const book=pack.value;if(!book)return {learned:0,total:0,percent:0,position:'教材暂不可用',today:0};const ids=orderedCourseWords(book),learned=Object.keys(fullCourseWords(profile.db,book)).length,prefix=completedPrefix(profile.db,book),unit=book.units.find(u=>u.lessons.some(l=>l.wordIds.includes(ids[prefix]||ids.at(-1)||''))),plan=selectDailyPlan(profile.db,book);return {learned,total:ids.length,percent:ids.length?Math.floor(learned/ids.length*100):0,position:prefix===ids.length?'全书学习完成':`${unit?.title||'当前教材'} · 下个位置 ${prefix+1}/${ids.length}`,today:plan?.flow?STUDY_STEPS.filter(step=>plan.flow!.completed[step].length===plan.wordIds.length).length:0}})
const summaryOpen=ref(false),optionsOpen=ref(false)
const dual=computed(()=>layout.width>=1000&&layout.fontScale<1.4)
const unitOptions=computed(()=>[{id:'',title:'全部单元'},...(pack.value?.units||[]).map((u,index)=>({id:u.id,title:u.title,order:u.order??index+1})).sort((a,b)=>a.order-b.order)])
const filterOptions=[{id:'all',title:'全部'},...familiarityLevels.map(id=>({id,title:familiarityLabels[id]})),{id:'due',title:'到期'},{id:'starred',title:'重点'},{id:'wrong',title:'错词'}]
const quickOptions=[{id:'all',name:'全部'},{id:'unseen',name:'未学'},{id:'due',name:'到期'}],quickFilter=computed(()=>['all','unseen','due'].includes(filterOptions[filterIndex.value].id)?filterOptions[filterIndex.value].id:'')
const sortOptions=[{id:'courseOrder' as const,title:'教材顺序'},{id:'alphabetical' as const,title:'字母 A–Z'},{id:'latestLearned' as const,title:'最近学习'},{id:'dueSoon' as const,title:'最近到期'},{id:'familiarity' as const,title:'熟知度从低到高'}]
const request=computed<CourseCardQuery>(()=>{const filter=filterOptions[filterIndex.value].id;return {courseId:props.courseId,unitId:unitOptions.value[unitIndex.value]?.id,keyword:keyword.value,familiarity:familiarityLevels.includes(filter as FamiliarityLevel)?filter as FamiliarityLevel:undefined,dueOnly:filter==='due',starredOnly:filter==='starred',wrongOnly:filter==='wrong',sort:sortOptions[sortIndex.value].id,mergeDuplicates:merge.value,pageIndex:pageIndex.value,pageSize:30}})
const result=computed(()=>book.courseCards(request.value)),detail=computed(()=>result.value.rows.find(row=>row.occurrence.id===selectedId.value))
watch([unitIndex,keyword,filterIndex,sortIndex,merge],()=>{pageIndex.value=0;selectedId.value='';detailOpen.value=false;stopAudio()})
watch([()=>props.courseId,()=>pack.value?.contentVersion],()=>{clearFilters();selectedId.value='';detailOpen.value=false})
watch(detail,value=>{if(!value)detailOpen.value=false})
function setQuick(id:string){filterIndex.value=filterOptions.findIndex(option=>option.id===id)}
function clearFilters(){unitIndex.value=0;keyword.value='';filterIndex.value=0;sortIndex.value=0;merge.value=false;pageIndex.value=0}
async function changePage(index:number){
 if(index<0||index>=result.value.pages||index===result.value.pageIndex)return
 pageIndex.value=index
 await nextTick()
 if(!result.value.pageRows.length)return
 const query=uni.createSelectorQuery()
 query.select('.course-card-browser .course-word-row').boundingClientRect()
 query.selectViewport().scrollOffset(()=>{})
 query.exec(positions=>{
  const row=positions[0] as {top:number}|null,viewport=positions[1] as {scrollTop:number}|null
  if(!row||!viewport||pageIndex.value!==index)return
  uni.pageScrollTo({scrollTop:Math.max(0,viewport.scrollTop+row.top-layout.safeTop-8),duration:0})
 })
}
function open(row:CourseCardRow){selectedId.value=row.occurrence.id;detailOpen.value=true}
function closeDetail(){detailOpen.value=false;stopAudio()}
const controller=new PhonicsPlaybackController()
function play(row:CourseCardRow){audioError.value='';void controller.play(row.word).catch(error=>audioError.value=(error as Error).message)}
function enter(requestIds?:string[],due=false){if(course.currentId!==props.courseId){uni.showToast?.({title:'先将这份教材设为当前课程，再开始学习。',icon:'none'});return}if(due&&learning.session&&!learning.session.completedAt)uni.showToast?.({title:'先继续当前学习，完成后再开始筛选范围的复习。',icon:'none'});if(due?learning.startDue(requestIds||[]):learning.start())navigate('learn')}
function beginWord(){if(!detail.value)return;if(course.currentId!==props.courseId)return;if(profile.db.cards[detail.value.word.id]){if(learning.start([detail.value.word.id]))navigate('learn')}else if(learning.startSelected(undefined,detail.value.word.id))navigate('learn')}
function beginUnit(){if(course.currentId!==props.courseId)return;if(learning.startSelected(unitOptions.value[unitIndex.value]?.id))navigate('learn')}
function beginDue(){enter([...new Set(result.value.rows.filter(row=>row.due).map(row=>row.word.id))],true)}
function handleBack(){if(detailOpen.value&&!dual.value){closeDetail();return true}emit('close');return true}
defineExpose({handleBack})
onUnmounted(()=>{controller.dispose();stopAudio()})
</script>
