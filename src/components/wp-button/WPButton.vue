<template><button role="button" :tabindex="blocked?-1:0" class="wp-button" :class="[kind,{playing,selected,'is-spread':spread}]" :disabled="blocked" :aria-disabled="blocked||undefined" :aria-busy="loading||playing||undefined" :aria-pressed="selected" :aria-label="label" @click="!blocked&&$emit('click')"><text v-if="loading" class="wp-spinner" aria-hidden="true">◌</text><slot/></button></template>
<script setup lang="ts">
import {computed} from 'vue'
const props=withDefaults(defineProps<{kind?:'primary'|'secondary'|'quiet'|'danger';disabled?:boolean;loading?:boolean;playing?:boolean;interruptible?:boolean;selected?:boolean;spread?:boolean;label?:string}>(),{kind:'primary',disabled:false,loading:false})
const blocked=computed(()=>props.disabled||props.loading&&!props.interruptible)
defineEmits(['click'])
</script>
