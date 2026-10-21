<template><button role="button" :tabindex="blocked?-1:0" class="wp-button" :class="[kind,{playing,selected,'is-spread':spread}]" :disabled="blocked" :aria-disabled="blocked||undefined" :aria-busy="busy||undefined" :aria-pressed="selected" :aria-label="label" @click="!blocked&&$emit('click')"><text v-if="loading" class="wp-spinner" aria-hidden="true">◌</text><slot/></button></template>
<script setup lang="ts">
import {computed} from 'vue'
import {wpButtonBlocked,wpButtonBusy} from '../../services/ui/WPButtonState'
const props=withDefaults(defineProps<{kind?:'primary'|'secondary'|'quiet'|'danger';disabled?:boolean;loading?:boolean;playing?:boolean;interruptible?:boolean;selected?:boolean;spread?:boolean;label?:string}>(),{kind:'primary',disabled:false,loading:false})
// 阻断与进行中状态来自同一处判定，避免 loading 在 app-plus 下隐式禁用按钮。
const blocked=computed(()=>wpButtonBlocked(props)),busy=computed(()=>wpButtonBusy(props))
defineEmits(['click'])
</script>
<style scoped>.wp-button{position:relative;box-sizing:border-box}.wp-button>.wp-spinner{position:absolute;inset-inline-start:4px;top:50%;margin-top:-9px;pointer-events:none}</style>
