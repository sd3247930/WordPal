import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pendingCleanupCount,retryCourseCleanup} from '../src/services/content/StorageRepository'

test('待清理队列可查询与重试，管理页提供失败重试入口',()=>{
 assert.equal(typeof pendingCleanupCount,'function')
 assert.equal(typeof retryCourseCleanup,'function')
 assert.equal(pendingCleanupCount(),0)
 const management=readFileSync('src/components/course/CourseManagement.vue','utf8')
 assert.ok(management.includes('retryCleanupNow'))
 // 用户可见的重试入口文案（原 course-delete-unification 的独特断言，迁入此处）。
 assert.ok(management.includes('重试清理'))
 assert.ok(management.includes('个课程待清理媒体'))
 assert.ok(management.includes("left?'媒体清理仍未完成，稍后再试。':'媒体清理完成。'"))
})
