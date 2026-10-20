import {ref} from 'vue'
export interface AudioBackend {
 src:string;startTime:number;autoplay:boolean;obeyMuteSwitch:boolean;sessionCategory?:string;paused?:boolean
 currentTime?:number;duration?:number
 play():void;stop():void;pause():void;seek(position:number):void;destroy():void
 onPlay(callback:()=>void):void;onStop(callback:()=>void):void;onEnded(callback:()=>void):void;onPause(callback:()=>void):void
 onError(callback:(error:{errCode?:number;errMsg?:string})=>void):void;onWaiting?(callback:()=>void):void
 onTimeUpdate?(callback:()=>void):void;onCanplay?(callback:()=>void):void
}
export interface AudioProgress {requestId:number;url:string|null;state:'idle'|'playing'|'paused'|'ended'|'error';positionMs:number|null;durationMs:number|null;waiting:boolean}
export class AudioPlaybackService {
 readonly isPlaying=ref(false);readonly currentUrl=ref<string|null>(null);readonly error=ref<Error|null>(null);readonly loading=ref(false)
 private backend?:AudioBackend;private pendingStart?:()=>void;private settle?:{resolve:()=>void;reject:(error:Error)=>void}
 private stopTimer?:ReturnType<typeof setTimeout>;private loadingTimer?:ReturnType<typeof setTimeout>;private timeout?:ReturnType<typeof setTimeout>
 private generation=0;private lastRequest=0;private trailing?:ReturnType<typeof setTimeout>
 private activeGeneration=0
 private progressTimer?:ReturnType<typeof setInterval>;private progressListeners=new Set<(progress:AudioProgress)=>void>()
 private progress:AudioProgress={requestId:0,url:null,state:'idle',positionMs:null,durationMs:null,waiting:false}
 constructor(private factory:()=>AudioBackend=()=>uni.createInnerAudioContext() as AudioBackend){}
 subscribeProgress(listener:(progress:AudioProgress)=>void){this.progressListeners.add(listener);listener({...this.progress});return ()=>{this.progressListeners.delete(listener)}}
 private publish(change:Partial<AudioProgress>={}){Object.assign(this.progress,change);for(const listener of this.progressListeners)listener({...this.progress})}
 private clearProgress(){clearInterval(this.progressTimer);this.progressTimer=undefined}
 private readProgress(){
  if(!this.backend||this.activeGeneration!==this.generation||!this.activeGeneration)return
  let positionMs:number|null=null,durationMs:number|null=null
  try{const time=this.backend.currentTime,duration=this.backend.duration;if(typeof time==='number'&&Number.isFinite(time)&&time>=0)positionMs=time*1000;if(typeof duration==='number'&&Number.isFinite(duration)&&duration>0)durationMs=duration*1000}catch{}
  this.publish({positionMs,durationMs})
 }
 private context(){
  if(this.backend)return this.backend
  const audio=this.factory();audio.autoplay=false;audio.startTime=0
  // uni-app H5 discards HTMLMediaElement.play()'s promise. Rapid step changes
  // intentionally stop playback; consume its AbortError instead of leaking an
  // unhandled rejection. Native contexts do not expose this HTML audio handle.
  const html=(audio as AudioBackend&{_audio?:{play:()=>Promise<void>}})._audio
  if(html&&typeof html.play==='function'){
   const play=html.play.bind(html)
   html.play=()=>{const epoch=this.generation,promise=play();void promise?.catch(error=>{if(error?.name!=='AbortError'&&epoch===this.generation&&this.activeGeneration)this.fail('暂时无法播放，请检查声音设置或重试。')});return promise}
  }
  // App exposes obeyMuteSwitch as a getter; supported mini programs allow a setter.
  const muteProperty=Object.getOwnPropertyDescriptor(audio,'obeyMuteSwitch')
  if(!muteProperty||muteProperty.set||muteProperty.writable)try{audio.obeyMuteSwitch=false}catch{}
  try{audio.sessionCategory='playback'}catch{}
  audio.onPlay(()=>{if(!this.activeGeneration||this.activeGeneration!==this.generation)return;this.isPlaying.value=true;this.loading.value=false;this.clearLoading();this.publish({state:'playing',waiting:false});this.readProgress();this.clearProgress();this.progressTimer=setInterval(()=>this.readProgress(),60);this.settle?.resolve();this.settle=undefined})
  audio.onStop(()=>{if(this.pendingStart){const start=this.pendingStart;this.pendingStart=undefined;clearTimeout(this.stopTimer);start()}else if(audio.paused!==false){this.isPlaying.value=false;this.loading.value=false;this.clearLoading();this.clearProgress();this.publish({state:'idle',positionMs:null,waiting:false})}})
  audio.onEnded(()=>{this.activeGeneration=0;this.isPlaying.value=false;this.loading.value=false;this.clearLoading();this.clearProgress();this.publish({state:'ended',positionMs:null,waiting:false});this.settle?.resolve();this.settle=undefined})
  audio.onPause(()=>{this.isPlaying.value=false;this.loading.value=false;this.clearLoading();this.clearProgress();this.publish({state:'paused',waiting:false})})
  audio.onError(()=>this.fail('暂时无法播放，请检查声音设置或重试。'))
  audio.onWaiting?.(()=>{this.publish({waiting:true});this.loadingTimer=setTimeout(()=>this.loading.value=true,300)})
  audio.onTimeUpdate?.(()=>{if(this.activeGeneration&&this.activeGeneration===this.generation){this.publish({waiting:false});this.readProgress()}})
  audio.onCanplay?.(()=>this.readProgress())
  this.backend=audio
  return audio
 }
 private clearLoading(){clearTimeout(this.loadingTimer);clearTimeout(this.timeout)}
 private fail(message:string){this.activeGeneration=0;this.clearLoading();this.clearProgress();this.pendingStart=undefined;clearTimeout(this.stopTimer);this.isPlaying.value=false;this.loading.value=false;this.error.value=new Error(message);this.publish({state:'error',positionMs:null,waiting:false});this.settle?.reject(this.error.value);this.settle=undefined}
 play(url:string):Promise<void>{
  if(!url){this.fail('这个单词暂无离线音频，可以选择文字学习。');return Promise.reject(this.error.value!)}
  const epoch=++this.generation;this.settle?.resolve();this.settle=undefined;clearTimeout(this.trailing);this.clearLoading();this.clearProgress();this.error.value=null;this.currentUrl.value=url;this.publish({requestId:epoch,url,state:'idle',positionMs:null,durationMs:null,waiting:false})
  return new Promise((resolve,reject)=>{
   this.settle={resolve,reject}
   const begin=()=>{
    if(epoch!==this.generation){resolve();return}
    try{
     const fresh=!this.backend,audio=this.context()
     const start=()=>{if(epoch!==this.generation)return;this.pendingStart=undefined;this.activeGeneration=epoch;const same=audio.src===url;audio.src=url;audio.startTime=0;if(same)try{audio.seek(0)}catch{}this.isPlaying.value=false;this.loading.value=false;this.loadingTimer=setTimeout(()=>{if(epoch===this.generation)this.loading.value=true},300);this.timeout=setTimeout(()=>{if(epoch===this.generation)this.fail('播放未能开始，请重试。')},8000);audio.play()}
     // A fresh native context has no previous resource to stop.
     if(fresh){start();return}
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
 stop(){this.generation++;this.activeGeneration=0;clearTimeout(this.trailing);clearTimeout(this.stopTimer);this.pendingStart=undefined;this.clearLoading();this.clearProgress();this.settle?.resolve();this.settle=undefined;this.isPlaying.value=false;this.loading.value=false;this.publish({requestId:this.generation,state:'idle',positionMs:null,waiting:false});this.backend?.stop()}
 pause(){this.clearLoading();this.clearProgress();this.backend?.pause();this.isPlaying.value=false;this.loading.value=false;this.publish({state:'paused',waiting:false})}
 resume(){if(!this.backend||!this.currentUrl.value)return;try{this.backend.play()}catch{this.fail('继续播放失败，请重新播放。')}}
 destroy(){this.stop();this.backend?.destroy();this.backend=undefined;this.currentUrl.value=null}
}
export const audioPlayback=new AudioPlaybackService()
