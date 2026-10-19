import {openCustomPractice,openExploration} from './helpers'
import {test,expect,type Page} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {go,database,setAppearance} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {wordById} from '../../packages/content_schema'
import {resolvePhonics} from '../../packages/phonics'
import {phonicsColor} from '../../src/styles/phonics'
import type {Word,LearningMode} from '../../packages/core_learning'

function sample(lemma='apple'):Word{
 return JSON.parse(JSON.stringify(wordById[lemma]||{...wordById.apple,id:lemma,word:lemma,ipa:'/ʃɪp/',meaning:'船',phonics:[],phonemes:[],syllables:[],audio:'/static/audio/apple.wav'}))
}
async function seed(page:Page,word=sample(),mode:LearningMode='flash',revealed=mode==='flash'){
 const db={...freshDatabase(),version:2,currentCourseId:'phonics-fixture',courseProgress:{'phonics-fixture':{currentLessonId:'l01',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]}
 const words=[word,sample('dog'),sample('fish'),sample('cat')];word.distractors=words.slice(1).map(w=>w.id)
 db.session={id:'phonics-session',date:'2026-10-05',startedAt:'2026-10-05T08:00:00Z',kind:'practice',wordIds:[word.id,'dog'],index:0,mode,input:'',selected:'',revealed,answers:[],courseId:'phonics-fixture',contentVersion:'1.0.0',wordSnapshot:Object.fromEntries(words.map(w=>[w.id,w]))}
 const pack={schemaVersion:2,courseId:'phonics-fixture',contentVersion:'1.0.0',title:'合成拼读测试',route:'theme',abilityLevels:['L5'],sources:[{id:'phonics-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'合成测试',revision:'r1'}],assets:[],units:[{id:'unit-1',title:'Unit 1',lessons:[{id:'l01',title:'合成词',wordIds:words.map(w=>w.id)}]}],vocabulary:words.map(w=>({id:w.id,language:'en',lemma:w.word,meaning:w.meaning,pos:w.pos,ipa:w.ipa,sourceId:'phonics-source',audio:w.audio,image:w.image,phonics:w.phonics,phonemes:w.phonemes,syllables:w.syllables,phonicsData:w.phonicsData,example:w.example}))}
 await page.addInitScript(({db,pack})=>{
  if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));const key='wordpal.content.pack.phonics-fixture.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))}
 },{db,pack})
}
async function mockClock(page:Page,available=true){
 await page.addInitScript(available=>{
  const clock=new WeakMap<HTMLMediaElement,{time:number;paused:boolean}>(),players=new Set<HTMLMediaElement>();let current:HTMLMediaElement|undefined
  const state=(node:HTMLMediaElement)=>{if(!clock.has(node))clock.set(node,{time:0,paused:true});return clock.get(node)!}
  Object.defineProperties(HTMLMediaElement.prototype,{
   currentTime:{configurable:true,get(){return available?state(this).time:NaN},set(value:number){state(this).time=value}},
   duration:{configurable:true,get(){return available?.92:NaN}},
   paused:{configurable:true,get(){return state(this).paused}}
  })
  HTMLMediaElement.prototype.play=function(){current=this;players.add(this);state(this).paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve()}
  HTMLMediaElement.prototype.pause=function(){state(this).paused=true;this.dispatchEvent(new Event('pause'))}
  ;(window as any).phonicsTest={tick(time:number){if(current){state(current).time=time;current.dispatchEvent(new Event('timeupdate'))}},event(name:string){if(current){if(name==='ended')state(current).paused=true;current.dispatchEvent(new Event(name))}},players:()=>players.size,paused:()=>!current||state(current).paused}
 },available)
}
const audioButton=(page:Page)=>page.getByRole('button',{name:'播放当前单词的标准发音',exact:true})
async function active(page:Page,index:number|null,withBreakdown=true){
 const expected=index===null?[]:[String(index)]
 await expect.poll(()=>page.locator('.phonics-word .is-active').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-chunk-index')))).toEqual(expected)
 await expect.poll(()=>page.locator('.phonics-breakdown .is-active').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-chunk-index')))).toEqual(withBreakdown?expected:[])
}
async function tick(page:Page,time:number){await page.evaluate(time=>(window as any).phonicsTest.tick(time),time)}
async function event(page:Page,name:string){await page.evaluate(name=>(window as any).phonicsTest.event(name),name)}

test('真实离线 apple 发音连续重播10次，主词与拆分同步且完整档案不变',async({page})=>{
 test.setTimeout(45000);await seed(page);await go(page,'learn');await openCustomPractice(page);await openExploration(page);const before=await database(page)
 const response=await page.request.get('/static/audio/apple.wav');expect(response.ok()).toBeTruthy()
 for(let i=0;i<10;i++){
  await page.evaluate(()=>{
   const w=window as any;w.phonicsSeen=[];w.phonicsMismatch=false
   w.phonicsProbe=setInterval(()=>{
    const a=document.querySelector('.phonics-word .is-active')?.getAttribute('data-chunk-index')??null,b=document.querySelector('.phonics-breakdown .is-active')?.getAttribute('data-chunk-index')??null
    if(a!==b)w.phonicsMismatch=true
    if(w.phonicsSeen.at(-1)!==a)w.phonicsSeen.push(a)
   },20)
  })
  await audioButton(page).click();await expect(audioButton(page)).toHaveClass(/playing/)
  await expect(page.locator('.phonics-timing-note')).toHaveAttribute('data-timing','weighted')
  await expect(audioButton(page)).not.toHaveClass(/playing/);await active(page,null)
  const trace=await page.evaluate(()=>{const w=window as any;clearInterval(w.phonicsProbe);return {seen:w.phonicsSeen,mismatch:w.phonicsMismatch}})
  expect(trace.mismatch).toBeFalsy();expect(trace.seen.filter((i:string|null)=>i!==null)).toEqual(['0','1','2'])
 }
 expect(await database(page)).toEqual(before)
})

test('精确元数据同步、播放中重播、错误恢复、切模式/切词/离页均无残留',async({page})=>{
 const word=sample(),bounds=[0,260,480,920];word.phonicsData={...resolvePhonics(word).data,chunks:resolvePhonics(word).data.chunks.map((chunk,i)=>({...chunk,startMs:bounds[i],endMs:bounds[i+1]}))}
 await mockClock(page);await seed(page,word);await go(page,'learn');await openCustomPractice(page);await openExploration(page);const before=await database(page)
 await audioButton(page).click();await active(page,0);await tick(page,.28);await active(page,1);await tick(page,.6);await active(page,2)
 await expect(page.locator('.phonics-timing-note')).toHaveAttribute('data-timing','exact')
 await audioButton(page).click();await active(page,0);await tick(page,.6);await active(page,2);await event(page,'ended');await active(page,null)
  await audioButton(page).click();await event(page,'error');await active(page,null);await expect(audioButton(page)).toContainText('重试播放')
 await audioButton(page).click();await active(page,0);expect(await database(page)).toEqual(before)
 await page.locator('.mode-button').filter({hasText:'连接'}).click();await active(page,null);await page.getByRole('button',{name:/^查看提示/}).click();await expect(page.locator('.study-hint')).toBeVisible();await expect(page.locator('.phonics-breakdown')).toHaveCount(0)
 await audioButton(page).click();await active(page,0,false)
 await page.locator('.answer-choice').filter({hasText:'苹果'}).click();await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.word')).toHaveText('dog');await page.getByRole('button',{name:/^查看提示/}).click();await expect(page.locator('.study-hint')).toBeVisible();await expect(page.locator('.phonics-breakdown')).toHaveCount(0);await active(page,null,false)
 await audioButton(page).click();await expect(page.locator('.phonics-word .is-active')).toHaveCount(1)
 await page.getByRole('button',{name:'单词本',exact:true}).click();await expect(page.locator('.phonics-word')).toHaveCount(0)
 expect(await page.evaluate(()=>(window as any).phonicsTest.paused())).toBeTruthy();expect(await page.evaluate(()=>(window as any).phonicsTest.players())).toBe(1)
 const after=await database(page);for(const field of ['cards','history','rewardIds','gems','pets'])expect(after[field]).toEqual(before[field])
})

test('无时间能力使用明确教育提示，apple/ship/rain 的拼写与音块连续无缝',async({page})=>{
 await mockClock(page,false);await seed(page,sample('ship'));await go(page,'learn');await openCustomPractice(page);await openExploration(page);const at=new Date('2026-10-05T08:00:00Z');await page.clock.install({time:at});await page.clock.pauseAt(at)
 await expect(page.locator('.phonics-word .chunk-grapheme')).toHaveText(['sh','i','p']);await audioButton(page).click();await active(page,0);await page.clock.runFor(450);await active(page,1);await page.clock.runFor(350);await active(page,2)
 await expect(page.locator('.phonics-timing-note')).toContainText('仅作跟读提示');await expect(page.locator('.phonics-timing-note')).toHaveAttribute('data-timing','visual')
 await event(page,'ended');await active(page,null)
})

test('前后台事件清理声音与高亮，系统减少动效切换立即关闭缩放',async({page})=>{
 await setAppearance(page,'swiss','light',{reducedMotion:false});await mockClock(page);await seed(page);await go(page,'learn');await openCustomPractice(page);await openExploration(page);const before=await database(page)
 await audioButton(page).click();await tick(page,.4);await active(page,1)
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.locator('.phonics-word .is-active').evaluate(node=>getComputedStyle(node).transform)).toBe('none')
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
 await active(page,null);expect(await page.evaluate(()=>(window as any).phonicsTest.paused())).toBeTruthy()
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'))})
 await active(page,null);await expect(audioButton(page)).not.toHaveClass(/playing/);await audioButton(page).click();await active(page,0);expect(await database(page)).toEqual(before)
})

const rgbCases=(['swiss'] as const).flatMap(theme=>(['light','dark'] as const).map(mode=>({theme,mode,highContrast:false})))
rgbCases.push({theme:'swiss',mode:'light',highContrast:true},{theme:'swiss',mode:'dark',highContrast:true})
for(const {theme,mode,highContrast} of rgbCases)test(`${theme} ${mode}${highContrast?' 高对比':''} 红绿蓝循环、Active色与下划线双处同步，结束及重播恢复`,async({page})=>{
 const word:Word={...sample(),id:'blends',word:'blends',ipa:'/blendz/',meaning:'混合',example:'It blends well.',phonics:['b','l','e','n','d','s'],phonemes:['/b/','/l/','/e/','/n/','/d/','/z/'],syllables:['blends']}
 word.phonicsData={...resolvePhonics(word).data,chunks:resolvePhonics(word).data.chunks.map((chunk,i)=>({...chunk,startMs:i*140,endMs:(i+1)*140}))}
 await setAppearance(page,theme,mode,{highContrast});await mockClock(page);await seed(page,word);await go(page,'learn');await openCustomPractice(page);await openExploration(page);const before=await database(page)
 const names=['red','green','blue','red','green','blue'],rgb=(hex:string)=>'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')'
 const colors=async(selector:string)=>page.locator(selector+' .chunk-grapheme').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).color))
 const base=names.map((_,i)=>rgb(phonicsColor(i,theme,mode)[highContrast?'active':'ink']))
 for(const selector of ['.phonics-word','.phonics-breakdown']){
  expect(await page.locator(selector+' .phonics-chunk').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-color')))).toEqual(names)
  expect(await colors(selector)).toEqual(base)
 }
 await audioButton(page).click()
 for(let index=0;index<6;index++){
  await tick(page,(index*140+20)/1000);await active(page,index)
  const expected=[...base];expected[index]=rgb(phonicsColor(index,theme,mode).active)
  for(const selector of ['.phonics-word','.phonics-breakdown'])await expect.poll(()=>colors(selector)).toEqual(expected)
  const underline=await page.locator('.phonics-word .is-active .chunk-grapheme').evaluate(n=>({weight:getComputedStyle(n).fontWeight,height:getComputedStyle(n,'::after').height,opacity:getComputedStyle(n,'::after').opacity,color:getComputedStyle(n,'::after').backgroundColor}))
  expect(underline).toEqual({weight:'800',height:'3px',opacity:'1',color:expected[index]})
  expect(await page.locator('.phonics-card.is-active').evaluate(n=>getComputedStyle(n).borderTopColor)).toBe(expected[index])
 }
 await audioButton(page).click();await active(page,0);await tick(page,.31);await active(page,2);await event(page,'ended');await active(page,null)
 for(const selector of ['.phonics-word','.phonics-breakdown'])await expect.poll(()=>colors(selector)).toEqual(base)
 await expect.poll(()=>page.locator('.phonics-word .chunk-grapheme').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n,'::after').opacity))).toEqual(Array(6).fill('0'))
 expect(await database(page)).toEqual(before);expect(await page.evaluate(()=>(window as any).phonicsTest.players())).toBe(1)
})

