<template><image v-if="!failed" class="wp-blue-diamond" :src="spiritStoneAsset(size)" mode="aspectFit" aria-hidden="true" @error="failed=true"/><text v-else class="wp-blue-diamond wp-blue-diamond-fallback" aria-hidden="true">◇</text></template>
<script setup lang="ts">
import {ref} from 'vue'
import {spiritStoneAsset} from '../../services/ui/SpiritStoneAsset'
withDefaults(defineProps<{size?:'small'|'medium'|'large'}>(),{size:'small'})
const failed=ref(false)
</script>
<style scoped>.wp-blue-diamond{width:24px;height:28px;flex-shrink:0;vertical-align:middle}.wp-blue-diamond-fallback{color:#438bc8;text-align:center}</style>
