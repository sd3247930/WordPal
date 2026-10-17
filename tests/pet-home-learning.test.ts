import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {localDate,type Answer} from '../packages/core_learning'
import {petHomeLearningProgress} from '../src/services/pet-home-learning'
import {useProfileStore} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {openStudyPractice,consumeStudyPractice} from '../src/services/navigation'
const storage=new Map<string,string>(),routes:string[]=[]
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,value:string)=>storage.set(key,value),redirectTo:({url}:{url:string})=>routes.push(url)}
;(globalThis as any).getCurrentPages=()=>[{route:'pages/pet/index'}]

test('家园统计按本地日读取正式记录，3次与5次目标、拼写尝试和奖励标记独立且只读',()=>{
 const at=new Date(2026,9,16,23,59),history:Answer[]=Array.from({length:5},(_,i)=>({id:'home-test-'+i,wordId:'cat',rating:3,correct:i!==0,at:at.toISOString(),source:i%2?'review_due':'new_word',mode:i===4?'spell':'flash',input:''})),before=JSON.stringify(history)
 for(const [length,practice,complete]of [[0,0,0],[2,2,2],[3,3,3],[5,3,5]]){
  const result=petHomeLearningProgress(history.slice(0,length),[],localDate(at));assert.equal(result.practiceCount,practice);assert.equal(result.learningCount,complete);assert.equal(result.practiceDone,length>=3);assert.equal(result.learningDone,length>=5);assert.equal(result.spellingDone,length===5);assert.equal(result.rewarded,false)
 }
 assert.equal(petHomeLearningProgress(history,['daily-task:'+localDate(at)],localDate(at)).rewarded,true)
 assert.equal(petHomeLearningProgress(history,[],localDate(new Date(2026,9,17))).count,0);assert.equal(JSON.stringify(history),before)
 const dictation=[{...history[0],mode:'dictation' as const}];assert.equal(petHomeLearningProgress(dictation,[],localDate(at)).spellingDone,true)
})

test('真实提交逐次更新两个统计，第5次仅发一次每日奖励；重读统计不写学习档案',()=>{
 storage.clear();setActivePinia(createPinia());const profile=useProfileStore(),learning=useLearningStore();assert.ok(learning.start())
 for(let i=1;i<=6;i++){
  assert.ok(learning.setMode('spell'));assert.ok(learning.patch({input:learning.current!.word}));assert.ok(learning.submit());const result=petHomeLearningProgress(profile.db.history,profile.db.rewardIds)
  assert.equal(result.count,i);assert.equal(result.count,learning.todayAnswers.length);assert.equal(result.practiceCount,Math.min(i,3));assert.equal(result.learningCount,Math.min(i,5));assert.equal(result.rewarded,i>=5)
  assert.equal(profile.db.pets.water.exp,i*12+(i>=5?10:0));const before=JSON.stringify(profile.db);assert.equal(learning.submit(),false);petHomeLearningProgress(profile.db.history,profile.db.rewardIds);assert.equal(JSON.stringify(profile.db),before);learning.next()
 }
 assert.equal(profile.db.rewardIds.filter(id=>id==='daily-task:'+localDate()).length,1)
})

test('拼写听写入口发起真实学习跳转，一次性展开请求消费后不污染普通学习入口',()=>{
 routes.length=0;consumeStudyPractice();openStudyPractice();assert.deepEqual(routes,['/pages/learn/index']);assert.equal(consumeStudyPractice(),true);assert.equal(consumeStudyPractice(),false)
})
