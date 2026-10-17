<template>
 <WPActionTile class="pet-study-link" :disabled="opening" :aria-busy="opening||undefined" :aria-label="'和宠物一起去学习，'+petInfo[pet.element].name" @click="openStudy">
  <view class="pet-study-illustration" :data-element="pet.element" :data-form="forms.stage(pet.element)" aria-hidden="true"><view class="pet-study-character"><PetHousePetArt :element="pet.element" :cosmetic="pet.equippedCosmetics[0]" :badge="false"/></view><PetGrowthIcon class="pet-study-book" name="book"/></view>
  <view class="pet-study-copy"><text class="growth-card-title">和宠物一起去学习</text><text class="growth-card-note">{{petInfo[pet.element].name}}陪你{{destination==='course'?'选择一本教材':'继续当前教材'}}</text></view><text class="pet-study-arrow" aria-hidden="true">→</text>
 </WPActionTile>
</template>
<script setup lang="ts">
import {computed,ref,onUnmounted} from 'vue'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import {useProfileStore} from '../../stores/profile'
import {usePetFormsStore} from '../../stores/pet-forms'
import {petStudyDestination} from '../../services/pet-growth-dashboard'
import {navigate,openCourseGallery} from '../../services/navigation'
import WPActionTile from '../button/WPActionTile.vue'
import PetHousePetArt from './PetHousePetArt.vue'
import PetGrowthIcon from './PetGrowthIcon.vue'
defineProps<{pet:PetState}>()
const profile=useProfileStore(),forms=usePetFormsStore(),opening=ref(false)
const destination=computed(()=>petStudyDestination(profile.db.currentCourseId||'starter'))
let release:ReturnType<typeof setTimeout>|undefined
function openStudy(){if(opening.value)return;opening.value=true;if(destination.value==='course')openCourseGallery();else navigate('learn');release=setTimeout(()=>opening.value=false,1000)}
onUnmounted(()=>{if(release)clearTimeout(release)})
</script>
<style>
.pet-house .pet-study-link{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;margin:0;padding:14px 16px 18px;min-width:0;min-height:152px;border:1px solid var(--growth-border,var(--pet-border));border-radius:24px;background:var(--growth-study,var(--pet-surface));color:var(--pet-text);text-align:center;white-space:normal;line-height:1.5}
.pet-study-illustration{position:relative;width:104px;height:124px;flex-shrink:0;isolation:isolate}.pet-study-character{position:absolute;inset:0 0 15px}.pet-study-book.pet-growth-symbol{position:absolute;bottom:-10px;left:10px;z-index:2;width:84px;height:84px}.pet-study-copy{display:flex;flex-direction:column;gap:6px;min-width:0;width:100%;flex:1}.pet-study-arrow{position:absolute;right:16px;top:16px;font-size:26px;font-weight:600;flex-shrink:0;color:var(--pet-accent)}
.pet-study-copy .growth-card-title{font-size:clamp(18px,var(--wp-font-body),23px);font-weight:600;color:var(--pet-text);overflow-wrap:anywhere}.pet-study-copy .growth-card-note{font-size:clamp(14px,var(--wp-font-caption),18px);color:var(--pet-muted);overflow-wrap:anywhere}
.pet-house .pet-study-link:focus-visible{outline:2px solid var(--pet-accent);outline-offset:3px}.pet-house .pet-study-link:active{border-color:var(--pet-accent)}
@media(min-width:600px){.pet-house .pet-study-link{justify-content:center}}
</style>
