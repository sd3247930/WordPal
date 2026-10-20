<template><WPButton kind="secondary" :label="label||text" :disabled="!url" :loading="active&&audio.loading.value" :playing="active&&audio.isPlaying.value" :interruptible="true" @click="$emit('click')"><WPControlIcon/><text>{{!url?(compact?'暂无音频':'暂无离线音频'):active&&audio.error.value?(compact?'重试':'重试播放'):active&&audio.isPlaying.value?(compact?'播放中':'正在播放…'):active&&audio.loading.value?(compact?'加载中':'正在加载…'):text}}</text></WPButton></template>
<script setup lang="ts">
import {computed} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import WPControlIcon from './WPControlIcon.vue'
import {audioPlayback as audio} from '../../services/audio'
const props=withDefaults(defineProps<{url:string;text?:string;label?:string;ownsPlayback?:boolean;compact?:boolean}>(),{text:'听发音',ownsPlayback:true,compact:false});defineEmits(['click'])
const active=computed(()=>props.ownsPlayback!==false&&audio.currentUrl.value===props.url)
</script>
