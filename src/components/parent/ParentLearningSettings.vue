<template>
 <view class="parent-learning-settings">
  <view class="level-heading"><text class="section-title">学习等级</text><text class="small muted block">选择适合孩子的每批学习节奏</text></view>
  <view class="level-options" role="radiogroup" aria-label="学习等级">
   <WPActionTile v-for="level in ABILITY_LEVELS" :id="'parent-level-'+level.level" :key="level.level" role="radio" :aria-checked="parent.settings.entryLevel===level.level" class="level-option" :class="{chosen:parent.settings.entryLevel===level.level}" @click="saveLevel(level.level)">
    <view class="level-art"><LearningLevelIcon :level="level.level" :image-src="parentSettingsArtworkSrc(('level'+level.level) as ParentSettingsArtworkName)"/></view>
    <view class="level-copy"><view class="level-title"><text class="level-code">L{{level.level}}</text><text class="level-name">{{level.title}}</text></view><text class="level-count">{{levelWordCount(level.level)}}词/批</text></view>
    <text class="level-check" aria-hidden="true">{{parent.settings.entryLevel===level.level?'已选':'选择'}}</text>
   </WPActionTile>
  </view>
  <view class="level-effective" role="status" aria-live="polite"><ParentSettingsArtwork name="current"/><view><text class="strong">当前设置：L{{meta.level}} · 每批{{parent.settings.dailyNewWordLimit}}词</text><text class="small muted block">{{!parent.persisted?'设置尚未保存':parent.difficultyPending?'已保存，下一批生效；本批继续原计划。':'已保存，未开始的任务使用此等级。'}}</text></view></view>
  <text v-if="parent.error||!parent.persisted" class="notice error" role="alert">{{parent.error||'等级设置尚未保存，请释放设备空间后重试。'}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import LearningLevelIcon from './LearningLevelIcon.vue'
import ParentSettingsArtwork from './ParentSettingsArtwork.vue'
import {parentSettingsArtworkSrc,type ParentSettingsArtworkName} from '../../services/parent-settings-artwork'
import {useParentSettingsStore} from '../../stores/parent-settings'
import {ABILITY_LEVELS,abilityMeta,levelWordCount,type EntryLevel} from '../../../packages/parent_settings'
const parent=useParentSettingsStore(),meta=computed(()=>abilityMeta(parent.settings.entryLevel))
function saveLevel(level:EntryLevel){if(level===parent.settings.entryLevel&&parent.persisted&&!parent.error)return;if(parent.save({entryLevel:level}))uni.showToast?.({title:'学习等级已保存',icon:'none'})}
</script>
<style scoped>
.parent-learning-settings{display:flex;flex-direction:column;gap:10px;min-width:0;margin-top:10px}
.level-heading{display:flex;flex-direction:column;gap:4px}
.level-options{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;width:100%;min-width:0;align-items:stretch}
.level-option{display:flex;flex-direction:column;justify-content:flex-start;align-items:center;gap:4px;min-width:0;width:100%;height:100%;min-height:132px;margin:0;padding:8px 2px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);text-align:center;color:var(--wp-foreground);white-space:normal;box-sizing:border-box}
.level-option.chosen{border-color:var(--wp-primary);background:linear-gradient(110deg,var(--wp-surface-tonal),var(--wp-surface));box-shadow:var(--wp-elevation)}
.level-art{width:36px;height:36px;max-width:100%;min-width:0;flex-shrink:0}
.level-copy{display:flex;flex-direction:column;gap:3px;min-width:0;width:100%}
.level-title{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0}
.level-code{font-size:var(--wp-font-body);line-height:1.3;font-weight:700;color:var(--wp-primary);white-space:nowrap}
.level-name{font-size:var(--wp-font-caption);font-weight:600;line-height:1.4;min-height:2.8em;max-width:4em;overflow-wrap:anywhere}
.level-count{font-size:var(--wp-font-caption);line-height:1.4;color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.level-check{color:var(--wp-primary);font-size:var(--wp-font-caption);line-height:1.35;text-align:center}
.level-effective{display:flex;align-items:center;gap:8px;padding:10px;border-radius:var(--wp-radius-sm);background:var(--wp-surface-tonal);line-height:1.5}
.level-effective>view{min-width:0}
.level-effective .strong{font-size:var(--wp-font-small)}
@media(min-width:680px){.level-options{gap:10px}.level-art{width:48px;height:48px}.level-name{font-size:var(--wp-font-small);min-height:1.4em;max-width:none}.level-option{padding:12px 4px}}
</style>
