<template>
 <WPActionTile role="button" tabindex="0" toggle-highlight class="pet-choice wp-pet-card" :class="['element-'+pet.element,{selected}]" :aria-label="'选择'+info.name+'陪伴并查看详情'" :aria-pressed="selected" @click="$emit('choose',pet.element)">
  <WPPetAsset :element="pet.element" variant="avatar" :size="48"/>
  <view class="pet-card-copy"><text class="pet-card-name">{{info.name}}</text><text class="pet-card-element">{{info.elementName}}精灵</text><text class="pet-card-meta">Lv.{{pet.level}} · {{moods[pet.mood]}}</text><text class="pet-card-status">{{selected?'陪伴中':'查看详情 →'}}</text></view>
 </WPActionTile>
</template>
<script setup lang="ts">
import WPActionTile from "../button/WPActionTile.vue"

import {computed} from 'vue'
import WPPetAsset from '../WPPetAsset.vue'
import {petInfo,type PetState} from '../../../packages/pet_engine'
const props=defineProps<{pet:PetState;selected:boolean}>()
defineEmits(['choose'])
const info=computed(()=>petInfo[props.pet.element])
const moods={calm:'平静',happy:'开心',excited:'兴奋',curious:'好奇'}
</script>
<style scoped>
.wp-pet-card{display:flex;align-items:center;gap:10px;padding:14px 12px;margin:0;min-width:0;min-height:112px;border:2px solid var(--wp-border);border-radius:var(--wp-radius);background:var(--wp-surface);color:var(--wp-foreground);text-align:left;transition:border-color var(--wp-motion-fast)}
.wp-pet-card.selected{border-color:var(--wp-element-color);background:var(--wp-element-soft)}
.pet-card-copy{min-width:0;display:flex;flex-direction:column;gap:3px}
.pet-card-name{font-weight:var(--wp-weight-bold);font-size:var(--wp-font-body)}
.pet-card-element,.pet-card-meta,.pet-card-status{font-size:var(--wp-font-caption);color:var(--wp-muted-foreground);line-height:1.5}
.pet-card-status{color:var(--wp-element-color);margin-top:3px}
</style>
