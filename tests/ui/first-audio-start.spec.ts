import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database} from './helpers'
import {seedSpellingPractice} from '../helpers/spelling-practice'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,STUDY_STEPS} from '../../src/services/learning/DailyLearningPlan'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'

type Entry='daily'|'overview'|'custom'
async function seedDaily(page:Page){
 const db:Database={...freshDatabase(),version:2,currentCourseId:'starter',abilityLevel:'L1',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}
 const plan=selectDailyPlan(db,starterPack)!;plan.flow!.begunAt=plan.startedAt;plan.flow!.step='spell';plan.mode='spell';plan.revealed=false;plan.wordSnapshot=JSON.parse(JSON.stringify(wordById));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']))
 for(const step of STUDY_STEPS.slice(0,STUDY_STEPS.indexOf('spell')))plan.flow!.completed[step]=[...plan.wordIds]
 db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 await page.addInitScript(db=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)
}
async function open(page:Page,entry:Entry){
 if(entry==='custom'){await seedSpellingPractice(page,'spell');await go(page,'learn');await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('2');await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click();await page.getByRole('button',{name:'开始练习',exact:true}).click()}
 else{await seedDaily(page);await go(page,'learn');if(entry==='overview')await page.locator('.study-overview-toggle').click()}
}
async function simulateNativeInitialState(page:Page){
 await page.evaluate(async()=>{
  const {audioPlayback:service}=await import('/src/services/audio/index.ts' as string),player=service as any,create=player.factory
  if(player.backend)throw Error('Expected a cold player')
  const stats=(window as any).firstAudioStats={created:0,unprepared:0,stoppedErrors:0}
  player.factory=()=>{
   stats.created++;const audio=create(),errors:Function[]=[]
   // Model App's synchronous property flushes and stopped-resource events;
   // retain the real H5 player, resource fetch and play promise underneath.
   return new Proxy(audio,{
    get(target,key){if(key==='onError')return(callback:Function)=>{errors.push(callback);target.onError(callback)};if(key==='stop')return()=>{stats.stoppedErrors++;for(const callback of errors)callback({errCode:10003,errMsg:'stopped resource'});target.stop()};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value},
    set(target,key,value){if(['autoplay','startTime','sessionCategory'].includes(String(key))&&!target.src){stats.unprepared++;queueMicrotask(()=>{for(const callback of errors)callback({errCode:10003,errMsg:'empty resource'})})}return Reflect.set(target,key,value,target)}
   })
  }
 })
}
for(const theme of ['swiss','clay'])for(const entry of ['daily','overview','custom'] as Entry[])test(`首词冷启动不误报且切词重播正常 ${theme} ${entry}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,'light');await open(page,entry);await simulateNativeInitialState(page)
 const before=await database(page),audio=page.locator('.practice-audio');await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing');await expect(page.getByText(/暂时无法播放/)).toHaveCount(0)
 const stats=()=>page.evaluate(()=>(window as any).firstAudioStats);expect((await stats()).unprepared).toBe(0);expect((await stats()).created).toBe(1)
 for(let i=0;i<3;i++){await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing');await expect(page.getByText(/暂时无法播放/)).toHaveCount(0)}
 const s=entry==='custom'?before.customPractice:before.courseProgress.starter.dailyPlan,word=s.wordSnapshot[s.wordIds[s.index]].word
 const keyboard=page.getByRole('button',{name:'键盘输入',exact:true});if(await keyboard.count())await keyboard.click();await page.locator('.slot-native input').fill(word);const submit=page.getByRole('button',{name:'确认答案 →',exact:true});await submit.evaluate(n=>n.scrollIntoView({block:'center'}));await submit.click();await page.locator('.answer-feedback').getByRole('button').last().click();await expect(audio).toHaveAttribute('data-audio-state','idle');await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing');await expect(page.getByText(/暂时无法播放/)).toHaveCount(0)
 expect((await stats()).created).toBe(1);expect((await stats()).stoppedErrors).toBeGreaterThan(0);expect((await database(page)).gems).toBe(before.gems)
})
