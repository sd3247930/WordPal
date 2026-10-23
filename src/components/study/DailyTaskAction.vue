<template><WPButton class="hero-cta daily-task-action" :class="{'daily-task-clay':theme.settings.themeId==='clay'}" :disabled="disabled" :loading="loading" :spread="theme.settings.themeId!=='clay'" @click="$emit('click')"><slot/></WPButton></template>
<script setup lang="ts">
import WPButton from '../wp-button/WPButton.vue'
import {useThemeStore} from '../../stores/theme'
defineProps<{disabled?:boolean;loading?:boolean}>()
defineEmits<{click:[]}>()
const theme=useThemeStore()
</script>
<style scoped>
.daily-task-action.daily-task-clay.wp-button{position:relative;width:100%;min-height:56px;padding:12px 16px;margin:0 0 10px;justify-content:center;border-radius:var(--wp-radius-chip);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.04)),var(--wp-primary);color:var(--wp-on-primary);border:1px solid var(--wp-primary);font-size:var(--wp-font-body-large);font-weight:700;line-height:1.5;box-shadow:inset 0 2px 2px rgba(255,255,255,.18),0 3px 0 rgba(108,73,39,.13),0 5px 10px rgba(108,73,39,.07)}
.daily-task-clay.wp-button:not([disabled]):active{transform:translateY(1px);box-shadow:var(--wp-clay-pressed)}
.daily-task-clay.wp-button[disabled]{box-shadow:none}
.high-contrast .daily-task-clay.wp-button{box-shadow:none;border-width:2px}
.reduce-motion .daily-task-clay.wp-button:not([disabled]):active{transform:none}
@media(prefers-reduced-motion:reduce){.daily-task-clay.wp-button:not([disabled]):active{transform:none}}
</style>
