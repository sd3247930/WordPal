<template><view class="pet-status-symbol" aria-hidden="true"><image v-if="!failed" :key="source" :src="source" mode="aspectFit" @error="failed=true"/><text v-else class="pet-status-icon-fallback">{{fallback[name]}}</text></view></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useThemeStore} from '../../stores/theme'
import type {PetStatusName} from '../../services/pet-status'
import {petStatusIconSource} from '../../services/pet-status-icons'
const props=defineProps<{name:PetStatusName}>(),theme=useThemeStore(),failed=ref(false)
const source=computed(()=>petStatusIconSource(props.name,theme.settings.highContrast,theme.mode==='dark'))
const fallback={excitement:'兴奋',happiness:'开心',experience:'经验',affection:'亲密'}
watch(source,()=>failed.value=false)
</script>
<style scoped>.pet-status-symbol{display:flex;align-items:center;justify-content:center;width:52px;height:52px;flex-shrink:0}.pet-status-symbol image{display:block;width:100%;height:100%}.pet-status-icon-fallback{font-size:var(--wp-font-small);font-weight:600;color:var(--pet-text)}</style>
