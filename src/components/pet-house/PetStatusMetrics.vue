<template>
 <view class="pet-status-metrics" :class="{dark:theme.mode==='dark',contrast:theme.settings.highContrast}" role="group" aria-label="当前精灵四项状态">
  <view class="pet-status-grid"><PetStatusCard v-for="metric in metrics" :key="metric.id" :metric="metric" :pet-id="pet.petId" :expanded="selected===metric.id" @explain="selected=selected===$event?null:$event"/></view>
  <view v-if="info" class="pet-status-explanation" role="region" :aria-label="info.label+'指标说明'" aria-live="polite"><text class="pet-status-label">{{info.label}}说明</text><text class="pet-status-note">{{info.explanation}}</text><WPButton kind="quiet" @click="selected=null">收起状态说明</WPButton></view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import type {PetState} from '../../../packages/pet_engine'
import {petStatusMetrics,type PetStatusName} from '../../services/pet-status'
import {useThemeStore} from '../../stores/theme'
import PetStatusCard from './PetStatusCard.vue'
import WPButton from '../wp-button/WPButton.vue'
const props=defineProps<{pet:PetState;unavailable?:boolean}>(),theme=useThemeStore(),selected=ref<PetStatusName|null>(null)
const metrics=computed(()=>petStatusMetrics(props.pet,props.unavailable)),info=computed(()=>metrics.value.find(m=>m.id===selected.value))
watch(()=>props.pet.petId,()=>selected.value=null)
</script>
<style src="../../styles/pet-status.scss" lang="scss"></style>
