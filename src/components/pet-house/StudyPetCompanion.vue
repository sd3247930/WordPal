<template>
 <view v-if="theme.settings.themeId==='clay'||!identity" class="study-pet-companion study-companion-lite" :class="{'study-companion-stacked':stacked}" :data-element="identity?pet?.element:undefined" :data-form="form">
  <WPCard ref="cardRef" class="pet-companion-card study-companion-card" :class="{'study-companion-empty':!identity}">
   <view class="study-companion-layout">
    <view class="companion-portrait" :aria-hidden="true">
     <PetHousePetArt v-if="identity&&pet&&!portraitFailed" :key="pet.element+':'+form" :element="pet.element" :stage="form" :badge="false" fit="portrait" @error="portraitFailed=true"/>
     <view v-else class="study-companion-placeholder"><text>{{identity?'伙伴配图暂不可用':'等待伙伴'}}</text></view>
    </view>
    <view class="companion-card-copy">
     <text class="companion-card-title">{{identity?identity.name+'陪你一起学习':unavailable?'伙伴资料暂不可用':'还没有当前陪伴'}}</text>
     <view v-if="identity" class="companion-card-status"><text>{{identity.elementName}}精灵 · Lv.{{level}}</text><text class="companion-form-label">{{stageTitle}}</text></view>
     <text class="companion-card-note">{{identity?'每天一点，一起成长。':unavailable?'请先恢复学习档案，再查看伙伴状态。':'选好伙伴后，它会在这里陪你学习。'}}</text>
    </view>
   </view>
  </WPCard>
  <WPCard v-if="$slots.default" class="companion-card-actions study-companion-ready"><slot/></WPCard>
 </view>
 <PetCompanionCard v-else-if="pet" class="study-pet-companion" :pet="pet"><template v-if="$slots.default" #default><slot/></template></PetCompanionCard>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import {petStages} from '../../services/pet-growth'
import {windowLayout} from '../../services/window'
import {usePetFormsStore} from '../../stores/pet-forms'
import {useThemeStore} from '../../stores/theme'
import WPCard from '../wp-card/WPCard.vue'
import PetHousePetArt from './PetHousePetArt.vue'
import PetCompanionCard from './PetCompanionCard.vue'
const props=defineProps<{pet?:PetState;unavailable?:boolean}>(),theme=useThemeStore(),forms=usePetFormsStore()
const identity=computed(()=>!props.unavailable&&props.pet?petInfo[props.pet.element]:undefined)
const form=computed(()=>identity.value&&props.pet?forms.stage(props.pet.element):undefined)
const stageTitle=computed(()=>form.value?petStages[form.value-1].title:'')
const level=computed(()=>props.pet&&Number.isFinite(props.pet.level)&&props.pet.level>=1?props.pet.level:'—')
const portraitFailed=ref(false),width=ref(340),instance=getCurrentInstance(),cardRef=ref<InstanceType<typeof WPCard>>()
// Measure the actual card column: a tablet can still give this card a narrow split pane.
const stacked=computed(()=>width.value<270||Math.max(windowLayout.fontScale,theme.settings.largeText?1.25:1)>=1.4)
function measure(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.study-companion-card').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()})}
watch(()=>[props.pet?.element,form.value,props.unavailable],()=>portraitFailed.value=false)
watch(()=>[windowLayout.width,windowLayout.height,windowLayout.fontScale,theme.settings.largeText,theme.settings.themeId],measure)
onMounted(measure);onShow(measure)
// #ifdef H5
let observer:ResizeObserver|undefined
watch(cardRef,card=>{observer?.disconnect();const element=card?.$el as HTMLElement|undefined;if(element?.nodeType===1&&typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(measure);observer.observe(element)}},{flush:'post'})
onUnmounted(()=>observer?.disconnect())
// #endif
</script>
<style scoped>
.study-pet-companion{margin-bottom:12px}
.study-pet-companion :deep(.study-ready){display:flex;flex-direction:column;gap:8px;padding:0;min-width:0}
.study-pet-companion :deep(.study-ready .wp-button){width:100%;min-width:0}
.study-companion-lite{min-width:0;max-width:100%}
.study-companion-lite .study-companion-card.wp-card{display:block;padding:16px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:linear-gradient(160deg,var(--wp-surface),var(--wp-surface-raised));color:var(--wp-surface-foreground);box-shadow:0 4px 14px rgba(108,73,39,.06)}
.study-companion-layout{display:grid;grid-template-columns:minmax(0,.38fr) minmax(0,.62fr);align-items:center;gap:12px;max-width:680px;margin:auto;min-width:0}
.companion-portrait{position:relative;width:100%;max-width:192px;aspect-ratio:3/4;justify-self:center;min-width:0}
.companion-portrait>.pet-cutout{position:absolute;inset:0}
.companion-card-copy{display:flex;flex-direction:column;gap:10px;min-width:0;overflow-wrap:anywhere}
.companion-card-title{font-size:calc(var(--wp-font-body)*1.25);font-weight:700;line-height:1.4;color:var(--wp-foreground)}
.companion-card-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:var(--wp-font-small);line-height:1.5;color:var(--wp-muted-foreground)}
.companion-form-label{max-width:100%;padding:3px 10px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-chip);background:var(--wp-secondary);color:var(--wp-primary);font-size:var(--wp-font-caption);font-weight:600;line-height:1.5;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.companion-card-note{font-size:var(--wp-font-small);line-height:1.6;color:var(--wp-muted-foreground)}
.study-companion-placeholder{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:112px;padding:10px;border-radius:var(--wp-radius-sm);background:var(--wp-surface-soft);color:var(--wp-muted-foreground);font-size:var(--wp-font-small);text-align:center;overflow-wrap:anywhere}
.study-companion-ready.wp-card{margin-top:12px;min-width:0}
.study-companion-stacked .study-companion-layout{grid-template-columns:minmax(0,1fr);gap:12px}
.study-companion-stacked .companion-portrait{max-width:132px}
.study-companion-stacked .companion-card-copy{width:100%}
[data-mode=dark] .study-companion-lite .study-companion-card.wp-card,.high-contrast .study-companion-lite .study-companion-card.wp-card{box-shadow:none}
.high-contrast .study-companion-lite .study-companion-card.wp-card{border:2px solid var(--wp-border);background:var(--wp-surface)}
.high-contrast .study-companion-lite .companion-form-label{background:var(--wp-surface);color:var(--wp-foreground);border-color:var(--wp-border);box-shadow:none}
@media(min-width:840px){.study-companion-lite .study-companion-card.wp-card{padding:20px}.study-companion-layout{gap:20px}}
</style>
