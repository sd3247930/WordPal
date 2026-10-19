<template><view class="wp-segmented segmented" :class="{'is-scrollable':scrollable}" role="group" :aria-label="label"><WPActionTile v-for="option in options" :key="option.id" toggle-highlight class="wp-segment mode-button" :class="{selected:modelValue===option.id}" :disabled="disabled||option.disabled" :selected="modelValue===option.id" :aria-label="option.description?option.name+'，'+option.description:option.name" @click="$emit('update:modelValue',option.id)"><text>{{option.name}}</text></WPActionTile></view></template>
<script setup lang="ts">
import WPActionTile from './WPActionTile.vue'
defineProps<{modelValue:string;options:readonly {id:string;name:string;description?:string;disabled?:boolean}[];label:string;disabled?:boolean;scrollable?:boolean}>()
defineEmits<{'update:modelValue':[value:string]}>()
</script>
