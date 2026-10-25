<template><view v-if="!failed" class="parent-settings-artwork" :data-parent-settings-art="name" aria-hidden="true"><image :src="parentSettingsArtworkSrc(name)" mode="aspectFit" @error="failed=true"/></view></template>
<script setup lang="ts">
import {ref,watch} from 'vue'
import {parentSettingsArtworkSrc,type ParentSettingsArtworkName} from '../../services/parent-settings-artwork'
const props=defineProps<{name:ParentSettingsArtworkName}>(),failed=ref(false)
watch(()=>props.name,()=>failed.value=false)
</script>
