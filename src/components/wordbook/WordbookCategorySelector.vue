<template>
 <view class="mode-list review-tabs wordbook-tabs wordbook-category-selector" role="group" aria-label="单词本筛选">
  <WPActionTile v-for="option in options" :key="option.id" toggle-highlight class="mode-button wordbook-category-tile" :class="{selected:modelValue===option.id}" :selected="modelValue===option.id" :data-category="option.id" :aria-label="option.name" @click="$emit('update:modelValue',option.id)">
   <view class="wordbook-category-art" aria-hidden="true"><image v-if="!failed.has(option.id)" class="wordbook-category-image" :src="wordbookCategoryIcons[option.id].src" mode="aspectFit" @error="failed.add(option.id)"/><text v-else class="wordbook-category-fallback">{{wordbookCategoryIcons[option.id].fallback}}</text></view>
   <text class="wordbook-category-title"><text v-for="part in option.parts" :key="part" class="wordbook-category-title-part">{{part}}</text></text>
  </WPActionTile>
 </view>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import type {WordbookFilter} from '../../stores/wordbook'
import {wordbookCategoryIcons} from '../../services/wordbook-category-icons'
defineProps<{modelValue:WordbookFilter}>()
defineEmits<{'update:modelValue':[value:WordbookFilter]}>()
const failed=ref(new Set<WordbookFilter>())
const options=[{id:'due' as const,name:'到期复习',parts:['到期','复习']},{id:'weak' as const,name:'重点复习',parts:['重点','复习']},{id:'mistakes' as const,name:'错词本',parts:['错词本']},{id:'all' as const,name:'所有单词',parts:['所有','单词']}]
</script>
<style scoped>
.wp-app .wordbook-category-selector{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;width:100%;min-width:0;margin:0 0 10px}
.wp-app .wordbook-category-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;min-width:0;min-height:92px;margin:0;padding:8px 2px;box-sizing:border-box;border:2px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);color:var(--wp-foreground);text-align:center;transition:background 150ms,border-color 150ms}
.wp-app .wordbook-category-tile.selected,.wp-app .wordbook-category-tile.icon-highlighted{border-color:var(--wp-primary);background:var(--wp-secondary);color:var(--wp-primary)}
.wordbook-category-art{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:40px;height:40px}
.wordbook-category-image{display:block;width:100%;height:100%;object-fit:contain}
.wordbook-category-title{display:block;max-width:100%;font-size:var(--wp-font-small);font-weight:600;line-height:1.4;white-space:normal}
.wordbook-category-title-part{display:inline-block;white-space:nowrap}
.wordbook-category-fallback{font-size:26px;line-height:1;color:var(--wp-primary)}
.wp-app .wordbook-category-tile:active{border-color:var(--wp-primary);background:var(--wp-secondary)}
.wp-app .wordbook-category-tile:focus-visible{outline:2px solid var(--wp-focus-ring);outline-offset:2px}
.wp-app.reduce-motion .wordbook-category-tile{transition:none}
@media(prefers-reduced-motion:reduce){.wp-app .wordbook-category-tile{transition:none}}
</style>
