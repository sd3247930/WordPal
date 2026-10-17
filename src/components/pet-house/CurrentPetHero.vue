<template><WPCard class="current-pet-hero"><view class="current-pet-heading"><view class="current-pet-avatar"><PetHousePetArt :element="pet.element" :cosmetic="pet.equippedCosmetics[0]"/></view><view><text class="small muted block">当前陪伴</text><text class="section-title">{{petInfo[pet.element].elementName}}精灵 · {{petInfo[pet.element].name}}</text><text class="small block">Lv.{{pet.level}} · {{petMoods[pet.mood]}}</text></view></view><text class="pet-companion-message">“{{petInfo[pet.element].message}}”</text><PetStatusMetrics :pet="pet" :unavailable="unavailable"/><view class="current-pet-actions"><WPButton class="companion-link" @click="$emit('action','feed')">喂一喂</WPButton><WPButton kind="secondary" @click="$emit('action','growth')">去成长</WPButton></view><text class="small muted block">今天陪你一起学习 · 休息也不会失去伙伴</text></WPCard></template>
<script setup lang="ts">
import {petInfo,type PetState} from '../../../packages/pet_engine'
import {petMoods} from '../../styles/pet-house'
import PetHousePetArt from './PetHousePetArt.vue'
import WPButton from '../wp-button/WPButton.vue'
import WPCard from '../wp-card/WPCard.vue'
import PetStatusMetrics from './PetStatusMetrics.vue'
defineProps<{pet:PetState;unavailable?:boolean}>();defineEmits(['action'])
</script>
<style scoped>
.current-pet-hero{display:flex;flex-direction:column;gap:10px;min-width:0}.current-pet-heading{display:flex;align-items:center;gap:12px}.current-pet-heading>view:last-child{min-width:0}.current-pet-avatar{width:80px;height:100px;flex-shrink:0}.pet-companion-message{font-size:var(--wp-font-small);line-height:1.7;color:var(--pet-muted);padding:4px 0}.current-pet-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}.current-pet-actions .companion-link{display:flex;width:100%;max-width:none;padding:12px}
</style>
