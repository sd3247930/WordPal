<template>
 <view class="parent-dashboard"><view v-show="!toolsOpen" class="parent-overview">
  <WPCard class="parent-overview-card parent-week-card">
   <view class="parent-section-row"><view class="parent-section-title"><ParentSettingsArtwork name="stats"/><text class="section-title">最近 7 天</text></view><WPButton kind="quiet" class="parent-inline-action" :aria-expanded="recordsOpen" @click="recordsOpen=!recordsOpen">学习记录</WPButton></view>
   <template v-if="summary">
    <view v-if="summary.learningDays" class="parent-week-chart" role="img" :aria-label="summary.days.map(day=>day.label+' 正式学习 '+day.count+' 次').join('，')"><view v-for="day in summary.days" :key="day.date" class="parent-day"><text class="parent-day-count">{{day.count}}</text><view class="parent-day-track"><view class="parent-day-bar" :style="{height:day.count/summary.max*100+'%'}"/></view><text class="small muted">{{day.label}}</text></view></view>
    <text v-if="!summary.learningDays" class="small muted parent-empty-week">最近 7 天暂无正式学习记录。</text>
    <view class="parent-key-metrics"><view><ParentSettingsArtwork name="days"/><view><text class="small muted block">学习天数</text><text class="parent-metric-value">{{summary.learningDays}} / 7 天</text></view></view><view><ParentSettingsArtwork name="tasks"/><view><text class="small muted block">{{summary.tasks?.carried?'待续任务':'今日任务'}}</text><text class="parent-metric-value">{{summary.tasks?summary.tasks.done+' / '+summary.tasks.total+' 项':'尚未开始'}}</text></view></view></view>
   </template><text v-else class="notice error" role="status">学习档案暂不可用，请在数据工具中检查或恢复备份。</text>
   <view v-if="recordsOpen" class="parent-record-list"><text class="small strong">全部正式学习记录</text><text v-if="!summary?.records.length" class="small muted">暂无正式学习记录。</text><view v-for="record in summary?.records.slice(0,20)||[]" :key="record.id" class="parent-record"><view><text class="strong">{{recordWord(record)}}</text><text class="small muted block">{{new Date(record.at).toLocaleString()}}</text></view><text class="small">{{record.correct?'正确':'需巩固'}}</text></view><text v-if="(summary?.records.length||0)>20" class="small muted">显示最近 20 条，可在教材与数据工具中导出 CSV 查看全部记录。</text></view>
  </WPCard>
  <WPCard class="parent-overview-card parent-level-card">
   <view class="parent-section-title"><ParentSettingsArtwork name="settings"/><text class="section-title">家长设置</text></view><ParentLearningSettings/>
   <view class="parent-learning-rules"><WPButton kind="quiet" class="parent-rule-entry" @click="showHelp('order')"><ParentSettingsArtwork name="method"/><view><text class="strong block">学习方式</text><text class="small muted block">按教材顺序，不跳词</text></view></WPButton><view class="parent-guard-state"><ParentSettingsArtwork name="guard"/><view><text class="strong block">家长验证</text><text class="small muted block">本次访问已验证</text></view><WPButton kind="quiet" class="parent-inline-action" @click="$emit('reverify')">重新验证</WPButton></view></view>
  </WPCard>
  <WPCard class="parent-overview-card parent-course-card">
   <view class="parent-section-row"><view class="parent-section-title"><ParentSettingsArtwork name="courses"/><text class="section-title">教材管理</text></view><WPButton kind="quiet" class="parent-inline-action" @click="openTools('courses')"><ParentSettingsArtwork name="manage"/><text>教材与数据工具</text></WPButton></view>
   <view class="parent-current-course"><ParentSettingsArtwork name="cover"/><view class="parent-course-copy"><text class="strong block">{{course.current.title}}</text><text class="small muted block">{{isCourseInstalled(course.currentId)?'整册已安装':'当前教材不可用'}}<template v-if="summary"> · {{summary.course.units}} 单元</template></text><template v-if="summary&&summary.course.total"><view class="parent-course-progress" role="progressbar" aria-label="当前教材完整学习进度" :aria-valuenow="summary.course.learned" :aria-valuemax="summary.course.total" :aria-valuemin="0"><view :style="{width:summary.course.learned/summary.course.total*100+'%'}"/></view><text class="small muted block">已完整学完 {{summary.course.learned}} / {{summary.course.total}} 词</text></template></view></view>
  </WPCard>
  <WPCard id="parent-help" class="parent-overview-card parent-help-card">
   <view class="parent-section-title"><ParentSettingsArtwork name="help"/><text class="section-title">帮助与说明</text></view>
   <view class="parent-help-actions"><WPButton v-for="item in helpItems" :key="item.id" kind="quiet" :aria-expanded="help===item.id" @click="help=help===item.id?'':item.id"><ParentSettingsArtwork :name="item.icon"/><text>{{item.name}}</text></WPButton></view>
   <view v-if="help" class="parent-help-content" role="region" :aria-label="helpItems.find(item=>item.id===help)?.name"><template v-if="help==='levels'"><text v-for="level in ABILITY_LEVELS" :key="level.level" class="small block">L{{level.level}} {{level.title}} · 每批 {{levelWordCount(level.level)}} 词</text><text class="small block">{{parent.difficultyPending?'本批任务继续原计划，新等级将在下一批生效。':'未开始的任务使用当前等级；开始后本批词表固定。'}}完成六环节后可继续下一批。</text></template><template v-else-if="help==='order'"><text class="small block">从当前教材的第一个未完整学完的单词继续，不跳词。不同教材独立保留进度。</text><text class="small block">{{Object.values(STEP_TITLES).join(' → ')}}。自定义练习不计入正式任务。</text></template><template v-else><text class="small block">学习档案保存在本机，导出的文件请自行保管。CSV 仅用于查看正式记录；恢复 JSON 备份会替换学习档案，需再次确认。</text><WPButton kind="quiet" @click="openTools('data')">管理学习数据</WPButton></template></view>
  </WPCard>
  </view><ParentToolsView v-if="toolsReady" v-show="toolsOpen" ref="tools" :active="toolsOpen"/>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,nextTick,onMounted,onUnmounted,watch} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import WPCard from '../wp-card/WPCard.vue'
