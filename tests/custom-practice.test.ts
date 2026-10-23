import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {freshDatabase,useProfileStore,type Database} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {useCustomPracticeStore} from '../src/stores/custom-practice'
import {loadCourseRegistry,registerCourse,courseRegistry,installationStatus,archiveStatus,wordById} from '../src/services/content/ContentRegistry'
import {installTextCourse} from '../src/services/content/StorageRepository'
import {validateDatabase,CUSTOM_RECOVERY_KEY} from '../src/services/storage/MigrationV1toV2'
import {makeLearningBackup,previewLearningBackup} from '../src/services/storage/LearningBackup'
import {courseRemovalScope,pruneRemovedCourseRecords} from '../src/services/content/CourseRemovalData'
import {CUSTOM_MODES,createCustomPractice,practiceWordIds,wholeBook,practiceCountError,defaultPracticeCount,runCustom,pauseCustom,endCustom,recordCustomAnswer,advanceCustom,customToken,customProgress,customResults,customMatchGroup,validCustomPractice,customResumeProblem} from '../src/services/learning/CustomPractice'
import {customCourse} from './helpers/custom-course'
import type {LearningMode} from '../packages/core_learning'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function reset(){storage.clear();fail=false;loadCourseRegistry();setActivePinia(createPinia());const pack=customCourse();registerCourse(pack);return pack}
function make(count=113,modes:LearningMode[]=[...CUSTOM_MODES]){const pack=reset(),session=createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count,modes,sound:true,id:'custom-fixture-session'});const db={...freshDatabase(),customPractice:session};runCustom(session);return {pack,session,db}}
function answer(db:Database){const s=db.customPractice!,mode=s.modes[s.modeIndex],id=s.wordIds[s.index];s.revealed=true;s.selected=id;s.input=s.wordSnapshot[id].word;assert(recordCustomAnswer(db,customToken(s),3,true));assert(validCustomPractice(s));assert(advanceCustom(s,customToken(s)));assert(validCustomPractice(s))}
const protectedFields=(db:Database)=>JSON.stringify(Object.fromEntries(Object.entries(db).filter(([key])=>!['customPractice','practiceAnswers'].includes(key))))

test('31种组合完成结果只统计所选模式和不同词条，闪现不伪造答题正确率',()=>{
 for(let mask=1;mask<32;mask++){
  const modes=CUSTOM_MODES.filter((_,index)=>mask&(1<<index)),{db,session}=make(2,[...modes])
  assert.equal(customResults(session).accuracy,null)
  while(session.status==='running')answer(db)
  const result=customResults(session);assert.equal(result.selectedWordCount,2);assert.equal(result.completedWordCount,2);assert.equal(result.completedModes,modes.length);assert.equal(result.totalSteps,2*modes.length)
  assert.equal(result.gradedAnswered,2*modes.filter(mode=>mode!=='flash').length);assert.equal(result.accuracy,modes.some(mode=>mode!=='flash')?100:null);assert.equal(result.completionRate,100)
 }
})
test('正确率保留错答与重试，暂停不伪造成完成，活跃用时排除暂停时间',()=>{
 const {session,db}=make(1,['spell','dictation']);session.activeSince='2026-10-23T00:00:00.000Z';const now=new Date('2026-10-23T00:00:02.000Z'),token=customToken(session)
 session.input='wrong';assert(recordCustomAnswer(db,token,undefined,true,now));assert(advanceCustom(session,token,now));assert(pauseCustom(session,now));assert.equal(session.elapsedMs,2000)
 const partial=customResults(session);assert.equal(partial.completedWordCount,0);assert.equal(partial.completedModes,0);assert.equal(partial.accuracy,0)
 assert(runCustom(session,new Date('2026-10-23T00:05:00.000Z')));answer(db);answer(db)
 const result=customResults(session);assert.equal(result.gradedCorrect,2);assert.equal(result.gradedAnswered,3);assert.equal(result.accuracy,67);assert.equal(result.completedWordCount,1)
})
test('同教材恢复模式选择，存储失败不提前进入完成页，重试只完成一次',()=>{
 reset();const custom=useCustomPracticeStore(),profile=useProfileStore();custom.openConfig();custom.singleMode='spell';custom.toggleMode('dictation');custom.count='1';assert.equal(custom.start(),'started');assert(custom.resume())
 assert(profile.transact(db=>{answer(db)}));custom.heardToken=custom.token;custom.patch({input:custom.current!.word});assert(custom.submit());fail=true;assert.equal(custom.next(),false);assert.equal(custom.screen,'training');assert.equal(custom.session!.status,'running');assert(custom.error);fail=false;assert(custom.next());assert.equal(custom.screen,'summary');assert.equal(custom.session!.status,'completed');const id=custom.session!.id
 assert(custom.openConfig());assert.deepEqual(custom.selectedModes,['spell','dictation']);assert.equal(custom.start(),'started');assert.notEqual(custom.session!.id,id);assert.equal(custom.progress!.steps,0);assert(custom.resume());assert(custom.end());registerCourse(customCourse('custom-other',3));custom.chooseCourse('custom-other');assert.deepEqual(custom.selectedModes,['flash'])
})

