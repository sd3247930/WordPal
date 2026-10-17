<template><PetCompanionCard class="study-pet-companion" :pet="pet"><template v-if="$slots.default" #default><slot/></template></PetCompanionCard></template>
<script setup lang="ts">
import type {PetState} from '../../../packages/pet_engine'
import PetCompanionCard from './PetCompanionCard.vue'
defineProps<{pet:PetState}>()
</script>
<style scoped>.study-pet-companion{margin-bottom:12px}.study-pet-companion :deep(.study-ready){display:flex;flex-direction:column;gap:8px;padding:0;min-width:0}.study-pet-companion :deep(.study-ready .wp-button){width:100%;min-width:0}</style>
