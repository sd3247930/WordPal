import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {familiarityFor,familiarityLevels} from '../src/services/content/FamiliaritySelector'
import {queryCourseCards,type CourseCardIndex} from '../src/services/content/WordbookQueryBuilder'
import type {CoursePack} from '../packages/content_schema/course'
import type {Word,Answer} from '../packages/core_learning'
import {newCard,FSRSScheduler} from '../packages/srs_fsrs'
import {useProfileStore} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {useWordbookStore} from '../src/stores/wordbook'
import {useCourseStore} from '../src/stores/course'
import {makeLearningBackup,previewLearningBackup} from '../src/services/storage/LearningBackup'
const now=Date.parse('2026-10-11T10:00:00Z')
const word=(id:string,lemma=id,meaning=id):Word=>({id,word:lemma,meaning,ipa:'',pos:'n.',audio:'',image:'',example:'',phonics:[],phonemes:[],syllables:[],unit:'',lesson:'',distractors:[],difficulty:1})
const event=(wordId:string,day:number,extra:Partial<Answer>={}):Answer=>({id:wordId+':'+day,wordId,rating:3,correct:true,at:`2026-10-${String(day).padStart(2,'0')}T07:00:00Z`,mode:'spell',source:'new_word',input:wordId,...extra})
const pack=(courseId:string,ids=['apple','book','play-verb','play-noun','unseen','legacy']):CoursePack=>({schemaVersion:2,courseId,contentVersion:'1.0.0',title:courseId,route:'theme',abilityLevels:['L3'],sources:[{id:'original',type:'author-created',rightsStatus:'redistribution-approved',attribution:'Synthetic original test fixture',textLicense:'CC0-1.0',revision:'1'}],assets:[],vocabulary:ids.map(id=>({id,language:'en',lemma:id.startsWith('play')?'play':id,meaning:id==='play-verb'?'玩':id==='play-noun'?'戏剧':id,sourceId:'original'})),units:[{id:'u2',title:'Unit 2 School',order:2,lessons:[{id:'l2',title:'Two',wordIds:['book']}]},{id:'u1',title:'Unit 1 Fruit',order:1,lessons:[{id:'l1',title:'One',wordIds:ids}]}]})
const p=pack('a'),dictionary=Object.fromEntries(p.vocabulary.map(w=>[w.id,word(w.id,w.lemma,w.meaning)]))
const index=():CourseCardIndex=>({pack:p,installed:true,wordFor:id=>dictionary[id],cards:{legacy:newCard('legacy',new Date(now)),apple:newCard('apple',new Date(now))},answers:[event('apple',7),event('apple',8),event('apple',9,{source:'review_due'}),event('book',9,{mode:'flash'})],dueIds:['apple','apple'],favorites:['book'],mistakes:[],now})

// 保守分类不使用复习稳定性冒充多日证据，跨午夜按本地自然日计算。
test('六熟知等级、提示/错误退步、旧记录与多日到期证据',()=>{
 assert.equal(familiarityFor('x',undefined,[],now).level,'unseen')
 assert.equal(familiarityFor('x',newCard('x',new Date(now)),[],now).level,'unrated')
 assert.equal(familiarityFor('x',undefined,[event('x',8,{mode:'flash'})],now).level,'introduced')
 assert.equal(familiarityFor('x',undefined,[event('x',8)],now).level,'practicing')
 assert.equal(familiarityFor('x',undefined,[event('x',8),event('x',9)],now).level,'familiar')
 const stable=[event('x',7),event('x',8),event('x',9,{source:'review_due'})]
 assert.equal(familiarityFor('x',newCard('x',new Date(now)),stable,now).level,'mastered')
 assert.equal(familiarityFor('x',undefined,stable.map(a=>({...a,source:'new_word'})),now).level,'familiar')
 for(const extra of [{correct:false,rating:1},{hinted:true},{rating:2}] as Partial<Answer>[])assert.equal(familiarityFor('x',undefined,[...stable,event('x',10,extra)],now).level,'practicing')
 assert.equal(familiarityFor('x',undefined,[...stable,event('x',10,{source:'review_due',dueAtSubmit:'2026-11-01T00:00:00Z'})].slice(-3).map(a=>({...a,source:a.id==='x:10'?'review_due':'new_word'})),now).level,'familiar')
 assert.equal(familiarityFor('x',undefined,[event('x',12)],now).level,'unrated')
 assert.equal(familiarityFor('x',undefined,[event('x',8,{mode:undefined as any})],now).level,'unrated')
 assert.equal(familiarityFor('x',undefined,[event('x',8),event('x',8)],now).successfulDays,1)
})

