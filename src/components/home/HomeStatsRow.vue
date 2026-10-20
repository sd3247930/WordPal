<template>
 <view class="home-stats-wrap">
  <view class="hero-counts home-stats-strip" :class="{'stats-wide-values':wideValues,'stats-large-text':layout.fontScale>=1.4||theme.settings.largeText,'stats-a11y-stack':layout.fontScale>=1.75}" role="group" aria-label="今日学习概览">
   <view v-for="item in items" :key="item.id" class="home-stat" :class="'home-stat-'+item.id" :data-stat="item.id" role="group" :aria-label="item.label+'，'+(item.value==='—'?'数据暂不可用':item.value+' '+item.unit+'，'+item.description)">
    <view class="home-stat-icon" aria-hidden="true"><image v-if="!failed.has(item.id)" :src="homeStatIconSource(item.id)" mode="aspectFit" @error="failed.add(item.id)"/><text v-else class="home-stat-fallback">{{item.fallback}}</text></view>
    <view class="home-stat-copy" aria-hidden="true"><text class="home-stat-title">{{item.label}}</text><view class="home-stat-reading"><text class="home-stat-value">{{item.value}}</text><text class="home-stat-unit">{{item.unit}}</text></view></view>
   </view>
  </view>
  <text v-if="unavailable" class="home-stats-unavailable small muted" role="status">统计暂不可用，请先恢复学习档案。</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import {windowLayout as layout} from '../../services/window'
import {useThemeStore} from '../../stores/theme'
import {homeStatIconSource,type HomeStatName} from '../../services/home-stat-icons'
const props=defineProps<{streak:number|null;due:number|null;planned:number|null;unavailable?:boolean}>(),theme=useThemeStore(),failed=ref(new Set<HomeStatName>())
const count=(value:number|null)=>!props.unavailable&&Number.isSafeInteger(value)&&value!==null&&value>=0?String(value):'—'
const items=computed(()=>[
 {id:'streak' as const,label:'连续学习',value:count(props.streak),unit:'天',description:'有效学习连续天数',fallback:'日'},
 {id:'review' as const,label:'今日复习',value:count(props.due),unit:'个',description:'当前教材到期待复习',fallback:'复'},
 {id:'new' as const,label:'今日新词',value:count(props.planned),unit:'个',description:'当前每日任务词数',fallback:'词'}
])
const wideValues=computed(()=>items.value.some(item=>item.value.length>2))
</script>
<style scoped>
.home-stats-wrap{margin-bottom:16px;min-width:0}
.home-stats-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;min-height:108px;padding:16px 8px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:linear-gradient(180deg,var(--wp-surface),var(--wp-surface-raised));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 3px 8px rgba(80,52,30,.08)}
.home-stat{position:relative;display:flex;align-items:center;justify-content:center;gap:9px;min-width:0;padding:0 12px;cursor:default}
.home-stat+.home-stat::before{content:'';position:absolute;left:0;top:22%;bottom:22%;width:1px;background:var(--wp-divider)}
.home-stat-icon{display:flex;align-items:center;justify-content:center;flex:0 0 42px;width:42px;height:42px}
.home-stat-icon image{width:100%;height:100%;display:block}
.home-stat-fallback{font-size:var(--wp-font-body);color:var(--wp-foreground)}
.home-stat-copy{display:flex;flex-direction:column;gap:4px;min-width:0;max-width:100%}
.home-stat-title{font-size:var(--wp-font-small);font-weight:600;line-height:1.4;color:var(--wp-foreground);overflow-wrap:anywhere}
.home-stat-reading{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px;max-width:100%;line-height:1.2}
.home-stat-value{min-width:0;max-width:100%;font-size:calc(var(--wp-font-body)*1.75);font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.home-stat-unit{font-size:var(--wp-font-small);font-weight:600}
.home-stat-streak .home-stat-reading{color:var(--wp-element-fire)}
.home-stat-review .home-stat-reading{color:var(--wp-element-water)}
.home-stat-new .home-stat-reading{color:var(--wp-element-earth)}
.home-stats-unavailable{display:block;margin-top:8px;line-height:1.5}
.stats-wide-values .home-stat,.stats-large-text .home-stat{flex-direction:column;align-items:flex-start}
.stats-wide-values .home-stat-value{font-size:calc(var(--wp-font-body)*1.5)}
.high-contrast .home-stats-strip{border-color:var(--wp-foreground);box-shadow:none;background:var(--wp-surface)}
.high-contrast .home-stat+.home-stat::before{background:var(--wp-foreground)}
.high-contrast .home-stat-reading{color:var(--wp-foreground)}
@media(max-width:999px){.home-stat{gap:7px;padding:0 10px}.home-stat-icon{flex-basis:38px;width:38px;height:38px}}
@media(max-width:599px){.home-stats-wrap{margin-bottom:12px}.home-stats-strip{padding:14px 4px;min-height:104px}.home-stat{gap:6px;padding:0 6px}.home-stat-icon{flex-basis:36px;width:36px;height:36px}.home-stat-title{font-size:var(--wp-font-small)}}
@media(min-width:353px) and (max-width:379px){.home-stat{gap:5px;padding:0 4px}.home-stat-icon{flex-basis:32px;width:32px;height:32px}}
@media(max-width:352px){.home-stat{flex-direction:column;align-items:flex-start;padding:0 8px}.home-stat-value{font-size:calc(var(--wp-font-body)*1.5)}}
.home-stats-strip.stats-a11y-stack{grid-template-columns:minmax(0,1fr);padding:8px 16px}
.stats-a11y-stack .home-stat{flex-direction:row;align-items:center;justify-content:flex-start;padding:16px 0}
.stats-a11y-stack .home-stat+.home-stat::before{top:0;bottom:auto;left:0;right:0;width:auto;height:1px}
</style>
