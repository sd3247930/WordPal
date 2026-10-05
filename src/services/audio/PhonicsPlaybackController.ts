import {ref,shallowRef} from 'vue'
import type {Word} from '../../../packages/core_learning'
import {resolvePhonics,buildTimeline,activeChunkAt,type ResolvedPhonics,type PhonicsPlaybackState,type PhonicsTiming} from '../../../packages/phonics'
import {readFeedbackSettings} from '../../stores/feedback'
import {audioPlayback,AudioPlaybackService,type AudioProgress} from './AudioPlaybackService'

export class PhonicsPlaybackController {
 readonly phonics=shallowRef<ResolvedPhonics|null>(null)
 readonly activeChunkIndex=ref<number|null>(null)
 readonly playbackState=ref<PhonicsPlaybackState>('idle')
 readonly timing=ref<PhonicsTiming>('visual')
 private word?:Word;private key='';private request=0;private timer?:ReturnType<typeof setInterval>
 private unsubscribe:()=>void;private latest?:AudioProgress;private visualMs=0;private lastTick=0;private disposed=false
 constructor(private audio:AudioPlaybackService=audioPlayback,private enabled=()=>readFeedbackSettings().sound,private now=()=>Date.now()){this.unsubscribe=audio.subscribeProgress(progress=>this.update(progress))}
 setWord(word:Word|undefined){
  const key=word?JSON.stringify([word.id,word.word,word.audio,word.phonicsData,word.phonics,word.phonemes,word.syllables]):''
  if(key===this.key)return
  if(this.word&&this.audio.currentUrl.value===this.word.audio)this.audio.stop()
  this.clearTimer();this.key=key;this.word=word;this.phonics.value=word?resolvePhonics(word):null;this.activeChunkIndex.value=null;this.playbackState.value='idle';this.timing.value='visual';this.request=0;this.visualMs=0
 }
 async play(word=this.word){
  if(!word||this.disposed)return
  this.setWord(word)
  if(!this.enabled()){this.stop();throw new Error('学习发音已关闭，可在设置中开启。')}
  await this.audio.play(word.audio)
 }
 replay(){return this.play()}
 stop(){if(this.word&&this.audio.currentUrl.value===this.word.audio)this.audio.stop();this.clearTimer();this.activeChunkIndex.value=null;this.playbackState.value='idle';this.visualMs=0}
 private clearTimer(){clearInterval(this.timer);this.timer=undefined}
 private update(progress:AudioProgress){
  if(this.disposed||!this.word||progress.url!==this.word.audio){this.clearTimer();this.activeChunkIndex.value=null;this.playbackState.value='idle';return}
  this.latest=progress
  if(progress.requestId!==this.request){this.request=progress.requestId;this.visualMs=0;this.lastTick=this.now();this.activeChunkIndex.value=null}
  if(progress.state!=='playing'){this.clearTimer();this.activeChunkIndex.value=null;this.playbackState.value=progress.state==='error'?'error':progress.state==='ended'?'ended':'idle';this.lastTick=this.now();return}
  this.playbackState.value='playing';this.sample()
  if(!this.timer)this.timer=setInterval(()=>this.sample(),50)
 }
 private sample(){
  const progress=this.latest,data=this.phonics.value?.data;if(!progress||!data||this.playbackState.value!=='playing')return
  const now=this.now();if(!progress.waiting)this.visualMs+=Math.max(0,now-this.lastTick);this.lastTick=now
  const timeline=buildTimeline(data,progress.durationMs,progress.positionMs!==null);this.timing.value=timeline.kind
  const position=timeline.kind==='visual'?this.visualMs:progress.positionMs!
  this.activeChunkIndex.value=activeChunkAt(timeline,position)
 }
 dispose(){this.stop();this.disposed=true;this.unsubscribe()}
}