// 以教材出现记录为基表，所有状态合计与列表逐项对账，多义词按 ID 分离。
test('教材 A/B、跨单元重复、未学、旧档与到期去重采用明确口径',()=>{
 const before=JSON.stringify(index()),a=queryCourseCards({courseId:'a'},index())
 assert.equal(a.totalRows,7);assert.equal(a.summary.uniqueLexemes,6);assert.equal(a.summary.learnedOccurrences,3);assert.equal(a.summary.dueUniqueLexemes,1)
 assert.equal(Object.values(a.summary.byFamiliarity).reduce((a,b)=>a+b,0),7)
 assert.equal(a.rows[0].occurrence.unitId,'u1');assert.equal(a.rows.at(-1)!.occurrence.unitId,'u2')
 assert.equal(a.rows.filter(r=>r.word.word==='play').length,2)
 assert.equal(a.rows.find(r=>r.word.id==='apple')!.familiarity.level,'mastered');assert.equal(a.rows.find(r=>r.word.id==='apple')!.due,true)
 const b=queryCourseCards({courseId:'b'},{...index(),pack:pack('b')})
 assert.deepEqual(b.rows.find(r=>r.word.id==='apple')!.familiarity,a.rows.find(r=>r.word.id==='apple')!.familiarity)
 assert.equal(JSON.stringify(index()),before)
 const merged=queryCourseCards({courseId:'a',mergeDuplicates:true},index());assert.equal(merged.totalRows,6);assert.equal(merged.rows.find(r=>r.word.id==='book')!.occurrence.unitId,'u1');assert.equal(merged.summary.totalOccurrences,7)
})

test('统一搜索/Unit/状态/到期/重点、缺失资源及未安装空教材',()=>{
 for(const level of familiarityLevels){const result=queryCourseCards({courseId:'a',familiarity:level},index());assert.ok(result.rows.every(row=>row.familiarity.level===level));assert.equal(result.summary.totalOccurrences,result.totalRows)}
 assert.equal(queryCourseCards({courseId:'a',unitId:'u2',keyword:' SCHOOL ',starredOnly:true},index()).totalRows,1)
 assert.equal(queryCourseCards({courseId:'a',keyword:'戏剧'},index()).totalRows,1)
 assert.equal(queryCourseCards({courseId:'b'},index()).available,false)
 assert.equal(queryCourseCards({courseId:'a'},{...index(),installed:false}).totalRows,0)
 assert.equal(queryCourseCards({courseId:'a'},{...index(),pack:{...p,units:[]}}).totalRows,0)
 const damaged=queryCourseCards({courseId:'a'},{...index(),wordFor:()=>undefined});assert.equal(damaged.totalRows,7);assert.ok(damaged.rows.every(row=>row.familiarity.level==='unrated'))
 assert.equal(queryCourseCards({courseId:'a',dueOnly:true},index()).totalRows,1)
})

test('600 词分页稳定、不漏词、不混课程且不挂载所有复杂卡',()=>{
 const ids=Array.from({length:600},(_,i)=>'word-'+i),large={...pack('large',ids),units:[{id:'large-u',title:'Large Unit',lessons:[{id:'large-l',title:'Large',wordIds:ids}]}]},largeIndex={...index(),pack:large,wordFor:(id:string)=>word(id)}
 const seen=new Set<string>(),start=performance.now()
 for(let pageIndex=0;pageIndex<20;pageIndex++){const page=queryCourseCards({courseId:'large',pageIndex,pageSize:30},largeIndex);assert.equal(page.pageRows.length,30);for(const row of page.pageRows){assert.ok(!seen.has(row.occurrence.id));seen.add(row.occurrence.id)}}
 assert.equal(seen.size,600);assert.ok(performance.now()-start<5000)
})

// 真实提交自由练习只追加证据；既有卡、排程、奖励、课程进度与历史不改写。
test('实际练习证据只提交一次、可备份恢复，正式答题仍使用原调度器',()=>{
 const storage=new Map<string,string>();(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value),removeStorageSync:(key:string)=>storage.delete(key)};setActivePinia(createPinia())
 const profile=useProfileStore(),learning=useLearningStore(),book=useWordbookStore(),course=useCourseStore()
 assert.ok(learning.start(['cat']));const before=JSON.parse(JSON.stringify(profile.db));learning.setMode('spell');learning.patch({input:'cat'});assert.ok(learning.submit());assert.equal(learning.submit(),false);assert.equal(profile.db.practiceAnswers?.length,1)
 for(const key of ['cards','history','courseProgress','pets','gems','rewardIds','streakDates'] as const)assert.deepEqual(profile.db[key],before[key])
 assert.equal(book.courseCards({courseId:'starter'}).rows.find(row=>row.word.id==='cat')!.familiarity.level,'practicing')
 assert.deepEqual(previewLearningBackup(makeLearningBackup(profile.db)).practiceAnswers,profile.db.practiceAnswers)
 profile.transact(d=>{d.history.push(event('cat',10,{id:'fixture-later-formal',at:new Date(Date.parse(d.practiceAnswers![0].at)+1).toISOString()}))})
 const mixedBefore=JSON.stringify(profile.db);assert.equal(book.historyByWord.cat.at(-1)!.id,'fixture-later-formal');assert.equal(JSON.stringify(profile.db),mixedBefore)
 learning.next();profile.transact(d=>{d.session=null});assert.ok(learning.startSelected(undefined,'dog'));assert.equal(learning.current?.id,'dog');learning.setMode('spell');learning.patch({input:'dog'});const card=newCard('dog',new Date());assert.ok(learning.submit());const answer=profile.db.history.at(-1)!;assert.deepEqual(profile.db.cards.dog,new FSRSScheduler().schedule(card,3,new Date(answer.at)).card)
 assert.equal(course.currentId,'starter')
})
