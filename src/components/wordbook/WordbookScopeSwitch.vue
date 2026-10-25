<template>
 <view class="wordbook-scope-control">
  <view class="wordbook-scope-switch" role="group" aria-label="单词本课程范围">
   <WPActionTile v-for="option in options" :key="option.id" toggle-highlight class="wordbook-scope-tile" :class="{selected:modelValue===option.id}" :data-scope="option.id" :selected="modelValue===option.id" :aria-label="option.name" @click="$emit('update:modelValue',option.id)">
    <view class="wordbook-scope-art" aria-hidden="true"><image v-if="!failed.has(option.id)" class="wordbook-scope-image" :src="wordbookScopeIcons[option.id].src" mode="aspectFit" @error="failed.add(option.id)"/><text v-else class="wordbook-scope-fallback">{{wordbookScopeIcons[option.id].fallback}}</text></view>
    <text class="wordbook-scope-title">{{option.name}}</text><text class="wordbook-scope-count">{{option.count}} 个独立词</text>
   </WPActionTile>
  </view>
  <WPActionTile v-if="modelValue==='all'" toggle-highlight class="wordbook-learned-toggle" :class="{selected:learnedOnly}" :selected="learnedOnly" aria-label="只看已学" @click="$emit('update:learnedOnly',!learnedOnly)" @cancel="$emit('update:learnedOnly',false)">
   <view class="wordbook-learned-art" aria-hidden="true"><image v-if="!failed.has('learned')" class="wordbook-scope-image" :src="wordbookScopeIcons.learned.src" mode="aspectFit" @error="failed.add('learned')"/><text v-else class="wordbook-scope-fallback">★</text></view><text>只看已学 · {{learnedCount}} 词</text><view class="wordbook-learned-indicator" aria-hidden="true"><view v-if="learnedOnly" class="wordbook-learned-dot"/></view>
  </WPActionTile>
 </view>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import {wordbookScopeIcons,type WordbookViewScope} from '../../services/wordbook-scope-icons'
const props=defineProps<{modelValue:WordbookViewScope;learnedOnly:boolean;currentCount:number;allCount:number;learnedCount:number}>()
defineEmits<{'update:modelValue':[value:WordbookViewScope];'update:learnedOnly':[value:boolean]}>()
const failed=ref(new Set<keyof typeof wordbookScopeIcons>())
const options=computed(()=>[{id:'current' as const,name:'当前教材',count:props.currentCount},{id:'all' as const,name:'全部单词',count:props.allCount}])
</script>
<style scoped>
.wordbook-scope-control{width:100%;min-width:0;display:flex;flex-direction:column;gap:8px}
.wordbook-scope-switch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}
.wp-app .wordbook-scope-tile{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;align-content:center;gap:0 10px;min-width:0;min-height:80px;width:100%;padding:10px 14px;margin:0;box-sizing:border-box;border:2px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);color:var(--wp-foreground);text-align:left;transition:background 150ms,border-color 150ms,transform 120ms}
.wp-app .wordbook-scope-tile.selected,.wp-app .wordbook-learned-toggle.selected{background:var(--wp-secondary);border-color:var(--wp-primary);color:var(--wp-primary)}
.wp-app .wordbook-scope-tile.selected{border-width:3px}
.wordbook-scope-art{position:relative;display:flex;grid-row:span 2;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0}
.wordbook-scope-image{display:block;width:100%;height:100%;object-fit:contain}
.wordbook-scope-title{font-size:var(--wp-font-body);font-weight:600;line-height:1.4;white-space:nowrap}
.wordbook-scope-count{font-size:var(--wp-font-caption);line-height:1.4;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.wordbook-scope-fallback{font-size:24px;line-height:1;color:var(--wp-primary)}
.wp-app .wordbook-learned-toggle{display:flex;align-items:center;justify-content:flex-start;gap:8px;min-height:48px;min-width:0;max-width:100%;align-self:flex-start;margin:0;padding:6px 12px;border:2px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);color:var(--wp-foreground);font-size:var(--wp-font-small);line-height:1.4;transition:background 150ms,border-color 150ms}
.wordbook-learned-art{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:24px;height:24px}
.wordbook-learned-indicator{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:16px;height:16px;border:1.5px solid currentColor;border-radius:50%;box-sizing:border-box}
.wordbook-learned-dot{width:8px;height:8px;border-radius:50%;background:currentColor}
.wp-app .wordbook-scope-tile:active,.wp-app .wordbook-learned-toggle:active{border-color:var(--wp-primary);background:var(--wp-secondary)}
.wp-app .wordbook-scope-tile:focus-visible,.wp-app .wordbook-learned-toggle:focus-visible{outline:2px solid var(--wp-focus-ring);outline-offset:2px}
.wp-app.reduce-motion .wordbook-scope-tile,.wp-app.reduce-motion .wordbook-learned-toggle{transition:none}
@media(max-width:599px){.wp-app .wordbook-scope-tile{grid-template-columns:36px minmax(0,1fr);gap:0 6px;min-height:76px;padding:8px}.wordbook-scope-art{width:36px;height:36px}}
@media(prefers-reduced-motion:reduce){.wp-app .wordbook-scope-tile,.wp-app .wordbook-learned-toggle{transition:none}}
</style>
