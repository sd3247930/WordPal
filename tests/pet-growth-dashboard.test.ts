import {startLegacyRound} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {readFile} from 'node:fs/promises'
import sharp from 'sharp'
import {createPet,growPet,applyLearningReward} from '../packages/pet_engine'
import type {Answer} from '../packages/core_learning'
import {petGrowthMetrics,petStudyDestination} from '../src/services/pet-growth-dashboard'
import {petGrowthIconNames,petGrowthIconSource} from '../src/services/pet-growth-icons'
import {loadCourseRegistry,installationStatus,archiveStatus} from '../src/services/content/ContentRegistry'
import {useProfileStore} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value)}
const answer=(id:string,wordId='cat'):Answer=>({id,wordId,rating:3,correct:true,at:'2026-10-17T08:00:00Z',source:'new_word',mode:'flash',input:''})

test('1. 经验与亲密度按当前精灵读取，跨级仅本级进度结转；设备统计按正式答题ID去重',()=>{
 const pet={...createPet('water'),level:4,exp:398,affection:71},history=[answer('a'),answer('a'),answer('b','dog'),{...answer('c'),source:'practice' as const},{...answer('d'),at:'invalid'},{...answer('e'),id:''}];const original=JSON.stringify({pet,history})
 const m=petGrowthMetrics(pet,history);assert.deepEqual([m.lifetimeXp,m.levelXp,m.remainingXp,m.bond],[398,98,2,71]);assert.deepEqual(m.device,{answerCount:2,uniqueWords:2,activeMinutes:null});assert.equal(JSON.stringify({pet,history}),original)
 const grown=growPet(pet,{source:'spelling',exp:212,affection:2},0),after=petGrowthMetrics(grown,history);assert.deepEqual([after.level,after.levelXp,after.remainingXp,after.lifetimeXp],[7,10,90,610]);assert.equal(after.bond,73)
 const empty=petGrowthMetrics({...pet,exp:NaN,affection:101},history);assert.equal(empty.lifetimeXp,null);assert.equal(empty.levelXp,null);assert.equal(empty.bond,null);const unreadable=petGrowthMetrics(pet,history,true);assert.equal(unreadable.device.answerCount,null);assert.equal(unreadable.level,null)
})
test('1. 真实学习提交后统计刷新，重放同答案不重复发奖，读取和导航判定均不改档案',()=>{
 storage.clear();loadCourseRegistry();setActivePinia(createPinia());const profile=useProfileStore(),learning=useLearningStore();assert.equal(startLegacyRound(learning),true);learning.reveal();assert.equal(learning.submit(3),true);const snapshot=JSON.stringify(profile.db),m=petGrowthMetrics(profile.db.pets.water,profile.db.history);assert.equal(m.device.answerCount,1);assert.equal(m.lifetimeXp,12);assert.equal(m.bond,2);assert.equal(learning.submit(3),false);assert.equal(JSON.stringify(profile.db),snapshot)
 applyLearningReward(profile.db,profile.db.history[0]);assert.equal(JSON.stringify(profile.db),snapshot)
 assert.equal(petStudyDestination('starter'),'learn');installationStatus.starter='notInstalled';assert.equal(petStudyDestination('starter'),'course');installationStatus.starter='installed';archiveStatus.starter=true;assert.equal(petStudyDestination('starter'),'course');assert.equal(petStudyDestination('missing'),'course');assert.equal(JSON.stringify(profile.db),snapshot)
})
test('图标高清、透明、离线且无来源元数据，高对比有独立版本',async()=>{
 for(const name of petGrowthIconNames)for(const contrast of [false,true])for(const dark of contrast?[false,true]:[false]){
  const data=await readFile('src'+petGrowthIconSource(name,contrast,dark)),m=await sharp(data).metadata();assert.equal(m.width,contrast?256:1024);assert.equal(m.height,m.width);assert.equal(m.hasAlpha,true);assert.ok(!m.exif&&!m.xmp&&!m.icc)
  for(const marker of ['caBX','ChatGPT','OpenAI Media Service'])assert.equal(data.includes(Buffer.from(marker)),false)
 }
})
