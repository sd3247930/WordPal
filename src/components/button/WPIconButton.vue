<template><WPButton kind="quiet" class="wp-icon-button" :label="label" :disabled="disabled" @click="$emit('click')"><slot/></WPButton></template>
<script setup lang="ts">
import WPButton from '../wp-button/WPButton.vue'
defineProps<{label:string;disabled?:boolean}>();defineEmits(['click'])
</script>
