<template>
 <WPActionTile class="pet-status-card" :class="'pastel-'+metric.id" :data-status="metric.id" :aria-label="metric.label+'状态说明'" :aria-expanded="expanded" @click="$emit('explain',metric.id)">
  <view class="pet-status-card-head"><PetStatusIcon :name="metric.id"/><text class="pet-status-label">{{metric.label}}</text></view>
  <text class="pet-status-value">{{metric.display}}</text>
  <WPPastelProgressBar :variant="metric.id" :identity="petId" :value="metric.value" :max="metric.max" :label="metric.label+'进度'" :value-text="metric.display"/>
  <text class="pet-status-note">{{metric.note}}</text>
 </WPActionTile>
</template>
<script setup lang="ts">
import type {PetStatusMetric,PetStatusName} from '../../services/pet-status'
import WPActionTile from '../button/WPActionTile.vue'
import WPPastelProgressBar from '../wp-progress/WPPastelProgressBar.vue'
import PetStatusIcon from './PetStatusIcon.vue'
defineProps<{metric:PetStatusMetric;petId:string;expanded:boolean}>()
defineEmits<{explain:[id:PetStatusName]}>()
</script>
<style scoped lang="scss">
// App WebViews isolate child styles; the card owns its internal layout.
.pet-status-card-head{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
.pet-status-label{font-size:clamp(17px,var(--wp-font-body),21px);font-weight:600;overflow-wrap:anywhere}
.pet-status-value{display:block;font-size:clamp(17px,var(--wp-font-body),21px);font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.pet-status-note{display:block;font-size:clamp(13px,var(--wp-font-caption),17px);color:var(--pet-muted);line-height:1.6;overflow-wrap:anywhere;margin-top:auto}
</style>
