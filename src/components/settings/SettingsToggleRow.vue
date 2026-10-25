<template>
 <label class="preference-row settings-toggle-row" :class="{'settings-toggle-disabled':disabled}">
  <SettingsArtwork v-if="icon" :name="icon"/>
  <view class="settings-row-copy"><text class="strong">{{name}}</text><text v-if="note" :id="descriptionId" class="small muted block">{{note}}</text><text v-else-if="description" :id="descriptionId" class="settings-sr-only">{{description}}</text></view>
  <view class="settings-switch-target"><switch role="switch" :checked="checked" :disabled="disabled" :aria-label="name" :aria-checked="checked" :aria-describedby="note||description?descriptionId:undefined" @change="change"/></view>
 </label>
</template>
<script setup lang="ts">
import {getCurrentInstance} from 'vue'
import SettingsArtwork from './SettingsArtwork.vue'
import type {SettingsArtworkName} from '../../services/settings-artwork'
defineProps<{name:string;checked:boolean;icon?:SettingsArtworkName;description?:string;note?:string;disabled?:boolean}>()
const emit=defineEmits<{change:[value:boolean]}>(),descriptionId='settings-description-'+getCurrentInstance()!.uid
function change(event:Event){emit('change',!!(event as Event&{detail:{value:boolean}}).detail.value)}
</script>