test('按真实 Unit 数字序和词条顺序去重，整书与指定单元边界动态计算',()=>{
 const pack=reset(),expected=pack.vocabulary.map(word=>word.id)
 assert.deepEqual(practiceWordIds(pack.courseId,wholeBook()),expected)
 const units={type:'units' as const,unitIds:[pack.courseId+'-u10',pack.courseId+'-u2']}
 assert.deepEqual(practiceWordIds(pack.courseId,units),[...expected.slice(10,20),...expected.slice(90,100)])
 pack.units[0].lessons[0].wordIds.push(expected[0]);registerCourse(pack);assert.equal(practiceWordIds(pack.courseId,wholeBook()).length,113)
 assert.deepEqual(practiceWordIds(pack.courseId,{type:'units',unitIds:['missing']}),[])
})
test('动态词量支持1至整书，31/112/113均合法，拒绝空白小数负数及越界',()=>{
 const pack=reset()
 for(const count of [1,5,10,20,30,31,50,100,112,113])assert.equal(createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count,modes:['flash'],sound:true}).wordIds.length,count)
 for(const count of ['0','-1','1.5','',' ','abc','114',String(Number.MAX_SAFE_INTEGER+1)]){assert(practiceCountError(count,113));assert.throws(()=>createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count,modes:['flash'],sound:true}))}
 const tiny=customCourse('custom-tiny',3);registerCourse(tiny);assert.equal(defaultPracticeCount(freshDatabase(),3),3);assert.equal(practiceWordIds(tiny.courseId,wholeBook()).length,3)
})
for(const mode of CUSTOM_MODES)test(`${mode} 单项113词：冻结词条同序、只有custom和额外答题记录改变`,()=>{
 const {session,db}=make(113,[mode]),ids=[...session.wordIds],before=protectedFields(db)
 for(const id of ids){assert.equal(session.wordIds[session.index],id);answer(db)}
 assert.equal(session.status,'completed');assert.deepEqual(session.results[mode].completedWordIds,ids);assert.equal(db.practiceAnswers!.length,113);assert.equal(protectedFields(db),before);assert(validateDatabase(db))
 assert(!runCustom(session));assert(!recordCustomAnswer(db,customToken(session),3,true));assert(!advanceCustom(session,customToken(session)))
})
test('113词连续五模式覆盖同一个快照，不把565步骤当成565个不同词',()=>{
 const {session,db}=make(),ids=[...session.wordIds],snapshot=JSON.stringify(session.wordSnapshot),before=protectedFields(db)
 for(const mode of CUSTOM_MODES){assert.equal(session.modes[session.modeIndex],mode);for(const id of ids){assert.equal(session.wordIds[session.index],id);answer(db)}assert.deepEqual(session.results[mode].completedWordIds,ids)}
 assert.equal(session.status,'completed');assert.deepEqual(customProgress(session),{total:113,steps:565,totalSteps:565,completedModes:5,percent:100});assert.equal(db.practiceAnswers!.length,565);assert.equal(protectedFields(db),before);assert.equal(JSON.stringify(session.wordSnapshot),snapshot)
})

