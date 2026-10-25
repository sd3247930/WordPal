<template><view v-if="!failed" class="parent-gate-artwork" :data-parent-artwork="name" aria-hidden="true"><image :src="'/static/icons/parent-gate/'+name+'.png'" mode="aspectFit" @error="failed=true"/></view></template>
<script setup lang="ts">
import {ref} from 'vue'
defineProps<{name:'heading'|'question'|'answer'|'refresh'|'guard'}>()
const failed=ref(false)
</script>