for(const mode of ['flash','connect','listen','spell','dictation'] as const)test(`${mode} 音块遵守题面隐藏，反馈后可重播且不改排程`,async({page})=>{
 await mockClock(page);await seed(page,sample('rain'),mode,false);await go(page,'learn');await openCustomPractice(page);await openExploration(page);const before=await database(page),hidden=['listen','spell','dictation'].includes(mode)
 await expect(page.locator('.phonics-word')).toHaveCount(hidden?0:1);await expect(page.locator('.phonics-breakdown')).toHaveCount(0)
 if(mode==='flash'){await page.locator('.answer-actions .wp-button').filter({hasText:'查看答案'}).click();await page.locator('.rating-grid .wp-button').filter({hasText:'记住了'}).click()}
 else{if(mode==='spell'||mode==='dictation')await page.locator('.spelling-input input').fill('rain');else await page.locator('.answer-choice').filter({hasText:mode==='connect'?'雨':'rain'}).click();await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click()}
  await openExploration(page);await expect(page.locator('.phonics-word .chunk-grapheme')).toHaveText(['r','ai','n']);await audioButton(page).click();await active(page,0);await tick(page,.8);await active(page,2)
 expect(await page.locator('.answer-choice .phonics-chunk').count()).toBe(0)
 const after=await database(page);for(const field of ['cards','history','rewardIds','gems','pets'])expect(after[field]).toEqual(before[field])
})

