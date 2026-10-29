import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {freshDatabase,useProfileStore,type Database} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {finishDaily} from './helpers/daily-flow'
import {useCustomPracticeStore} from '../src/stores/custom-practice'
import {loadCourseRegistry,registerCourse,courseRegistry,installationStatus,archiveStatus,wordById,getCourseWord} from '../src/services/content/ContentRegistry'
import {installTextCourse} from '../src/services/content/StorageRepository'
import {validateDatabase,CUSTOM_RECOVERY_KEY} from '../src/services/storage/MigrationV1toV2'
import {makeLearningBackup,previewLearningBackup} from '../src/services/storage/LearningBackup'
import {courseRemovalScope,pruneRemovedCourseRecords} from '../src/services/content/CourseRemovalData'
import {CUSTOM_MODES,createCustomPractice,practiceWordIds,wholeBook,practiceCountError,defaultPracticeCount,runCustom,pauseCustom,endCustom,recordCustomAnswer,advanceCustom,customToken,customProgress,customResults,customMatchGroup,validCustomPractice,customResumeProblem,customModeProblems} from '../src/services/learning/CustomPractice'
import {customCourse} from './helpers/custom-course'
import type {LearningMode} from '../packages/core_learning'
import {validCustomPracticeCursors} from '../src/services/learning/CustomPracticeSequence'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function reset(){storage.clear();fail=false;loadCourseRegistry();setActivePinia(createPinia());const pack=customCourse();registerCourse(pack);return pack}
function make(count=113,modes:LearningMode[]=[...CUSTOM_MODES]){const pack=reset(),session=createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count,modes,sound:true,id:'custom-fixture-session'});const db={...freshDatabase(),customPractice:session};runCustom(session);return {pack,session,db}}
function answer(db:Database){const s=db.customPractice!,mode=s.modes[s.modeIndex],id=s.wordIds[s.index];s.revealed=true;s.selected=id;s.input=s.wordSnapshot[id].word;assert(recordCustomAnswer(db,customToken(s),3,true));assert(validCustomPractice(s));assert(advanceCustom(s,customToken(s)));assert(validCustomPractice(s))}
const protectedFields=(db:Database)=>JSON.stringify(Object.fromEntries(Object.entries(db).filter(([key])=>!['customPractice','practiceAnswers','customPracticeCursors'].includes(key))))
function finishStore(custom:ReturnType<typeof useCustomPracticeStore>){if(custom.screen==='overview')assert(custom.resume());while(custom.session!.status==='running'){const id=custom.session!.wordIds[custom.session!.index];assert(custom.patch({revealed:true,selected:id,input:custom.session!.wordSnapshot[id].word}));custom.heardToken=custom.token;assert(custom.submit(3));assert(custom.next())}}

