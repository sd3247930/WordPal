<template><WPButton kind="secondary" :class="{'audio-icon-only':iconOnly,'audio-failed':state==='error'}" :label="accessibleLabel" :data-audio-state="state" :disabled="!url" :loading="active&&audio.loading.value" :playing="active&&audio.isPlaying.value" :interruptible="true" @click="$emit('click')"><image v-if="iconSrc&&!iconFailed" class="audio-control-icon" :src="iconSrc" mode="aspectFit" aria-hidden="true" @error="iconFailed=true"/><WPControlIcon v-else/><text v-if="!iconOnly">{{!url?(compact?'暂无音频':'暂无离线音频'):active&&audio.error.value?(compact?'重试':'重试播放'):active&&audio.isPlaying.value?(compact?'播放中':'正在播放…'):active&&audio.loading.value?(compact?'加载中':'正在加载…'):text}}</text></WPButton></template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import WPControlIcon from './WPControlIcon.vue'
import {audioPlayback as audio} from '../../services/audio'
const props=withDefaults(defineProps<{url:string;text?:string;label?:string;ownsPlayback?:boolean;compact?:boolean;iconOnly?:boolean;iconSrc?:string}>(),{text:'听发音',ownsPlayback:true,compact:false,iconOnly:false,iconSrc:''});defineEmits(['click'])
const active=computed(()=>props.ownsPlayback!==false&&audio.currentUrl.value===props.url)
const iconFailed=ref(false)
watch(()=>props.iconSrc,()=>iconFailed.value=false)
const state=computed(()=>!props.url?'missing':active.value&&audio.error.value?'error':active.value&&audio.isPlaying.value?'playing':active.value&&audio.loading.value?'loading':'idle')
const accessibleLabel=computed(()=>{const label=props.label||props.text;if(!props.iconOnly)return label;return label+{missing:'，暂无音频',error:'，播放失败，点击重试',playing:'，正在播放，再次点击重播',loading:'，正在加载',idle:''}[state.value]})
</script>
<style scoped>
.audio-icon-only :deep(.wp-spinner){display:none}
</style>
