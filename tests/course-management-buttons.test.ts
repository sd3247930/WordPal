import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const management=readFileSync('src/components/course/CourseManagement.vue','utf8')

test('课程管理按钮集统一：设为当前课程 / 安装 / 卸载·删除 / 导出课程包',()=>{
 assert.ok(management.includes('设为当前课程'))
 assert.match(management,/@click="installCourse\(pack.courseId\)">安装<\/WPButton>/)
 assert.ok(management.includes("isBundledCourse(pack.courseId)?'卸载':'删除'"))
 assert.ok(management.includes('导出课程包'))
})

test('旧的归档与回滚入口已从课程管理移除',()=>{
 for(const dead of ['归档课程','上一内容版本','@click="archive(','@click="rollback('])assert.ok(!management.includes(dead),dead+' 应已删除')
})

test('每行按钮只包含已安装态相关动作，starter 不出现卸载按钮',()=>{
 assert.ok(management.includes("v-if=\"pack.courseId!=='starter'\""))
 assert.ok(management.includes('exportPack(pack.courseId)'))
})

test('卸载/删除反馈在 await 之前取值，不再读取已被移除的注册表条目',()=>{
 const start=management.indexOf('async function confirmRemoveCourse(')
 const body=management.slice(start,management.indexOf('function installCourse(',start))
 assert.ok(start>0&&body.length>0)
 const capture=body.indexOf('const target=removeTarget.value')
 const awaited=body.indexOf('await course.uninstall(')
 assert.ok(capture>0&&awaited>capture,'删除目标必须在卸载前快照')
 // 导入课程删除后注册表条目消失，旧写法会渲染出《undefined》。
 assert.ok(!body.includes('《${removePack.value?.title}》'))
 assert.ok(body.includes('教材及本册专属记录已清理'),'带媒体课程删除后要明确反馈清理结果')
 assert.ok(body.includes('部分内容待清理，重启后自动重试'),'清理未完成时要给出下一步')
})