import WPButton from '../wp-button/WPButton.vue'
import ParentSettingsArtwork from './ParentSettingsArtwork.vue'
import ParentLearningSettings from './ParentLearningSettings.vue'
import ParentToolsView from './ParentToolsView.vue'
import {useProfileStore} from '../../stores/profile'
import {useCourseStore} from '../../stores/course'
import {useParentGateStore} from '../../stores/parent-gate'
import {useParentSettingsStore} from '../../stores/parent-settings'
import {isCourseInstalled,getCourseWord} from '../../services/content/ContentRegistry'
import {selectParentDashboard} from '../../services/parent/ParentDashboardData'
import {ABILITY_LEVELS,levelWordCount} from '../../../packages/parent_settings'
import {STEP_TITLES} from '../../services/learning/DailyLearningPlan'
import type {Answer} from '../../../packages/core_learning'
import type {ParentSettingsArtworkName} from '../../services/parent-settings-artwork'
defineEmits<{reverify:[]}>()
const profile=useProfileStore(),course=useCourseStore(),gate=useParentGateStore(),parent=useParentSettingsStore(),now=ref(Date.now()),recordsOpen=ref(false),help=ref(''),toolsReady=ref(false),tools=ref<InstanceType<typeof ParentToolsView>>()
const toolsOpen=defineModel<boolean>('toolsOpen',{default:false})
watch(toolsOpen,open=>{uni.hideKeyboard();if(open)toolsReady.value=true;else scroll('.parent-heading')})
const summary=computed(()=>profile.readOnly||profile.bootError?null:selectParentDashboard(profile.db,course.current,new Date(now.value)))
const helpItems:{id:string;name:string;icon:ParentSettingsArtworkName}[]=[{id:'levels',name:'学习分级说明',icon:'levels'},{id:'order',name:'教材顺序规则',icon:'method'},{id:'data',name:'数据说明',icon:'privacy'}]
let timer:ReturnType<typeof setInterval>|undefined,scrollTimer:ReturnType<typeof setTimeout>|undefined
function stop(){clearInterval(timer);timer=undefined}
function start(){stop();now.value=Date.now();timer=setInterval(()=>now.value=Date.now(),30000)}
onMounted(start);onShow(start);onHide(stop);onUnmounted(()=>{stop();clearTimeout(scrollTimer)})
function scroll(selector:string){clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{if(gate.canAccess())uni.pageScrollTo(selector==='.parent-heading'?{scrollTop:0,duration:0}:{selector,duration:0})},60)}
async function openTools(target:'courses'|'data'){if(!gate.canAccess())return;toolsReady.value=true;toolsOpen.value=true;await nextTick();scroll(target==='data'?'#parent-tool-data':'.parent-heading')}
function showHelp(id:string){help.value=id;scroll('#parent-help')}
function recordWord(answer:Answer){return getCourseWord(answer.courseId||'starter',answer.wordId)?.word||answer.wordId}
</script>
