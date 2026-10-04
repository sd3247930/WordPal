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
 const {profile,learning}=fresh();assert.ok(learning.start());learning.setMode('spell');learning.patch({input:'cat'})
 const before=JSON.stringify(profile.db);fail=true;assert.equal(learning.submit(),false);assert.equal(JSON.stringify(profile.db),before);assert.ok(profile.storageError)
 fail=false;assert.ok(learning.submit());assert.equal(profile.db.history.length,1);assert.equal(profile.db.gems,2)
})
test('恢复事务快照，反复提交不会重复增长',()=>{
 const {profile,learning}=fresh();learning.start();learning.setMode('spell');learning.patch({input:'cat'});learning.submit()
 assert.equal(learning.submit(),false);const id=profile.db.session!.id
 setActivePinia(createPinia());const restored=useLearningStore();const loaded=useProfileStore();assert.equal(restored.session?.id,id);assert.equal(loaded.db.history.length,1);assert.equal(restored.submit(),false)
})
test('未完成到期任务禁止新词，指定练习仍先复习',()=>{
 const {profile,learning}=fresh();profile.transact(d=>{d.cards.cat=newCard('cat',new Date('2000-01-01T00:00:00Z'))})
 assert.equal(learning.newWords.length,0);learning.start(['dog']);assert.equal(learning.session?.kind,'review_due');assert.deepEqual(learning.session?.wordIds,['cat'])
})
test('低于80%巩固当前课程，练习不发资源、不改复习日期',()=>{
 const {profile,learning}=fresh();learning.start()
 for(let i=0;i<5;i++){learning.setMode('spell');learning.patch({input:i<3?learning.current!.word:'wrong'});learning.submit();learning.next()}
 assert.equal(profile.db.lessonIndex,0);assert.equal(profile.db.lastLessonAccuracy,.6)
 const before=JSON.stringify(profile.db.cards),gems=profile.db.gems
 // Move due dates forward to examine the explicit consolidation path.
 profile.transact(d=>{Object.values(d.cards).forEach(c=>c.due=new Date(Date.now()+86400000).toISOString())})
 const unchanged=JSON.stringify(profile.db.cards);learning.start();assert.equal(learning.session?.kind,'practice')
 learning.setMode('spell');learning.patch({input:learning.current!.word});learning.submit();assert.equal(profile.db.gems,gems);assert.equal(JSON.stringify(profile.db.cards),unchanged);assert.notEqual(before,unchanged)
})
test('删除后四宠从初始状态继续可选，喂养仍有边界',()=>{
 const {profile,pet}=fresh();profile.erase();pet.choose('fire');assert.equal(pet.current.element,'fire');assert.equal(pet.current.exp,0);assert.equal(pet.feed(),false);assert.equal(profile.db.gems,0)
})
