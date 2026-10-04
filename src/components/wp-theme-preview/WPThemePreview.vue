<template>
 <view class="theme-mini" :style="themeStyle" :data-preview="themeId" aria-hidden="true">
  <view class="mini-top"><view class="mini-dot"/><text>Aa</text><view class="mini-line"/></view>
  <view class="mini-layout"><view class="mini-feature"><view class="mini-bar"/><view class="mini-bar short"/></view><view class="mini-side"><view class="mini-line"/><view class="mini-line"/></view></view>
  <view class="mini-action">学习 →</view>
 </view>
</template>
<script setup lang="ts">
import type {ThemeId} from '../../styles/themes'
defineProps<{name:string;themeStyle:string;themeId?:ThemeId}>()
</script>
<style scoped>
.theme-mini{background:var(--wp-background);color:var(--wp-foreground);padding:12px;border-radius:var(--wp-radius);width:100%;height:112px;overflow:hidden}
.mini-top{display:flex;gap:6px;font-size:14px;align-items:center;line-height:1.3;font-weight:600}
.mini-dot{width:6px;height:6px;background:var(--wp-primary);border-radius:50%}
.mini-layout{display:grid;grid-template-columns:1.3fr 1fr;gap:6px;margin:10px 0 8px}
.mini-feature{background:var(--wp-surface-tonal);padding:8px;border-radius:var(--wp-radius-chip)}
.mini-side{display:flex;flex-direction:column;gap:6px;justify-content:center}
.mini-bar,.mini-line{height:4px;background:var(--wp-primary);border-radius:3px;width:70%}
.mini-bar.short{width:45%;margin-top:5px;opacity:.5}
.mini-top>.mini-line{margin-left:auto;width:26%;background:var(--wp-border)}
.mini-side>.mini-line{background:var(--wp-border);width:90%}
.mini-action{background:var(--wp-primary);color:var(--wp-on-primary);padding:4px;border-radius:var(--wp-radius-chip);text-align:center;font-size:11px;line-height:1.4;width:65%}
[data-preview=swiss] .mini-layout{grid-template-columns:1fr 1fr}
[data-preview=swiss] .mini-feature{background:var(--wp-surface);border-bottom:1px solid var(--wp-divider)}
[data-preview=swiss] .mini-action{background:var(--wp-surface);color:var(--wp-primary);padding-left:0;text-align:left}
[data-preview=soft] .mini-action{width:80%}
[data-preview=oled] .mini-dot{background:var(--wp-primary)}
</style>
