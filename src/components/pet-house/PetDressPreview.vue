<template>
 <view class="dress-preview" :class="{dark}" role="group" :aria-label="identity+'，'+scene.title+'，装扮预览'" :data-element="pet.element" :data-scene="scene.id" :data-form="form">
  <image class="dress-scene" :src="scene.sceneAsset" mode="aspectFill" aria-hidden="true"/>
  <view class="dress-scene-shade" aria-hidden="true"/>
  <view class="dress-preview-heading"><text class="dress-pet-name">{{identity}}</text><text class="dress-scene-name">{{scene.title}} · {{petStages[form-1].title}}</text></view>
  <view class="dress-model"><PetHousePetArt :element="pet.element" :cosmetic="pet.equippedCosmetics[0]" :badge="false"/></view>
  <text class="dress-wearing-state">{{worn?'正在穿戴 · '+worn.name:'选一件喜欢的装扮吧'}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import type {PetHouseTheme} from '../../styles/pet-house'
import {petStages} from '../../services/pet-growth'
import {cosmetics} from '../../stores/pet'
import {usePetFormsStore} from '../../stores/pet-forms'
import PetHousePetArt from './PetHousePetArt.vue'
const props=withDefaults(defineProps<{pet:PetState;scene:PetHouseTheme;dark?:boolean}>(),{dark:false}),forms=usePetFormsStore()
const form=computed(()=>forms.stage(props.pet.element))
const identity=computed(()=>petInfo[props.pet.element].elementName+'精灵 · '+petInfo[props.pet.element].name)
const worn=computed(()=>cosmetics.find(item=>item.id===props.pet.equippedCosmetics[0]))
</script>
<style scoped>
.dress-preview{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;align-items:center;width:100%;max-width:680px;align-self:center;padding:0;border:1px solid var(--pet-border);border-radius:var(--pet-radius);background:var(--pet-tonal);height:auto;min-width:0}
.dress-scene,.dress-scene-shade{position:absolute;inset:0;width:100%;height:100%;z-index:-2}.dress-scene-shade{z-index:-1;background:linear-gradient(180deg,rgba(255,253,247,.88),rgba(255,253,247,.06) 30%,rgba(255,253,247,.04) 65%,rgba(255,253,247,.88))}
.dress-preview-heading{display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px 12px 0;max-width:100%;text-align:center}.dress-pet-name{font-size:clamp(18px,var(--wp-font-body),22px);font-weight:600;color:#353b46;overflow-wrap:anywhere}.dress-scene-name{font-size:var(--wp-font-caption);color:#4a5362}
.dress-model{width:100%;height:320px;max-width:360px;flex-shrink:0}.dress-wearing-state{display:block;max-width:calc(100% - 24px);padding:8px 16px;margin:0 12px 16px;border-radius:20px;background:var(--pet-surface);color:var(--pet-accent);font-size:var(--wp-font-small);font-weight:600;text-align:center;overflow-wrap:anywhere}
@media(max-width:359px){.dress-model{height:285px}}
.dark .dress-scene{filter:brightness(.72) saturate(.8)}.dark .dress-scene-shade{background:linear-gradient(180deg,rgba(25,29,36,.9),rgba(25,29,36,.03) 30%,rgba(25,29,36,.03) 65%,rgba(25,29,36,.84))}.dark .dress-pet-name{color:#f1ede7}.dark .dress-scene-name{color:#ddd7ce}
</style>
