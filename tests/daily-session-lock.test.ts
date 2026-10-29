import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {useCustomPracticeStore} from '../src/stores/custom-practice'
import {useActivitiesStore} from '../src/stores/activities'
import {loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {finishDaily,answerDailyWord} from './helpers/daily-flow'
import {dailySessionLocked} from '../src/services/learning/DailySessionLock'
import {createDailyStudyNavigation} from '../src/services/learning/DailyStudyNavigation'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value),removeStorageSync:(key:string)=>storage.delete(key)}
function reset(clear=true){if(clear)storage.clear();loadCourseRegistry();setActivePinia(createPinia());const profile=useProfileStore();if(clear)profile.transact(d=>{d.abilityLevel='L1'});return {profile,learning:useLearningStore(),custom:useCustomPracticeStore(),activities:useActivitiesStore()}}

test('开始即锁定，不能以自定义、轻松练习或独立会话替换本轮，重新加载仍锁定',()=>{
 let {profile,learning,custom,activities}=reset();assert.equal(learning.isSessionLocked,false);assert(learning.start());assert(learning.isSessionLocked)
 const before=JSON.stringify(profile.db),id=learning.session!.id
 assert.equal(custom.openConfig(),false);assert.equal(custom.start(),'failed');assert.equal(custom.resume(),false);assert.equal(activities.start('pair'),false);assert.equal(learning.startPractice(),false);assert.equal(learning.startDue(['cat']),false);assert.equal(learning.setMode('spell'),false)
 assert.equal(JSON.stringify(profile.db),before)
 ;({profile,learning,custom}=reset(false));assert(learning.isSessionLocked);assert.equal(learning.session!.id,id);assert.equal(custom.openConfig(),false)
})

test('旧版绕入独立练习的未完成六环节会继续原检查点，直到巩固结算后才解锁',()=>{
 const {profile,learning,custom}=reset();assert(learning.start());const id=learning.session!.id
 profile.transact(d=>{d.courseProgress!.starter.studyActivity='independent'})
 assert(learning.isSessionLocked);assert(learning.start());assert(learning.isDaily);assert.equal(learning.session!.id,id)
 for(let i=0;learning.session!.flow!.step!=='consolidate';i++) {assert(i<30);answerDailyWord(learning);assert(learning.isSessionLocked)}
 assert.equal(custom.openConfig(),false);finishDaily(learning);assert.equal(learning.isSessionLocked,false);assert.equal(dailySessionLocked(learning.session),false);assert(custom.openConfig())
})

function navigation(){
 let route='pages/learn/index',token='daily-one',flushes=0,save=true
 const prompts:((ok:boolean)=>void)[]=[],visits:{method:string;url?:string}[]=[]
 const guard=createDailyStudyNavigation({route:()=>route,lockedSession:()=>token,flush:()=>{flushes++;return save},confirm:done=>prompts.push(done),replay:(method,options)=>{assert.equal(guard.invoke(method,options),undefined);visits.push({method,url:options.url})}})
 return {guard,prompts,visits,get flushes(){return flushes},set route(value:string){route=value},set token(value:string){token=value},set save(value:boolean){save=value}}
}
test('离开先确认，取消不跳转，快速重复点击只出现一个对话框，确认后保存并只放行一次',()=>{
 const n=navigation();assert.equal(n.guard.invoke('redirectTo',{url:'/pages/home/index'}),false);assert.equal(n.guard.invoke('redirectTo',{url:'/pages/settings/index'}),false);assert.equal(n.prompts.length,1)
 n.prompts[0](false);assert.equal(n.visits.length,0);assert.equal(n.flushes,0)
 n.guard.invoke('redirectTo',{url:'/pages/home/index'});n.prompts[1](true);assert.equal(n.flushes,1);assert.deepEqual(n.visits,[{method:'redirectTo',url:'/pages/home/index'}])
 assert.equal(n.guard.invoke('redirectTo',{url:'/pages/home/index'}),false);assert.equal(n.prompts.length,3)
})
test('保存失败与过期确认都留在原页，硬件返回同样确认，完成后正常导航',()=>{
 const n=navigation();n.save=false;assert(n.guard.back());n.prompts[0](true);assert.equal(n.visits.length,0)
 n.save=true;n.guard.back();n.token='daily-two';n.prompts[1](true);assert.equal(n.visits.length,0)
 n.token='';assert.equal(n.guard.invoke('navigateBack',{delta:1}),undefined);assert.equal(n.guard.back(),false)
 const other=navigation();other.route='pages/home/index';assert.equal(other.guard.invoke('redirectTo',{url:'/pages/settings/index'}),undefined);assert.equal(other.prompts.length,0)
})
