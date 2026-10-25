<template><view v-if="!failed" class="detail-artwork" aria-hidden="true"><image :src="wordDetailIcon(name)" mode="aspectFit" @error="failed=true"/></view></template>
<script setup lang="ts">
import {ref,watch} from 'vue'
import {wordDetailIcon,type wordDetailIcons} from '../../services/word-detail-presentation'
const props=defineProps<{name:keyof typeof wordDetailIcons}>(),failed=ref(false)
watch(()=>props.name,()=>failed.value=false)
</script>
