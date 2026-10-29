import test from 'node:test'
import assert from 'node:assert/strict'
import {wordById} from '../src/services/content/ContentRegistry'
import {availableModes} from '../packages/content_schema/course'
import {ABILITY_LEVELS,levelModes,type EntryLevel} from '../packages/parent_settings'
import {automaticMode} from '../src/services/study-presentation'
import {BEGINNER_DAILY_NEW_WORD_CAP,planDailySession,plannedNewWordCeiling} from '../src/services/learning/SessionPlanner'

const expected:Record<EntryLevel,number>={1:2,2:3,3:4,4:5,5:5}

test('L1–L5 题型数量符合等级矩阵，且与能力说明一致',()=>{
 for(const level of [1,2,3,4,5] as EntryLevel[]){
  const modes=levelModes(level)
  assert.equal(modes.length,expected[level],'L'+level+' 题型数量')
  assert.equal(new Set(modes).size,modes.length,'L'+level+' 不应重复')
  assert.deepEqual([...modes],[...ABILITY_LEVELS[level-1].modes])
 }
 assert.equal(levelModes(1).includes('dictation'),false)
 assert.equal(levelModes(1).includes('spell'),false)
 assert.equal(levelModes(4).includes('dictation'),true)
 assert.equal(levelModes(5).includes('dictation'),true)
})

test('availableModes 按等级收窄，但不会放开词条本身不支持的活动',()=>{
 const word=wordById.cat,pool=[wordById.cat,wordById.dog,wordById.fish]
 const level1=availableModes(word,pool,true,1)
 assert.deepEqual(level1,['flash','connect'])
 assert.equal(availableModes(word,pool,true,3).includes('dictation'),false)
 assert.equal(availableModes(word,pool,true,5).includes('dictation'),true)
 // No audio means listen and dictation stay unavailable at every level.
 const silent={...word,audio:''}
 for(const level of [1,2,3,4,5] as EntryLevel[]){
  const modes=availableModes(silent,pool,true,level)
  assert.equal(modes.includes('listen'),false,'L'+level+' 无音频不应有听音')
  assert.equal(modes.includes('dictation'),false,'L'+level+' 无音频不应有听写')
 }
 // Without a level the helper keeps its previous per-word behaviour.
 assert.deepEqual(availableModes(silent,[silent]),['flash','spell'])
})

test('自动编排只在等级允许的题型里轮换',()=>{
 const allowed=new Set(levelModes(1))
 for(let index=0;index<6;index++)assert.ok(allowed.has(automaticMode(index,'new_word',1)),'L1 第 '+index+' 题')
 for(const level of [2,3,4,5] as EntryLevel[]){
  const limit=new Set(levelModes(level))
  for(let index=0;index<6;index++)assert.ok(limit.has(automaticMode(index,'new_word',level)))
 }
})

test('Planner 的新词上限真正读取等级，并返回等级题型顺序',()=>{
 const base={dailyNewWordLimit:20 as const,entryLevel:1 as EntryLevel}
 assert.equal(plannedNewWordCeiling(base),BEGINNER_DAILY_NEW_WORD_CAP)
 assert.equal(plannedNewWordCeiling({dailyNewWordLimit:20,entryLevel:5}),20)
 const newIds=Array.from({length:12},(_,index)=>'new-'+index)
 const beginner=planDailySession({config:base,dueIds:[],weakIds:[],newIds,newToday:0})
 assert.equal(beginner.newIds.length,BEGINNER_DAILY_NEW_WORD_CAP)
 assert.deepEqual(beginner.modeOrder,[...levelModes(1)])
 const advanced=planDailySession({config:{dailyNewWordLimit:20,entryLevel:5},dueIds:[],weakIds:[],newIds,newToday:0})
 assert.equal(advanced.newIds.length,12)
 assert.deepEqual(advanced.modeOrder,[...levelModes(5)])
 // Due reviews are never trimmed by the level ceiling.
 const withDue=planDailySession({config:base,dueIds:['a','b','c','d','e','f','g'],weakIds:['w'],newIds,newToday:0})
 assert.deepEqual(withDue.dueIds,['a','b','c','d','e','f','g'])
 assert.equal(withDue.newIds.length,BEGINNER_DAILY_NEW_WORD_CAP)
})
