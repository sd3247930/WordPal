<template><view class="task" :class="element?'element-'+element:''" role="group" :aria-label="title+'，'+value+(completed?'，已完成':'')"><WPActionTile toggle-highlight class="task-icon" :aria-label="title+'图标'"><WPTaskIcon :name="icon"/></WPActionTile><view class="task-copy"><text class="task-title">{{title}}</text><view class="task-meta"><text class="task-value">{{value}}</text><text class="task-detail">{{detail}}</text></view></view><text v-if="completed" class="task-done">已完成</text><WPButton v-else-if="action" kind="secondary" class="task-action" :label="action+title" @click="$emit('click')">{{action}} <text aria-hidden="true">→</text></WPButton></view></template>
<script setup lang="ts">
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPTaskIcon from './WPTaskIcon.vue'
import type {TaskIconName} from '../../services/task-icons'
import type {Element} from '../../../packages/pet_engine';defineProps<{icon:TaskIconName;title:string;detail:string;value:string|number;element?:Element;completed?:boolean;action?:string}>();defineEmits(['click'])</script>
<style scoped>
.task{display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 0;min-height:84px;border-bottom:1px solid var(--wp-divider)}
.task:last-of-type{border-bottom:0}
.task-icon{position:relative;display:flex;align-items:center;justify-content:center;width:52px;height:52px;flex-shrink:0;border-radius:12px;background:transparent;margin:0;padding:0;border:0;color:inherit}
.task-icon :deep(.task-symbol){height:auto;aspect-ratio:1}
.task-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
.task-title{display:block;font-size:var(--wp-font-body);font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.task-meta{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px;min-width:0;line-height:1.45}
.task-value{font-size:var(--wp-font-small);font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--wp-foreground)}
.task-detail{font-size:calc(var(--wp-font-caption) + 1px);color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.task .task-action.wp-button{min-height:48px;min-width:80px;padding:0 10px;border-radius:var(--wp-radius-sm);font-size:var(--wp-font-small);line-height:1.4;gap:4px;white-space:nowrap}
.task-done{min-width:64px;text-align:center;font-size:var(--wp-font-small);font-weight:600;color:var(--wp-success);line-height:1.4}
.large-text .task .task-action.wp-button{min-height:56px}
@media(max-width:599px){.task{grid-template-columns:48px minmax(0,1fr) auto;gap:10px;min-height:80px;padding:10px 0}.task-icon{width:48px;height:48px}.task .task-action.wp-button{min-width:76px;padding:0 8px}}
@media(max-width:359px){.task{grid-template-columns:44px minmax(0,1fr) auto;column-gap:8px}.task-icon{width:44px;height:44px}.task-detail{display:none}.task .task-action.wp-button{min-width:72px}}
</style>
