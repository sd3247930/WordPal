<template>
 <CourseWordCardList v-if="cardsOpen" ref="cardBrowser" :course-id="course.currentId" @close="closeCards"/>
 <view v-else class="wordbook-overview">
 <view class="page-heading wordbook-heading"><WordbookArtwork name="heading"/><view><text class="page-title">我的单词本</text><text class="page-subtitle">看看记忆长到哪一步，再和单词见一面。</text></view></view>
 <template v-if="!priority&&!dataUnavailable">
 <view class="wordbook-course-filters">
  <WordbookScopeSwitch v-model="scope" v-model:learned-only="learnedOnly" :current-count="courseOverview.summary.uniqueLexemes" :all-count="allWords.stats.totalUniqueLexemes" :learned-count="learnedWords.stats.totalUniqueLexemes"/>
  <view v-if="scope==='current'" class="wordbook-textbook-row">
   <view class="wordbook-textbook-info"><WordbookArtwork name="course"/><view><text class="wordbook-textbook-title" :title="course.current.title">{{course.current.title}}</text><text class="small muted block">{{course.current.units.length}} 单元 · {{courseOverview.summary.totalOccurrences}} 词条 · {{courseOverview.summary.uniqueLexemes}} 个独立词</text></view></view>
   <picker :range="unitOptions" range-key="title" :value="unitIndex" aria-label="选择浏览单元" @change="unitIndex=Number(($event as any).detail.value)"><view class="course-picker">{{unitOptions[unitIndex]?.title}} <text aria-hidden="true">⌄</text></view></picker>
   <WPButton class="wordbook-change-course" kind="quiet" @click="openGallery">切换教材</WPButton>
  </view>
  <text v-else class="small muted block wordbook-scope-note">{{learnedOnly?'仅显示已有学习记录的单词，跨教材去重。':'汇总已安装教材与保留的已学词，包含未学词，跨教材去重。'}}复习从当前教材开始。</text>
  <WPButton class="wordbook-due-action" :disabled="!duePractice.rows.length" @click="beginDue"><WordbookArtwork name="due"/><text>{{duePractice.rows.length?(scope==='current'?'复习到期词 · ':'复习当前教材到期词 · ')+duePractice.rows.length:scope==='current'?'当前范围没有到期词':'当前教材没有到期词'}}</text><text aria-hidden="true">›</text></WPButton>
 </view>
 <WPCard v-if="scope==='current'&&!courseOverview.available"><text class="block">当前教材尚未安装或已移除，无法浏览完整词卡。</text><text class="small muted block">保留的已学词可在全部单词中查看。</text><WPButton @click="openGallery">前往教材库</WPButton></WPCard>
 <WordbookLearningOverview :summary="learningSummary" :context="overviewContext"/>
 <WordbookCategorySelector v-model="filter" :counts="categoryCounts"/>
 </template>
 <WPCard v-if="priority" class="wordbook-priority-context"><text class="section-title block">{{homeReviewPriorityLabels[priority]}}</text><text class="small muted block">{{priority==='due'?'当前教材：《'+course.current.title+'》 · ':''}}{{homeReviewPriorityNotes[priority]}}</text><WPButton kind="quiet" @click="priority=null">返回单词本</WPButton></WPCard>
 <view v-if="!dataUnavailable" class="wordbook-search"><text aria-hidden="true">⌕</text><input :value="query" placeholder="搜索英文、中文或单元" aria-label="搜索单词本" :maxlength="80" @input="search"/><WPActionTile v-if="query" role="button" tabindex="0" aria-label="清空单词搜索" @click="query=''">×</WPActionTile></view>
 <template v-if="!priority&&!dataUnavailable">
 <text v-if="filter==='due'||filter==='weak'" class="small muted block wordbook-filter-note">{{filter==='due'?'按记忆计划显示已到复习时间的单词。':'只显示你手动星标的重点词，与到期时间无关。'}}</text>
 <view v-if="filter==='weak'" class="wordbook-focus-legend"><text>★ 我的重点 {{result.stats.focusCount}}</text><text>⚡ 系统建议 {{result.suggestions.length}}（单独列出）</text></view>
 <view v-if="filter==='weak'&&result.suggestions.length" class="wordbook-suggestions"><text class="small muted">系统建议多练</text><WPButton v-for="word in result.suggestions.slice(0,5)" :key="word.id" kind="quiet" @click="openSuggestion(word.id)">{{word.word}}</WPButton></view>
 <text v-if="filter==='mistakes'" class="small muted block wordbook-filter-note">最近多次需要帮助的单词，连续两次正式答对后移出。</text>
 </template>
 <text v-if="dataUnavailable" class="notice error" role="status">词表暂不可用，请先在设置中恢复档案。</text>
 <view class="review-workspace wordbook-workspace" :class="{'wordbook-has-detail':!!detail}">
  <WPCard class="review-list"><view class="section-heading"><text>{{priority?homeReviewPriorityLabels[priority]:filters.find(item=>item.id===filter)?.name}}</text><text class="small muted" role="status">筛选结果 {{dataUnavailable?'—':list.length}} 个独立词</text></view>
   <view v-if="!dataUnavailable&&!list.length" class="empty-small"><WPNavIcon name="review" :size="36"/><text>{{query?'没有找到这个单词':priority?priority==='due'?'暂时没有到期单词':priority==='weak'?'暂时没有需要巩固的单词':'还没有已认识的单词':filter==='due'?'暂时没有到期单词':filter==='mistakes'?'这轮记忆很平稳':filter==='weak'?'还没有重点标记':'这里还没有单词'}}</text><text class="small muted">{{query?'试试英文、中文或单元名称。':priority?'浏览不会改变学习记录。':filter==='weak'?'打开单词详情，把想多练的词加入重点。':'可以切换到所有单词，轻松看看。'}}</text></view>
   <view class="wordbook-page-list" @touchstart="interaction.guard.start($event)" @touchmove="interaction.guard.move($event)" @touchend="interaction.guard.end($event)" @touchcancel="interaction.guard.cancel()">
    <view v-for="(item,index) in pageItems" :id="index===0?'wordbook-page-first':undefined" :key="item.key" class="review-row wordbook-row" :class="{selected:selected===item.key}" :data-word-id="item.word.id" :data-course-id="item.position?.courseId" :data-occurrence="item.key">
     <WordbookWordPicture :word="item.word"/>
     <view class="wordbook-row-copy"><text class="review-word">{{item.word.word}}<text v-if="book.preferences.favorites.includes(item.word.id)" class="wordbook-star" aria-label="我的重点">★</text></text><text class="wordbook-meaning">{{item.word.meaning}}</text><text class="wordbook-source">{{sourceLabel(item)}}</text><text v-if="!priority&&filter==='weak'||book.preferences.later.includes(item.word.id)" class="small muted block">{{!priority&&filter==='weak'?'我的重点':'稍后再看'}}</text></view>
     <view class="wordbook-row-memory"><text class="familiarity-label" :data-level="stateFor(item.word.id).level">{{stateFor(item.word.id).label}}</text><WPButton kind="quiet" class="wordbook-open" :selected="selected===item.key" :label="item.word.word+'，'+item.word.meaning+'，查看详情'" @click="open(item)">查看</WPButton></view>
    </view>
   </view>
   <view v-if="pages>1" class="wordbook-pagination"><WPButton kind="quiet" :disabled="pageIndex===0" @click="changePage(pageIndex-1)">上一页</WPButton><text class="small muted" role="status">{{pageIndex+1}} / {{pages}}</text><WPButton kind="quiet" :disabled="pageIndex+1>=pages" @click="changePage(pageIndex+1)">下一页</WPButton></view>
  </WPCard>
  <WPWordDetail v-if="detail && (layout.width>=600||sheetOpen)" :word="detail" :card="profile.db.cards[detail.id]" :history="book.historyByWord[detail.id]||[]" :favorite="book.preferences.favorites.includes(detail.id)" :later="book.preferences.later.includes(detail.id)" :modal="layout.width<600" :occurrence="detailItem?.position" @close="closeDetail" @favorite="book.toggle('favorites',detail.id)" @later="book.toggle('later',detail.id)" @practice="practice"/>
 </view>
 <view v-if="!priority&&!dataUnavailable" class="wordbook-more-actions"><WPButton class="wordbook-continue-link" kind="quiet" @click="begin">{{canContinueStudy?'继续当前学习':'继续当前课程'}}</WPButton><WPButton v-if="scope==='current'&&courseOverview.available" kind="quiet" class="course-card-entry" @click="openCards">查看教材全部单词 · {{courseOverview.summary.totalOccurrences}}</WPButton></view>
 <text v-if="book.error" class="notice error" role="alert">{{book.error}}</text>
 </view>
