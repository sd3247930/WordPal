<template>
 <WPCard class="home-priority home-priority-clay" role="region" aria-label="复习优先级">
  <view class="home-priority-content" :class="{'priority-stacked':stacked}" :style="{'--priority-count-width':countWidth}">
   <view class="priority-heading"><image v-if="!failed.has('heading')" class="priority-heading-icon" :src="icons.heading" mode="aspectFit" aria-hidden="true" @error="failed.add('heading')"/><text v-else class="priority-icon-fallback" aria-hidden="true">芽</text><text>复习优先级</text></view>
   <text v-if="unavailable" class="priority-unavailable" role="status">复习统计暂不可用，请在设置中恢复档案后再试。</text>
   <WPActionTile v-for="kind in homeReviewPriorities" :key="kind" class="home-priority-row" :class="'priority-'+kind" :disabled="unavailable||opening" :aria-label="homeReviewPriorityLabels[kind]+'，'+(unavailable?'数据暂不可用':counts[kind]+' 个单词，查看详情')" @click="open(kind)">
    <view class="priority-art" aria-hidden="true"><image v-if="!failed.has(kind)" :src="icons[kind]" mode="aspectFit" @error="failed.add(kind)"/><text v-else class="priority-icon-fallback">{{fallback[kind]}}</text></view>
    <text class="priority-dot" aria-hidden="true"/><text class="priority-name">{{homeReviewPriorityLabels[kind]}}</text><view class="priority-count"><text>{{unavailable?'—':counts[kind]}}</text><text v-if="!unavailable"> 个</text></view><view class="priority-arrow" aria-hidden="true"><view/></view>
   </WPActionTile>
  </view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import WPCard from '../wp-card/WPCard.vue'
