<template>
 <view class="parent-learning-settings">
  <view class="parent-settings-summary" aria-label="当前家长设置">
   <text class="strong">当前设置</text>
   <view><text>每日新词</text><text>{{parent.settings.dailyNewWordLimit}} 个 / 天</text></view>
   <view><text>能力起点</text><text>L{{meta.level}} · {{meta.title}}</text></view>
  </view>
  <view class="parent-setting-section">
   <text class="strong">每日新词上限</text>
   <WPSegmentedButton :model-value="String(parent.settings.dailyNewWordLimit)" :options="limits" label="每日新词上限" @update:model-value="saveLimit"/>
   <text class="small block parent-setting-status" role="status" aria-live="polite" :data-state="parent.dailyState">{{dailyStatus}}</text>
   <text class="small muted block">到期复习优先，再巩固错词，最后安排新词。上限只限制新词，不限制到期复习；当前轮次不会中途重排。</text>
   <text class="small muted block parent-plan-preview">下一轮建议：{{learning.dailyPlan.dueIds.length}} 个到期复习 · {{learning.dailyPlan.weakIds.length}} 个重点巩固 · 最多 {{learning.dailyPlan.newIds.length}} 个新词</text>
   <text v-if="newWordNote" class="small muted block">{{newWordNote}}</text>
  </view>
  <view class="parent-setting-section">
   <text class="strong">学习能力起点</text>
   <text class="small muted block">这是学习能力建议，不等同于年级。</text>
   <WPSegmentedButton class="parent-level-control" :model-value="'L'+parent.settings.entryLevel" :options="levels" label="能力起点" @update:model-value="saveLevel"/>
   <text class="small block parent-setting-status" role="status" aria-live="polite" :data-state="parent.levelState">{{levelStatus}}</text>
   <view class="ability-explanation" :data-entry-level="meta.level">
    <text class="strong">L{{meta.level}} · {{meta.title}}</text>
    <text class="small block">{{meta.description}}</text>
    <text class="small muted block">推荐学习：{{meta.recommendedSkills.join(' · ')}}</text>
   </view>
   <view class="ability-cap-note">
    <text class="small strong block">能力起点说明</text>
    <text class="small muted block">· L1 / L2（入门）：每轮新词不超过 5 个，帮助孩子建立稳定节奏。</text>
    <text class="small muted block">· L3 / L4 / L5（进阶）：L3 每日新词最多 10 个，L4 最多 15 个，L5 最多 20 个；同时受「每日新词」设置限制（5 / 10 / 20）。</text>
   </view>
   <view class="ability-recommendations" :data-entry-level="course.recommendation.entryLevel">
    <text class="small strong block">课程建议已按 L{{course.recommendation.entryLevel}} 更新</text>
    <text class="small muted block">{{course.recommendation.courses.length?'适合此起点：'+course.recommendation.courses.slice(0,3).map(c=>c.title).join('、'):'已安装课程中暂无匹配此起点的内容，可继续当前课程。'}}</text>
    <text class="small muted block">只更新课程推荐和下一轮题型建议。已有学习记录、复习排程和当前课程保持原样；短句等练习以课程实际内容为准。</text>
   </view>
  </view>
  <text v-if="parent.error||!parent.persisted" class="notice error" role="alert">{{parent.error||'家长设置升级尚未保存，请检查设备存储后重新选择设置。'}}</text>
  <text v-if="savedNotice" class="small block" role="status">✓ 已保存</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import WPSegmentedButton from '../button/WPSegmentedButton.vue'
import {useParentSettingsStore} from '../../stores/parent-settings'
import {useLearningStore} from '../../stores/learning'
import {useCourseStore} from '../../stores/course'
import {ABILITY_LEVELS,DAILY_NEW_WORD_LIMITS,abilityMeta,type DailyNewWordLimit,type EntryLevel} from '../../../packages/parent_settings'
const parent=useParentSettingsStore(),learning=useLearningStore(),course=useCourseStore(),savedNotice=ref(false)
const meta=computed(()=>abilityMeta(parent.settings.entryLevel))
const limits=DAILY_NEW_WORD_LIMITS.map(n=>({id:String(n),name:n+' 个'})),levels=ABILITY_LEVELS.map(m=>({id:'L'+m.level,name:'L'+m.level,description:m.title}))
const status={saved:'已保存',pending:'待应用',applying:'正在应用…',applied:'✓ 已生效',error:'设置未保存或应用失败，请重试'}
const dailyStatus=computed(()=>parent.dailyState==='pending'&&parent.sessionPending?'已保存 · 下次学习生效':status[parent.dailyState])
/** Why the next round may schedule no new words at all. */
const newWordNote=computed(()=>{
 if(learning.dailyPlan.newIds.length)return ''
 if(parent.settings.entryLevel<=2&&learning.newToday>=5)return '入门等级每轮新词不超过 5，今日已学 5，明日再来。'
 if(learning.newToday>0)return '今日新词已达上限，明日再来。'
 return ''
})
const levelStatus=computed(()=>parent.levelState==='applied'?'✓ 已生效 · 课程推荐已更新'+(parent.difficultyPending?'，题型建议下次学习生效':''):status[parent.levelState])
function saved(ok:boolean){savedNotice.value=ok;if(ok)uni.showToast?.({title:'设置已更新',icon:'none'})}
function saveLimit(value:string){saved(parent.save({dailyNewWordLimit:Number(value) as DailyNewWordLimit}))}
function saveLevel(value:string){saved(parent.save({entryLevel:Number(value.slice(1)) as EntryLevel}))}
</script>
