<template><view class="wp-chip" :class="element?'element-'+element:''"><slot/></view></template>
<script setup lang="ts">import type {Element} from '../../../packages/pet_engine';defineProps<{element?:Element}>()</script>
<style scoped>.wp-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:var(--wp-radius-chip);font-size:var(--wp-font-small);font-weight:var(--wp-weight-bold);background:var(--wp-element-soft,var(--wp-secondary));color:var(--wp-element-color,var(--wp-primary));line-height:1.4}</style>