test('连接词义每题固定四项，五词批次及末尾单词均包含唯一正确词义',()=>{
 const {db,session}=make(5,['connect'])
 while(session.status==='running'){const choices=customMatchGroup(session).choices,id=session.wordIds[session.index];assert.equal(choices.length,4);assert.equal(choices.filter(word=>word.id===id).length,1);assert.equal(new Set(choices.map(word=>word.meaning)).size,4);answer(db)}
})
test('单词数1至7、指定单元与不同起点始终为四项，正确词义只出现一次且可恢复',()=>{
 for(const count of [1,2,3,4,5,7])for(const offset of [0,10]){
  const pack=reset(),session=createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count,offset,modes:['connect'],sound:true}),db={...freshDatabase(),customPractice:session};runCustom(session)
  while(session.status==='running'){const group=customMatchGroup(session),id=session.wordIds[session.index];assert.equal(group.choices.length,4);assert.equal(group.choices.filter(word=>word.meaning===session.wordSnapshot[id].meaning).length,1);assert(group.choices.some(word=>word.id===id));assert.deepEqual(customMatchGroup(JSON.parse(JSON.stringify(session))).choices.map(word=>word.id),group.choices.map(word=>word.id));answer(db)}
 }
 const pack=reset(),session=createCustomPractice({courseId:pack.courseId,scope:{type:'units',unitIds:[pack.courseId+'-u12']},count:3,modes:['connect'],sound:true});assert.equal(session.wordIds.length,3);assert.equal(customMatchGroup(session).choices.length,4)
})
test('重复词义去重；旧断点缺少干扰项时仅从原教材补足，不修改会话快照',()=>{
 reset();const pack=customCourse('custom-duplicate-meanings',8),meanings=['重复',' 重复 ','重复','词义乙','词义丙','词义丁','目标','目标'];pack.vocabulary.forEach((word,index)=>word.meaning=meanings[index]);registerCourse(pack)
 const session=createCustomPractice({courseId:pack.courseId,scope:wholeBook(),count:1,offset:6,modes:['connect'],sound:true}),id=session.wordIds[0];assert.equal(new Set(session.wordSnapshot[id].distractors.map(other=>session.wordSnapshot[other].meaning.trim())).size,3)
 const oldIds=[pack.vocabulary[0].id,pack.vocabulary[1].id,pack.vocabulary[3].id];session.wordSnapshot={[id]:{...session.wordSnapshot[id],distractors:oldIds},...Object.fromEntries(oldIds.map(other=>[other,{...getCourseWord(pack.courseId,other)!,distractors:[]}]))};assert(validCustomPractice(session));const before=JSON.stringify(session),choices=customMatchGroup(session).choices;assert.equal(choices.length,4);assert.equal(new Set(choices.map(word=>word.meaning.trim())).size,4);assert(choices.some(word=>word.id===id));assert(choices.every(word=>word.id.startsWith(pack.courseId+'-')));assert.equal(JSON.stringify(session),before)
})
test('不足四种可区分词义时明确阻止连接，不借用其他教材或影响闪现',()=>{
 const pack=reset(),tiny=customCourse('custom-three-meanings',3);registerCourse(tiny);const ids=practiceWordIds(tiny.courseId,wholeBook());assert.match(customModeProblems(tiny.courseId,ids,true).connect,/4 个不同词义/);assert.throws(()=>createCustomPractice({courseId:tiny.courseId,scope:wholeBook(),count:3,modes:['connect'],sound:true}),/4 个不同词义/);assert(createCustomPractice({courseId:tiny.courseId,scope:wholeBook(),count:3,modes:['flash'],sound:true}));assert.equal(practiceWordIds(pack.courseId,wholeBook()).length,113)
})
test('回归：完成两词自定义练习后，新一轮应从第三词继续而非首词',async()=>{
 reset();const custom=useCustomPracticeStore();await installTextCourse(customCourse());custom.openConfig();custom.chooseCourse('custom-fixture');custom.count='2';custom.singleMode='flash';assert.equal(custom.start(),'started');assert.equal(custom.session!.courseId,'custom-fixture');const first=[...custom.session!.wordIds]
 while(custom.session!.status==='running'){assert(custom.patch({revealed:true}));assert(custom.submit(3));assert(custom.next())}
 assert(custom.openConfig());custom.chooseCourse('custom-fixture');custom.count='2';assert.equal(custom.start(),'started');assert.equal(custom.session!.wordIds[0],'custom-fixture-w003');assert(!custom.session!.wordIds.some(id=>first.includes(id)))
})

