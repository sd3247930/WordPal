<template>
 <view class="page-heading wordbook-heading"><view><text class="page-title">我的单词本</text><text class="page-subtitle">看看记忆长到哪一步，再和单词见一面。</text></view><WPButton v-if="review.due.length" @click="begin">{{learning.session&&!learning.session.completedAt&&learning.session.kind!=='review_due'?'继续当前学习':'开始到期复习 · '+review.due.length}}</WPButton></view>
 <view v-if="!review.due.length" class="review-clear"><view><text class="strong">✓ 今天没有到期复习</text><text class="small muted block">来看看已经认识和即将学习的单词。</text></view><WPButton kind="quiet" @click="selectFilter('all')">浏览全部单词</WPButton></view>
 <view class="wordbook-stats" aria-label="单词本统计"><view v-for="item in filters" :key="item.id"><text>{{item.count}}</text><text class="small muted">{{item.short}}</text></view></view>
 <view class="wordbook-search"><text aria-hidden="true">⌕</text><input :value="query" placeholder="搜索英文、中文或单元" aria-label="搜索单词本" :maxlength="80" @input="search"/><button v-if="query" role="button" tabindex="0" aria-label="清空单词搜索" @click="query=''">×</button></view>
 <view class="mode-list review-tabs wordbook-tabs" role="group" aria-label="单词本筛选"><button role="button" tabindex="0" v-for="item in filters" :key="item.id" class="mode-button" :class="{selected:filter===item.id}" :aria-pressed="filter===item.id" @click="selectFilter(item.id)">{{item.name}}</button></view>
 <view v-if="filter==='weak'" class="wordbook-focus-legend"><text>★ 我的重点 {{book.preferences.favorites.length}}</text><text>⚡ 系统建议 {{book.suggestions.length}}</text></view>
 <text v-if="filter==='mistakes'" class="small muted block wordbook-filter-note">最近多次需要帮助的单词，连续两次正式答对后移出。</text>
 <view class="review-workspace wordbook-workspace">
  <WPCard class="review-list"><view class="section-heading"><text>{{filters.find(item=>item.id===filter)?.name}}</text><text class="small muted">{{list.length}} 个单词</text></view>
   <view v-if="!list.length" class="empty-small"><WPNavIcon name="review" :size="36"/><text>{{query?'没有找到这个单词':filter==='due'?'暂时没有到期单词':filter==='mistakes'?'这轮记忆很平稳':filter==='weak'?'还没有重点标记':'这里还没有单词'}}</text><text class="small muted">{{query?'试试英文、中文或单元名称。':filter==='weak'?'打开单词详情，把想多练的词加入重点。':'可以切换到所有单词，轻松看看。'}}</text></view>
   <button role="button" tabindex="0" v-for="word in list" :key="word.id" class="review-row wordbook-row" :class="{selected:selected===word.id}" :aria-label="word.word+'，'+word.meaning+'，查看详情'" :aria-pressed="selected===word.id" @click="open(word.id)" @longpress="open(word.id)" @touchstart="touchStart" @touchend="touchEnd($event,word.id)"><view class="wordbook-row-copy"><text class="review-word">{{word.word}}<text v-if="book.preferences.favorites.includes(word.id)" class="wordbook-star" aria-label="我的重点">★</text></text><text class="small">{{word.meaning}}</text><text class="small muted block">{{word.unit}}{{filter==='weak'?' · '+(book.preferences.favorites.includes(word.id)?'我的重点':'系统建议'):book.preferences.later.includes(word.id)?' · 稍后再看':''}}</text></view><view class="wordbook-row-memory"><WPMemoryMeter :card="profile.db.cards[word.id]" :compact="true"/><text class="small muted">{{nextReviewLabel(profile.db.cards[word.id]?.due)}}</text></view></button>
  </WPCard>
  <WPWordDetail v-if="detail && (layout.width>=600||sheetOpen)" :word="detail" :card="profile.db.cards[detail.id]" :history="book.historyByWord[detail.id]||[]" :favorite="book.preferences.favorites.includes(detail.id)" :later="book.preferences.later.includes(detail.id)" :modal="layout.width<600" @close="sheetOpen=false" @favorite="book.toggle('favorites',detail.id)" @later="book.toggle('later',detail.id)" @practice="practice"/>
  <view v-else-if="layout.width>=600" class="wordbook-detail-placeholder"><WPNavIcon name="review" :size="40"/><text class="section-title">打开一个单词</text><text class="muted">查看发音、例句和记忆状态。</text></view>
 </view>
 <text v-if="book.error" class="notice error" role="alert">{{book.error}}</text>
</template>
<script setup lang="ts">
import {computed,ref,onUnmounted} from 'vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPNavIcon from '../../components/wp-nav-icon/WPNavIcon.vue'
import WPMemoryMeter from '../../components/wp-memory-meter/WPMemoryMeter.vue'
import WPWordDetail from '../../components/wp-word-detail/WPWordDetail.vue'
import {useReviewStore} from '../../stores/review'
import {useLearningStore} from '../../stores/learning'
import {useProfileStore} from '../../stores/profile'
import {useWordbookStore,type WordbookFilter} from '../../stores/wordbook'
import {words,wordById} from '../../../packages/content_schema'
import {nextReviewLabel} from '../../services/study-presentation'
import {windowLayout as layout} from '../../services/window'
import {stopAudio} from '../../services/audio'
import {navigate} from '../../services/navigation'
const review=useReviewStore(),learning=useLearningStore(),profile=useProfileStore(),book=useWordbookStore()
const filter=ref<WordbookFilter>('due'),query=ref(''),selected=ref(''),sheetOpen=ref(false)
const filters=computed(()=>[{id:'due' as const,name:'到期复习',short:'到期',count:review.due.length},{id:'weak' as const,name:'重点复习',short:'重点',count:book.weak.length},{id:'mistakes' as const,name:'错词本',short:'错词',count:book.mistakes.length},{id:'all' as const,name:'所有单词',short:'全部',count:words.length}])
const list=computed(()=>book.list(filter.value,query.value))
const detail=computed(()=>wordById[selected.value])
function selectFilter(id:WordbookFilter){filter.value=id}
function open(id:string){selected.value=id;sheetOpen.value=true}
function begin(){learning.start();navigate('learn')}
function practice(){if(detail.value){learning.start([detail.value.id]);navigate('learn')}}
let startX=0
function search(event:any){query.value=event.detail?.value??event.target?.value??''}
function touchStart(event:{touches:ArrayLike<{clientX:number}>}){startX=event.touches[0]?.clientX||0}
function touchEnd(event:{changedTouches:ArrayLike<{clientX:number}>},id:string){if(Math.abs((event.changedTouches[0]?.clientX||startX)-startX)>=50)open(id)}
onUnmounted(stopAudio)
</script>


