import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync('src/components/course/ActivityWorkspace.vue','utf8')

test('11 项练习全部保留，不可用项带中性原因文案',()=>{
 for(const name of ['整课检查','词义配对','字母拼装','句子排序','句子填空','故事阅读','看图选词','听音选图','自然拼读与跟读','连胜挑战','闪电判断'])
  assert.ok(source.includes(name),name)
 for(const reason of ['本课还有未学词，先完成新词学习','本课暂无已审核故事','本课暂无已审核词图','本课暂无已审核词图或音频','本课暂无已审核拼读规则'])
  assert.ok(source.includes(reason),reason)
 for(const negative of ['失败','错误'])assert.ok(!source.includes('练习'+negative))
})

test('整课检查拒绝提示使用 warning 样式与警示图标',()=>{
 assert.ok(source.includes('class="notice warning"'))
 assert.ok(source.includes('⚠️'))
})
