<template><image class="lh-level-thumb-art" :src="source" mode="aspectFill" aria-hidden="true" @error="failed=true"/></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import type {Element} from '../../../../packages/pet_engine'
import type {PetForm} from '../../../services/pet-growth'
import {roomVisual} from '../../../services/pet-lifehouse/SceneVisualRegistry'
const props=defineProps<{element:Element;level:number;form:PetForm}>(),failed=ref(false)
const source=computed(()=>failed.value?roomVisual(props.element,props.level).thumbnail:`/static/pet-house/lifehouse/v6/thumb-${props.element}-l${props.level}-f${props.form}.jpg`)
watch(()=>[props.element,props.level,props.form],()=>failed.value=false)
</script>
<style scoped>.lh-level-thumb-art{display:block;width:100%;height:auto;aspect-ratio:1.5;border-radius:12px;background:var(--lh-tint)}</style>
