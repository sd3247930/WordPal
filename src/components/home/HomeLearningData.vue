<template>
 <WPCard class="home-data home-learning-data-clay" role="region" aria-label="学习数据">
  <view ref="contentElement" class="learning-data-content" :class="{'learning-data-wide':wide,'learning-data-large':large,'learning-metrics-stacked':stacked}" :style="{'--learning-count-width':countWidth,'--learning-ring-size':ringSize+'px'}">
   <view class="learning-data-heading"><view class="learning-data-title"><image v-if="!failed.has('heading')" class="learning-heading-icon" :src="icons.heading" mode="aspectFit" aria-hidden="true" @error="failed.add('heading')"/><text v-else class="learning-icon-fallback" aria-hidden="true">▥</text><text>学习数据</text></view><WPChip class="learning-data-source">真实记录</WPChip></view>
   <text v-if="unreadable" class="learning-data-unavailable" role="status">学习统计暂不可用，请在设置中恢复档案后再试。</text>
   <view class="learning-data-body">
    <view class="learning-data-rate">
     <view class="learning-data-ring" :role="accuracy===null?'img':'progressbar'" :aria-label="accuracy===null?'今日正确率，'+(unreadable?'统计暂不可用':'暂无答题记录'):'今日正确率'" :aria-valuenow="accuracy===null?undefined:accuracy" :aria-valuemin="accuracy===null?undefined:0" :aria-valuemax="accuracy===null?undefined:100" :aria-valuetext="accuracy===null?undefined:accuracy+'%'" :style="{'--learning-ring-angle':(accuracy===null?0:accuracy*3.6)+'deg'}">
      <view class="learning-ring-face" aria-hidden="true"><view class="learning-rate-reading"><text class="learning-rate-number">{{accuracy===null?'—':accuracy}}</text><text v-if="accuracy!==null" class="learning-rate-percent">%</text></view><text v-if="!large" class="learning-rate-label">今日正确率</text><image v-if="!large&&!failed.has('accuracy')" class="learning-rate-book" :src="icons.accuracy" mode="aspectFit" @error="failed.add('accuracy')"/></view>
     </view>
     <text v-if="large" class="learning-rate-label">今日正确率</text><image v-if="large&&!failed.has('accuracy')" class="learning-rate-book" :src="icons.accuracy" mode="aspectFit" aria-hidden="true" @error="failed.add('accuracy')"/>
     <text v-if="!unreadable&&accuracy===null" class="learning-rate-empty">今天还没有答题记录</text>
    </view>
    <view class="learning-data-metrics">
     <view v-for="item in metrics" :key="item.id" class="learning-data-metric" :class="'learning-metric-'+item.id" role="group" :aria-label="item.label+'，'+(unreadable?'统计暂不可用':item.value+item.unit)">
      <view class="learning-metric-art" aria-hidden="true"><image v-if="!failed.has(item.id)" :src="icons[item.id]" mode="aspectFit" @error="failed.add(item.id)"/><text v-else class="learning-icon-fallback">{{item.fallback}}</text></view><text class="learning-metric-value">{{unreadable?'—':item.value}}</text><view class="learning-metric-divider" aria-hidden="true"/><text class="learning-metric-label">{{item.label}}</text>
     </view>
    </view>
   </view>
  </view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import type {HomeLearningData} from '../../services/learning/StudyStats'
