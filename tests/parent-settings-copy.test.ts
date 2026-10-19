import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync('src/components/parent/ParentLearningSettings.vue','utf8')
test('家长设置保留紧凑等级单选、词数说明与生效时间，删除冲突配置和长篇建议',()=>{
 for(const old of ['每日新词上限','能力起点说明','课程建议','saveLimit','WPSegmentedButton'])assert(!source.includes(old))
 for(const required of ['学习等级','radiogroup','aria-checked','levelWordCount','下一学习日'])assert(source.includes(required))
})