test('全部31种非空模式组合按固定模式顺序执行同一词组，保存/备份校验兼容旧单项和五项',()=>{
 for(let mask=1;mask<32;mask++){
  const modes=CUSTOM_MODES.filter((_,index)=>mask&(1<<index)),{session,db}=make(2,[...modes].reverse()),before=protectedFields(db)
  assert.deepEqual(session.modes,modes);assert(validCustomPractice(session));assert(validateDatabase(db));assert.deepEqual(previewLearningBackup(makeLearningBackup(db)).customPractice!.modes,modes)
  for(const mode of modes){assert.equal(session.modes[session.modeIndex],mode);for(const id of session.wordIds){assert.equal(session.wordIds[session.index],id);answer(db)}}
  assert.equal(session.status,'completed');assert.equal(customProgress(session).totalSteps,2*modes.length);assert.equal(customProgress(session).percent,100);assert.equal(protectedFields(db),before)
 }
 const pack=reset()
 for(const modes of [[],['spell','spell'],['unknown']])assert.throws(()=>createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count:1,modes:modes as LearningMode[],sound:true}))
 for(const modes of [[],['spell','spell'],['dictation','spell'],['unknown']]){const {session}=make(2,['spell','dictation']);session.modes=modes as LearningMode[];assert(!validCustomPractice(session))}
})

test('多选、再次取消和一键全选保持同一选择状态，空选不能开始，部分组合冷恢复不串正式进度',()=>{
 reset();const custom=useCustomPracticeStore(),profile=useProfileStore();custom.openConfig();custom.toggleMode('spell');assert.deepEqual(custom.selectedModes,['flash','spell']);custom.toggleMode('flash');assert.deepEqual(custom.selectedModes,['spell']);custom.toggleMode('spell');assert.deepEqual(custom.selectedModes,[]);assert.equal(custom.start(),'failed')
 custom.toggleMode('dictation');custom.toggleMode('listen');assert.deepEqual(custom.selectedModes,['listen','dictation']);custom.continuous=true;assert.deepEqual(custom.selectedModes,CUSTOM_MODES);custom.continuous=false;assert.deepEqual(custom.selectedModes,['listen','dictation']);custom.continuous=true;custom.toggleMode('connect');assert.equal(custom.continuous,false);assert.deepEqual(custom.selectedModes,['flash','listen','spell','dictation'])
 custom.singleMode='spell';custom.toggleMode('dictation');custom.count='2';const before=protectedFields(profile.db);assert.equal(custom.start(),'started');assert.equal(custom.screen,'overview');assert.deepEqual(custom.session!.modes,['spell','dictation']);assert(custom.resume());custom.patch({input:'draft'});assert(custom.pause());const id=custom.session!.id;setActivePinia(createPinia());const restored=useCustomPracticeStore();assert.equal(restored.session!.id,id);assert.deepEqual(restored.session!.modes,['spell','dictation']);assert(restored.resume());assert.equal(restored.session!.input,'draft');assert.equal(protectedFields(useProfileStore().db),before)
})
test('连接按最多5词分组且覆盖113词，稳定打散词义列，重复词义分开处理',()=>{
 const {session,db}=make(113,['connect']),seen:string[]=[],batches=new Map<string,string[]>()
 while(session.status==='running'){
  const group=customMatchGroup(session);assert(group.wordIds.length<=5);assert(group.wordIds.includes(session.wordIds[session.index]));batches.set(group.wordIds.join(','),group.wordIds);assert.deepEqual(customMatchGroup(session).choices.map(word=>word.id),group.choices.map(word=>word.id));seen.push(session.wordIds[session.index]);answer(db)
 }
 assert.equal(batches.size,23);assert.deepEqual(seen,session.wordIds);assert.equal(new Set(seen).size,113)
})
test('五模式在开始、中途、末尾可持久化恢复，取消结束保持原快照，ended不可误作completed',()=>{
 for(const mode of CUSTOM_MODES)for(const position of [0,2,4]){
  const {db,session}=make(5,[mode]);for(let i=0;i<position;i++)answer(db)
  const token=customToken(session);session.input='draft';assert(pauseCustom(session));assert(validCustomPractice(session));const resumed=JSON.parse(JSON.stringify(session));assert.equal(resumed.input,'draft');assert.equal(customToken(resumed),token);assert(runCustom(resumed));assert.equal(resumed.index,position);assert(validCustomPractice(resumed));assert(endCustom(resumed));assert.equal(resumed.status,'ended');assert.equal(resumed.completedAt,undefined);assert(!runCustom(resumed));assert(validCustomPractice(resumed))
 }
})
test('错答重试不增加完成数；双击、旧模式回调和重复下一步不能双写记录',()=>{
 const {session,db}=make(1,['spell']),token=customToken(session);session.input='wrong';assert(recordCustomAnswer(db,token));assert(!recordCustomAnswer(db,token));assert.equal(db.practiceAnswers!.length,1);assert.equal(customProgress(session).steps,0);assert(advanceCustom(session,token));assert.equal(session.index,0);session.input=session.wordSnapshot[session.wordIds[0]].word;assert(recordCustomAnswer(db,token));assert(advanceCustom(session,token));assert.equal(customProgress(session).steps,1);assert(!advanceCustom(session,token));assert.equal(db.practiceAnswers!.length,2)
})
test('停用、卸载、内容版本变化或快照越教材时明确阻止恢复和创建',()=>{
 const {pack,session}=make();assert.equal(customResumeProblem(session),'');installationStatus[pack.courseId]='notInstalled';assert(customResumeProblem(session));assert.throws(()=>createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count:1,modes:['flash'],sound:true}));installationStatus[pack.courseId]='installed';archiveStatus[pack.courseId]=true;assert(customResumeProblem(session));archiveStatus[pack.courseId]=false;courseRegistry[pack.courseId].contentVersion='2.0.0';assert(customResumeProblem(session));courseRegistry[pack.courseId].contentVersion='1.0.0';session.wordIds[0]='foreign-word';assert(customResumeProblem(session));assert(!validCustomPractice(session))
})
test('无音频、关闭声音时不冒充连续完成，听音必须先成功播放当前词',()=>{
 const {pack,session,db}=make(1,['listen']);session.selected=session.wordIds[0];assert(!recordCustomAnswer(db,customToken(session),undefined,false));assert(recordCustomAnswer(db,customToken(session),undefined,true));assert.throws(()=>createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count:113,modes:[...CUSTOM_MODES],sound:false}));assert(createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count:113,modes:['spell'],sound:false}));pack.vocabulary[0].audio='';registerCourse(pack);wordById[pack.vocabulary[0].id].audio='';assert.throws(()=>createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count:113,modes:[...CUSTOM_MODES],sound:true}))
})