</template>
<script setup lang="ts">
import WordbookScopeSwitch from '../../components/wordbook/WordbookScopeSwitch.vue'
import WordbookCategorySelector from '../../components/wordbook/WordbookCategorySelector.vue'
import type {WordbookViewScope} from '../../services/wordbook-scope-icons'
import CourseWordCardList from '../../components/wordbook/CourseWordCardList.vue'
import WordbookArtwork from '../../components/wordbook/WordbookArtwork.vue'
import WordbookLearningOverview from '../../components/wordbook/WordbookLearningOverview.vue'
import WordbookWordPicture from '../../components/wordbook/WordbookWordPicture.vue'
import {summarizeWordbookLearning} from '../../services/content/WordbookLearningSummary'
import {familiarityFor} from '../../services/content/FamiliaritySelector'
import {useCourseStore} from '../../stores/course'
import {courseMemberships,courseRegistry} from '../../services/content/ContentRegistry'
import WPActionTile from "../../components/button/WPActionTile.vue"

import {computed,ref,watch,nextTick,onUnmounted} from 'vue'
import {useWordListInteraction} from '../../services/ui/useWordListInteraction'
import {wordSourceLabel} from '../../services/content/WordSourcePosition'
import {orderedUnits} from '../../../packages/content_schema/course-order'
import type {WordbookRow} from '../../services/content/WordbookQueryBuilder'
import {onBackPress,onShow,onHide} from '@dcloudio/uni-app'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPNavIcon from '../../components/wp-nav-icon/WPNavIcon.vue'
import WPWordDetail from '../../components/wp-word-detail/WPWordDetail.vue'
import {useReviewStore} from '../../stores/review'
import {useLearningStore} from '../../stores/learning'
import {useStudyPresentation} from '../../stores/study-presentation'
import {useProfileStore} from '../../stores/profile'
import {useWordbookStore,type WordbookFilter} from '../../stores/wordbook'
import {windowLayout as layout} from '../../services/window'
import {stopAudio} from '../../services/audio'
import {homeReviewPriorityLabels,homeReviewPriorityNotes} from '../../services/home-review-priority'
import {navigate,openCourseGallery,consumeHomePriority} from '../../services/navigation'
const review=useReviewStore(),learning=useLearningStore(),profile=useProfileStore(),book=useWordbookStore(),course=useCourseStore()
const study=useStudyPresentation(),interaction=useWordListInteraction()
const priority=ref(consumeHomePriority())
const cardsOpen=ref(false),courseOverview=computed(()=>book.courseCards({courseId:course.currentId}))
const cardBrowser=ref<InstanceType<typeof CourseWordCardList>>()
onBackPress(()=>cardsOpen.value?cardBrowser.value?.handleBack()||false:sheetOpen.value?(closeDetail(),true):false)
onShow(()=>review.refresh());onHide(stopAudio)
const dueTimer=setInterval(()=>review.refresh(),30000)
const canContinueStudy=computed(()=>!!learning.session&&(!learning.session.completedAt||study.revisiting))
const scope=ref<WordbookViewScope>('current'),learnedOnly=ref(false),unitIndex=ref(0),pageIndex=ref(0)
const unitOptions=computed(()=>[{id:'',title:'全部单元'},...orderedUnits(course.current).map(u=>({id:u.id,title:u.title}))])
watch(()=>course.currentId,()=>{unitIndex.value=0;pageIndex.value=0;closeDetail(false)})
watch(scope,()=>{unitIndex.value=0})
function openGallery(){course.applyPending();openCourseGallery()}
const filter=ref<WordbookFilter>('due'),query=ref(''),selected=ref(''),sheetOpen=ref(false)
const scopeRequest=computed(()=>({scope:scope.value==='current'?'currentCourse' as const:'allWords' as const,learnedOnly:scope.value==='all'&&learnedOnly.value,currentCourseId:course.currentId,installedCourseIds:course.installed.map(c=>c.courseId),unitId:scope.value==='current'?unitOptions.value[unitIndex.value]?.id:undefined}))
// Scope totals intentionally ignore text/category filtering; no persisted summary cache.
const scopeResult=computed(()=>book.query({...scopeRequest.value,keyword:'',category:'all'}))
// Independent study is course-bound. Global browsing must not advertise other courses' due IDs as startable.
const duePractice=computed(()=>book.query({...scopeRequest.value,scope:'currentCourse',keyword:'',category:'due'}))
const states=computed(()=>new Map(scopeResult.value.rows.map(word=>[word.id,familiarityFor(word.id,profile.db.cards[word.id],book.historyByWord[word.id]||[])])))
function stateFor(id:string){return states.value.get(id)||familiarityFor(id,profile.db.cards[id],book.historyByWord[id]||[])}
const learningSummary=computed(()=>summarizeWordbookLearning([...states.value.values()]))
const overviewContext=computed(()=>scope.value==='current'?course.current.title+(unitIndex.value?' · '+unitOptions.value[unitIndex.value]?.title:''):learnedOnly.value?'全部单词 · 只看已学':'全部单词')
const allWords=computed(()=>book.query({scope:'allWords',currentCourseId:course.currentId,installedCourseIds:course.installed.map(c=>c.courseId),category:'all',keyword:''}))
const learnedWords=computed(()=>book.query({scope:'allWords',learnedOnly:true,currentCourseId:course.currentId,installedCourseIds:course.installed.map(c=>c.courseId),category:'all',keyword:''}))
const result=computed(()=>priority.value?book.priority(priority.value,query.value):book.query({...scopeRequest.value,keyword:query.value,category:filter.value==='weak'?'focus':filter.value}))
const filters=[{id:'due',name:'到期复习'},{id:'weak',name:'重点复习'},{id:'mistakes',name:'错词本'},{id:'all',name:'所有单词'}]
const categoryCounts=computed(()=>({due:scopeResult.value.stats.dueUniqueLexemeCount,weak:scopeResult.value.stats.focusCount,mistakes:scopeResult.value.stats.mistakesCount,all:scopeResult.value.stats.totalUniqueLexemes}))
const dataUnavailable=computed(()=>profile.readOnly||!!profile.bootError)
const list=computed(()=>dataUnavailable.value?[]:result.value.rows)
const pages=computed(()=>Math.max(1,Math.ceil(list.value.length/30))),pageItems=computed(()=>dataUnavailable.value?[]:result.value.items.slice(pageIndex.value*30,pageIndex.value*30+30))
watch([filter,query,scope,unitIndex,learnedOnly,priority],()=>{pageIndex.value=0;closeDetail(false)})
watch(()=>result.value.items,rows=>{pageIndex.value=Math.min(pageIndex.value,pages.value-1);if(selected.value&&!rows.some(item=>item.key===selected.value))closeDetail(false)})
const suggestionItem=ref<WordbookRow|null>(null)
const detailItem=computed(()=>result.value.items.find(item=>item.key===selected.value)||suggestionItem.value?.key===selected.value&&suggestionItem.value||undefined)
const detail=computed(()=>{const item=detailItem.value;if(!item)return undefined;const membership=courseMemberships(item.word.id).find(row=>row.courseId===item.position?.courseId&&row.unitId===item.position?.unitId);return {...item.word,example:membership?.example||item.word.example}})
watch(()=>detailItem.value?.position?.courseId&&courseRegistry[detailItem.value.position.courseId]?.contentVersion,(value,previous)=>{if(previous&&value!==previous)closeDetail(false)})
function sourceLabel(item:WordbookRow){const position=item.position;return wordSourceLabel(position?courseRegistry[position.courseId]?.title||courseMemberships(item.word.id).find(row=>row.courseId===position.courseId)?.courseTitle||'原教材':'原教材',position)}
async function changePage(index:number){if(index<0||index>=pages.value||index===pageIndex.value)return;closeDetail(false);pageIndex.value=index;await interaction.first('#wordbook-page-first',layout.safeTop,()=>pageIndex.value===index)}

