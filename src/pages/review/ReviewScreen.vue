<template>
 <CourseWordCardList v-if="cardsOpen" ref="cardBrowser" :course-id="course.currentId" @close="cardsOpen=false"/>
 <view v-else class="wordbook-overview">
 <view class="page-heading wordbook-heading"><view><text class="page-title">我的单词本</text><text class="page-subtitle">看看记忆长到哪一步，再和单词见一面。</text></view></view>
 <WPButton class="wordbook-continue-link" kind="quiet" @click="begin">{{canContinueStudy?'继续当前学习':'继续当前课程'}}</WPButton>
 <view class="wordbook-course-filters">
  <WordbookScopeSwitch v-model="scope" v-model:learned-only="learnedOnly" :current-count="courseOverview.summary.uniqueLexemes" :all-count="allWords.stats.totalUniqueLexemes" :learned-count="learnedWords.stats.totalUniqueLexemes"/>
  <template v-if="scope==='current'"><text class="small muted block">当前教材：《{{course.current.title}}》 · {{course.current.units.length}} 单元 · {{course.wordIds.length}} 词</text><WPButton kind="quiet" @click="openGallery">切换教材</WPButton></template>
  <text v-else class="small muted block wordbook-scope-note">{{learnedOnly?'仅显示已有学习记录的单词，跨教材去重。':'汇总已安装教材与保留的已学词，包含未学词，跨教材去重。'}}</text>
  <picker v-if="scope==='current'" :range="unitOptions" range-key="title" :value="unitIndex" aria-label="选择浏览单元" @change="unitIndex=Number(($event as any).detail.value)"><view class="course-picker">单元：{{unitOptions[unitIndex]?.title}}⌄</view></picker>
  <text class="small muted block">{{scope==='all'&&learnedOnly?'已学独立单词 '+result.stats.totalUniqueLexemes:'教材词条位置 '+result.stats.totalCourseOccurrences+' · 独立单词 '+result.stats.totalUniqueLexemes}} · 到期按独立单词计数</text>
 </view>
 <template v-if="scope==='current'"><template v-if="courseOverview.available"><WPButton v-if="courseOverview.summary.dueUniqueLexemes" class="course-overview-due" @click="beginOverviewDue">复习当前教材到期词 · {{courseOverview.summary.dueUniqueLexemes}}</WPButton><WPFamiliaritySummary :summary="courseOverview.summary" :course-title="course.current.title"/><WPButton class="course-card-entry" @click="cardsOpen=true">查看教材全部单词 · {{courseOverview.summary.totalOccurrences}}</WPButton></template><WPCard v-else><text class="block">当前教材尚未安装或已移除，无法浏览完整词卡。</text><text class="small muted block">保留的已学词可在全部单词中查看。</text><WPButton @click="openGallery">前往教材库</WPButton></WPCard></template>
 <view class="wordbook-stats" aria-label="单词本统计"><view v-for="item in filters" :key="item.id"><text>{{item.count}}</text><text class="small muted">{{item.short}}</text></view></view>
 <view class="wordbook-search"><text aria-hidden="true">⌕</text><input :value="query" placeholder="搜索英文、中文或单元" aria-label="搜索单词本" :maxlength="80" @input="search"/><WPActionTile v-if="query" role="button" tabindex="0" aria-label="清空单词搜索" @click="query=''">×</WPActionTile></view>
 <view class="wordbook-review-action"><WPButton v-if="result.stats.dueUniqueLexemeCount" @click="beginDue">开始到期复习 · {{result.stats.dueUniqueLexemeCount}}</WPButton><view v-else class="review-clear"><text class="small muted">✓ 当前范围没有到期复习</text><WPButton kind="quiet" @click="selectFilter('all')">浏览全部单词</WPButton></view></view>
 <WordbookCategorySelector v-model="filter"/>
 <text v-if="filter==='due'||filter==='weak'" class="small muted block wordbook-filter-note">{{filter==='due'?'按记忆计划显示已到复习时间的单词。':'只显示你手动星标的重点词，与到期时间无关。'}}</text>
 <view v-if="filter==='weak'" class="wordbook-focus-legend"><text>★ 我的重点 {{result.stats.focusCount}}</text><text>⚡ 系统建议 {{result.suggestions.length}}（单独列出）</text></view>
 <view v-if="filter==='weak'&&result.suggestions.length" class="wordbook-suggestions"><text class="small muted">系统建议多练</text><WPButton v-for="word in result.suggestions.slice(0,5)" :key="word.id" kind="quiet" @click="open(word.id)" @cancel="selected='';sheetOpen=false">{{word.word}}</WPButton></view>
 <text v-if="filter==='mistakes'" class="small muted block wordbook-filter-note">最近多次需要帮助的单词，连续两次正式答对后移出。</text>
 <view class="review-workspace wordbook-workspace">
  <WPCard class="review-list"><view class="section-heading"><text>{{filters.find(item=>item.id===filter)?.name}}</text><text class="small muted">{{list.length}} 个独立词 · 预览</text></view>
   <view v-if="!list.length" class="empty-small"><WPNavIcon name="review" :size="36"/><text>{{query?'没有找到这个单词':filter==='due'?'暂时没有到期单词':filter==='mistakes'?'这轮记忆很平稳':filter==='weak'?'还没有重点标记':'这里还没有单词'}}</text><text class="small muted">{{query?'试试英文、中文或单元名称。':filter==='weak'?'打开单词详情，把想多练的词加入重点。':'可以切换到所有单词，轻松看看。'}}</text></view>
   <WPActionTile role="button" tabindex="0" v-for="word in pageWords" :key="word.id" toggle-highlight class="review-row wordbook-row" :class="{selected:selected===word.id}" :aria-label="word.word+'，'+word.meaning+'，查看详情'" :aria-pressed="selected===word.id" @click="open(word.id)" @cancel="selected='';sheetOpen=false" @longpress="open(word.id)" @touchstart="touchStart" @touchend="touchEnd($event,word.id)"><view class="wordbook-row-copy"><text class="review-word">{{word.word}}<text v-if="book.preferences.favorites.includes(word.id)" class="wordbook-star" aria-label="我的重点">★</text></text><text class="small">{{word.meaning}}</text><text class="small muted block">{{result.positionsById.get(word.id)?.[0]?.unitTitle||word.unit}}{{filter==='weak'?' · 我的重点':book.preferences.later.includes(word.id)?' · 稍后再看':''}}</text></view><view class="wordbook-row-memory"><text class="familiarity-label">{{familiarityFor(word.id,profile.db.cards[word.id],book.historyByWord[word.id]||[]).label}}</text><text class="small muted">{{nextReviewLabel(profile.db.cards[word.id]?.due)}}</text></view></WPActionTile>
  <view v-if="pages>1" class="wordbook-pagination"><WPButton kind="quiet" :disabled="pageIndex===0" @click="pageIndex--">上一页</WPButton><text class="small muted">{{pageIndex+1}} / {{pages}}</text><WPButton kind="quiet" :disabled="pageIndex+1>=pages" @click="pageIndex++">下一页</WPButton></view>
  </WPCard>
  <WPWordDetail v-if="detail && (layout.width>=600||sheetOpen)" :word="detail" :card="profile.db.cards[detail.id]" :history="book.historyByWord[detail.id]||[]" :favorite="book.preferences.favorites.includes(detail.id)" :later="book.preferences.later.includes(detail.id)" :modal="layout.width<600" @close="closeDetail" @favorite="book.toggle('favorites',detail.id)" @later="book.toggle('later',detail.id)" @practice="practice"/>
  <view v-else-if="layout.width>=600" class="wordbook-detail-placeholder"><WPNavIcon name="review" :size="40"/><text class="section-title">打开一个单词</text><text class="muted">查看发音、例句和记忆状态。</text></view>
 </view>
 <text v-if="book.error" class="notice error" role="alert">{{book.error}}</text>
 </view>
