<template><view v-if="!failed" class="settings-artwork" aria-hidden="true"><image :src="settingsArtworkSrc(name)" mode="aspectFit" @error="failed=true"/></view></template>
<script setup lang="ts">
import {ref,watch} from 'vue'
import {settingsArtworkSrc,type SettingsArtworkName} from '../../services/settings-artwork'
const props=defineProps<{name:SettingsArtworkName}>(),failed=ref(false)
watch(()=>props.name,()=>failed.value=false)
</script>
