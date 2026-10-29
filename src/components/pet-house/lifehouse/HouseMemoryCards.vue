<template><view class="lh-memory-list"><view v-for="event in displayed" :key="event.id" class="lh-memory-card"><HouseSnapshotScene v-if="event.snapshot.assetVersion===3" :element="event.element" :snapshot="event.snapshot"/><view v-else class="lh-memory-scene" :aria-label="event.title+'时的家园留影'" role="img"><LifeHouseAsset class="lh-memory-bg" :src="roomVisual(event.element,event.snapshot.level,legacy(event.snapshot.assetVersion)).thumbnail" decorative fit="aspectFill"/><LifeHouseAsset v-if="event.snapshot.level>0&&roomVisual(event.element,event.snapshot.level,legacy(event.snapshot.assetVersion)).motif" class="lh-memory-motif" :src="themeAsset(event.element)" decorative/><LifeHouseAsset v-for="item in event.snapshot.items" :key="item.slotId" class="lh-memory-item" :style="position(item.slotId)" :src="furnitureVisual(item.furnitureId,event.element,'icon',legacy(event.snapshot.assetVersion))" decorative/><PetHousePetArt class="lh-memory-pet" :element="event.element" :stage="event.snapshot.form" :cosmetic="event.snapshot.cosmetic||undefined" :badge="false"/></view><text v-if="event.snapshot.assetVersion!==3&&!roomVisual(event.element,event.snapshot.level,legacy(event.snapshot.assetVersion)).available" class="lh-caption lh-block">这张回忆的场景图片暂不可用。</text><text class="lh-strong lh-block">{{event.type==='upgrade'?houseLevelName(event.element,event.snapshot.level):event.title}}</text><text class="lh-caption">{{date(event.at)}} · 房屋 Lv.{{event.snapshot.level}}</text></view><text v-if="!events.length" class="lh-hint">第一次升级、第一次布置休息区或活动角，都会留下小小的回忆。</text></view><WPButton v-if="events.length>limit" kind="quiet" class="lh-memory-more" @click="limit+=6">查看更多家园回忆</WPButton></template>
<script setup lang="ts">
import {houseLevelName} from '../../../services/pet-lifehouse/HouseIdentity'
import HouseSnapshotScene from './HouseSnapshotScene.vue'
import {computed,ref,watch} from 'vue'
import WPButton from '../../wp-button/WPButton.vue'
import type {HouseMemoryEvent,SlotId} from '../../../services/pet-lifehouse/types'
import {themeAsset,slotDefinitions} from '../../../services/pet-lifehouse/HouseRegistry'
import {roomVisual,furnitureVisual} from '../../../services/pet-lifehouse/SceneVisualRegistry'
import PetHousePetArt from '../PetHousePetArt.vue'
import LifeHouseAsset from './LifeHouseAsset.vue'
const props=defineProps<{events:HouseMemoryEvent[]}>(),limit=ref(6),displayed=computed(()=>props.events.slice(0,limit.value))
watch(()=>props.events[0]?.element,()=>limit.value=6)
const legacy=(v:number):1|2=>v===1?1:2
function position(id:SlotId){const s=slotDefinitions[id];return{left:s.x+'%',top:s.y+'%',width:s.w+'%',height:s.h+'%',zIndex:s.z}}
function date(value:string){const d=new Date(value);return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'}
</script>
