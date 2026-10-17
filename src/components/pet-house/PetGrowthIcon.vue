<template><view class="pet-growth-symbol" :class="'symbol-'+name" aria-hidden="true"><image v-if="!failed" :key="source" :src="source" mode="aspectFit" @error="failed=true"/><text v-else class="growth-icon-fallback">{{fallback[name]}}</text></view></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {petGrowthIconSource,type PetGrowthIconName} from '../../services/pet-growth-icons'
const props=defineProps<{name:PetGrowthIconName}>(),theme=useThemeStore(),failed=ref(false)
const source=computed(()=>petGrowthIconSource(props.name,theme.settings.highContrast,theme.mode==='dark'))
const fallback={progress:'进度',experience:'经验',affection:'亲密',device:'学习',book:'读书'}
watch(source,()=>failed.value=false)
</script>
<style scoped>.pet-growth-symbol{display:flex;align-items:center;justify-content:center;width:64px;height:64px;flex-shrink:0}.pet-growth-symbol image{display:block;width:100%;height:100%}.growth-icon-fallback{font-size:15px;font-weight:600;color:var(--pet-text);text-align:center}</style>
