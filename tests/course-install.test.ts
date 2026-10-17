import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canReinstall} from '../src/services/content/CourseDirectory'
import {isCourseInstalled,installationStatus} from '../src/services/content/ContentRegistry'
import {useBundledFixture} from './support/bundled-fixture'

const management=readFileSync('src/components/course/CourseManagement.vue','utf8')

/** 安装按钮只要被绑上 loading/disabled，就会在 app-plus 下变成不可点的死按钮。 */
function bindsBlockingState(tag:string){return /:\s*(loading|disabled)\b/.test(tag)||tag.includes('aria-disabled')}

function installButtonTag(){
 const anchor=management.indexOf('canReinstall(pack.courseId)')
 assert.ok(anchor>0,'课程管理应保留安装入口')
 const open=management.lastIndexOf('<WPButton',anchor)
 const close=management.indexOf('>',anchor)
 return management.slice(open,close+1)
}

test('课程管理的安装按钮不绑定 loading/disabled（app-plus 可点性守卫）',()=>{
 const tag=installButtonTag()
 assert.ok(tag.startsWith('<WPButton'))
 assert.equal(bindsBlockingState(tag),false,tag)
 assert.ok(tag.includes('@click="installCourse(pack.courseId)"'))
 assert.ok(tag.includes('v-if="!isCourseInstalled(pack.courseId)&&canReinstall(pack.courseId)"'))
 assert.ok(management.includes("{{installingId===pack.courseId?'安装中…':'安装'}}"))
})

test('守卫对历史缺陷写法有效（负向用例）',()=>{
 // 第一成因：全局 busy 挂到安装按钮上。
 assert.equal(bindsBlockingState('<WPButton kind="secondary" :loading="busy" @click="installCourse(pack.courseId)">'),true)
 // 第二成因候选：按课程 installingId 挂 loading，或再叠加 disabled/aria-disabled。
 assert.equal(bindsBlockingState('<WPButton :loading="installingId===pack.courseId" @click="installCourse(pack.courseId)">'),true)
 assert.equal(bindsBlockingState('<WPButton :disabled="!canReinstall(pack.courseId)" aria-disabled="true">'),true)
})

test('未安装行的占位按钮不再以禁用形态出现',()=>{
 assert.ok(management.includes('<WPButton v-if="isCourseInstalled(pack.courseId)" kind="secondary" @click="selectCourse(pack.courseId)">'))
 assert.ok(!management.includes('<WPButton kind="secondary" :disabled="!isCourseInstalled(pack.courseId)"'))
 assert.ok(!management.includes(":'未安装'}}"))
})

test('installCourse：重复点击只执行一次，finally 必复位 installingId',()=>{
 const start=management.indexOf('function installCourse(')
 const end=management.indexOf('async function retryCleanupNow')
 assert.ok(start>0&&end>start,'installCourse 应位于课程管理组件内')
 const body=management.slice(start,end)
 assert.ok(body.includes('if(installingId.value===id)return'),'重复点击守卫')
 assert.ok(body.indexOf('installingId.value===id')<body.indexOf('installingId.value=id'),'守卫必须在写入前生效')
 assert.ok(body.includes('if(!parentGate.canAccess())return'))
 assert.ok(body.includes('enableBundledCourse(id)'))
 assert.ok(body.includes("finally{installingId.value=''}"),'异常路径也必须复位')
})

test('安装态与安装入口的判定组合：已安装不显示安装入口，未安装的 bundled 课程可重装',()=>{
 assert.equal(canReinstall('starter'),true)
 assert.equal(canReinstall('imported-course-x'),false,'导入课程不走安装入口，需重新导入')
 const bundled=useBundledFixture('bundled-install-test')
 assert.equal(canReinstall(bundled.courseId),true)
 installationStatus[bundled.courseId]='notInstalled'
 assert.equal(isCourseInstalled(bundled.courseId),false)
 assert.equal(canReinstall(bundled.courseId),true)
 installationStatus[bundled.courseId]='installed'
 assert.equal(isCourseInstalled(bundled.courseId),true)
 delete installationStatus[bundled.courseId]
 assert.equal(isCourseInstalled(bundled.courseId),true,'无记录时默认视为已安装')
})
