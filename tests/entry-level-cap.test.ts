import test from 'node:test'
import assert from 'node:assert/strict'
import {BEGINNER_DAILY_NEW_WORD_CAP,plannedNewWordCeiling} from '../src/services/learning/SessionPlanner'
import {levelModes} from '../packages/parent_settings'

test('能力起点新词上限为 5/5/10/15/20',()=>{
 assert.equal(BEGINNER_DAILY_NEW_WORD_CAP,5)
 for(const limit of [5,10,15,20] as const){
  assert.equal(plannedNewWordCeiling({dailyNewWordLimit:limit,entryLevel:1}),Math.min(limit,5))
  assert.equal(plannedNewWordCeiling({dailyNewWordLimit:limit,entryLevel:2}),Math.min(limit,5))
  for(const [level,cap] of [[3,10],[4,15],[5,20]] as const)assert.equal(plannedNewWordCeiling({dailyNewWordLimit:limit,entryLevel:level}),Math.min(limit,cap))
 }
})

test('入门封顶不影响到期复习，且题型数量仍按等级收窄',()=>{
 assert.equal(levelModes(1).length,2)
 assert.equal(levelModes(2).length,3)
})
