<template><button role="button" class="wp-action-tile" :tabindex="disabled?-1:0" :disabled="disabled" :aria-disabled="disabled||undefined" :aria-pressed="selected" @click="!disabled&&$emit('click',$event)"><slot/></button></template>
<script setup lang="ts">
defineProps<{disabled?:boolean;selected?:boolean}>()
defineEmits<{click:[event:Event]}>()
</script>
