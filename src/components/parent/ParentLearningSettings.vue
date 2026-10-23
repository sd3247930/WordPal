<template>
 <view class="parent-learning-settings">
  <view class="level-heading"><text class="section-title">学习等级</text><text class="small muted block">选择适合孩子的每批学习节奏</text></view>
  <view class="level-options" role="radiogroup" aria-label="学习等级">
   <WPActionTile v-for="level in ABILITY_LEVELS" :key="level.level" role="radio" :aria-checked="parent.settings.entryLevel===level.level" class="level-option" :class="{chosen:parent.settings.entryLevel===level.level}" @click="saveLevel(level.level)">
    <view class="level-art"><LearningLevelIcon :level="level.level"/></view>
    <view class="level-copy"><view class="level-title"><text class="level-code">L{{level.level}}</text><text class="level-name">{{level.title}}</text></view><text class="level-count">每批 {{levelWordCount(level.level)}} 词</text></view>
    <text class="level-check" aria-hidden="true">{{parent.settings.entryLevel===level.level?'✓':'○'}}</text>
   </WPActionTile>
  </view>
  <view class="level-effective" role="status" aria-live="polite"><text class="strong">当前选择：L{{meta.level}} · {{meta.title}} · 每批{{parent.settings.dailyNewWordLimit}}词</text><text class="small muted block">{{parent.difficultyPending?'已保存，新等级将于下一批新任务生效；未完成任务继续原计划。':'已保存。尚未开始的任务立即使用此等级，开始后本批词表固定；完成六环节后可继续下一批。'}}</text></view>
  <text v-if="parent.error||!parent.persisted" class="notice error" role="alert">{{parent.error||'等级设置尚未保存，请释放设备空间后重试。'}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import LearningLevelIcon from './LearningLevelIcon.vue'
import {useParentSettingsStore} from '../../stores/parent-settings'
import {ABILITY_LEVELS,abilityMeta,levelWordCount,type EntryLevel} from '../../../packages/parent_settings'
const parent=useParentSettingsStore(),meta=computed(()=>abilityMeta(parent.settings.entryLevel))
function saveLevel(level:EntryLevel){if(parent.save({entryLevel:level}))uni.showToast?.({title:'学习等级已保存',icon:'none'})}
</script>
<style scoped>
.parent-learning-settings{display:flex;flex-direction:column;gap:16px;min-width:0}
.level-heading{display:flex;flex-direction:column;gap:4px}
.level-options{display:grid;gap:10px}
.level-option{display:grid;grid-template-columns:64px minmax(0,1fr) 24px;align-items:center;gap:12px;min-height:88px;width:100%;margin:0;padding:10px 14px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);text-align:left;color:var(--wp-foreground)}
.level-option.chosen{border-color:var(--wp-primary);background:linear-gradient(110deg,var(--wp-surface-tonal),var(--wp-surface));box-shadow:var(--wp-elevation)}
.level-art{width:64px;height:64px;min-width:0;flex-shrink:0}
.level-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
.level-title{display:flex;align-items:baseline;flex-wrap:wrap;gap:3px 8px;min-width:0}
.level-code{font-size:var(--wp-font-small);line-height:1.5;font-weight:700;color:var(--wp-primary);white-space:nowrap}
.level-name{font-size:calc(var(--wp-font-body) + 2px);font-weight:600;line-height:1.45;overflow-wrap:anywhere}
.level-count{font-size:calc(var(--wp-font-small) + 1px);line-height:1.5;color:var(--wp-muted-foreground)}
.level-check{color:var(--wp-primary);font-size:24px;line-height:1.5;text-align:center}
.level-effective{padding:12px 14px;border-radius:var(--wp-radius-sm);background:var(--wp-surface-tonal);line-height:1.6}
.level-effective .strong{font-size:var(--wp-font-small)}
@media(max-width:359px){.level-option{grid-template-columns:56px minmax(0,1fr) 20px;gap:10px;padding:10px;min-height:80px}.level-art{width:56px;height:56px}}
@media(min-width:760px){.level-option{grid-template-columns:68px minmax(0,1fr) 24px;min-height:92px}.level-art{width:68px;height:68px}}
.large-text .level-option{align-items:center}.large-text .level-title{row-gap:2px}
</style>