test('资源清单变化即使未升级版本也不能沿用旧断点',()=>{
 const {pack,session}=make(5,['flash']);assert.equal(customResumeProblem(session),'')
 courseRegistry[pack.courseId].assets.push({id:'replacement-audio',path:'audio/replacement.wav',mediaType:'audio/wav',bytes:16,sha256:'a'.repeat(64),sourceId:'fixture-source',license:'author-created'})
 assert.match(customResumeProblem(session),/版本已变更/)
})
test('备份带断点且可通过原数据库校验，移除教材只清理其专属custom记录',()=>{
 const {pack,session,db}=make(5,['flash']);answer(db);pauseCustom(session);assert(validateDatabase(db));assert.deepEqual(previewLearningBackup(makeLearningBackup(db)).customPractice,session);const changed=JSON.parse(JSON.stringify(db));changed.customPractice.results.flash.completedWordIds.push(session.wordIds[0]);assert(!validateDatabase(changed));const scope=courseRemovalScope(pack.courseId,db);pruneRemovedCourseRecords(db,scope);assert.equal(db.customPractice,null);assert.equal(db.practiceAnswers!.length,0);assert.equal(db.gems,0)
})
for(const [level,count] of [[1,5],[2,5],[3,10],[4,15],[5,20]] as const)test(`L${level} 113词完成/结束后默认回到${count}，冻结正式计划与多教材记录不变`,async()=>{
 reset();const profile=useProfileStore();profile.transact(db=>{db.abilityLevel=`L${level}`});const learning=useLearningStore();assert(learning.start());const custom=useCustomPracticeStore();await installTextCourse(customCourse());const before=protectedFields(profile.db),daily=JSON.stringify(profile.db.courseProgress!.starter.dailyPlan)
 assert(custom.openConfig());custom.chooseCourse('custom-fixture');assert.equal(Number(custom.count),count);custom.count='113';custom.continuous=true;assert.equal(custom.start(),'started');assert(custom.resume())
 assert.equal(protectedFields(profile.db),before);assert.equal(JSON.stringify(profile.db.courseProgress!.starter.dailyPlan),daily);assert(custom.pause());assert(custom.resume());assert(custom.end());assert.equal(protectedFields(profile.db),before);assert(custom.openConfig());assert.equal(Number(custom.count),count)
 custom.chooseCourse('custom-fixture');custom.count='113';custom.continuous=true;assert.equal(custom.start(),'started');assert(custom.resume());assert(profile.transact(db=>{while(db.customPractice?.status==='running')answer(db)}));assert.equal(custom.session!.status,'completed');assert.equal(protectedFields(profile.db),before);assert.equal(JSON.stringify(profile.db.courseProgress!.starter.dailyPlan),daily);assert(custom.openConfig());assert.equal(Number(custom.count),count)
})
test('空间不足时会话不假前进，强制中断后用冻结快照恢复，不改正式状态',()=>{
 reset();const profile=useProfileStore(),custom=useCustomPracticeStore();assert(custom.openConfig());assert.equal(custom.start(),'started');const initial=JSON.stringify(profile.db);fail=true;assert(!custom.patch({revealed:true}));assert.equal(JSON.stringify(profile.db),initial);assert(!custom.pause());fail=false;assert(custom.patch({revealed:true}));assert(custom.submit(3));const oldId=custom.session!.id;setActivePinia(createPinia());const restored=useCustomPracticeStore();assert(restored.recoverable);assert.equal(restored.session!.id,oldId);assert(restored.resume());assert(restored.next());assert.equal(restored.session!.index,1)
})
test('损坏的custom断点先单独备份隔离，正式档案与日计划仍可使用',()=>{
 reset();const profile=useProfileStore(),learning=useLearningStore();assert(learning.start());const custom=useCustomPracticeStore();custom.openConfig();assert.equal(custom.start(),'started');const before=protectedFields(profile.db),broken=JSON.parse(JSON.stringify(profile.db));broken.customPractice.index=999;storage.set('wordpal.database.v2',JSON.stringify(broken));setActivePinia(createPinia());const restored=useProfileStore();assert.equal(restored.readOnly,false);assert.equal(restored.db.customPractice,null);assert.equal(protectedFields(restored.db),before);assert(storage.has(CUSTOM_RECOVERY_KEY));assert.equal(JSON.parse(storage.get(CUSTOM_RECOVERY_KEY)!).customPractice.index,999)
})
test('连点开始只创建一个会话，旧阶段回调不能写入新阶段',()=>{
 reset();const profile=useProfileStore(),custom=useCustomPracticeStore();custom.openConfig();assert.equal(custom.start(),'started');const id=custom.session!.id;assert.equal(custom.start(),'failed');assert.equal(custom.session!.id,id);assert.equal(custom.confirmation,'')
 const {db,session}=make(1);const old=customToken(session);session.revealed=true;assert(recordCustomAnswer(db,old,3,true));assert(advanceCustom(session,old));assert.equal(session.modes[session.modeIndex],'connect');assert(!recordCustomAnswer(db,old,3,true));assert(!advanceCustom(session,old));assert.equal(db.practiceAnswers!.length,1);assert(validCustomPractice(session))
})

test('进程重启后新建或结束旧练习不会把离线时间计入实际耗时',()=>{
 for(const action of ['configure','end'] as const){
  reset();const original=useCustomPracticeStore();assert(original.openConfig());assert.equal(original.start(),'started')
  assert(useProfileStore().transact(db=>{db.customPractice!.elapsedMs=1234;db.customPractice!.activeSince='2026-01-01T00:00:00.000Z'}));setActivePinia(createPinia())
  const custom=useCustomPracticeStore();assert(action==='configure'?custom.openConfig():custom.end());assert.equal(custom.session!.elapsedMs,1234)
 }
})
