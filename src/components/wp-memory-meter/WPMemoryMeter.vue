<template><view class="memory-meter" :aria-label="info.label" role="img"><view class="memory-dots" aria-hidden="true"><view v-for="index in 4" :key="index" class="memory-dot" :class="{filled:index<=info.dots}"/></view><text v-if="!compact" class="small muted">{{info.label}}</text></view></template>
<script setup lang="ts">
import {computed} from 'vue'
import type {MemoryCard} from '../../../packages/core_learning'
import {masteryPresentation} from '../../services/study-presentation'
const props=defineProps<{card?:MemoryCard;compact?:boolean}>()
const info=computed(()=>masteryPresentation(props.card))
</script>
<style scoped>.memory-meter{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.memory-dots{display:flex;gap:4px}.memory-dot{width:8px;height:8px;border-radius:50%;background:var(--wp-border)}.memory-dot.filled{background:var(--wp-primary)}</style>
