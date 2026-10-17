import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const storage=readFileSync('src/services/content/StorageRepository.ts','utf8')
const sheet=readFileSync('src/components/course/CourseDeleteConfirmSheet.vue','utf8')
const store=readFileSync('src/stores/course.ts','utf8')
const management=readFileSync('src/components/course/CourseManagement.vue','utf8')

test('导入课程删除：以 catalog 写入为提交点，媒体进入待清理队列',()=>{
 assert.ok(storage.includes('writeStorage(CATALOG_KEY,catalog.filter(e=>e.courseId!==id))'))
 assert.ok(storage.includes('这是提交点')||storage.includes('This pointer is the commit point'))
 assert.ok(storage.includes("installationStatus[id]='notInstalled'"))
})

test('确认面板语义：bundled 说「卸载」、导入课程说「删除」，必须输入确认文字',()=>{
 assert.ok(sheet.includes("props.bundled?'卸载':'删除'"))
 assert.ok(sheet.includes('输入「{{actionLabel}}」以确认：'))
 assert.ok(sheet.includes('typed.value.trim()===actionLabel.value'))
 assert.ok(sheet.includes('已学 ${props.learnedWords} 词仍会参加到期复习'))
 assert.ok(sheet.includes(':aria-label="actionLabel+\'教材确认\'"'))
})

test('确认面板：当前课程必须先选替代教材，缺替代时给出可读原因',()=>{
 assert.ok(management.includes(':needs-replacement="removeTarget===course.currentId"'))
 assert.ok(sheet.includes('至少需要保留一份已安装教材。请先安装其他教材。'))
 assert.ok(sheet.includes('!props.needsReplacement||!!replacementId.value'))
 assert.ok(sheet.includes(':disabled="!canConfirm"'))
 assert.ok(store.includes('替代教材未保存，已保留原教材。'))
})
