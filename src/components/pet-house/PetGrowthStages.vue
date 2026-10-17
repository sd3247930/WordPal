<template>
 <view :class="variant==='growth'?'growth-track':'pet-album-grid'" class="pet-form-gallery" role="group" :aria-label="petInfo[pet.element].name+'的精灵形态'">
  <WPActionTile v-for="(stage,i) in petStages" :key="stage.title" class="pet-form-card" :class="[variant==='growth'?'growth-step':'pet-album-entry','stage-'+presentations[i].state,{reached:presentations[i].unlocked,locked:!presentations[i].unlocked,'form-selected':forms.stage(pet.element)===i+1}]" :disabled="!presentations[i].unlocked" :data-state="presentations[i].state" :aria-label="stage.title+'，'+(presentations[i].unlocked?'已解锁':'点亮进度 '+presentations[i].percent+'%')" :aria-describedby="progressId(i)" :aria-pressed="forms.stage(pet.element)===i+1" @click="choose(i+1)">
   <view class="pet-form-art" :class="{'album-art':variant==='album'}">
    <view class="pet-form-sprite" :class="{'pet-unlock-pop':celebrating.includes(i)}" :style="{filter:presentations[i].unlocked?'none':'grayscale('+presentations[i].grayscale+'%)',opacity:presentations[i].opacity}">
     <PetHousePetArt :element="pet.element" :stage="i+1" :badge="false"/>
    </view>
    <view v-if="!presentations[i].unlocked" class="pet-form-veil" :style="{opacity:presentations[i].veil}" aria-hidden="true"/>
    <view v-if="!presentations[i].unlocked" class="pet-form-lock" aria-hidden="true"><view class="pet-lock-shackle"/><view class="pet-lock-body"/></view>
   </view>
   <view class="pet-form-copy">
    <view class="pet-form-heading"><text class="pet-form-title">{{stage.title}}</text><text class="pet-form-requirement">{{stage.level?'Lv.'+stage.level+' 解锁':'全部教材学习 100%'}}</text></view>
    <view class="pet-form-progress"><text :id="progressId(i)" class="pet-form-progress-label">{{presentations[i].unlocked?'点亮完成':'点亮进度'}} {{presentations[i].percent}}%</text><WPProgress :value="presentations[i].percent" :total="100" :label="stage.title+'点亮进度'"/></view>
    <text class="pet-form-status">{{presentations[i].unlocked?(forms.stage(pet.element)===i+1?'✓ 当前形态':'全彩已解锁 · 切换 →'):'还需 '+presentations[i].remaining+(i===3?' 词':' 经验')}}</text>
   </view>
  </WPActionTile>
 </view>
 <text v-if="forms.error" class="notice" role="status">{{forms.error}}</text>
