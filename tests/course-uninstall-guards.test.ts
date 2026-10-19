import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const store=readFileSync('src/stores/course.ts','utf8')
const storage=readFileSync('src/services/content/StorageRepository.ts','utf8')

test('卸载守卫：确认、只读、缺替代、starter 全部有可读理由',()=>{
 assert.ok(store.includes('请先确认删除教材及本册专属记录。'))
 assert.ok(store.includes('学习档案只读，暂不能移除教材。'))
 assert.ok(store.includes('请选择另一份已安装教材作为当前课程。'))
 assert.ok(store.includes('替代教材未保存，已保留原教材。'))
 assert.ok(storage.includes('默认启蒙课程需保留。'))
})
