import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import Ajv from 'ajv'
import {resolvePhonics,rulePhonics,validPhonicsData,buildTimeline,activeChunkAt,type PhonicsData} from '../packages/phonics'
import type {Word} from '../packages/core_learning'
import {wordById} from '../packages/content_schema'
import {validateCourse,entryWord,type CoursePack} from '../packages/content_schema/course'
import {AudioPlaybackService,type AudioBackend} from '../src/services/audio/AudioPlaybackService'
import {PhonicsPlaybackController} from '../src/services/audio/PhonicsPlaybackController'
import {getPhonicsColor,phonicsColor} from '../src/styles/phonics'
import {themePacks,contrast} from '../src/styles/themes'

function word(lemma:string,ipa='',extra:Partial<Word>={}):Word{return {...wordById.apple,id:lemma,word:lemma,ipa,phonics:[],phonemes:[],syllables:[],audio:lemma+'.wav',...extra}}
function timedApple():Word{const apple=JSON.parse(JSON.stringify(wordById.apple)) as Word;const data=resolvePhonics(apple).data,bounds=[0,260,480,920];apple.phonicsData={...data,chunks:data.chunks.map((c,i)=>({...c,startMs:bounds[i],endMs:bounds[i+1]}))};return apple}
class ClockAudio implements AudioBackend{
 src='';startTime=0;autoplay=false;obeyMuteSwitch=false;paused=true;currentTime:number|undefined=0;duration:number|undefined=.92;failNext=false;starts=0;listeners:Record<string,number>={};events:Record<string,Function>={}
 private bind(name:string,cb:Function){this.events[name]=cb;this.listeners[name]=(this.listeners[name]||0)+1}
 onPlay(cb:()=>void){this.bind('play',cb)}onStop(cb:()=>void){this.bind('stop',cb)}onEnded(cb:()=>void){this.bind('ended',cb)}onPause(cb:()=>void){this.bind('pause',cb)}onError(cb:Function){this.bind('error',cb)}onWaiting(cb:()=>void){this.bind('waiting',cb)}onTimeUpdate(cb:()=>void){this.bind('time',cb)}onCanplay(cb:()=>void){this.bind('canplay',cb)}
 play(){this.starts++;if(this.failNext){this.failNext=false;this.events.error({});return}this.paused=false;this.events.play()}
 stop(){this.paused=true;this.events.stop?.()}pause(){this.paused=true;this.events.pause()}seek(time:number){this.currentTime=time}destroy(){}
 tick(time:number|undefined){this.currentTime=time;this.events.time()}
 end(){this.paused=true;this.events.ended()}
}
function player(now?:()=>number){const audio=new ClockAudio();let created=0;const service=new AudioPlaybackService(()=>{created++;return audio}),controller=new PhonicsPlaybackController(service,()=>true,now);return {audio,service,controller,created:()=>created}}