function open(item:WordbookRow){if(!interaction.guard.allow())return;if(selected.value===item.key&&(sheetOpen.value||layout.width>=600)){closeDetail();return}interaction.remember();selected.value=item.key;sheetOpen.value=true}
function openSuggestion(id:string){const item=book.query({...scopeRequest.value,keyword:query.value,category:'all'}).items.find(row=>row.word.id===id);if(item){suggestionItem.value=item;open(item)}}
function closeDetail(restore=true){const wasOpen=!!selected.value;selected.value='';sheetOpen.value=false;stopAudio();if(restore&&wasOpen)void interaction.restore()}
async function openCards(){interaction.remember();cardsOpen.value=true;await nextTick();uni.pageScrollTo({scrollTop:0,duration:0})}
function closeCards(){cardsOpen.value=false;void interaction.restore()}
function begin(){
 // Browsing scope never supplies words or applies a pending course to a saved study.
 if(canContinueStudy.value||learning.start())navigate('learn')
}
function beginDue(){if(!duePractice.value.rows.length)return;if(canContinueStudy.value){uni.showToast?.({title:'先继续当前学习，完成后再开始筛选范围的复习',icon:'none'});navigate('learn');return}if(learning.startDue(duePractice.value.rows.map(w=>w.id)))navigate('learn')}
function practice(){if(detail.value){learning.start([detail.value.id]);navigate('learn')}}
function search(event:any){query.value=event.detail?.value??event.target?.value??''}
onUnmounted(()=>{clearInterval(dueTimer);stopAudio()})
</script>


