import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useParentGateStore} from '../src/stores/parent-gate'
import {useProfileStore} from '../src/stores/profile'
import {useParentSettingsStore} from '../src/stores/parent-settings'
import {useLearningStore} from '../src/stores/learning'
import {ABILITY_LEVELS,levelModes,levelWordCount,type EntryLevel} from '../packages/parent_settings'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).getCurrentPages=()=>[{route:'pages/parent/index'}]
;(globalThis as any).uni={getStorageSync:(k:string)=>storage.get(k)||'',setStorageSync:(k:string,v:string)=>{if(fail)throw Error('Quota');storage.set(k,v)},removeStorageSync:(k:string)=>storage.delete(k)}
async function fresh(){storage.clear();fail=false;setActivePinia(createPinia());const profile=useProfileStore(),parent=useParentSettingsStore(),learning=useLearningStore(),gate=useParentGateStore();gate.beginVisit({});gate.setInput(gate.state.question!.answer);await gate.verify();return {profile,parent,learning}}
test('学习等级是唯一词数来源，五档新名称且原能力语义仍保留',async()=>{
 const {parent,profile}=await fresh();assert.deepEqual(ABILITY_LEVELS.map(l=>l.title),['初级入门','基础巩固','稳步提升','强化训练','进阶挑战'])
 for(const level of [1,2,3,4,5] as EntryLevel[]){assert(parent.save({entryLevel:level}));assert.equal(parent.settings.dailyNewWordLimit,levelWordCount(level));assert.equal(profile.db.dailyLimit,undefined);assert(parent.persisted)}
 assert.equal(levelModes(1).length,2);assert.equal(levelModes(2).length,3)
})
test('未开始计划立即按新等级重建；开始后词表/步骤/草稿保持冻结并提示下个学习日生效',async()=>{
 const {profile,parent,learning}=await fresh();learning.prepareDaily();assert.equal(learning.todayPlan!.wordIds.length,10);parent.save({entryLevel:1});assert.equal(learning.todayPlan!.wordIds.length,5)
 learning.start();learning.patch({input:'draft'});const plan=JSON.stringify(learning.session),cards=JSON.stringify(profile.db.cards);parent.save({entryLevel:5});assert.equal(JSON.stringify(learning.session),plan);assert.equal(parent.difficultyPending,true);assert.equal(parent.levelState,'pending');assert.equal(JSON.stringify(profile.db.cards),cards)
 setActivePinia(createPinia());assert.equal(JSON.stringify(useLearningStore().session),plan);assert.equal(useParentSettingsStore().settings.entryLevel,5);assert(useParentSettingsStore().difficultyPending)
})
test('写入失败保留上次设置和计划，释放空间后重试，未授权无法保存',async()=>{
 const {profile,parent,learning}=await fresh();learning.start();const before=JSON.stringify(profile.db);fail=true;assert.equal(parent.save({entryLevel:5}),false);assert.equal(JSON.stringify(profile.db),before);assert.equal(parent.saveState,'error');fail=false;assert(parent.save({entryLevel:5}));assert(parent.persisted)
 useParentGateStore().leaveVisit();const saved=JSON.stringify(profile.db);assert.equal(parent.save({entryLevel:1}),false);assert.equal(JSON.stringify(profile.db),saved)
})