import WPActionTile from '../button/WPActionTile.vue'
import {useThemeStore} from '../../stores/theme'
import {windowLayout as layout} from '../../services/window'
import {homeReviewPriorities,homeReviewPriorityLabels,type HomeReviewPriority} from '../../services/home-review-priority'
import heading from '../../static/icons/home-priority/heading.png'
import due from '../../static/icons/home-priority/due.png'
import weak from '../../static/icons/home-priority/weak.png'
import known from '../../static/icons/home-priority/known.png'
const props=defineProps<{counts:Record<HomeReviewPriority,number>;unavailable?:boolean}>(),emit=defineEmits<{open:[kind:HomeReviewPriority]}>()
const theme=useThemeStore(),icons={heading,due,weak,known},fallback={due:'复',weak:'练',known:'词'},failed=ref(new Set<string>()),opening=ref(false)
const width=ref(320),instance=getCurrentInstance(),stacked=computed(()=>width.value<270||Math.max(layout.fontScale,theme.settings.largeText?1.25:1)>=1.4||(width.value<310&&theme.settings.largeText))
const countWidth=computed(()=>Math.max(4,...Object.values(props.counts).map(value=>String(value).length+3))+'ch')
let release:ReturnType<typeof setTimeout>|undefined
function open(kind:HomeReviewPriority){if(props.unavailable||opening.value)return;opening.value=true;emit('open',kind);release=setTimeout(()=>opening.value=false,650)}
function measure(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.home-priority-content').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()})}
watch(()=>[layout.width,layout.height,layout.fontScale,theme.settings.largeText],measure)
onMounted(measure);onShow(()=>{opening.value=false;measure()});onUnmounted(()=>clearTimeout(release))
// #ifdef H5
let observer:ResizeObserver|undefined
onMounted(()=>{const element=instance?.proxy?.$el as HTMLElement|undefined;if(element&&typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(measure);observer.observe(element)}})
onUnmounted(()=>observer?.disconnect())
// #endif
</script>
<style scoped>
.home-priority.home-priority-clay.wp-card{width:100%;min-width:0;padding:20px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:var(--wp-surface-raised);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 5px 14px rgba(108,73,39,.05)}
.home-priority-content{width:100%;max-width:720px;min-width:0;margin:auto}
.priority-heading{display:flex;align-items:center;gap:10px;margin:0 0 16px;color:var(--wp-foreground);font-size:var(--wp-font-section);font-weight:700;line-height:1.4}
.priority-heading-icon{width:42px;height:42px;flex:none}
.home-priority-row.wp-action-tile{--priority-tone:var(--wp-clay-review-due-ink);--priority-tint:var(--wp-clay-review-due);display:grid;grid-template-columns:48px 7px minmax(0,1fr) max(64px,calc(var(--priority-count-width) + 24px)) 36px;align-items:center;gap:8px;width:100%;min-height:80px;height:auto;margin:0 0 12px;padding:12px;border:1px solid var(--wp-border);border-radius:22px;background:linear-gradient(110deg,var(--wp-surface),var(--priority-tint));color:var(--wp-foreground);text-align:left;line-height:1.5;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 2px 5px rgba(108,73,39,.03);transition:box-shadow var(--wp-motion-fast),border-color var(--wp-motion-fast)}
.home-priority-row:last-child{margin-bottom:0}
.priority-weak.wp-action-tile{--priority-tone:var(--wp-warning);--priority-tint:var(--wp-clay-task)}
.priority-known.wp-action-tile{--priority-tone:var(--wp-element-earth);--priority-tint:var(--wp-earth-soft)}
.priority-art{width:48px;height:48px;display:flex;align-items:center;justify-content:center;grid-column:1;grid-row:1}
.priority-art image{width:100%;height:100%}
.priority-icon-fallback{display:flex;align-items:center;justify-content:center;min-width:36px;min-height:36px;border-radius:12px;background:var(--wp-secondary);color:var(--wp-foreground);font-size:var(--wp-font-body);font-weight:600}
.priority-dot{grid-column:2;grid-row:1;width:7px;height:7px;border-radius:50%;background:var(--priority-tone)}
.priority-name{grid-column:3;grid-row:1;min-width:0;font-size:max(var(--wp-font-body-large),calc(var(--wp-font-body)*1.0625));font-weight:600;overflow-wrap:anywhere}
.priority-count{grid-column:4;grid-row:1;display:flex;align-items:center;justify-content:center;min-width:0;min-height:38px;flex-wrap:wrap;column-gap:3px;padding:4px 8px;border:1px solid var(--wp-border);border-radius:24px;background:var(--priority-tint);color:var(--priority-tone);font-size:max(var(--wp-font-body-large),calc(var(--wp-font-body)*1.125));font-weight:700;font-variant-numeric:tabular-nums;text-align:center;overflow-wrap:anywhere}
.priority-arrow{grid-column:5;grid-row:1;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--wp-border);border-radius:50%;background:var(--wp-surface);box-shadow:0 2px 3px rgba(108,73,39,.04)}
.priority-arrow>view{width:8px;height:8px;margin-left:-3px;border-top:2px solid var(--wp-primary);border-right:2px solid var(--wp-primary);transform:rotate(45deg)}
.home-priority-row.wp-action-tile:not([disabled]):active{border-color:var(--wp-primary);box-shadow:var(--wp-clay-pressed)}
.home-priority-row.wp-action-tile:focus-visible{outline:3px solid var(--wp-focus-ring);outline-offset:3px}
.home-priority-row.wp-action-tile[disabled]{opacity:.8}
.priority-unavailable{display:block;margin-bottom:12px;font-size:var(--wp-font-small);line-height:1.6;color:var(--wp-foreground)}
.priority-stacked .home-priority-row{grid-template-columns:36px 7px minmax(0,1fr) 36px;column-gap:8px;row-gap:5px}
.priority-stacked .priority-art{width:36px;height:36px;grid-row:1 / span 2}
.priority-stacked .priority-count{grid-column:3;grid-row:2;justify-self:stretch}
.priority-stacked .priority-arrow{grid-column:4;grid-row:1 / span 2}
.high-contrast .home-priority-clay.wp-card,.high-contrast .home-priority-row.wp-action-tile,.high-contrast .priority-count,.high-contrast .priority-arrow{box-shadow:none;border-width:2px}
.reduce-motion .home-priority-row.wp-action-tile{transition:none}
@media(max-width:599px){.home-priority.home-priority-clay.wp-card{padding:16px}.home-priority-row.wp-action-tile{grid-template-columns:40px 7px minmax(0,1fr) max(64px,calc(var(--priority-count-width) + 24px)) 36px;padding:10px;gap:7px}.priority-art{width:40px;height:40px}.priority-heading-icon{width:38px;height:38px}.priority-stacked .home-priority-row{grid-template-columns:36px 7px minmax(0,1fr) 36px;column-gap:7px;row-gap:5px}}
@media(prefers-reduced-motion:reduce){.home-priority-row.wp-action-tile{transition:none}}
</style>