import {windowLayout as layout} from '../../services/window'
import {useThemeStore} from '../../stores/theme'
import WPCard from '../wp-card/WPCard.vue'
import WPChip from '../wp-chip/WPChip.vue'
import heading from '../../static/icons/home-learning-data/heading.png'
import accuracyIcon from '../../static/icons/home-learning-data/accuracy.png'
import newIcon from '../../static/icons/home-learning-data/new.png'
import review from '../../static/icons/home-learning-data/review.png'
import effective from '../../static/icons/home-learning-data/effective.png'
const props=defineProps<{stats:HomeLearningData|null;unavailable?:boolean}>(),theme=useThemeStore(),icons={heading,accuracy:accuracyIcon,new:newIcon,review,effective},failed=ref(new Set<string>())
const unreadable=computed(()=>!!props.unavailable||!props.stats),accuracy=computed(()=>unreadable.value?null:props.stats!.accuracy)
const metrics=computed(()=>[
 {id:'new' as const,label:'新学单词',value:props.stats?.newWords||0,unit:' 个，当前教材正式完成词',fallback:'词'},
 {id:'review' as const,label:'复习次数',value:props.stats?.reviewEvents||0,unit:' 次，当日已保存到期复习答题',fallback:'复'},
 {id:'effective' as const,label:'有效学习',value:props.stats?.effectiveEvents||0,unit:' 次，当日已保存答题',fallback:'学'}
])
const width=ref(280),contentElement=ref<HTMLElement|{$el?:HTMLElement}>(),instance=getCurrentInstance(),scale=computed(()=>Math.max(layout.fontScale,theme.settings.largeText?1.25:1)),large=computed(()=>scale.value>=1.4),wide=computed(()=>!large.value&&width.value>=520*scale.value)
const countWidth=computed(()=>Math.max(2,...metrics.value.map(item=>String(item.value).length))+'ch'),stacked=computed(()=>large.value||width.value<240||metrics.value.some(item=>String(item.value).length>4))
const ringSize=computed(()=>Math.min(wide.value?(width.value-24)*.42:width.value,Math.min(248,Math.max(192,(wide.value?232:208)*scale.value))))
function measure(){void nextTick(()=>{
 // #ifdef H5
 const element=contentElement.value instanceof HTMLElement?contentElement.value:contentElement.value?.$el
 if(element){const measured=element.getBoundingClientRect().width;if(measured>0)width.value=measured;return}
 // #endif
 if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.learning-data-content').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()
})}
watch(()=>[layout.width,layout.height,layout.fontScale,theme.settings.largeText],measure)
onMounted(measure);onShow(measure)
// #ifdef H5
let observer:ResizeObserver|undefined
onMounted(()=>{void nextTick(()=>{const element=contentElement.value instanceof HTMLElement?contentElement.value:contentElement.value?.$el;if(element&&typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(entries=>{const measured=entries[0]?.contentRect.width;if(measured>0)width.value=measured});observer.observe(element)}})})
onUnmounted(()=>observer?.disconnect())
// #endif
</script>
<style scoped>
.home-data.home-learning-data-clay.wp-card{display:block;width:100%;min-width:0;padding:20px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:var(--wp-surface-raised);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 5px 14px rgba(108,73,39,.05)}
.learning-data-content{max-width:800px;min-width:0;width:100%;margin:auto}
.learning-data-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px}
.learning-data-title{display:flex;align-items:center;gap:10px;min-width:0;color:var(--wp-foreground);font-size:var(--wp-font-section);font-weight:700;line-height:1.4;overflow-wrap:anywhere}
.learning-heading-icon{width:40px;height:40px;flex:none}
.learning-data-source.wp-chip{min-height:34px;margin-left:auto;padding:5px 12px;background:var(--wp-secondary);color:var(--wp-primary);font-size:var(--wp-font-small);line-height:1.4;font-weight:600;border-radius:var(--wp-radius-chip)}
.learning-data-body{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;gap:20px;min-width:0}
.learning-data-rate{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;color:var(--wp-foreground)}
.learning-data-ring{--learning-ring-progress:var(--wp-brand);box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex:none;width:var(--learning-ring-size);height:var(--learning-ring-size);max-width:100%;padding:10px;border-radius:50%;background:conic-gradient(var(--learning-ring-progress) var(--learning-ring-angle),var(--wp-secondary) 0)}
.learning-ring-face{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;height:100%;padding:8px;border-radius:50%;background:var(--wp-surface-raised)}
.learning-rate-reading{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;max-width:100%;font-variant-numeric:tabular-nums;line-height:1.1;color:var(--wp-foreground)}
.learning-rate-number{font-size:calc(var(--wp-font-body)*2.75);font-weight:700;overflow-wrap:anywhere}
.learning-rate-percent{font-size:calc(var(--wp-font-body)*1.35);font-weight:600;line-height:1.1}
.learning-rate-label{display:block;max-width:100%;font-size:var(--wp-font-body);line-height:1.45;color:var(--wp-muted-foreground);text-align:center;overflow-wrap:anywhere}
.learning-rate-book{display:block;flex:none;width:112px;height:80px}
.learning-rate-empty,.learning-data-unavailable{display:block;max-width:100%;font-size:var(--wp-font-small);line-height:1.6;color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.learning-rate-empty{text-align:center}.learning-data-unavailable{margin-bottom:14px;color:var(--wp-foreground)}
.learning-data-metrics{display:flex;flex-direction:column;gap:12px;min-width:0}
.learning-data-metric{--learning-metric-tint:var(--wp-clay-review-due);--learning-metric-ink:var(--wp-clay-review-due-ink);display:grid;grid-template-columns:44px max(44px,var(--learning-count-width)) 1px minmax(0,1fr);align-items:center;gap:10px;min-height:76px;width:100%;padding:12px;border:1px solid var(--wp-border);border-radius:22px;background:linear-gradient(115deg,var(--wp-surface),var(--learning-metric-tint));color:var(--learning-metric-ink);font-size:calc(var(--wp-font-body)*1.875);line-height:1.2;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 2px 5px rgba(108,73,39,.03)}
.learning-metric-review{--learning-metric-tint:var(--wp-fire-soft);--learning-metric-ink:var(--wp-element-fire)}
.learning-metric-effective{--learning-metric-tint:var(--wp-earth-soft);--learning-metric-ink:var(--wp-element-earth)}
.learning-metric-art{grid-column:1;grid-row:1;display:flex;align-items:center;justify-content:center;width:44px;height:44px}
.learning-metric-art image{width:100%;height:100%}
.learning-icon-fallback{display:flex;align-items:center;justify-content:center;min-width:32px;min-height:32px;border-radius:10px;background:var(--wp-secondary);color:var(--wp-foreground);font-size:var(--wp-font-body);font-weight:600}
.learning-metric-value{grid-column:2;grid-row:1;min-width:0;font-weight:700;font-variant-numeric:tabular-nums;text-align:center;overflow-wrap:anywhere}
.learning-metric-divider{grid-column:3;grid-row:1;width:1px;height:26px;background:var(--wp-border)}
.learning-metric-label{grid-column:4;grid-row:1;min-width:0;font-size:calc(var(--wp-font-body)*1.0625);font-weight:600;line-height:1.5;color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.learning-data-wide .learning-data-body{grid-template-columns:minmax(0,.42fr) minmax(0,.58fr);gap:24px}
.learning-metrics-stacked .learning-data-metric{grid-template-columns:40px minmax(0,1fr);gap:4px 12px}
.learning-metrics-stacked .learning-metric-art{width:40px;height:40px;grid-row:1 / span 2}
.learning-metrics-stacked .learning-metric-value{grid-column:2;grid-row:1;text-align:left}
.learning-metrics-stacked .learning-metric-label{grid-column:2;grid-row:2}
.learning-metrics-stacked .learning-metric-divider{display:none}
.high-contrast .home-learning-data-clay.wp-card,.high-contrast .learning-data-metric{border-width:2px;box-shadow:none}
.high-contrast .learning-data-ring{--learning-ring-progress:var(--wp-primary)}
@media(max-width:599px){.home-data.home-learning-data-clay.wp-card{padding:16px}.learning-heading-icon{width:36px;height:36px}.learning-data-metric{gap:8px;padding:10px;grid-template-columns:40px max(44px,var(--learning-count-width)) 1px minmax(0,1fr)}.learning-metric-art{width:40px;height:40px}.learning-metrics-stacked .learning-data-metric{grid-template-columns:40px minmax(0,1fr);gap:4px 12px}}
</style>
