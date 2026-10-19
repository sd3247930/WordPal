<template><view class="phonics-word-frame word" :class="{'can-wrap':wrap}" role="group" :aria-label="word" :style="'font-size:'+fontSize+'px'"><view class="phonics-word"><WPPhonicsChunk v-for="(chunk,index) in phonics.chunks" :key="chunk.id" :chunk="chunk" :index="index" :total="phonics.chunks.length" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/></view></view></template>
<script setup lang="ts">
import {ref,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import type {PhonicsData,PhonicsPlaybackState} from '../../../packages/phonics'
import {windowLayout} from '../../services/window'
import {useThemeStore} from '../../stores/theme'
import WPPhonicsChunk from './WPPhonicsChunk.vue'
const props=withDefaults(defineProps<{word:string;phonics:PhonicsData;activeChunkIndex?:number|null;playbackState?:PhonicsPlaybackState;baseSize?:number;wrap?:boolean}>(),{activeChunkIndex:null,playbackState:'idle',baseSize:48,wrap:false})
const theme=useThemeStore(),instance=getCurrentInstance(),fontSize=ref(48);let generation=0
async function measure(){
 const epoch=++generation,requested=Math.min(64,props.baseSize*Math.max(windowLayout.fontScale,theme.settings.largeText?1.25:1));fontSize.value=requested
 await nextTick();if(epoch!==generation||!instance?.proxy)return
 uni.createSelectorQuery().in(instance.proxy).select('.phonics-word-frame').boundingClientRect(result=>{
  if(epoch!==generation||!result||Array.isArray(result)||!result.width)return
  const width=Array.from(props.word).reduce((sum,char)=>sum+(/[iljtfrI1'., ]/.test(char)?.32:/[MWmw]/.test(char)?.86:/[\u0000-\u007f]/.test(char)?.58:1),0)
  fontSize.value=Math.max(props.wrap?20:36,Math.min(requested,Math.floor((result.width-4)/(width||1))))
 }).exec()
}
watch(()=>[props.word,props.baseSize,windowLayout.width,windowLayout.fontScale,theme.settings.largeText],measure)
onMounted(measure);onUnmounted(()=>{generation++})
</script>
<style scoped>
.can-wrap.word{white-space:normal;overflow:visible;text-align:center}
.can-wrap .phonics-word{max-width:100%;flex-wrap:wrap;justify-content:center;row-gap:6px}
.can-wrap :deep(.phonics-chunk){min-width:0;max-width:100%}
.can-wrap :deep(.chunk-grapheme){overflow-wrap:anywhere;white-space:normal}
</style>