for(const theme of ['swiss'])for(const mode of ['light','dark'])test(`${theme} ${mode} 大字/减少动效/长词在手机与平板保持可读`,async({page})=>{
 await setAppearance(page,theme,mode,{largeText:true,reducedMotion:true});await mockClock(page);const word={...sample(),id:'uncharacteristically',word:'uncharacteristically',phonicsData:undefined,phonics:[],phonemes:[],syllables:[],ipa:''};await seed(page,word);await go(page,'learn');await openExploration(page)
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});await expect.poll(()=>page.locator('.phonics-word-frame').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(20)
  const frame=await page.locator('.phonics-word-frame').boundingBox(),grapheme=await page.locator('.phonics-word .chunk-grapheme').boundingBox();expect(grapheme!.x).toBeGreaterThanOrEqual(frame!.x-1);expect(grapheme!.x+grapheme!.width).toBeLessThanOrEqual(frame!.x+frame!.width+1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
  await expect(page.locator('.phonics-word .chunk-grapheme')).toHaveText(['uncharacteristically'])
 }
 await audioButton(page).click();await active(page,0)
 const style=await page.locator('.phonics-word .is-active').evaluate(node=>({transform:getComputedStyle(node).transform,duration:parseFloat(getComputedStyle(node).transitionDuration)}));expect(style.transform).toBe('none');expect(style.duration).toBeLessThanOrEqual(.08)
})

test('手机和平板音块视觉样本',async({browser})=>{
 mkdirSync('private/verification/phonics-rgb',{recursive:true})
 for(const [theme,mode,width,height] of [['swiss','light',390,844],['swiss','light',1280,900],['swiss','dark',1024,900]] as const){
  const page=await browser.newPage({viewport:{width,height}});await setAppearance(page,theme,mode);await mockClock(page);await seed(page);await go(page,'learn');await openCustomPractice(page);await openExploration(page);await audioButton(page).click();await tick(page,.4);await active(page,1)
  await page.screenshot({path:`private/verification/phonics-rgb/${theme}-${width}.png`,fullPage:true});await page.close()
 }
})
