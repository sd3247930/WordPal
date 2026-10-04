<template><view class="wp-chip" :class="element?'element-'+element:''"><slot/></view></template>
<script setup lang="ts">import type {Element} from '../../../packages/pet_engine';defineProps<{element?:Element}>()</script>
<style scoped>.wp-chip{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0 14px;border-radius:13px;font-size:var(--wp-font-small);font-weight:500;background:var(--wp-element-soft,var(--wp-secondary));color:var(--wp-element-color,var(--wp-primary));line-height:1.3}</style>
