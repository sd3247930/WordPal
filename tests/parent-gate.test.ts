import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {createParentMathQuestion,normalizeParentAnswer,parentQuestionKey} from '../src/services/parent/ParentMathQuestion'
import {useParentGateStore} from '../src/stores/parent-gate'
import {useParentSettingsStore} from '../src/stores/parent-settings'
import {useProfileStore} from '../src/stores/profile'
import {installParentGateNavigation} from '../src/services/parent/ParentGateNavigation'
const storage=new Map<string,string>(),interceptors=new Map<string,()=>void>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value),removeStorageSync:(key:string)=>storage.delete(key),addInterceptor:(method:string,handler:{invoke:()=>void})=>interceptors.set(method,handler.invoke)}
let route='pages/parent/index'
;(globalThis as any).getCurrentPages=()=>[{route}]
function fresh(){storage.clear();route='pages/parent/index';setActivePinia(createPinia());return useParentGateStore()}
async function unlock(gate:ReturnType<typeof useParentGateStore>){gate.setInput(String(gate.state.question!.answer));assert.equal(await gate.verify(),'correct')}
test('九九范围、边界积和交换顺序去重；常量/异常随机源也不会死循环',()=>{
 assert.equal(createParentMathQuestion('',()=>0).answer,1)
 assert.equal(createParentMathQuestion('',()=>1).answer,81)
 const q=createParentMathQuestion('',()=>61/81);assert.deepEqual([q.left,q.right,q.answer],[7,8,56])
 let previous='';for(let i=0;i<2000;i++){const q=createParentMathQuestion(previous,i%2?()=>0:Math.random);assert.ok(q.left>=1&&q.left<=9&&q.right>=1&&q.right<=9);assert.equal(q.answer,q.left*q.right);assert.notEqual(parentQuestionKey(q.left,q.right),previous);previous=parentQuestionKey(q.left,q.right)}
 assert.notEqual(parentQuestionKey(...[createParentMathQuestion('3x7',()=>NaN).left,createParentMathQuestion('3x7',()=>NaN).right] as [number,number]),'3x7')
 assert.equal(parentQuestionKey(3,7),parentQuestionKey(7,3))
})
test('空答案、字符过滤、错误保留题与输入，三次错误换题清空，正确只解锁本访问',async()=>{
 const gate=fresh(),visit={};assert.equal(gate.active,false);gate.beginVisit(visit);assert.equal(gate.active,true);const first=gate.state.question!
 assert.equal(await gate.verify(),'ignored');assert.equal(normalizeParentAnswer('a1b234'), '12');assert.equal(normalizeParentAnswer(null),'')
 gate.setInput('0');for(let i=0;i<2;i++){assert.equal(await gate.verify(),'incorrect');assert.equal(gate.state.question!.id,first.id);assert.equal(gate.state.input,'0');assert.equal(gate.unlocked,false)}
 assert.equal(await gate.verify(),'replaced');assert.equal(gate.state.input,'');assert.equal(gate.state.attemptCount,0);assert.notEqual(parentQuestionKey(gate.state.question!.left,gate.state.question!.right),parentQuestionKey(first.left,first.right))
 await unlock(gate);assert.equal(gate.canAccess(),true);gate.resumeVisit(visit);assert.equal(gate.unlocked,true);gate.leaveVisit(visit);assert.equal(gate.unlocked,false);assert.equal(gate.active,false)
 gate.beginVisit({});assert.equal(gate.state.input,'');assert.equal(gate.unlocked,false);assert.equal(gate.active,true)
})
test('异步校验离开后不能解锁新访问；过期页面卸载不影响新访问',async()=>{
 const gate=fresh(),old={},next={};gate.beginVisit(old);gate.setInput(gate.state.question!.answer);const pending=gate.verify();gate.beginVisit(next);assert.equal(await pending,'ignored');assert.equal(gate.unlocked,false);gate.leaveVisit(old);assert.equal(gate.active,true);await unlock(gate)
})
test('仅保存上一题key，重建Store或伪造持久化解锁均须重验；设置写入有状态和路由保护',async()=>{
 const gate=fresh(),profile=useProfileStore(),parent=useParentSettingsStore(),before=JSON.stringify(profile.db)
 assert.equal(parent.save({dailyNewWordLimit:20}),false);assert.equal(JSON.stringify(profile.db),before)
 gate.beginVisit({});await unlock(gate);const key=storage.get('wordpal.parent-gate.last-question.v1');assert.match(key!,/^[1-9]x[1-9]$/)
 route='pages/settings/index';assert.equal(gate.canAccess(),false);assert.equal(parent.save({dailyNewWordLimit:20}),false);assert.equal(JSON.stringify(profile.db),before)
 storage.set('wordpal.parent-gate.unlocked','true');setActivePinia(createPinia());const rebuilt=useParentGateStore();assert.equal(rebuilt.unlocked,false);rebuilt.beginVisit({});assert.notEqual(parentQuestionKey(rebuilt.state.question!.left,rebuilt.state.question!.right),key)
})
test('所有原生导航及返回操作立即撤销本访问授权',async()=>{
 const gate=fresh();installParentGateNavigation()
 for(const method of ['navigateTo','redirectTo','reLaunch','switchTab','navigateBack']){gate.beginVisit({});await unlock(gate);interceptors.get(method)!();assert.equal(gate.unlocked,false);assert.equal(gate.active,false)}
})
