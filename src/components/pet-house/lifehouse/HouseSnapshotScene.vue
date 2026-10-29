<template><SceneCanvas class="lh-snapshot-scene" :scene="scene" :zone="zone" :house="house" :form="snapshot.form" :cosmetic="snapshot.cosmetic" :cosmetics="snapshot.cosmetics" :actor-position="snapshot.scene?.actorAnchor??zone.spawn" :allow-q="snapshot.scene?.actorVariant.startsWith('chibi-')??true" reduced/></template>
<script setup lang="ts">
import {computed} from 'vue'
import type {Element} from '../../../../packages/pet_engine'
import type {ElementHouse,HouseSnapshot} from '../../../services/pet-lifehouse/types'
import {sceneDefinition} from '../../../services/pet-lifehouse/SceneConfig'
import SceneCanvas from './SceneCanvas.vue'
const props=defineProps<{element:Element;snapshot:HouseSnapshot;revision?:1|2|3}>()
const scene=computed(()=>sceneDefinition(props.element,props.snapshot.level,props.revision??props.snapshot.scene?.revision??(props.snapshot.assetVersion===3?2:1))),zone=computed(()=>scene.value.zones.find(z=>z.id===props.snapshot.scene?.zoneId)??scene.value.zones[0]),house=computed<ElementHouse>(()=>({level:props.snapshot.level,lastUpgradeAt:null,owned:props.snapshot.items.map(i=>({instanceId:'snapshot:'+i.slotId,furnitureId:i.furnitureId,paidGems:0,origin:'level-gift',acquiredAt:''})),slots:Object.fromEntries(props.snapshot.items.map(i=>[i.slotId,'snapshot:'+i.slotId]))}))
</script>
<style scoped>.lh-snapshot-scene{border-radius:12px;pointer-events:none}</style>
