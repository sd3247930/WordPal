import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync('src/components/parent/ParentLearningSettings.vue','utf8')

test('家长页包含能力起点封顶说明且不含负面词',()=>{
 assert.ok(source.includes('能力起点说明'))
 assert.ok(source.includes('每轮新词不超过 5 个'))
 assert.ok(source.includes('L3 每日新词最多 10 个'))
 assert.ok(source.includes('入门等级每轮新词不超过 5，今日已学 5，明日再来。'))
 // The new copy itself must stay neutral (other, pre-existing status lines may still say 失败).
 for(const negative of ['失败','错误'])assert.ok(!source.includes('能力起点说明：'+negative))
})
