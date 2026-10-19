<template>
 <WPActionTile class="gem-chip spirit-stone-badge" toggle-highlight :selected="open" :aria-label="display.label" aria-haspopup="dialog" :aria-expanded="open" :aria-busy="display.state==='loading'||undefined" @click="$emit('toggle')" @cancel="$emit('toggle')">
  <image v-if="!failed" class="spirit-stone-icon" :src="iconSource" mode="aspectFit" aria-hidden="true" @error="failed=true"/>
  <text v-else class="spirit-stone-icon spirit-stone-fallback" aria-hidden="true">◇</text>
  <text class="spirit-stone-count" aria-hidden="true">{{display.short}}</text><text class="spirit-stone-unit" aria-hidden="true">灵石</text>
 </WPActionTile>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import WPActionTile from '../button/WPActionTile.vue'
import {spiritStoneDisplay} from '../../services/ui/SpiritStoneDisplay'
const props=defineProps<{balance?:number;unavailable?:boolean;loading?:boolean;open:boolean}>(),failed=ref(false)
const iconSource='/static/local-spirit-stone/spirit-stone-128.png'
const display=computed(()=>spiritStoneDisplay(props.balance,props.unavailable,props.loading))
defineEmits<{toggle:[]}>()
</script>
