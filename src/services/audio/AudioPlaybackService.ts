import {ref} from 'vue'
export interface AudioBackend {
 src:string;startTime:number;autoplay:boolean;obeyMuteSwitch:boolean;sessionCategory?:string;paused?:boolean
 play():void;stop():void;pause():void;seek(position:number):void;destroy():void
 onPlay(callback:()=>void):void;onStop(callback:()=>void):void;onEnded(callback:()=>void):void;onPause(callback:()=>void):void
 onError(callback:(error:{errCode?:number;errMsg?:string})=>void):void;onWaiting?(callback:()=>void):void
}
export class AudioPlaybackService {
 readonly isPlaying=ref(false);readonly currentUrl=ref<string|null>(null);readonly error=ref<Error|null>(null);readonly loading=ref(false)
 private backend?:AudioBackend;private pendingStart?:()=>void;private settle?:{resolve:()=>void;reject:(error:Error)=>void}
 private stopTimer?:ReturnType<typeof setTimeout>;private loadingTimer?:ReturnType<typeof setTimeout>;private timeout?:ReturnType<typeof setTimeout>
 private generation=0;private lastRequest=0;private trailing?:ReturnType<typeof setTimeout>
 private activeGeneration=0
 constructor(private factory:()=>AudioBackend=()=>uni.createInnerAudioContext() as AudioBackend){}
 private context(){
  if(this.backend)return this.backend
  const audio=this.factory();audio.autoplay=false;audio.startTime=0
  // App exposes obeyMuteSwitch as a getter; supported mini programs allow a setter.
  const muteProperty=Object.getOwnPropertyDescriptor(audio,'obeyMuteSwitch')
  if(!muteProperty||muteProperty.set||muteProperty.writable)try{audio.obeyMuteSwitch=false}catch{}
  try{audio.sessionCategory='playback'}catch{}
  audio.onPlay(()=>{if(!this.activeGeneration||this.activeGeneration!==this.generation)return;this.isPlaying.value=true;this.loading.value=false;this.clearLoading();this.settle?.resolve();this.settle=undefined})
  audio.onStop(()=>{if(this.pendingStart){const start=this.pendingStart;this.pendingStart=undefined;clearTimeout(this.stopTimer);start()}else if(audio.paused!==false){this.isPlaying.value=false;this.loading.value=false;this.clearLoading()}})
  audio.onEnded(()=>{this.isPlaying.value=false;this.loading.value=false;this.clearLoading();this.settle?.resolve();this.settle=undefined})
  audio.onPause(()=>{this.isPlaying.value=false;this.loading.value=false;this.clearLoading()})
  audio.onError(()=>this.fail('暂时无法播放，请检查声音设置或重试。'))
  audio.onWaiting?.(()=>{this.loadingTimer=setTimeout(()=>this.loading.value=true,300)})
  this.backend=audio
  return audio
 }
 private clearLoading(){clearTimeout(this.loadingTimer);clearTimeout(this.timeout)}
 private fail(message:string){this.activeGeneration=0;this.clearLoading();this.pendingStart=undefined;clearTimeout(this.stopTimer);this.isPlaying.value=false;this.loading.value=false;this.error.value=new Error(message);this.settle?.reject(this.error.value);this.settle=undefined}
 play(url:string):Promise<void>{
  if(!url){this.fail('这个单词暂无离线音频，可以选择文字学习。');return Promise.reject(this.error.value!)}
  const epoch=++this.generation;this.settle?.resolve();this.settle=undefined;clearTimeout(this.trailing);this.clearLoading();this.error.value=null;this.currentUrl.value=url
  return new Promise((resolve,reject)=>{
   this.settle={resolve,reject}
   const begin=()=>{
    if(epoch!==this.generation){resolve();return}
    try{
     const audio=this.context()
     const start=()=>{if(epoch!==this.generation)return;this.pendingStart=undefined;this.activeGeneration=epoch;const same=audio.src===url;audio.src=url;audio.startTime=0;if(same)try{audio.seek(0)}catch{}this.isPlaying.value=false;this.loading.value=false;this.loadingTimer=setTimeout(()=>{if(epoch===this.generation)this.loading.value=true},300);this.timeout=setTimeout(()=>{if(epoch===this.generation)this.fail('播放未能开始，请重试。')},8000);audio.play()}
     this.pendingStart=start;audio.stop()
     // Native bases may dispatch stop asynchronously or omit it when already stopped.
     if(this.pendingStart)this.stopTimer=setTimeout(()=>{if(this.pendingStart===start){this.pendingStart=undefined;start()}},60)
    }catch{this.fail('播放器无法启动，请重试。')}
   }
   const now=Date.now(),delay=Math.max(0,120-(now-this.lastRequest));this.lastRequest=now
   if(delay)this.trailing=setTimeout(begin,delay);else begin()
  })
 }
 replay(){return this.currentUrl.value?this.play(this.currentUrl.value):Promise.reject(new Error('还没有选择音频。'))}
 stop(){this.generation++;this.activeGeneration=0;clearTimeout(this.trailing);clearTimeout(this.stopTimer);this.pendingStart=undefined;this.clearLoading();this.settle?.resolve();this.settle=undefined;this.isPlaying.value=false;this.loading.value=false;this.backend?.stop()}
 pause(){this.clearLoading();this.backend?.pause();this.isPlaying.value=false;this.loading.value=false}
 resume(){if(!this.backend||!this.currentUrl.value)return;try{this.backend.play()}catch{this.fail('继续播放失败，请重新播放。')}}
 destroy(){this.stop();this.backend?.destroy();this.backend=undefined;this.currentUrl.value=null}
}
export const audioPlayback=new AudioPlaybackService()
