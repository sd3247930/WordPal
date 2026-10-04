<template><view class="pronunciation-practice"><text class="section-title">跟读练习</text><text class="small muted block">听标准发音，再读给自己听。录音仅本地临时播放。</text><view class="button-row"><WPButton kind="secondary" label="听跟读单词的标准发音" @click="listen">◖)) 听一听</WPButton><WPButton :disabled="!supported||busy" @click="toggle">{{recording?'■ 结束录音':'● 录一遍'}}</WPButton><WPButton v-if="clip" kind="quiet" @click="replay">▷ 听我的录音</WPButton></view><text v-if="status" class="small muted block" role="status">{{status}}</text></view></template>
<script setup lang="ts">
import {ref,onUnmounted,watch} from 'vue'
import WPButton from './wp-button/WPButton.vue'
import type {Word} from '../../packages/core_learning'
import {playWord} from '../services/audio'
import {bindNativeRecorder} from '../services/recording'
const props=defineProps<{word:Word}>()
const recording=ref(false),busy=ref(false),clip=ref(''),status=ref(''),supported=ref(false)
let manager:ReturnType<typeof bindNativeRecorder>|undefined,player:ReturnType<typeof uni.createInnerAudioContext>|undefined,active=true,discard=false,generation=0
// #ifndef H5
manager=bindNativeRecorder({start:()=>{if(active&&!discard){recording.value=true;busy.value=false;status.value='正在录音，最多 15 秒。'}else manager?.stop()},stop:result=>{recording.value=false;busy.value=false;if(active&&!discard){clip.value=result.tempFilePath;status.value='录好了，听听自己的声音。'}discard=false},error:()=>{recording.value=false;busy.value=false;if(active)status.value='无法录音，请检查麦克风权限后再试。'}});supported.value=!!manager
// #endif
// #ifdef H5
supported.value=!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined'
let webRecorder:MediaRecorder|undefined,stream:MediaStream|undefined,timer:ReturnType<typeof setTimeout>|undefined
// #endif
function clearClip(){if(player){player.destroy();player=undefined}
 // #ifdef H5
 if(clip.value)URL.revokeObjectURL(clip.value)
 // #endif
 clip.value=''
}
function listen(){playWord(props.word,message=>status.value=message)}
async function toggle(){
 if(recording.value){manager?.stop()
  // #ifdef H5
  webRecorder?.stop()
  // #endif
  return
 }
 if(busy.value)return;busy.value=true;clearClip();status.value='';discard=false
 // #ifndef H5
 if(!manager?.start({duration:15000,sampleRate:16000,numberOfChannels:1,format:'mp3'})){busy.value=false;status.value='上一段录音正在结束，请稍后再试。'}
 // #endif
 // #ifdef H5
 const request=++generation
 try{
  const captured=await navigator.mediaDevices.getUserMedia({audio:true})
  if(!active||request!==generation){captured.getTracks().forEach(t=>t.stop());return}
  stream=captured
  const chunks:BlobPart[]=[],recorder=new MediaRecorder(captured)
  webRecorder=recorder
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
  recorder.onstop=()=>{
   captured.getTracks().forEach(t=>t.stop())
   if(!active||request!==generation)return
   clearTimeout(timer);recording.value=false;busy.value=false
   clip.value=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));status.value='录好了，听听自己的声音。'
  }
  recorder.start();recording.value=true;busy.value=false;status.value='正在录音，最多 15 秒。'
  timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop()},15000)
 }catch{if(active&&request===generation){busy.value=false;status.value='无法录音，请检查麦克风权限后再试。'}}
 // #endif
}
function replay(){if(!clip.value)return;player?.destroy();player=uni.createInnerAudioContext();player.src=clip.value;player.onError(()=>status.value='录音播放失败，请重新录一遍。');player.play()}
function reset(){generation++;discard=true;manager?.stop()
 // #ifdef H5
 if(webRecorder?.state==='recording')webRecorder.stop();clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop())
 // #endif
 recording.value=false;busy.value=false;clearClip();status.value=''
}
watch(()=>props.word.id,reset);onUnmounted(()=>{active=false;reset();manager?.release()})
</script>
