<template>
 <view class="wp-pastel-progress" :class="['pastel-'+variant,{empty:percent===null,reduced:theme.reduced,contrast:theme.settings.highContrast,changed:animate}]" :role="percent===null?'img':'progressbar'" :aria-label="label+(percent===null?'，暂无数值':'')" :aria-valuenow="percent===null?undefined:percent" :aria-valuemin="percent===null?undefined:0" :aria-valuemax="percent===null?undefined:100" :aria-valuetext="percent===null?undefined:valueText" :data-empty="percent===null">
  <view class="pastel-progress-fill" :style="{width:(percent??0)+'%'}"/>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {safePetPercent,type PetStatusName} from '../../services/pet-status'
const props=defineProps<{value:number|null;max:number;variant:PetStatusName;label:string;valueText?:string;identity?:string}>(),theme=useThemeStore()
const percent=computed(()=>safePetPercent(props.value,props.max)),animate=ref(false)
// Mounted values and switching companions snap directly to their saved state.
watch([()=>props.identity,percent],(current,previous)=>{animate.value=!theme.reduced&&current[0]===previous[0]&&current[1]!==null&&previous[1]!==null})
</script>
<style scoped>
.wp-pastel-progress{height:12px;width:100%;min-width:0;flex-shrink:0;box-sizing:border-box;border:1px solid var(--status-progress-border,var(--pet-border));border-radius:999px;overflow:hidden;background:var(--status-progress-track,var(--pet-soft));box-shadow:inset 0 1px 2px rgba(62,53,83,.06)}
.pastel-progress-fill{height:100%;max-width:100%;border-radius:inherit;background:var(--status-fill);box-shadow:inset 0 2px 1px rgba(255,255,255,.3);transition:none}
.changed .pastel-progress-fill{transition:width 220ms ease-out}.reduced .pastel-progress-fill,.contrast .pastel-progress-fill{transition:none;box-shadow:none}.contrast .pastel-progress-fill{background:var(--pet-text)}
@media(min-width:768px){.wp-pastel-progress{height:14px}}
@media(prefers-reduced-motion:reduce){.pastel-progress-fill{transition:none!important}}
</style>
