<template>
 <WPCard class="pet-companion-card" :class="'companion-'+variant" :style="atmosphere" :data-element="pet.element" :data-form="forms.stage(pet.element)" :aria-label="title||identity.name+'陪你一起学习'">
  <view class="companion-portrait" aria-hidden="true"><PetHousePetArt :element="pet.element" :badge="false"/></view>
  <view class="companion-card-copy">
   <text v-if="eyebrow" class="companion-card-eyebrow">{{eyebrow}}</text>
   <text class="companion-card-title">{{title||identity.name+'陪你一起学习'}}</text>
   <view class="companion-card-status"><text>{{identity.elementName}}精灵 · Lv.{{pet.level}}</text><text class="companion-form-label">{{petStages[forms.stage(pet.element)-1].title}}</text></view>
   <text class="companion-card-note">{{note}}</text>
  </view>
  <view v-if="$slots.default" class="companion-card-actions"><slot/></view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import {petStages} from '../../services/pet-growth'
import {petHouseThemes} from '../../styles/pet-house'
import {usePetFormsStore} from '../../stores/pet-forms'
import {useThemeStore} from '../../stores/theme'
import WPCard from '../wp-card/WPCard.vue'
import PetHousePetArt from './PetHousePetArt.vue'
const props=withDefaults(defineProps<{pet:PetState;variant?:'study'|'settings'|'summary';title?:string;eyebrow?:string;note?:string}>(),{variant:'study',note:'每天一点，一起成长。'})
const forms=usePetFormsStore(),theme=useThemeStore(),identity=computed(()=>petInfo[props.pet.element])
const atmosphere=computed(()=>{
 const color=petHouseThemes[props.pet.element].primary,channels=[1,3,5].map(start=>parseInt(color.slice(start,start+2),16)).join(',')
 return {'--companion-wash':theme.settings.highContrast?'transparent':`rgba(${channels},${theme.mode==='dark'?.08:.1})`,'--companion-glow':theme.settings.highContrast?'transparent':`rgba(${channels},${theme.mode==='dark'?.16:.2})`}
})
</script>
<style scoped>
.pet-companion-card.wp-card{--companion-portrait-width:clamp(108px,28vw,144px);display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:var(--wp-space-sm);padding:var(--wp-space-sm);min-width:0;max-width:100%;border-radius:var(--wp-radius-lg);background:linear-gradient(135deg,var(--companion-wash),transparent 72%),var(--wp-surface);color:var(--wp-surface-foreground);box-shadow:var(--wp-elevation)}
.companion-portrait{position:relative;width:var(--companion-portrait-width);max-width:100%;aspect-ratio:3/4;min-width:0;border-radius:var(--wp-radius-lg);background:radial-gradient(ellipse at 50% 60%,var(--companion-glow),transparent 72%)}
.companion-portrait>.pet-cutout{position:absolute;inset:0}
.companion-card-copy{display:flex;flex-direction:column;gap:6px;min-width:0;overflow-wrap:anywhere}
.companion-card-eyebrow{font-size:var(--wp-font-caption);color:var(--wp-muted-foreground);line-height:1.5}
.companion-card-title{font-size:var(--wp-font-card);font-weight:700;line-height:1.4}
.companion-card-status{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:var(--wp-font-caption);color:var(--wp-muted-foreground);line-height:1.5}
.companion-form-label{padding:2px 6px;border-radius:var(--wp-radius-chip);border:1px solid var(--wp-divider);background:var(--wp-surface)}
.companion-card-note{font-size:var(--wp-font-small);color:var(--wp-muted-foreground);line-height:1.6}
.companion-card-actions{display:flex;flex-direction:column;align-items:stretch;gap:8px;grid-column:1/-1;width:100%;min-width:0;margin-top:2px}
.pet-companion-card.companion-settings{--companion-portrait-width:clamp(132px,25vw,180px);gap:var(--wp-space-sm);padding:var(--wp-space-md)}
.companion-settings .companion-card-title,.companion-summary .companion-card-title{font-size:var(--wp-font-section)}
.pet-companion-card.companion-summary{--companion-portrait-width:clamp(120px,15vw,156px);grid-template-columns:minmax(0,1fr);justify-items:center;padding:var(--wp-space-md);text-align:center;gap:var(--wp-space-sm)}
.companion-summary .companion-card-status{justify-content:center}
@media(min-width:840px){.pet-companion-card.companion-study{padding:16px 20px;gap:var(--wp-space-md)}}
@media(max-width:599px){.pet-companion-card.companion-settings{padding:16px}}
@media(max-width:359px){.pet-companion-card.companion-settings{grid-template-columns:minmax(0,1fr);justify-items:center;gap:8px}.companion-settings .companion-card-copy{width:100%;text-align:center}.companion-settings .companion-card-status{justify-content:center}}
@media(max-width:1199px){.pet-companion-card.companion-summary{display:none}}
</style>
