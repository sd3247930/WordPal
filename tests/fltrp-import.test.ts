import {startLegacyRound} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {generateCourses,BOOKS,splitLessons,type Extraction} from '../tools/import-fltrp/generate'
import {validateBundles} from '../tools/import-fltrp/validate'
import {availableModes,entryWord,validateCourse} from '../packages/content_schema/course'
import {configureLocalCourses,loadCourseRegistry,courseRegistry,getCourseWord,starterPack} from '../packages/content_schema/registry'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useLearningStore} from '../src/stores/learning'
import {newCard,FSRSScheduler} from '../packages/srs_fsrs'
import {planDailySession} from '../src/services/learning/SessionPlanner'

const raw:Extraction={schemaVersion:1,series:'合成系列',editionYear:null,entries:BOOKS.flatMap((meta,index)=>Array.from({length:16},(_,i)=>({book:meta.key,image:24+index*2,unit:'1',lemma:i===0?'shared':i===1?'seal':'sample'+i,meaning:i===0?'共用合成词':i===1?(index%2?'合成印章':'合成海豹'):'合成释义'+i,verified:true}))) }
const {courses,audit}=generateCourses(raw)
test('默认 CI 合成六册通过严格 schema、来源、版次、拆课与引用校验',()=>{
 assert.deepEqual(validateBundles(courses),[])
 for(const pack of courses){assert.deepEqual(pack.units[0].lessons.map(l=>l.wordIds.length),[8,8]);assert.equal(pack.editionYear,null);assert.equal(pack.assets.length,0);assert.ok(validateCourse(pack,{publicUse:true}).some(i=>i.severity==='error'));assert.ok(!pack.vocabulary.some(w=>w.audio||w.phonics?.length||w.example))}
 assert.equal(audit.occurrences.length,96)
 assert.deepEqual(splitLessons(Array.from({length:31},(_,i)=>''+i)).map(p=>p.length),[11,10,10])
 assert.equal(splitLessons(['a','b','c','d','e'])[0].length,5)
})
test('共享词 ID 稳定、同形不同义分离，未核对词留在审计并不进入课程',()=>{
 assert.equal(new Set(courses.map(p=>p.vocabulary[0].id)).size,1)
 assert.equal(new Set(courses.map(p=>p.vocabulary[1].id)).size,2)
 assert.deepEqual(generateCourses({...raw,entries:[...raw.entries].reverse()}).courses[0].vocabulary.map(w=>w.id).sort(),courses[0].vocabulary.map(w=>w.id).sort())
 const pending={...raw.entries[0],lemma:'unclear',meaning:'',verified:false,note:'原图裁切'}
 const deferred=generateCourses({...raw,entries:[pending,...raw.entries]});assert.equal(deferred.audit.deferred.length,1);assert.ok(!deferred.courses[0].vocabulary.some(w=>w.lemma==='unclear'))
 const bad=structuredClone(courses);bad[1].vocabulary[0].meaning='不同释义';assert.ok(validateBundles(bad).some(i=>i.includes('不同词义')))
 assert.throws(()=>generateCourses({...raw,entries:raw.entries.filter(e=>e.book!=='g3b')}),/不能补造/)
})
test('精确同义复用旧 ID 与词性，避免迁移既有 SRS；资源缺失只保留可运行题型',()=>{
 const known={...starterPack.vocabulary[0],lemma:'shared',meaning:'共用合成词'}
 const reused=generateCourses(raw,[known]).courses
 assert.equal(reused[0].vocabulary[0].id,known.id);assert.equal(reused[0].vocabulary[0].pos,known.pos)
 const word=entryWord(courses[0].vocabulary[0],courses[0]),other=entryWord(courses[0].vocabulary[2],courses[0])
 const pool=[word,other,{...other,id:'third-choice',word:'third',meaning:'第三种合成释义'}]
 assert.deepEqual(availableModes(word,pool,true,1),['flash','connect'])
 assert.deepEqual(availableModes(word,pool,true,5).sort(),['connect','flash','spell'])
 assert.ok(!word.phonics.length&&!word.example&&!word.audio)
})
test('实际 Store 跨册保留 Card/历史/奖励，立即切册并恢复原会话；正式评分仍由原 FSRS 计算',()=>{
 const storage=new Map<string,string>();(globalThis as any).uni={getStorageSync:(k:string)=>storage.get(k)||'',setStorageSync:(k:string,v:string)=>storage.set(k,v),removeStorageSync:(k:string)=>storage.delete(k),showToast:()=>{}}
 configureLocalCourses(courses);loadCourseRegistry();setActivePinia(createPinia())
 const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore(),id=courses[0].vocabulary[0].id
 profile.transact(d=>{d.cards[id]=newCard(id,new Date('2000-01-01'))})
 const before=JSON.stringify({cards:profile.db.cards,history:profile.db.history,pets:profile.db.pets,gems:profile.db.gems})
 for(const pack of courses){assert.ok(course.choose(pack.courseId).ok);assert.equal(JSON.stringify({cards:profile.db.cards,history:profile.db.history,pets:profile.db.pets,gems:profile.db.gems}),before);assert.equal(courseRegistry[pack.courseId].vocabulary[0].id,id)}
 course.choose(courses[0].courseId);assert.ok(startLegacyRound(learning));assert.equal(learning.current!.id,id)
 const frozen=JSON.stringify(learning.session);assert.ok(course.choose(courses[1].courseId).ok);assert.equal(JSON.stringify(profile.db.courseSessions?.[courses[0].courseId]),frozen);assert.equal(course.currentId,courses[1].courseId);course.choose(courses[0].courseId);assert.equal(JSON.stringify(learning.session),frozen)
 learning.setMode('flash');learning.reveal();const old=JSON.parse(JSON.stringify(profile.db.cards[id]));assert.ok(learning.submit(3));const answer=profile.db.history.at(-1)!;assert.deepEqual(profile.db.cards[id],new FSRSScheduler().schedule(old,3,new Date(answer.at)).card)
 assert.equal(profile.db.history.filter(a=>a.wordId===id).length,1);assert.equal(Object.keys(profile.db.cards).filter(k=>k===id).length,1)
 assert.ok(getCourseWord(courses[1].courseId,id)?.word)
 configureLocalCourses([]);loadCourseRegistry()
})
test('能力上限 5/5/10/15/20 与每日设置取小值，复习/错词优先且不被新词上限截断',()=>{
 for(const [index,cap] of [5,5,10,15,20].entries()){
 const due=Array.from({length:25},(_,i)=>'due'+i),news=Array.from({length:40},(_,i)=>'new'+i)
 const plan=planDailySession({config:{entryLevel:(index+1) as 1|2|3|4|5,dailyNewWordLimit:20},dueIds:due,weakIds:['weak'],newIds:news,newToday:2})
 assert.equal(plan.newIds.length,cap-2);assert.deepEqual(plan.wordIds.slice(0,26),[...due,'weak'])
 }
})

test('旧章节选择不改变未开始教材的首词，按课节原序跨课补足额度',()=>{
 const storage=new Map<string,string>();(globalThis as any).uni={getStorageSync:(k:string)=>storage.get(k)||'',setStorageSync:(k:string,v:string)=>storage.set(k,v),removeStorageSync:(k:string)=>storage.delete(k)}
 configureLocalCourses(courses);loadCourseRegistry();setActivePinia(createPinia())
 const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore()
 course.choose(courses[0].courseId);const lesson=courses[0].units[0].lessons[1];assert.ok(course.chooseLesson(lesson.id))
 const before=JSON.stringify({cards:profile.db.cards,history:profile.db.history})
 assert.ok(startLegacyRound(learning));assert.deepEqual(learning.session!.wordIds.slice(0,8),courses[0].units[0].lessons[0].wordIds)
 assert.equal(learning.session!.wordIds.length,10);assert.equal(JSON.stringify({cards:profile.db.cards,history:profile.db.history}),before)
 configureLocalCourses([]);loadCourseRegistry()
})
