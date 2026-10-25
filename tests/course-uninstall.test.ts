import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const storage=readFileSync('src/services/content/StorageRepository.ts','utf8')
const sheet=readFileSync('src/components/course/CourseDeleteConfirmSheet.vue','utf8')
const store=readFileSync('src/stores/course.ts','utf8')
const management=readFileSync('src/components/course/CourseManagement.vue','utf8')

test('导入课程删除：以删除墓碑写入为提交点，媒体进入待清理队列',()=>{
 assert.ok(storage.includes('markCourseDeleted(id,'))
 assert.ok(storage.includes('This tombstone is the commit point'))
 assert.ok(storage.includes("installationStatus[id]='notInstalled'"))
})

test('确认面板语义：bundled 说「卸载」、导入课程说「删除」，必须输入确认文字',()=>{
 assert.ok(sheet.includes("props.bundled?'卸载':'删除'"))
 assert.ok(sheet.includes('输入「{{actionLabel}}」以确认：'))
 assert.ok(sheet.includes('typed.value.trim()===actionLabel.value'))
 assert.ok(sheet.includes('删除本机教材、历史版本及本册记录；记录先备份，之后需重新导入。'));assert.ok(sheet.includes('共享词卡、其他教材与全局奖励保留。'))
 assert.ok(sheet.includes(':aria-label="actionLabel+\'教材确认\'"'))
})

test('确认面板：当前课程必须先选替代教材，缺替代时给出可读原因',()=>{
 assert.ok(management.includes(':needs-replacement="removeNeedsReplacement"'))
 assert.ok(sheet.includes('至少需要保留一份已安装教材。请先安装其他教材。'))
 assert.ok(sheet.includes('!props.needsReplacement||!!replacementId.value'))
 assert.ok(sheet.includes(':disabled="!canConfirm"'))
 assert.ok(store.includes('替代教材未保存，已保留原教材。'))
})
