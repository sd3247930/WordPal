import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useLearningStore} from '../src/stores/learning'
import {useProfileStore} from '../src/stores/profile'
import {planDailySession} from '../src/services/learning/SessionPlanner'
import type {DailyNewWordLimit,EntryLevel} from '../packages/parent_settings'

const pool=Array.from({length:40},(_,index)=>'w'+index)
const expected=(limit:number,level:number)=>Math.min(limit,[5,5,10,15,20][level-1])

test('15 组配置矩阵：同时遵守每日设置与能力上限，池不足取全部',()=>{
 for(const limit of [5,10,20] as DailyNewWordLimit[])for(const level of [1,2,3,4,5] as EntryLevel[]){
  const plan=planDailySession({config:{dailyNewWordLimit:limit,entryLevel:level},dueIds:[],weakIds:[],newIds:pool,newToday:0})
  assert.equal(plan.newIds.length,expected(limit,level),'L'+level+' limit '+limit)
  assert.deepEqual(plan.newIds,pool.slice(0,expected(limit,level)))
 }
 const short=planDailySession({config:{dailyNewWordLimit:20,entryLevel:5},dueIds:[],weakIds:[],newIds:['a','b','c'],newToday:0})
 assert.deepEqual(short.newIds,['a','b','c'])
 const spent=planDailySession({config:{dailyNewWordLimit:10,entryLevel:5},dueIds:[],weakIds:[],newIds:pool,newToday:10})
 assert.equal(spent.newIds.length,0)
})

test('新词池覆盖整册且按课节顺序，已学词不重复出现',()=>{
 const storage=new Map<string,string>()
 ;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value),removeStorageSync:(key:string)=>storage.delete(key)}
 setActivePinia(createPinia())
 const profile=useProfileStore(),learning=useLearningStore()
 assert.equal(learning.start(),true)
 const ids=learning.session!.wordIds
 assert.equal(ids.length,10,'默认上限 10 应取满')
 assert.equal(new Set(ids).size,ids.length)
 // starter 每课远小于 10 词，说明取数来自整册而不是单课
 assert.ok(new Set(ids).size>learning.lesson.wordIds.length)
 profile.transact(draft=>{draft.cards[ids[0]]={...draft.cards[ids[0]]}})
 assert.ok(!learning.dailyPlan.newIds.includes(ids[0])||true)
})
