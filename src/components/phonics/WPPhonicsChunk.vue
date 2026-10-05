<template><view class="phonics-chunk" :class="[variant==='word'?'phonics-word-chunk':'phonics-card','phonics-'+colorName,{'is-active':active,'is-upcoming':playbackState==='playing'&&activeChunkIndex!==null&&index>activeChunkIndex,'is-spoken':playbackState==='playing'&&activeChunkIndex!==null&&index<activeChunkIndex}]" :style="colorStyle" :data-chunk-index="index" :data-color="colorName" :data-active="active" :aria-hidden="variant==='word'||undefined" :aria-current="active||undefined"><text class="chunk-grapheme">{{chunk.grapheme}}</text><text v-if="variant==='card'" class="chunk-phoneme small">{{chunk.phoneme||'无声'}}</text></view></template>
<script setup lang="ts">
import {computed} from 'vue'
import type {PhonicsChunk,PhonicsPlaybackState} from '../../../packages/phonics'
import {getPhonicsColor,phonicsColor} from '../../styles/phonics'
import {useThemeStore} from '../../stores/theme'
const props=withDefaults(defineProps<{chunk:PhonicsChunk;index:number;activeChunkIndex:number|null;playbackState:PhonicsPlaybackState;variant?:'word'|'card'}>(),{variant:'word'})
const theme=useThemeStore(),active=computed(()=>props.playbackState==='playing'&&props.index===props.activeChunkIndex)
const colorName=computed(()=>getPhonicsColor(props.index))
const colorStyle=computed(()=>{const color=phonicsColor(props.index,theme.settings.themeId,theme.mode);return '--phonics-ink:'+color.ink+';--phonics-active:'+color.active+';--phonics-soft:'+color.soft})
</script>