</template>
<script setup lang="ts">
import WordbookScopeSwitch from '../../components/wordbook/WordbookScopeSwitch.vue'
import WordbookCategorySelector from '../../components/wordbook/WordbookCategorySelector.vue'
import type {WordbookViewScope} from '../../services/wordbook-scope-icons'
import CourseWordCardList from '../../components/wordbook/CourseWordCardList.vue'
import WPFamiliaritySummary from '../../components/wordbook/WPFamiliaritySummary.vue'
import {familiarityFor} from '../../services/content/FamiliaritySelector'
import {useCourseStore} from '../../stores/course'
import {courseMemberships,getCourseWord,courseRegistry} from '../../services/content/ContentRegistry'
import WPActionTile from "../../components/button/WPActionTile.vue"

import {computed,ref,watch,onUnmounted} from 'vue'
import {onBackPress,onShow,onHide} from '@dcloudio/uni-app'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPNavIcon from '../../components/wp-nav-icon/WPNavIcon.vue'
import WPMemoryMeter from '../../components/wp-memory-meter/WPMemoryMeter.vue'
import WPWordDetail from '../../components/wp-word-detail/WPWordDetail.vue'
import {useReviewStore} from '../../stores/review'
import {useLearningStore} from '../../stores/learning'
import {useStudyPresentation} from '../../stores/study-presentation'
import {useProfileStore} from '../../stores/profile'
import {useWordbookStore,type WordbookFilter} from '../../stores/wordbook'
import {wordById} from '../../../packages/content_schema'
import {nextReviewLabel} from '../../services/study-presentation'
import {windowLayout as layout} from '../../services/window'
import {stopAudio} from '../../services/audio'
import {navigate,openCourseGallery} from '../../services/navigation'
import {courseNeedsReview} from '../../services/course/CourseSelection'
const review=useReviewStore(),learning=useLearningStore(),profile=useProfileStore(),book=useWordbookStore(),course=useCourseStore()
const study=useStudyPresentation()
const cardsOpen=ref(false),courseOverview=computed(()=>book.courseCards({courseId:course.currentId}))
const cardBrowser=ref<InstanceType<typeof CourseWordCardList>>()
onBackPress(()=>cardsOpen.value?cardBrowser.value?.handleBack()||false:sheetOpen.value?(closeDetail(),true):false)
onShow(()=>review.refresh());onHide(stopAudio)
const dueTimer=setInterval(()=>review.refresh(),30000)
const canContinueStudy=computed(()=>!!learning.session&&(!learning.session.completedAt||study.revisiting))
const scope=ref<WordbookViewScope>('current'),learnedOnly=ref(false),unitIndex=ref(0),pageIndex=ref(0)
const currentNeedsReview=computed(()=>courseNeedsReview(course.current))
const unitOptions=computed(()=>[{id:'',title:'全部单元'},...course.current.units.map(u=>({id:u.id,title:u.title}))])
watch(()=>course.currentId,()=>{unitIndex.value=0})
watch(scope,()=>{unitIndex.value=0})
function openGallery(){course.applyPending();openCourseGallery()}
const filter=ref<WordbookFilter>('due'),query=ref(''),selected=ref(''),sheetOpen=ref(false)
const scopeRequest=computed(()=>({scope:scope.value==='current'?'currentCourse' as const:'allWords' as const,learnedOnly:scope.value==='all'&&learnedOnly.value,currentCourseId:course.currentId,installedCourseIds:course.installed.map(c=>c.courseId),unitId:scope.value==='current'?unitOptions.value[unitIndex.value]?.id:undefined,keyword:query.value}))
const allWords=computed(()=>book.query({scope:'allWords',currentCourseId:course.currentId,installedCourseIds:course.installed.map(c=>c.courseId),category:'all',keyword:''}))
const learnedWords=computed(()=>book.query({scope:'allWords',learnedOnly:true,currentCourseId:course.currentId,installedCourseIds:course.installed.map(c=>c.courseId),category:'all',keyword:''}))
const result=computed(()=>book.query({...scopeRequest.value,category:filter.value==='weak'?'focus':filter.value}))
const filters=computed(()=>[{id:'due' as const,name:'到期复习',short:'到期',count:result.value.stats.dueUniqueLexemeCount},{id:'weak' as const,name:'重点复习',short:'重点',count:result.value.stats.focusCount},{id:'mistakes' as const,name:'错词本',short:'错词',count:result.value.stats.mistakesCount},{id:'all' as const,name:'所有单词',short:scope.value==='all'&&learnedOnly.value?'全部已学词':'全部独立词',count:result.value.stats.totalUniqueLexemes}])
const list=computed(()=>result.value.rows)
const pages=computed(()=>Math.max(1,Math.ceil(list.value.length/30))),pageWords=computed(()=>list.value.slice(pageIndex.value*30,pageIndex.value*30+30))
watch([filter,query,scope,unitIndex,learnedOnly],()=>{pageIndex.value=0})
watch(list,rows=>{if(selected.value&&!rows.some(word=>word.id===selected.value)){selected.value='';sheetOpen.value=false}})
const detail=computed(()=>{if(!wordById[selected.value])return undefined;const detailCourseId=result.value.positionsById.get(selected.value)?.[0]?.courseId||course.currentId;const word=getCourseWord(detailCourseId,selected.value);if(!word)return undefined;return {...word,example:courseMemberships(word.id).find(m=>m.courseId===detailCourseId)?.example||word.example}})
function selectFilter(id:WordbookFilter){filter.value=id}
function open(id:string){selected.value=id;sheetOpen.value=true}
function closeDetail(){selected.value='';sheetOpen.value=false}
function begin(){
 // Browsing scope never supplies words or applies a pending course to a saved study.
 if(canContinueStudy.value||learning.start())navigate('learn')
}
function beginDue(){if(canContinueStudy.value){uni.showToast?.({title:'先继续当前学习，完成后再开始筛选范围的复习',icon:'none'});navigate('learn');return}const dueIds=book.query({...scopeRequest.value,category:'due'}).rows.map(w=>w.id);if(learning.startDue(dueIds))navigate('learn')}
function practice(){if(detail.value){learning.start([detail.value.id]);navigate('learn')}}
let startX=0
function search(event:any){query.value=event.detail?.value??event.target?.value??''}
function touchStart(event:{touches:ArrayLike<{clientX:number}>}){startX=event.touches[0]?.clientX||0}
function touchEnd(event:{changedTouches:ArrayLike<{clientX:number}>},id:string){if(Math.abs((event.changedTouches[0]?.clientX||startX)-startX)>=50)open(id)}
function beginOverviewDue(){if(canContinueStudy.value){begin();return}if(learning.startDue([...new Set(courseOverview.value.rows.filter(row=>row.due).map(row=>row.word.id))]))navigate('learn')}
onUnmounted(()=>{clearInterval(dueTimer);stopAudio()})
</script>