test('优先兼容人工数组与元数据，apple/ship/rain/book/cake 音块连续且不改旧词或题面',()=>{
 const cases=[['apple',['a','pp','le']],['ship',['sh','i','p']],['rain',['r','ai','n']],['book',['b','oo','k']],['cake',['c','a','ke']]] as const
 for(const [lemma,letters] of cases){const input=wordById[lemma]||word(lemma),before=JSON.stringify(input),result=resolvePhonics(input);assert.deepEqual(result.data.chunks.map(c=>c.grapheme),letters);assert.ok(validPhonicsData(lemma,result.data));assert.equal(JSON.stringify(input),before)}
 const manual=word('ship','/ʃɪp/',{phonics:['shi','p'],phonemes:['/ʃɪ/','/p/'],syllables:['ship']});assert.deepEqual(resolvePhonics(manual).data.chunks.map(c=>c.grapheme),['shi','p'])
 const precise=timedApple();assert.equal(resolvePhonics(precise).data.chunks[1].startMs,260);assert.deepEqual(resolvePhonics(wordById.apple).data.syllables,['ap','ple'])
})
test('保守规则以完整已审核发音验证组合，支持辅音/元音组合、双写、词尾与 silent-e；无法证明时整词降级',()=>{
 for(const [lemma,ipa,letters] of [['thin','/θɪn/',['th','i','n']],['photo','/fəʊtəʊ/',['ph','o','t','o']],['duck','/dʌk/',['d','u','ck']],['boat','/bəʊt/',['b','oa','t']],['miss','/mɪs/',['m','i','ss']],['bake','/beɪk/',['b','a','k','e']],['helped','/helpt/',['h','e','l','p','ed']],['thing','/θɪŋ/',['th','ing']]] as const){
  const result=rulePhonics(word(lemma,ipa));if(lemma==='photo'){assert.equal(result,undefined);continue}assert.deepEqual(result?.chunks.map(c=>c.grapheme),letters)
 }
 const silent=rulePhonics(word('bake','/beɪk/'))!.chunks.at(-1)!;assert.equal(silent.type,'silent-e');assert.equal(silent.phoneme,'')
 for(const [lemma,ipa,letters] of [['chain','/tʃeɪn/',['ch','ai','n']],['play','/pleɪ/',['p','l','ay']],['sheep','/ʃiːp/',['sh','ee','p']],['team','/tiːm/',['t','ea','m']],['moon','/muːn/',['m','oo','n']],['out','/aʊt/',['ou','t']],['cow','/kaʊ/',['c','ow']],['when','/wen/',['wh','e','n']],['phone','/fəʊn/',['ph','o','n','e']]] as const)assert.deepEqual(rulePhonics(word(lemma,ipa))?.chunks.map(c=>c.grapheme),letters)
 for(const candidate of [word('rough','/rʌf/'),word('invented'),word('boat','/bəʊt/',{tags:['ipa-needs-review']}),word('hello world','/həˈləʊ/'),word('unknown','',{phonics:['wrong'],phonemes:['/r/']})]){assert.equal(resolvePhonics(candidate).source,'whole');assert.equal(resolvePhonics(candidate).data.chunks.length,1)}
})
test('导入双重 schema 接受可选音块数据，拒绝间隙/重叠/越界/重复ID/非法或不成对时间；旧课程不迁移',()=>{
 const pack=JSON.parse(readFileSync('src/content/courses/original-primary.json','utf8')) as CoursePack,apple=pack.vocabulary.find(w=>w.id==='apple')!;apple.phonicsData=timedApple().phonicsData!
 const schema=JSON.parse(readFileSync('packages/content_schema/course.schema.json','utf8')),validate=new Ajv({strict:false}).compile(schema)
 assert.equal(validate(pack),true);assert.deepEqual(validateCourse(pack),[]);assert.deepEqual(entryWord(apple,pack).phonicsData,apple.phonicsData)
 for(const change of [{start:2},{end:20},{id:apple.phonicsData.chunks[0].id},{startMs:500,endMs:400},{endMs:undefined},{type:'guess'},{grapheme:'wrong'}]){
  const broken=JSON.parse(JSON.stringify(pack)) as CoursePack;Object.assign(broken.vocabulary.find(w=>w.id==='apple')!.phonicsData!.chunks[1],change);assert.ok(validateCourse(broken).some(i=>i.field==='phonicsData'))
 }
 const old=JSON.parse(readFileSync('src/content/courses/original-primary.json','utf8'));assert.equal(validate(old),true);assert.deepEqual(validateCourse(old),[])
})
test('精确/权重/教育时序分级，边界和静音块不伪造发音；不把均分称为精确对齐',()=>{
 const precise=timedApple().phonicsData!,timeline=buildTimeline(precise,920,true);assert.equal(timeline.kind,'exact');assert.deepEqual([0,260,600,920].map(t=>activeChunkAt(timeline,t)),[0,1,2,2])
 const plain=resolvePhonics(wordById.apple).data,weighted=buildTimeline(plain,920,true);assert.equal(weighted.kind,'weighted');assert.notEqual(weighted.times[0].endMs,920/3)
 assert.equal(buildTimeline(precise,300,true).kind,'weighted');assert.equal(buildTimeline(precise,null,false).kind,'visual');assert.equal(buildTimeline(plain,920,false).kind,'visual')
 const silent=buildTimeline(rulePhonics(word('bake','/beɪk/'))!,920,true);assert.equal(silent.times.at(-1)!.startMs,silent.times.at(-1)!.endMs);assert.equal(activeChunkAt(silent,920),2)
 const gap:PhonicsData={chunks:[{id:'a',grapheme:'a',phoneme:'/æ/',start:0,end:1,startMs:0,endMs:100},{id:'b',grapheme:'b',phoneme:'/b/',start:1,end:2,startMs:200,endMs:300}]};assert.equal(activeChunkAt(buildTimeline(gap,300,true),150),null)
})
test('同词连续10次精确重播每次0→1→2→null，仅一播放器与一组进度监听',async()=>{
 const {audio,service,controller,created}=player();controller.setWord(timedApple())
 try{for(let i=0;i<10;i++){await controller.replay();const seen=[controller.activeChunkIndex.value];audio.tick(.28);seen.push(controller.activeChunkIndex.value);audio.tick(.6);seen.push(controller.activeChunkIndex.value);audio.end();seen.push(controller.activeChunkIndex.value);assert.deepEqual(seen,[0,1,2,null]);assert.equal(controller.playbackState.value,'ended')}
  assert.equal(created(),1);assert.ok(Object.values(audio.listeners).every(n=>n===1));assert.equal(audio.starts,10)
 }finally{controller.dispose();service.destroy()}
})
test('无时钟教育提示、等待暂停、切词、停止后的迟到事件和重试均清理高亮',async()=>{
 let clock=0;const {audio,service,controller}=player(()=>clock);audio.currentTime=undefined;audio.duration=undefined;controller.setWord(wordById.apple)
 try{await controller.play();assert.equal(controller.timing.value,'visual');assert.equal(controller.activeChunkIndex.value,0);clock=150;audio.events.canplay();audio.events.waiting();clock=1000;audio.events.canplay();assert.equal(controller.activeChunkIndex.value,0)
  audio.tick(undefined);clock=1270;audio.tick(undefined);assert.equal(controller.activeChunkIndex.value,1);clock=1570;audio.tick(undefined);assert.equal(controller.activeChunkIndex.value,2);audio.end();assert.equal(controller.activeChunkIndex.value,null)
  controller.setWord(word('ship'));audio.currentTime=0;audio.duration=.92;audio.failNext=true;await assert.rejects(controller.play());assert.equal(controller.playbackState.value,'error');assert.equal(controller.activeChunkIndex.value,null)
  await controller.replay();assert.equal(controller.activeChunkIndex.value,0);controller.stop();audio.tick(.8);audio.events.play();assert.equal(controller.activeChunkIndex.value,null);assert.equal(controller.playbackState.value,'idle')
  controller.setWord(word('rain'));audio.events.ended();assert.equal(controller.activeChunkIndex.value,null)
 }finally{controller.dispose();service.destroy()}
})
test('固定红绿蓝循环在所有主题不变，不将颜色写入音块内容',()=>{
 assert.deepEqual(Array.from({length:9},(_,i)=>getPhonicsColor(i)),['red','green','blue','red','green','blue','red','green','blue'])
 for(const id of ['swiss'] as const)for(const mode of ['light','dark'] as const)for(let i=0;i<9;i++){
  assert.deepEqual(phonicsColor(i,id,mode),phonicsColor(i%3,id,mode))
  for(const hex of [phonicsColor(i,id,mode).ink,phonicsColor(i,id,mode).active]){
   const rgb=[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16));assert.equal(rgb.indexOf(Math.max(...rgb)),i%3);assert.ok(!['#FF0000','#00FF00','#0000FF'].includes(hex))
  }
 }
 const resolved=resolvePhonics(wordById.apple);assert.ok(resolved.data.chunks.every(c=>!('color' in c)))
})
test('瑞士主题明暗的RGB基础色、Active、高对比与75%待播放色均可读，音素沿用正文色',()=>{
 const composite=(fg:string,bg:string)=>'#'+[1,3,5].map(i=>Math.round(parseInt(fg.slice(i,i+2),16)*.75+parseInt(bg.slice(i,i+2),16)*.25).toString(16).padStart(2,'0')).join('')
 for(const id of ['swiss'] as const)for(const mode of ['light','dark'] as const){const theme=themePacks[id][mode==='light'?'buildLight':'buildDark']().tokens
  for(let i=0;i<3;i++){const color=phonicsColor(i,id,mode);assert.notEqual(color.ink,color.active);assert.ok(contrast(color.active,theme.surface)>=4.5,id+' '+mode+' high contrast')
   for(const background of [theme.surface,color.soft]){assert.ok(contrast(color.ink,background)>=3,id+' '+mode);assert.ok(contrast(color.active,background)>=3);assert.ok(contrast(composite(color.ink,background),background)>=3,id+' '+mode+' upcoming')}
   assert.ok(contrast(theme.foreground,color.soft)>=4.5)
  }
 }
})
