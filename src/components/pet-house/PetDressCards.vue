<template>
 <view class="dress-closet">
  <view class="dress-closet-heading"><text class="dress-title">今天，想戴哪一件？</text><text class="dress-count" role="status" aria-live="polite">已穿戴 {{worn.length}}/3</text></view>
  <text class="dress-instruction">轻点穿戴，再点一次取下。</text>
  <view class="dress-filters" role="group" aria-label="装扮分类"><WPActionTile v-for="tab in filters" :key="tab.id" :selected="filter===tab.id" :aria-pressed="filter===tab.id" :aria-label="tab.label" @click="filter=tab.id">{{tab.label}}</WPActionTile></view>
  <view class="dress-results"><text>{{filter==='all'?'小小衣橱':filters.find(tab=>tab.id===filter)?.label}} · {{visible.length}} 件</text><text>可穿戴 {{availableCount}} 件</text></view>
  <view class="pet-dress-grid" role="group" aria-label="选择精灵装扮">
   <WPActionTile v-for="item in visible" :key="item.id" class="cosmetic-button" :class="['cosmetic-'+item.slot,{'equipped':worn.includes(item.id)}]" :selected="worn.includes(item.id)" :data-item="item.id" :data-category="item.slot" :disabled="disabled(item)" :aria-label="item.name+'，'+state(item)+(disabled(item)?'':'，'+(worn.includes(item.id)?'点击取下':'点击穿戴'))" :aria-pressed="worn.includes(item.id)" @click="$emit('equip',item.id)">
    <view class="cosmetic-art"><image v-if="item.icon" class="pet-dress-symbol" :src="item.icon" mode="aspectFit" lazy-load aria-hidden="true" @error="broken.add(item.id)"/><text v-else class="cosmetic-missing">图片暂不可用</text></view>
    <view class="cosmetic-copy"><text class="cosmetic-name">{{item.name}}</text><text class="cosmetic-description">{{item.description}}</text><text class="cosmetic-status">{{state(item)}}</text></view>
    <view class="cosmetic-cta"><text>{{worn.includes(item.id)?'取下':disabled(item)?pet.level<item.level?'Lv.'+item.level+' 解锁':'暂不可用':'穿戴'}}</text></view>
   </WPActionTile>
  </view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import {dressCatalog,equippedItems,hasDressAssets,type DressItem,type DressSlot} from '../../services/pet-lifehouse/DressCatalog'
import type {PetState} from '../../../packages/pet_engine'
import type {PetForm} from '../../services/pet-growth'
const props=withDefaults(defineProps<{pet:PetState;form?:PetForm;unavailable?:readonly string[];readOnly?:boolean}>(),{form:1,unavailable:()=>[]})
defineEmits<{equip:[id:string]}>()
const filter=ref<DressSlot|'all'>('all'),broken=ref(new Set<string>())
const filters=[{id:'all',label:'全部'},{id:'head',label:'头饰'},{id:'neck',label:'围巾'},{id:'badge',label:'徽章'}] as const
const catalog=computed(()=>dressCatalog(props.pet.element)),worn=computed(()=>equippedItems(props.pet.equippedCosmetics,props.pet.element)),visible=computed(()=>catalog.value.filter(item=>filter.value==='all'||item.slot===filter.value))
function ready(item:DressItem){return !broken.value.has(item.id)&&!props.unavailable.includes(item.id)&&hasDressAssets(item,props.pet.element,props.form)}
const availableCount=computed(()=>catalog.value.filter(item=>props.pet.level>=item.level&&ready(item)).length)
function disabled(item:DressItem){return !!props.readOnly||!worn.value.includes(item.id)&&(props.pet.level<item.level||!ready(item))}
function state(item:DressItem){return worn.value.includes(item.id)?'已穿戴':!ready(item)?'暂不可用':props.pet.level<item.level?'未获得 · Lv.'+item.level+' 解锁':'未穿戴'}
</script>
<style lang="scss" src="../../styles/pet-dress-closet.scss"></style>