</template>
<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPProgress from '../wp-progress/WPProgress.vue'
import PetHousePetArt from './PetHousePetArt.vue'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import {petStages,petStagePresentation,type PetCurriculumProgress} from '../../services/pet-growth'
import {usePetFormsStore} from '../../stores/pet-forms'
const props=withDefaults(defineProps<{pet:PetState;curriculum:PetCurriculumProgress;variant?:'growth'|'album'}>(),{variant:'growth'})
const forms=usePetFormsStore(),presentations=computed(()=>petStages.map((_,i)=>petStagePresentation(props.pet,i,props.curriculum)))
const celebrating=ref<number[]>([])
let celebrationTimer:ReturnType<typeof setTimeout>|undefined
const progressId=(index:number)=>'pet-form-progress-'+props.variant+'-'+props.pet.element+'-'+index
function celebrate(indices:number[]){if(celebrationTimer)clearTimeout(celebrationTimer);celebrating.value=indices;celebrationTimer=setTimeout(()=>{celebrating.value=[]},600)}
function choose(form:number){if(forms.stage(props.pet.element)!==form&&forms.choose(props.pet.element,form))celebrate([form-1])}
watch(()=>({element:props.pet.element,unlocks:presentations.value.map(p=>p.unlocked)}),(next,previous)=>{
 if(next.element!==previous.element){celebrating.value=[];return}
 const revealed=next.unlocks.flatMap((unlocked,i)=>unlocked&&!previous.unlocks[i]?[i]:[])
 if(revealed.length)celebrate(revealed)
})
onUnmounted(()=>{if(celebrationTimer)clearTimeout(celebrationTimer)})
</script>
<style>
.pet-house .pet-form-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr;align-items:start;gap:var(--wp-card-gap,12px);margin:0;min-width:0}
.pet-house .pet-form-card{display:flex;flex-direction:column;align-items:center;align-self:stretch;gap:var(--wp-space-xs,6px);min-width:0;width:100%;margin:0;padding:10px 8px;border:2px solid var(--pet-border);border-radius:var(--pet-button-radius);background:var(--pet-surface);color:var(--pet-text);white-space:normal;line-height:1.4;text-align:center;opacity:1}
.pet-house .pet-form-card.form-selected{border-color:var(--pet-accent);background:var(--pet-tonal)}
.pet-house .pet-form-card[disabled]{background:var(--pet-soft);color:var(--pet-text);cursor:default;opacity:1}
.pet-house .pet-form-card:focus-visible{outline:2px solid var(--pet-accent);outline-offset:2px}
.pet-house .pet-form-art{position:relative;width:100%;max-width:150px;height:auto;aspect-ratio:3/4;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:var(--wp-radius-sm);background:var(--pet-tonal);overflow:hidden;isolation:isolate}
.pet-form-copy{display:flex;flex-direction:column;gap:var(--wp-space-xs,6px);flex:1;width:100%;min-width:0;justify-content:center}
.pet-form-heading{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:2px 6px;min-width:0}
.pet-form-sprite{position:absolute;inset:0;width:100%;height:100%;transform-origin:center;transition:filter .36s ease,opacity .36s ease}
.pet-form-veil{position:absolute;inset:0;pointer-events:none;background:linear-gradient(160deg,var(--pet-surface),transparent 58%,var(--pet-surface));transition:opacity .36s ease}
.pet-form-lock{position:absolute;right:6px;top:6px;width:26px;height:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;border-radius:9px;background:var(--pet-surface);color:var(--pet-muted);border:1px solid var(--pet-border)}
.pet-lock-shackle{width:10px;height:8px;border:2px solid currentColor;border-bottom:0;border-radius:6px 6px 0 0}.pet-lock-body{width:14px;height:10px;border:2px solid currentColor;border-radius:3px}
.pet-form-title{font-size:clamp(16px,var(--wp-font-body),20px);font-weight:600;color:var(--pet-text)}
.pet-form-requirement{font-size:clamp(12px,var(--wp-font-caption),16px);color:var(--pet-muted);overflow-wrap:anywhere}
.pet-form-progress{display:flex;flex-direction:column;gap:4px;width:100%;padding:0;min-width:0}
.pet-form-progress-label{font-size:clamp(12px,var(--wp-font-caption),16px);color:var(--pet-muted);overflow-wrap:anywhere}
.pet-form-progress .progress{height:6px;background:var(--pet-soft)}.pet-form-progress .bar{background:var(--pet-accent)}
.pet-form-status{font-size:clamp(13px,var(--wp-font-caption),16px);font-weight:600;color:var(--pet-muted);overflow-wrap:anywhere}
.stage-unlocked .pet-form-status{color:var(--pet-accent)}
.pet-unlock-pop{animation:pet-form-reveal .52s ease-out}
@keyframes pet-form-reveal{0%,100%{transform:scale(1)}48%{transform:scale(1.025)}}
.pet-house-reduced .pet-form-sprite{transition:none;animation:none}
@media(prefers-reduced-motion:reduce){.pet-form-sprite{transition:none;animation:none}}
@media(min-width:760px) and (max-width:1099px){.pet-house .pet-form-card{flex-direction:row;gap:12px;padding:12px;text-align:left}.pet-house .pet-form-art{width:132px}.pet-form-heading{justify-content:flex-start}}
@media(min-width:1100px){.pet-house .pet-form-gallery{grid-template-columns:repeat(4,minmax(0,1fr))}}
.large-text .pet-house .pet-form-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.large-text .pet-house .pet-form-card{flex-direction:column;text-align:center}.large-text .pet-form-heading{justify-content:center}
@media(max-width:359px){.large-text .pet-house .pet-form-gallery{grid-template-columns:minmax(0,1fr)}}
</style>
