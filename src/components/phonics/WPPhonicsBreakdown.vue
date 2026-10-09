<template><view class="phonics-row phonics-breakdown" role="group" aria-label="自然拼读音块"><WPPhonicsChunk v-for="(chunk,index) in phonics.chunks" :key="chunk.id" :chunk="chunk" :index="index" :total="phonics.chunks.length" variant="card" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/></view></template>
<script setup lang="ts">
import type {PhonicsData,PhonicsPlaybackState} from '../../../packages/phonics'
import WPPhonicsChunk from './WPPhonicsChunk.vue'
withDefaults(defineProps<{phonics:PhonicsData;activeChunkIndex?:number|null;playbackState?:PhonicsPlaybackState}>(),{activeChunkIndex:null,playbackState:'idle'})
</script>
