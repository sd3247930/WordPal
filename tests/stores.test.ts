import {startLegacyRound} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {usePetStore} from '../src/stores/pet'
import {newCard} from '../packages/srs_fsrs'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,data:string)=>{if(fail)throw new Error('QuotaExceeded');storage.set(key,data)}}
function fresh(){storage.clear();fail=false;setActivePinia(createPinia());return {profile:useProfileStore(),learning:useLearningStore(),pet:usePetStore()}}
test('存储失败不会推进答案、排程、奖励或输入',()=>{
 const {profile,learning}=fresh();assert.ok(startLegacyRound(learning));learning.setMode('spell');learning.patch({input:'cat'})
 const before=JSON.stringify(profile.db);fail=true;assert.equal(learning.submit(),false);assert.equal(JSON.stringify(profile.db),before);assert.ok(profile.storageError)
 fail=false;assert.ok(learning.submit());assert.equal(profile.db.history.length,1);assert.equal(profile.db.gems,2)
})
test('恢复事务快照，反复提交不会重复增长',()=>{
 const {profile,learning}=fresh();startLegacyRound(learning);learning.setMode('spell');learning.patch({input:'cat'});learning.submit()
 assert.equal(learning.submit(),false);const id=profile.db.session!.id
 setActivePinia(createPinia());const restored=useLearningStore();const loaded=useProfileStore();assert.equal(restored.session?.id,id);assert.equal(loaded.db.history.length,1);assert.equal(restored.submit(),false)
})
test('教材首轮不因到期任务跳词，显式练习仍可先处理本册到期词',()=>{
 const {profile,learning}=fresh();profile.transact(d=>{d.cards.cat=newCard('cat',new Date('2000-01-01T00:00:00Z'))})
 assert.equal(learning.studyWords[0],'cat');assert(learning.newWords.includes('dog'));learning.start(['dog']);assert.equal(learning.session?.kind,'review_due');assert.deepEqual(learning.session?.wordIds,['cat'])
})
test('首轮低正确率不阻断教材词序，显式巩固不发资源或改复习日期',()=>{
 const {profile,learning}=fresh();startLegacyRound(learning)
 // The daily pool spans the whole course now, so answer the full round with a 3-in-5 accuracy.
 let answered=0
 while(!learning.session!.completedAt){const current=learning.current!;learning.setMode('spell');learning.patch({input:answered%5<3?current.word:'wrong'});learning.submit();learning.next();answered++}
 assert.equal(profile.db.lessonIndex,2);assert.equal(profile.db.lastLessonAccuracy,.6)
 const before=JSON.stringify(profile.db.cards),gems=profile.db.gems
 // Move due dates forward to examine the explicit consolidation path.
 profile.transact(d=>{Object.values(d.cards).forEach(c=>c.due=new Date(Date.now()+86400000).toISOString())})
 const unchanged=JSON.stringify(profile.db.cards);learning.start(['cat','dog']);assert.equal(learning.session?.kind,'practice')
 learning.setMode('spell');learning.patch({input:learning.current!.word});learning.submit();assert.equal(profile.db.gems,gems);assert.equal(JSON.stringify(profile.db.cards),unchanged);assert.notEqual(before,unchanged)
})
test('删除后四宠从初始状态继续可选，喂养仍有边界',()=>{
 const {profile,pet}=fresh();profile.erase();pet.choose('fire');assert.equal(pet.current.element,'fire');assert.equal(pet.current.exp,0);assert.equal(pet.feed(),false);assert.equal(profile.db.gems,0)
})
