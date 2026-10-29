<template><view class="lh-room-overview">
 <view class="lh-room-summary"><HouseSnapshotScene class="lh-room-preview" :element="element" :snapshot="snapshot" :revision="scene.revision"/><view class="lh-room-summary-copy"><text class="lh-room-level">房屋 Lv.{{house.level}} · {{houseLevelName(element,house.level)}}</text><text class="lh-caption">{{houseLevelBrief[house.level]}}</text></view></view>
 <view class="lh-room-zones" role="group" aria-label="已开放家园区域"><WPActionTile v-for="zone in scene.zones" :key="zone.id" :aria-label="'查看家园区域'+zone.name" @click="$emit('zone',zone.id)">{{zone.name}}</WPActionTile></view>
 <view class="lh-room-next"><view><text class="lh-strong lh-block">{{house.level===5?'庭院与露台，都准备好了':'下一步 · '+houseLevelName(element,house.level+1)}}</text><text class="lh-caption">{{house.level===5?'喜欢的小物件，慢慢布置就好。':housePrices[house.level+1]+' 灵石 · 原有物品会保留'}}</text></view><WPButton class="lh-main-button" :disabled="unavailable" @click="$emit('upgrade')">{{house.level===5?'查看家园':house.level===0?'预览建造':'预览升级'}}</WPButton></view>
</view></template>
<script setup lang="ts">
import {computed} from 'vue'
import type {Element} from '../../../../packages/pet_engine'
import type {PetForm} from '../../../services/pet-growth'
import type {ElementHouse,HouseSnapshot,SlotId} from '../../../services/pet-lifehouse/types'
import {sceneDefinition,type SceneZoneId} from '../../../services/pet-lifehouse/SceneConfig'
import {housePrices} from '../../../services/pet-lifehouse/HouseRegistry'
import HouseSnapshotScene from './HouseSnapshotScene.vue'
import {houseLevelName,houseLevelBrief} from '../../../services/pet-lifehouse/HouseIdentity'
import WPButton from '../../wp-button/WPButton.vue'
import WPActionTile from '../../button/WPActionTile.vue'
const props=defineProps<{element:Element;house:ElementHouse;form:PetForm;equipment:readonly string[];unavailable:boolean}>()
defineEmits<{upgrade:[];zone:[id:SceneZoneId]}>()
const scene=computed(()=>sceneDefinition(props.element,props.house.level))
const snapshot=computed<HouseSnapshot>(()=>({level:props.house.level,items:Object.entries(props.house.slots).flatMap(([slot,id])=>{const owned=props.house.owned.find(item=>item.instanceId===id);return owned?[{slotId:slot as SlotId,furnitureId:owned.furnitureId}]:[]}),form:props.form,cosmetic:props.equipment[0]??null,cosmetics:[...props.equipment],assetVersion:3}))
</script>
<style scoped>
.lh-room-summary{display:grid;grid-template-columns:minmax(100px,.8fr) minmax(0,1.2fr);align-items:center;gap:12px}.lh-room-preview{width:100%;min-width:0}.lh-room-summary-copy{display:flex;flex-direction:column;gap:6px;min-width:0}.lh-room-level{font-size:var(--wp-font-body);font-weight:750;color:var(--lh-ink)}.lh-room-zones{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0}.lh-room-zones .wp-action-tile{min-height:44px;padding:8px 12px;background:var(--lh-tint);border-radius:18px;font-size:var(--wp-font-small)}.lh-room-next{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;background:var(--lh-tint);border-radius:18px}.lh-room-next>view{min-width:0}.lh-room-next .wp-button{flex-shrink:0;min-height:44px}.large-text .lh-room-summary,.scaled-text .lh-room-summary{grid-template-columns:minmax(0,1fr)}.large-text .lh-room-preview,.scaled-text .lh-room-preview{max-width:240px;justify-self:center}.large-text .lh-room-next,.scaled-text .lh-room-next{flex-wrap:wrap}
</style>
