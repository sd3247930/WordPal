<template>
 <view class="pet-growth-dashboard" :class="{dark:theme.mode==='dark',contrast:theme.settings.highContrast,reduced:theme.reduced}" role="group" aria-label="成长记录">
  <WPActionTile class="growth-data-card growth-level" aria-label="升级经验说明" @click="showInfo('level')"><view class="growth-card-head"><PetGrowthIcon name="progress"/><view class="growth-card-copy"><text class="growth-card-title">升级经验</text></view><text class="growth-level-tag">{{metrics.level===null?'—':'Lv.'+metrics.level}}</text></view><text class="growth-card-value">{{metrics.levelXp===null?'暂无成长数据':metrics.levelXp+' / 100'}}<text v-if="metrics.levelXp!==null" class="growth-unit"> 经验</text></text><WPProgress :style="progressStyle" :value="metrics.levelXp??0" :total="100" label="成长升级经验"/><text class="growth-card-note">{{metrics.remainingXp===null?'成长数据暂不可用':'再获得 '+metrics.remainingXp+' 经验，就能升到 Lv.'+((metrics.level||1)+1)}}</text></WPActionTile>
  <view class="growth-metric-grid">
   <WPActionTile class="growth-data-card growth-experience" data-metric="experience" aria-label="累计经验说明" @click="showInfo('experience')"><PetGrowthIcon name="experience"/><text class="growth-card-title">累计经验</text><text class="growth-card-value">{{metrics.lifetimeXp??'暂无可靠数据'}}<text v-if="metrics.lifetimeXp!==null" class="growth-unit"> 经验</text></text><text class="growth-card-note">{{petInfo[pet.element].name}}的经验</text></WPActionTile>
   <WPActionTile class="growth-data-card growth-affection" data-metric="affection" aria-label="怎样提高亲密度" @click="showInfo('affection')"><PetGrowthIcon name="affection"/><text class="growth-card-title">亲密度</text><text class="growth-card-value">{{metrics.bond??'暂不可用'}}<text v-if="metrics.bond!==null" class="growth-unit"> / 100</text></text><WPProgress :style="progressStyle" :value="metrics.bond??0" :total="100" label="当前精灵亲密度"/><text class="growth-card-note">查看亲密秘诀</text></WPActionTile>
  </view>
  <WPActionTile class="growth-data-card growth-device" data-metric="device" aria-label="本设备累计学习详情" @click="showInfo('device')"><PetGrowthIcon name="device"/><view class="growth-card-copy"><text class="growth-card-title">本设备累计学习</text><text class="growth-card-value">{{metrics.device.answerCount??'暂不可用'}}<text v-if="metrics.device.answerCount!==null" class="growth-unit"> 次有效答题</text></text><view class="growth-note-pair"><text class="growth-card-note">本机记录</text><text class="growth-card-note">离线可查看</text></view></view></WPActionTile>
  <view class="growth-data-card pet-curriculum-progress"><text class="growth-card-title">全部教材学习进度</text><view class="growth-card-head"><PetGrowthIcon name="progress"/><view class="growth-card-copy"><text class="growth-percent">{{curriculum.percent}}%</text><text class="growth-card-note">{{curriculum.learned}} / {{curriculum.total}} 词 · {{curriculum.courses.length}} 本已安装教材</text></view></view><WPProgress :style="progressStyle" :value="curriculum.percent" :total="100" label="全部已安装教材单词学习进度"/><text class="growth-card-note">{{curriculum.total?'完成全部已安装教材的单词学习，点亮未知形态。':'还没有已安装教材，先选择一本喜欢的教材吧。'}}</text></view>
  <PetStudyLink :pet="pet"/>
  <view v-if="info" id="pet-growth-info" class="growth-info" role="region" :aria-label="info.title" aria-live="polite"><text class="growth-card-title">{{info.title}}</text><text class="growth-card-note">{{info.body}}</text><WPButton kind="quiet" @click="infoKey=null">收起说明</WPButton></view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,nextTick} from 'vue'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import type {Answer} from '../../../packages/core_learning'
import {petGrowthMetrics} from '../../services/pet-growth-dashboard'
import {allCourseLearningProgress} from '../../services/pet-growth'
import {useThemeStore} from '../../stores/theme'
import WPActionTile from '../button/WPActionTile.vue'
import WPProgress from '../wp-progress/WPProgress.vue'
import WPButton from '../wp-button/WPButton.vue'
import PetGrowthIcon from './PetGrowthIcon.vue'
import PetStudyLink from './PetStudyLink.vue'
const props=defineProps<{pet:PetState;history:Answer[];curriculum:ReturnType<typeof allCourseLearningProgress>;unavailable?:boolean}>(),theme=useThemeStore()
const metrics=computed(()=>petGrowthMetrics(props.pet,props.history,props.unavailable))
const progressStyle={'--pet-accent':'var(--growth-fill)','--pet-soft':'var(--growth-track)','--wp-element-bright':'var(--growth-fill)','--wp-element-soft':'var(--growth-track)'}
const infoKey=ref<'level'|'experience'|'affection'|'device'|null>(null)
const info=computed(()=>{
 const m=metrics.value
 const values={level:{title:'关于升级经验',body:m.remainingXp===null?'成长数据暂不可用，请先恢复本机档案。':'这是当前等级经验。累计每获得 100 经验升一级，距离下一级还差 '+m.remainingXp+' 经验。有效学习和每日任务带来成长，查看进度不会增加经验。'},experience:{title:'经验来自哪里',body:'显示当前精灵已保存的累计经验，升级不会清零。正式答题和每日任务会带来经验，小点心不会增加经验。历史未保存逐笔来源明细，这里不生成额外流水。'},affection:{title:'怎样提高亲密度',body:'认真答题和每天分享一次小点心，都能增加当前精灵的亲密度，最多 100。每个伙伴每天可分享一次，消耗 5 灵石，亲密度最多增加 5。只查看卡片不会增加亲密度。'},device:{title:'本机学习记录',body:m.device.answerCount===null?'本机档案暂不可用，请先恢复档案。':'已保存 '+m.device.answerCount+' 次正式有效答题，涉及 '+m.device.uniqueWords+' 个不同单词。按答题记录去重统计，包含新学与到期复习；自由练习、仅打开学习页和重播音频不计入。历史没有可靠活跃时长，不估算分钟数，也不将答题次数当作完成会话数。'}}
 return infoKey.value?values[infoKey.value]:null
})
function showInfo(key:NonNullable<typeof infoKey.value>){infoKey.value=infoKey.value===key?null:key;if(infoKey.value)nextTick(()=>uni.pageScrollTo({selector:'#pet-growth-info',duration:theme.reduced?0:180}))}
watch(()=>props.pet.element,()=>infoKey.value=null)
</script>
<style src="../../styles/pet-growth-dashboard.scss" lang="scss"></style>
