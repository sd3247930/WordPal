import {test,expect,type Page} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {go,database,setAppearance} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {wordById} from '../../packages/content_schema'
import {resolvePhonics} from '../../packages/phonics'
import type {Word,LearningMode} from '../../packages/core_learning'

function sample(lemma='apple'):Word{
 return JSON.parse(JSON.stringify(wordById[lemma]||{...wordById.apple,id:lemma,word:lemma,ipa:'/ʃɪp/',meaning:'船',phonics:[],phonemes:[],syllables:[],audio:'/static/audio/apple.wav'}))
}
async function seed(page:Page,word=sample(),mode:LearningMode='flash'){
 const db={...freshDatabase(),version:2,currentCourseId:'starter',courseProgress:{starter:{currentLessonId:'l01',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]}
 const words=[word,sample('dog'),sample('fish'),sample('cat')];word.distractors=words.slice(1).map(w=>w.id)
 db.session={id:'phonics-session',date:'2026-10-05',startedAt:'2026-10-05T08:00:00Z',kind:'practice',wordIds:[word.id,'dog'],index:0,mode,input:'',selected:'',revealed:false,answers:[],courseId:'starter',contentVersion:'1.0.0',wordSnapshot:Object.fromEntries(words.map(w=>[w.id,w]))}
 await page.addInitScript(db=>{
  if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}
 },db)
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
async function active(page:Page,index:number|null){
 const expected=index===null?[]:[String(index)]
 await expect.poll(()=>page.locator('.phonics-word .is-active').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-chunk-index')))).toEqual(expected)
 await expect.poll(()=>page.locator('.phonics-breakdown .is-active').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-chunk-index')))).toEqual(expected)
}
async function tick(page:Page,time:number){await page.evaluate(time=>(window as any).phonicsTest.tick(time),time)}
async function event(page:Page,name:string){await page.evaluate(name=>(window as any).phonicsTest.event(name),name)}

test('真实离线 apple 发音连续重播10次，主词与拆分同步且完整档案不变',async({page})=>{
 test.setTimeout(45000);await seed(page);await go(page,'learn');const before=await database(page)
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
 await mockClock(page);await seed(page,word);await go(page,'learn');const before=await database(page)
 await audioButton(page).click();await active(page,0);await tick(page,.28);await active(page,1);await tick(page,.6);await active(page,2)
 await expect(page.locator('.phonics-timing-note')).toHaveAttribute('data-timing','exact')
 await audioButton(page).click();await active(page,0);await tick(page,.6);await active(page,2);await event(page,'ended');await active(page,null)
  await audioButton(page).click();await event(page,'error');await active(page,null);await expect(audioButton(page)).toContainText('重试播放')
 await audioButton(page).click();await active(page,0);expect(await database(page)).toEqual(before)
 await page.locator('.mode-button').filter({hasText:'连接'}).click();await active(page,null)
 await audioButton(page).click();await active(page,0)
 await page.locator('.answer-choice').filter({hasText:'苹果'}).click();await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.word')).toHaveText('dog');await active(page,null)
 await audioButton(page).click();await expect(page.locator('.phonics-word .is-active')).toHaveCount(1)
 await page.getByRole('button',{name:'单词本',exact:true}).click();await expect(page.locator('.phonics-word')).toHaveCount(0)
 expect(await page.evaluate(()=>(window as any).phonicsTest.paused())).toBeTruthy();expect(await page.evaluate(()=>(window as any).phonicsTest.players())).toBe(1)
 const after=await database(page);for(const field of ['cards','history','rewardIds','gems','pets'])expect(after[field]).toEqual(before[field])
})

test('无时间能力使用明确教育提示，apple/ship/rain 的拼写与音块连续无缝',async({page})=>{
 await mockClock(page,false);await seed(page,sample('ship'));await go(page,'learn');const at=new Date('2026-10-05T08:00:00Z');await page.clock.install({time:at});await page.clock.pauseAt(at)
 await expect(page.locator('.phonics-word .chunk-grapheme')).toHaveText(['sh','i','p']);await audioButton(page).click();await active(page,0);await page.clock.runFor(450);await active(page,1);await page.clock.runFor(350);await active(page,2)
 await expect(page.locator('.phonics-timing-note')).toContainText('仅作跟读提示');await expect(page.locator('.phonics-timing-note')).toHaveAttribute('data-timing','visual')
 await event(page,'ended');await active(page,null)
})

test('前后台事件清理声音与高亮，系统减少动效切换立即关闭缩放',async({page})=>{
 await setAppearance(page,'bento','light',{reducedMotion:false});await mockClock(page);await seed(page);await go(page,'learn');const before=await database(page)
 await audioButton(page).click();await tick(page,.4);await active(page,1)
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.locator('.phonics-word .is-active').evaluate(node=>getComputedStyle(node).transform)).toBe('none')
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
 await active(page,null);expect(await page.evaluate(()=>(window as any).phonicsTest.paused())).toBeTruthy()
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'))})
 await active(page,null);await expect(audioButton(page)).not.toHaveClass(/playing/);await audioButton(page).click();await active(page,0);expect(await database(page)).toEqual(before)
})

for(const mode of ['flash','connect','listen','spell','dictation'] as const)test(`${mode} 音块遵守题面隐藏，反馈后可重播且不改排程`,async({page})=>{
 await mockClock(page);await seed(page,sample('rain'),mode);await go(page,'learn');const before=await database(page),hidden=['listen','spell','dictation'].includes(mode)
 await expect(page.locator('.phonics-word')).toHaveCount(hidden?0:1);await expect(page.locator('.phonics-breakdown')).toHaveCount(hidden?0:1)
 if(mode==='flash'){await page.locator('.answer-actions .wp-button').filter({hasText:'查看答案'}).click();await page.locator('.rating-grid .wp-button').filter({hasText:'记住了'}).click()}
 else{if(mode==='spell'||mode==='dictation')await page.locator('.spelling-input input').fill('rain');else await page.locator('.answer-choice').filter({hasText:mode==='connect'?'雨':'rain'}).click();await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click()}
  await expect(page.locator('.phonics-word .chunk-grapheme')).toHaveText(['r','ai','n']);await audioButton(page).click();await active(page,0);await tick(page,.8);await active(page,2)
 expect(await page.locator('.answer-choice .phonics-chunk').count()).toBe(0)
 const after=await database(page);for(const field of ['cards','history','rewardIds','gems','pets'])expect(after[field]).toEqual(before[field])
})

for(const theme of ['bento','swiss','soft','oled'])for(const mode of ['light','dark'])test(`${theme} ${mode} 大字/减少动效/长词在手机与平板保持可读`,async({page})=>{
 await setAppearance(page,theme,mode,{largeText:true,reducedMotion:true});await mockClock(page);const word={...sample(),word:'uncharacteristically',phonics:[],phonemes:[],syllables:[],ipa:''};await seed(page,word);await go(page,'learn')
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});await expect.poll(()=>page.locator('.phonics-word-frame').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(36)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
  await expect(page.locator('.phonics-word .chunk-grapheme')).toHaveText(['uncharacteristically'])
 }
 await audioButton(page).click();await active(page,0)
 const style=await page.locator('.phonics-word .is-active').evaluate(node=>({transform:getComputedStyle(node).transform,duration:parseFloat(getComputedStyle(node).transitionDuration)}));expect(style.transform).toBe('none');expect(style.duration).toBeLessThanOrEqual(.08)
})

test('手机和平板音块视觉样本',async({browser})=>{
 mkdirSync('private/verification/phonics',{recursive:true})
 for(const [theme,mode,width,height] of [['bento','light',390,844],['soft','light',1280,900],['oled','dark',1024,900]] as const){
  const page=await browser.newPage({viewport:{width,height}});await setAppearance(page,theme,mode);await mockClock(page);await seed(page);await go(page,'learn');await audioButton(page).click();await tick(page,.4);await active(page,1)
  await page.screenshot({path:`private/verification/phonics/${theme}-${width}.png`,fullPage:true});await page.close()
 }
})
