<template><view class="pet-status-hud"><view class="hud-title"><text aria-hidden="true">{{petHouseThemes[pet.element].icon}}</text><text class="strong">{{petInfo[pet.element].elementName}}精灵 · {{petInfo[pet.element].name}}</text><text class="small">Lv.{{pet.level}}</text></view><view class="context-line small"><text>{{petMoods[pet.mood]}}</text><text>{{pet.exp%100}} / 100 经验</text></view><WPProgress :value="pet.exp%100" :total="100" label="领地伙伴升级经验"/><button v-if="selectable" role="button" tabindex="0" class="hud-interact" :aria-pressed="selected" @click="$emit('choose',pet.element)">{{selected?'✓ 当前陪伴':'选择陪伴 →'}}</button></view></template>
<script setup lang="ts">
import WPProgress from '../wp-progress/WPProgress.vue'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import {petHouseThemes,petMoods} from '../../styles/pet-house'
defineProps<{pet:PetState;selected?:boolean;selectable?:boolean}>();defineEmits(['choose'])
</script>
<style scoped>
.pet-status-hud{position:relative;background:var(--pet-surface);color:var(--pet-text);border:1px solid var(--pet-border);border-radius:16px;padding:12px;box-shadow:var(--pet-shadow);display:flex;flex-direction:column;gap:8px}.hud-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:var(--wp-font-small);line-height:1.5}.hud-title .small{margin-left:auto}.hud-interact{margin:0;min-height:56px;padding:8px;border:1px solid var(--pet-border);border-radius:12px;background:var(--pet-tonal);color:var(--pet-accent);font-size:var(--wp-font-small);line-height:1.5}
</style>
