<template>
 <WPCard class="home-today task-list-card home-today-clay" :class="{'home-tasks-stacked':stacked}" role="region" aria-label="今日任务">
  <view class="home-today-content">
   <view class="section-heading"><text class="today-tasks-title">今日任务</text><WPChip class="task-count" :aria-label="unreadable?'今日任务完成数暂不可用':'今日任务已完成'+completed+'项，共'+tasks.length+'项'">{{unreadable?'—':completed}} / {{tasks.length}}</WPChip></view>
   <WPButton class="hero-cta" :disabled="busy||!!unavailable" :loading="busy" @click="$emit('start')">{{actionLabel}}</WPButton>
   <text v-if="unavailable" class="task-unavailable" role="status">{{unavailable}}</text>
   <WPTaskCard v-for="task in tasks" :key="task.icon" variant="clay" :stacked="stacked" :icon="task.icon" :title="task.title" :detail="task.detail" :value="unreadable?'— / —':task.value" :element="task.element" :completed="!unreadable&&task.done" :disabled="busy||!!unavailable" action="去学习" @click="$emit('start')"/>
   <text class="today-tasks-note">{{note}}</text>
  </view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import type {Element} from '../../../packages/pet_engine'
import type {TaskIconName} from '../../services/task-icons'
import {windowLayout as layout} from '../../services/window'
import {useThemeStore} from '../../stores/theme'
import WPCard from '../wp-card/WPCard.vue'
import WPChip from '../wp-chip/WPChip.vue'
import WPButton from '../wp-button/WPButton.vue'
import WPTaskCard from '../wp-task-card/WPTaskCard.vue'
const props=defineProps<{tasks:readonly {icon:TaskIconName;title:string;detail:string;value:string;done:boolean;element:Element}[];actionLabel:string;note:string;unavailable?:string;unreadable?:boolean;busy?:boolean}>()
defineEmits<{start:[]}>()
const theme=useThemeStore(),instance=getCurrentInstance(),width=ref(320),completed=computed(()=>props.tasks.filter(task=>task.done).length)
const stacked=computed(()=>width.value<270||Math.max(layout.fontScale,theme.settings.largeText?1.25:1)>=1.4)
function measure(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.home-today-content').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()})}
watch(()=>[layout.width,layout.height,layout.fontScale,theme.settings.largeText],measure)
onMounted(measure);onShow(measure)
// #ifdef H5
let observer:ResizeObserver|undefined
onMounted(()=>{const element=instance?.proxy?.$el as HTMLElement|undefined;if(element&&typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(measure);observer.observe(element)}})
onUnmounted(()=>observer?.disconnect())
// #endif
</script>
<style scoped>
.home-today.home-today-clay.wp-card{--home-task-action-width:max(88px,calc(var(--wp-font-body)*3 + 28px));width:100%;min-width:0;padding:20px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:var(--wp-surface-raised);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 5px 14px rgba(108,73,39,.06)}
.home-today-content{width:100%;max-width:760px;min-width:0;margin:auto}
.home-today-clay .section-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:0 0 16px}
.today-tasks-title{font-size:var(--wp-font-section);font-weight:700;line-height:1.4;color:var(--wp-foreground)}
.home-today-clay .task-count.wp-chip{min-width:72px;min-height:40px;max-width:100%;padding:6px 14px;margin-left:auto;border-radius:var(--wp-radius-chip);background:var(--wp-secondary);color:var(--wp-primary);font-size:var(--wp-font-body-large);font-weight:600;font-variant-numeric:tabular-nums;line-height:1.4;overflow-wrap:anywhere}
.home-today.home-today-clay .hero-cta.wp-button{position:relative;width:100%;min-height:56px;padding:12px 16px;margin:0 0 10px;justify-content:center;border-radius:var(--wp-radius-chip);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.04)),var(--wp-primary);color:var(--wp-on-primary);border:1px solid var(--wp-primary);font-size:var(--wp-font-body-large);font-weight:700;line-height:1.5;box-shadow:inset 0 2px 2px rgba(255,255,255,.18),0 3px 0 rgba(108,73,39,.13),0 5px 10px rgba(108,73,39,.07)}
.home-today-clay .hero-cta.wp-button:not([disabled]):active{transform:translateY(1px);box-shadow:var(--wp-clay-pressed)}
.home-today-clay .hero-cta.wp-button[disabled]{box-shadow:none}
.today-tasks-note,.task-unavailable{display:block;font-size:var(--wp-font-small);line-height:1.6;color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.today-tasks-note{padding-top:12px}
.task-unavailable{padding:10px 12px;margin:6px 0;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-secondary);color:var(--wp-foreground)}
.high-contrast .home-today-clay.wp-card,.high-contrast .home-today-clay .hero-cta.wp-button{box-shadow:none;border-width:2px}
.reduce-motion .home-today-clay .hero-cta.wp-button:not([disabled]):active{transform:none}
@media(max-width:599px){.home-today.home-today-clay.wp-card{padding:16px}}
@media(prefers-reduced-motion:reduce){.home-today-clay .hero-cta.wp-button:not([disabled]):active{transform:none}}
</style>
