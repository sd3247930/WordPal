<template>
 <view class="pet-dress-grid" role="group" aria-label="选择精灵装扮">
  <WPActionTile v-for="item in cosmetics" :key="item.id" class="cosmetic-button" :class="{equipped:pet.equippedCosmetics.includes(item.id)}" :disabled="pet.level<item.level" :aria-label="item.name+'，'+(pet.level<item.level?'Lv.'+item.level+' 解锁':pet.equippedCosmetics.includes(item.id)?'已穿戴，点击取下':'穿戴')" :aria-pressed="pet.equippedCosmetics.includes(item.id)" @click="$emit('equip',item.id)">
   <view class="cosmetic-art"><PetDressIcon :name="item.id"/></view>
   <view class="cosmetic-copy"><text class="cosmetic-name">{{item.name}}</text><text class="cosmetic-description">{{descriptions[item.id]}}</text><text class="cosmetic-state">{{pet.level<item.level?'Lv.'+item.level+' 解锁':pet.equippedCosmetics.includes(item.id)?'✓ 已穿戴 · 点击取下':'穿戴 →'}}</text></view>
  </WPActionTile>
 </view>
</template>
<script setup lang="ts">
import WPActionTile from '../button/WPActionTile.vue'
import PetDressIcon from './PetDressIcon.vue'
import {cosmetics} from '../../stores/pet'
import type {PetState} from '../../../packages/pet_engine'
defineProps<{pet:PetState}>()
defineEmits<{equip:[id:string]}>()
const descriptions={ribbon:'多彩丝带，陪你探索',scarf:'柔软围巾，暖暖陪伴',star:'闪亮星星，记录成长'}
</script>
<style>
.pet-dress-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0}
.pet-house .pet-dress-grid .cosmetic-button{display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;justify-content:flex-start;gap:14px;margin:0;padding:14px 12px;min-height:128px;min-width:0;width:100%;border:2px solid var(--pet-border);border-radius:var(--pet-button-radius);background:var(--pet-surface);color:var(--pet-text);line-height:1.5;text-align:left;white-space:normal;opacity:1}
.pet-house .pet-dress-grid .cosmetic-button.equipped{background:var(--pet-tonal);border-color:var(--pet-accent)}
.pet-house .pet-dress-grid .cosmetic-button[disabled]{color:var(--pet-text);background:var(--pet-soft);border-color:var(--pet-border);opacity:1;cursor:default}
.pet-house .pet-dress-grid .cosmetic-button:focus-visible{outline:2px solid var(--pet-accent);outline-offset:2px}
.cosmetic-art{display:flex;align-items:center;justify-content:center;width:80px;height:80px;flex-shrink:0}
.cosmetic-copy{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0;flex:1}
.cosmetic-name{font-size:clamp(18px,var(--wp-font-body),21px);font-weight:600;color:var(--pet-text);overflow-wrap:anywhere}
.cosmetic-description{font-size:clamp(13px,var(--wp-font-caption),16px);color:var(--pet-muted);overflow-wrap:anywhere}
.cosmetic-state{font-size:clamp(14px,var(--wp-font-small),18px);font-weight:600;color:var(--pet-accent);overflow-wrap:anywhere}
.cosmetic-button[disabled] .cosmetic-state{color:var(--pet-muted)}
@media(min-width:1100px){.pet-dress-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.pet-house .pet-dress-grid .cosmetic-button{flex-direction:column;min-height:224px;padding:18px 10px;text-align:center}.cosmetic-copy{align-items:center;width:100%}.cosmetic-state{margin-top:auto}}
.large-text .pet-dress-grid{grid-template-columns:minmax(0,1fr)}.large-text .pet-house .pet-dress-grid .cosmetic-button{flex-direction:row;text-align:left;min-height:140px}.large-text .cosmetic-copy{align-items:flex-start}
</style>
