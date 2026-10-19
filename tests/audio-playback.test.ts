import test from 'node:test'
import assert from 'node:assert/strict'
import {AudioPlaybackService,type AudioBackend} from '../src/services/audio/AudioPlaybackService'
class FakeAudio implements AudioBackend{
 src='';startTime=9;autoplay=true;obeyMuteSwitch=true;paused=true;plays:string[]=[];seeks:number[]=[];listeners=0;destroyed=false;stopDelay=0;silentStop=false;failNext=false;startDelay=0
 callbacks:Record<string,Function>={}
 onPlay(cb:()=>void){this.callbacks.play=cb;this.listeners++}onStop(cb:()=>void){this.callbacks.stop=cb;this.listeners++}onEnded(cb:()=>void){this.callbacks.ended=cb;this.listeners++}onPause(cb:()=>void){this.callbacks.pause=cb;this.listeners++}onError(cb:Function){this.callbacks.error=cb;this.listeners++}onWaiting(cb:()=>void){this.callbacks.wait=cb;this.listeners++}
 play(){this.plays.push(this.src);if(this.failNext){this.failNext=false;this.paused=true;this.callbacks.error({});return}this.paused=false;if(this.startDelay)setTimeout(()=>this.callbacks.play(),this.startDelay);else this.callbacks.play()}
 stop(){this.paused=true;if(this.silentStop)return;if(this.stopDelay)setTimeout(()=>this.callbacks.stop(),this.stopDelay);else this.callbacks.stop()}
 pause(){this.paused=true;this.callbacks.pause()}seek(n:number){this.seeks.push(n)}destroy(){this.destroyed=true}end(){this.paused=true;this.callbacks.ended()}
}
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
test('App只读静音属性不阻断初始化，十次重播仍沿用完整监听的同一实例',async()=>{const audio=new FakeAudio();Object.defineProperty(audio,'obeyMuteSwitch',{get:()=>true});const service=new AudioPlaybackService(()=>audio);for(let i=0;i<10;i++){await service.play('cat.wav');assert.equal(service.isPlaying.value,true);audio.end()}assert.equal(audio.listeners,6);service.destroy()})
test('同词十次完整重播与下一词只创建一个播放器、只绑定一组监听',async()=>{
 const audio=new FakeAudio();let created=0;const service=new AudioPlaybackService(()=>{created++;return audio})
 for(let i=0;i<10;i++){await service.play('cat.wav');assert.equal(service.isPlaying.value,true);audio.end();assert.equal(service.isPlaying.value,false)}
 await service.play('dog.wav');assert.equal(created,1);assert.equal(audio.listeners,6);assert.equal(audio.plays.length,11);assert.ok(audio.seeks.every(n=>n===0));assert.equal(audio.startTime,0);service.destroy();assert.equal(audio.destroyed,true)
})
test('异步 stop、缺失 stop 与迟到 stop 均可重播且不会清除新一轮播放状态',async()=>{
 const audio=new FakeAudio(),service=new AudioPlaybackService(()=>audio);audio.stopDelay=100
 await service.play('cat.wav');await delay(50);assert.equal(service.isPlaying.value,true)
 audio.silentStop=true;await service.play('dog.wav');assert.equal(service.currentUrl.value,'dog.wav');assert.equal(service.isPlaying.value,true);service.destroy()
})
test('快速连点合并为最后一个请求；后台停止后迟到 play 不恢复声音',async()=>{
 const audio=new FakeAudio(),service=new AudioPlaybackService(()=>audio)
 await service.play('cat.wav');const a=service.play('dog.wav'),b=service.play('sun.wav');await Promise.all([a,b]);assert.deepEqual(audio.plays,['cat.wav','sun.wav'])
 audio.startDelay=30;await delay(130);const pending=service.play('moon.wav');service.stop();await pending;await delay(50);assert.equal(service.isPlaying.value,false);service.destroy()
})
test('延迟加载超过300毫秒才提示、报错后重试可恢复，缺资源不会创建播放器',async()=>{
 const audio=new FakeAudio(),service=new AudioPlaybackService(()=>audio);audio.startDelay=360
 const play=service.play('cat.wav');assert.equal(service.loading.value,false);await delay(320);assert.equal(service.loading.value,true);await play;assert.equal(service.loading.value,false)
 audio.startDelay=0;audio.failNext=true;await assert.rejects(service.play('bad.wav'));assert.ok(service.error.value);await service.replay();assert.equal(service.error.value,null);service.destroy()
 let created=0;const empty=new AudioPlaybackService(()=>{created++;return audio});await assert.rejects(empty.play(''));assert.equal(created,0);empty.destroy()
})

test('H5框架丢弃的play Promise被接住，切词主动中断不产生未处理拒绝',async()=>{
 const audio=new FakeAudio(),html={play:()=>Promise.reject(Object.assign(new Error('interrupted'),{name:'AbortError'}))},oldPlay=audio.play.bind(audio)
 ;(audio as any)._audio=html
 audio.play=()=>{void html.play();oldPlay()}
 const service=new AudioPlaybackService(()=>audio)
 await service.play('cat.wav');await delay(0);service.stop();assert.equal(service.error.value,null);service.destroy()
})