test('31种模式组合连续换批不重复词；只有所有已选阶段完成才顺延，重启保持游标',async()=>{
 reset();const custom=useCustomPracticeStore(),profile=useProfileStore();await installTextCourse(customCourse());const before=protectedFields(profile.db)
 for(let mask=1;mask<32;mask++){
  assert(custom.openConfig());custom.chooseCourse('custom-fixture');custom.count='1';custom.singleMode=undefined;for(const mode of CUSTOM_MODES.filter((_,index)=>mask&(1<<index)))custom.toggleMode(mode)
  assert.equal(custom.start(),'started');assert.equal(custom.session!.wordIds[0],`custom-fixture-w${String(mask).padStart(3,'0')}`);const cursorBefore=profile.db.customPracticeCursors?.[0]?.nextOffset||0
  if(custom.screen==='overview'){assert(custom.resume());const id=custom.session!.wordIds[0];assert(custom.patch({revealed:true,selected:id,input:custom.current!.word}));custom.heardToken=custom.token;assert(custom.submit(3));assert(custom.next());assert.equal(profile.db.customPracticeCursors?.[0]?.nextOffset||0,cursorBefore)}
  finishStore(custom);assert.equal(profile.db.customPracticeCursors![0].nextOffset,mask);assert.equal(protectedFields(profile.db),before)
 }
 setActivePinia(createPinia());const restored=useCustomPracticeStore();assert(restored.openConfig());restored.chooseCourse('custom-fixture');restored.count='1';restored.singleMode='flash';assert.equal(restored.start(),'started');assert.equal(restored.session!.wordIds[0],'custom-fixture-w032')
})
test('教材与单元范围各自顺延；单元选择顺序、模式和词数变化不重置同一范围',async()=>{
 reset();const custom=useCustomPracticeStore(),profile=useProfileStore();await installTextCourse(customCourse());await installTextCourse(customCourse('custom-other',23))
 function start(course:string,count:number,units:string[]=[]){assert(custom.openConfig());custom.chooseCourse(course);if(units.length){custom.chooseScope('units');for(const id of [...custom.scope.unitIds])custom.toggleUnit(id);for(const id of units)custom.toggleUnit(id)}custom.count=String(count);custom.singleMode='flash';assert.equal(custom.start(),'started')}
 start('custom-fixture',2);finishStore(custom);start('custom-other',1);finishStore(custom);start('custom-fixture',1);assert.equal(custom.current!.id,'custom-fixture-w003');finishStore(custom)
 const units=['custom-fixture-u2','custom-fixture-u1'];start('custom-fixture',2,units);assert.equal(custom.current!.id,'custom-fixture-w001');finishStore(custom);assert(custom.openConfig());assert.deepEqual(custom.scope.unitIds,units)
 custom.chooseScope('whole-book');custom.count='1';assert.equal(custom.start(),'started');assert.equal(custom.current!.id,'custom-fixture-w004');finishStore(custom);start('custom-fixture',1,[...units].reverse());assert.equal(custom.current!.id,'custom-fixture-w003');finishStore(custom)
 assert.equal(profile.db.customPracticeCursors!.length,3);assert(validCustomPracticeCursors(profile.db.customPracticeCursors));assert.equal(previewLearningBackup(makeLearningBackup(profile.db)).customPracticeCursors!.length,3)
 const removal=courseRemovalScope('custom-other',profile.db);assert(profile.transact(db=>{pruneRemovedCourseRecords(db,removal)}));assert(profile.db.customPracticeCursors!.every(item=>item.courseId!=='custom-other'));assert.equal(profile.db.customPracticeCursors!.filter(item=>item.courseId==='custom-fixture').length,2)
})
test('末批仅取剩余词，练完整范围后提示新一轮；教材版本改变不沿用旧偏移',async()=>{
 reset();const custom=useCustomPracticeStore();await installTextCourse(customCourse('custom-tail',13));custom.openConfig();custom.chooseCourse('custom-tail');custom.count='10';custom.singleMode='flash';assert.equal(custom.start(),'started');finishStore(custom)
 assert(custom.openConfig());assert.equal(custom.total,3);assert.equal(custom.count,'3');assert.match(custom.sequenceHint,/第 11 词/);assert.equal(custom.start(),'started');assert.deepEqual(custom.session!.wordIds,['custom-tail-w011','custom-tail-w012','custom-tail-w013']);finishStore(custom)
 assert(custom.openConfig());assert.match(custom.sequenceHint,/新一轮/);assert.equal(custom.total,13);custom.count='1';assert.equal(custom.start(),'started');assert.equal(custom.current!.id,'custom-tail-w001');finishStore(custom)
 registerCourse({...courseRegistry['custom-tail'],contentVersion:'1.0.1'});assert(custom.openConfig());custom.chooseCourse('custom-tail');custom.count='1';assert.equal(custom.start(),'started');assert.equal(custom.current!.id,'custom-tail-w001')
})
test('暂停和终止不跳过当前批，保存失败不推进游标，双击完成不会推进两次',async()=>{
 reset();const custom=useCustomPracticeStore(),profile=useProfileStore();await installTextCourse(customCourse());custom.openConfig();custom.chooseCourse('custom-fixture');custom.singleMode='flash';custom.count='2';assert.equal(custom.start(),'started');assert(custom.patch({revealed:true}));assert(custom.submit(3));assert(custom.next());assert(custom.pause());assert.equal(profile.db.customPracticeCursors,undefined);assert(custom.resume());assert(custom.end())
 assert(custom.openConfig());custom.chooseCourse('custom-fixture');custom.count='1';custom.singleMode='flash';assert.equal(custom.start(),'started');assert.equal(custom.current!.id,'custom-fixture-w001');assert(custom.patch({revealed:true}));assert(custom.submit(3));const before=JSON.stringify(profile.db);fail=true;assert.equal(custom.next(),false);assert.equal(JSON.stringify(profile.db),before);fail=false;assert(custom.next());assert.equal(profile.db.customPracticeCursors![0].nextOffset,1);assert.equal(custom.next(),false);assert.equal(profile.db.customPracticeCursors![0].nextOffset,1)
})
test('旧已完成会话无需重练即可衔接，替换或终止后仍保留已迁移位置',async()=>{
 reset();const profile=useProfileStore();await installTextCourse(customCourse());const session=createCustomPractice({courseId:'custom-fixture',scope:wholeBook(),count:2,modes:['flash'],sound:true});delete session.sequenceStart;const db={...profile.db,customPractice:session};runCustom(session);while(session.status==='running')answer(db);assert(profile.transact(next=>{next.customPractice=session}));assert.equal(profile.db.customPracticeCursors,undefined)
 setActivePinia(createPinia());const custom=useCustomPracticeStore();assert(custom.openConfig());assert.match(custom.sequenceHint,/第 3 词/);custom.count='1';assert.equal(custom.start(),'started');assert.equal(custom.current!.id,'custom-fixture-w003');assert.equal(useProfileStore().db.customPracticeCursors![0].nextOffset,2);assert(custom.end());assert(custom.openConfig());custom.chooseCourse('custom-fixture');custom.count='1';custom.singleMode='flash';assert.equal(custom.start(),'started');assert.equal(custom.current!.id,'custom-fixture-w003')
})
test('损坏的顺延数据被单独保护，正式档案仍可用；非法偏移不能创建或恢复',async()=>{
 reset();const custom=useCustomPracticeStore(),profile=useProfileStore();custom.openConfig();custom.count='1'
 assert.equal(custom.start(),'started');finishStore(custom);const before=protectedFields(profile.db),broken=JSON.parse(JSON.stringify(profile.db));broken.customPracticeCursors[0].nextOffset=-1;storage.set('wordpal.database.v2',JSON.stringify(broken));setActivePinia(createPinia());const restored=useProfileStore();assert.equal(restored.readOnly,false);assert.equal(protectedFields(restored.db),before);assert.deepEqual(restored.db.customPracticeCursors,[]);assert.equal(JSON.parse(storage.get(CUSTOM_RECOVERY_KEY)!).customPracticeCursors[0].nextOffset,-1)
 for(const offset of [-1,1.5,999])assert.throws(()=>createCustomPractice({courseId:'starter',scope:wholeBook(),count:1,modes:['flash'],sound:true,offset}))
 const s=JSON.parse(JSON.stringify(restored.db.customPractice));s.sequenceStart=999;assert(customResumeProblem(s));s.sequenceStart=-1;assert(!validCustomPractice(s));assert(!validCustomPracticeCursors([{}]))
})

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
test('连接按最多4词分组且覆盖113词，稳定打散词义列，重复词义分开处理',()=>{
 const {session,db}=make(113,['connect']),seen:string[]=[],batches=new Map<string,string[]>()
 while(session.status==='running'){
  const group=customMatchGroup(session);assert(group.wordIds.length<=4);assert(group.wordIds.includes(session.wordIds[session.index]));batches.set(group.wordIds.join(','),group.wordIds);assert.deepEqual(customMatchGroup(session).choices.map(word=>word.id),group.choices.map(word=>word.id));seen.push(session.wordIds[session.index]);answer(db)
 }
 assert.equal(batches.size,29);assert.deepEqual(seen,session.wordIds);assert.equal(new Set(seen).size,113)
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
for(const [level,count] of [[1,5],[2,5],[3,10],[4,15],[5,20]] as const)test(`L${level} 113词完成/结束后默认回到${count}，六环节完成后正式计划与多教材记录不变`,async()=>{
 reset();const profile=useProfileStore();profile.transact(db=>{db.abilityLevel=`L${level}`});const learning=useLearningStore();assert(learning.start());finishDaily(learning);const custom=useCustomPracticeStore();await installTextCourse(customCourse());const before=protectedFields(profile.db),daily=JSON.stringify(profile.db.courseProgress!.starter.dailyPlan)
 assert(custom.openConfig());custom.chooseCourse('custom-fixture');assert.equal(Number(custom.count),count);custom.count='113';custom.continuous=true;assert.equal(custom.start(),'started');assert(custom.resume())
 assert.equal(protectedFields(profile.db),before);assert.equal(JSON.stringify(profile.db.courseProgress!.starter.dailyPlan),daily);assert(custom.pause());assert(custom.resume());assert(custom.end());assert.equal(protectedFields(profile.db),before);assert(custom.openConfig());assert.equal(Number(custom.count),count)
 custom.chooseCourse('custom-fixture');custom.count='113';custom.continuous=true;assert.equal(custom.start(),'started');assert(custom.resume());assert(profile.transact(db=>{while(db.customPractice?.status==='running')answer(db)}));assert.equal(custom.session!.status,'completed');assert.equal(protectedFields(profile.db),before);assert.equal(JSON.stringify(profile.db.courseProgress!.starter.dailyPlan),daily);assert(custom.openConfig());assert.equal(Number(custom.count),count)
})
test('空间不足时会话不假前进，强制中断后用冻结快照恢复，不改正式状态',()=>{
 reset();const profile=useProfileStore(),custom=useCustomPracticeStore();assert(custom.openConfig());assert.equal(custom.start(),'started');const initial=JSON.stringify(profile.db);fail=true;assert(!custom.patch({revealed:true}));assert.equal(JSON.stringify(profile.db),initial);assert(!custom.pause());fail=false;assert(custom.patch({revealed:true}));assert(custom.submit(3));const oldId=custom.session!.id;setActivePinia(createPinia());const restored=useCustomPracticeStore();assert(restored.recoverable);assert.equal(restored.session!.id,oldId);assert(restored.resume());assert(restored.next());assert.equal(restored.session!.index,1)
})
test('损坏的custom断点先单独备份隔离，正式档案与日计划仍可使用',()=>{
 reset();const profile=useProfileStore(),learning=useLearningStore(),custom=useCustomPracticeStore();assert(custom.openConfig());assert.equal(custom.start(),'started');assert(custom.leave());assert(learning.start());const before=protectedFields(profile.db),broken=JSON.parse(JSON.stringify(profile.db));broken.customPractice.index=999;storage.set('wordpal.database.v2',JSON.stringify(broken));setActivePinia(createPinia());const restored=useProfileStore();assert.equal(restored.readOnly,false);assert.equal(restored.db.customPractice,null);assert.equal(protectedFields(restored.db),before);assert(storage.has(CUSTOM_RECOVERY_KEY));assert.equal(JSON.parse(storage.get(CUSTOM_RECOVERY_KEY)!).customPractice.index,999)
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
