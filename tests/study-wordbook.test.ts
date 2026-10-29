import {startLegacyRound} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useLearningStore} from '../src/stores/learning'
import {useProfileStore} from '../src/stores/profile'
import {useStudyPresentation} from '../src/stores/study-presentation'
import {useWordbookStore} from '../src/stores/wordbook'
import {usePetStore} from '../src/stores/pet'
import {automaticMode,needsRecentPractice,nextReviewLabel} from '../src/services/study-presentation'
import type {Answer} from '../packages/core_learning'
import {newCard} from '../packages/srs_fsrs'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,data:string)=>{if(fail)throw new Error('QuotaExceeded');storage.set(key,data)}}
function fresh(){storage.clear();fail=false;setActivePinia(createPinia());return {learning:useLearningStore(),profile:useProfileStore(),view:useStudyPresentation(),book:useWordbookStore()}}
function history(ratings:number[]):Answer[]{return ratings.map((rating,index)=>({id:String(index),wordId:'cat',rating:rating as Answer['rating'],correct:rating>1,at:new Date(index*1000).toISOString(),source:'review_due',mode:'flash',input:''}))}
test('自动题型混合、手动选择与重启恢复，不重建正式 Session',()=>{
 const {learning,view}=fresh();startLegacyRound(learning);view.sync();const id=learning.session!.id
 assert.deepEqual([0,1,2,3,4].map(index=>automaticMode(index,'new_word')),['flash','connect','listen','spell','dictation'])
 learning.reveal();view.submit(3);view.next();assert.equal(view.mode,'connect')
 view.chooseMode('spell');view.updateInput('do');assert(learning.flushDraft());setActivePinia(createPinia());const restored=useStudyPresentation();restored.sync()
 assert.equal(restored.input,'do');assert.equal(restored.mode,'spell');assert.equal(useLearningStore().session!.id,id)
})
test('正式错词回看每词一次，刷新恢复，完全不改正式记录、排程、课程与奖励',()=>{
 const {learning,view,profile}=fresh();startLegacyRound(learning);view.sync();view.chooseMode('spell')
 // The daily pool now spans the whole course, so answer until this round actually finishes.
 while(!learning.session!.completedAt){const current=learning.current!;view.updateInput(current.id==='cat'?'wrong':current.word);view.submit();view.next()}
 assert.equal(view.revisiting,true);assert.deepEqual(view.state.queue,['cat'])
 const before=JSON.stringify(profile.db);view.updateInput('ca');setActivePinia(createPinia());const restored=useStudyPresentation();restored.sync()
 assert.equal(restored.input,'ca');restored.updateInput('cat');assert.ok(restored.submit());assert.equal(restored.submit(),false);restored.next();assert.equal(restored.completed,true)
 assert.equal(JSON.stringify(useProfileStore().db),before);assert.equal(restored.state.answers.length,1)
})
test('界面偏好写入失败不会扣费、改正式输入或丢失巩固答案',()=>{
 const {learning,view,profile,book}=fresh();startLegacyRound(learning);view.sync();const before=JSON.stringify(profile.db)
 fail=true;view.chooseMode('spell');assert.equal(JSON.stringify(profile.db),before);assert.ok(view.error)
 assert.equal(book.toggle('favorites','cat'),false);assert.deepEqual(book.preferences.favorites,[]);assert.ok(book.error)
})
test('旧学习快照已选择题型、输入与答案时，界面不得覆盖',()=>{
 const {learning,view}=fresh();startLegacyRound(learning);learning.setMode('spell');learning.patch({input:'cat'});view.sync();assert.equal(view.mode,'spell');assert.equal(view.input,'cat');assert.equal(view.state.manual,true)
})
test('错词近五次判定、评分下降及连续正确退出',()=>{
 assert.equal(needsRecentPractice(history([1])),false);assert.equal(needsRecentPractice(history([1,3,1])),true)
 assert.equal(needsRecentPractice(history([4,1])),true);assert.equal(needsRecentPractice(history([1,1,3,3])),false)
 assert.equal(needsRecentPractice(history([1,1,3,3,3,3,3])),false)
})
test('搜索三种字段、重点与稍后标记均不改变 SRS 或到期排序',()=>{
 const {book,profile}=fresh();profile.transact(d=>{d.cards.cat=newCard('cat',new Date('2000-01-01'));d.cards.dog=newCard('dog',new Date('2001-01-01'))})
 const before=JSON.stringify(profile.db);assert.equal(book.list('all','CAT')[0].id,'cat');assert.equal(book.list('all','猫')[0].id,'cat');assert.equal(book.list('all','探索单元 1').length,10)
 book.toggle('favorites','cat');book.toggle('later','cat');assert.deepEqual(book.list('due','').map(word=>word.id),['cat','dog']);assert.equal(JSON.stringify(profile.db),before)
 assert.ok(book.list('weak','').some(word=>word.id==='cat'));assert.equal(book.list('all','missing').length,0)
})
test('损坏界面偏好回退、未知单词不得成为重点',()=>{
 fresh();storage.set('wordpal.study.presentation.v1',JSON.stringify({sessionId:'bad',queue:['unknown'],index:0,answers:[],manual:false}));storage.set('wordpal.wordbook.preferences.v1',JSON.stringify({favorites:['cat','unknown','cat'],later:null}));setActivePinia(createPinia())
 const view=useStudyPresentation(),book=useWordbookStore();assert.equal(view.state.sessionId,'');assert.deepEqual(book.preferences.favorites,['cat']);assert.equal(book.toggle('favorites','unknown'),false)
})
test('相对复习日期取真实排程，不依赖 Intl、不伪造间隔',()=>{
 const now=new Date(2026,9,4,12);assert.equal(nextReviewLabel(new Date(2026,9,4,10).toISOString(),now),'今天复习');assert.equal(nextReviewLabel(new Date(2026,9,4,14).toISOString(),now),'今天稍后');assert.equal(nextReviewLabel(new Date(2026,9,5,12).toISOString(),now),'明天');assert.equal(nextReviewLabel(new Date(2026,9,7,12).toISOString(),now),'3 天后');assert.equal(nextReviewLabel(new Date(2026,9,12,12).toISOString(),now),'下周');assert.equal(nextReviewLabel('invalid',now),'复习日期待确认')
})
test('本轮经验来自全体宠物的真实增量，切换搭子后仍可核对',()=>{
 const {learning,view}=fresh();startLegacyRound(learning);view.sync();learning.reveal();view.submit(3);assert.equal(view.earnedExp,12);usePetStore().choose('fire');view.next();view.chooseMode('spell');view.updateInput('dog');view.submit();assert.equal(view.earnedExp,24)
})
test('家长清除后独立学习回看输入和单词标记也可清除，不改默认数据库',()=>{
 const {profile,learning,view,book}=fresh();startLegacyRound(learning);view.sync();view.chooseMode('spell');view.updateInput('ca');book.toggle('favorites','cat');book.toggle('later','cat')
 profile.erase();const empty=JSON.stringify(profile.db);assert.ok(view.reset());assert.ok(book.reset());assert.equal(view.input,'');assert.equal(view.state.sessionId,'');assert.deepEqual(book.preferences,{favorites:[],later:[]});assert.equal(JSON.stringify(profile.db),empty)
})
