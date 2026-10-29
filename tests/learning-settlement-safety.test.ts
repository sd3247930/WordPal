import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore,freshDatabase} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {useCourseStore} from '../src/stores/course'
import {loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {installTextCourse} from '../src/services/content/StorageRepository'
import {FSRSScheduler,newCard} from '../packages/srs_fsrs'
import type {CoursePack} from '../packages/content_schema/course'
import type {MemoryCard} from '../packages/core_learning'
import {answerDailyWord,finishDaily,hearQuestion} from './helpers/daily-flow'
import {validateDatabase,V2_KEY,POINTER_KEY} from '../src/services/storage/MigrationV1toV2'
import {makeLearningBackup,previewLearningBackup} from '../src/services/storage/LearningBackup'
import {selectFirstRecallData,selectHomeLearningData} from '../src/services/learning/StudyStats'
import {studyCapability} from '../packages/core_learning/study-capability'
import {applyLearningReward,feedPet} from '../packages/pet_engine'
import {executeHouseCommand} from '../src/services/pet-lifehouse/HouseCommands'
import type {HouseCommand,LifeHouseDomain} from '../src/services/pet-lifehouse/types'
import fs from 'node:fs'

const storage=new Map<string,string>();let failWrites=false,writeCount=0,onWrite:(()=>void)|undefined
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(failWrites)throw Error('Synthetic quota failure');onWrite?.();writeCount++;storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function reset(){storage.clear();failWrites=false;onWrite=undefined;loadCourseRegistry();setActivePinia(createPinia());const profile=useProfileStore();profile.transact(d=>{d.abilityLevel='L1'});writeCount=0;return {profile,learning:useLearningStore(),course:useCourseStore()}}
function pack(id:string,count=7):CoursePack{return {schemaVersion:2,courseId:id,contentVersion:'1.0.0',title:'合成安全测试教材',route:'theme',abilityLevels:['L1','L2','L3','L4','L5'],sources:[{id:'synthetic',type:'author-created',rightsStatus:'redistribution-approved',attribution:'合成测试',revision:'1'}],assets:[],vocabulary:Array.from({length:count},(_,i)=>({id:`safe-word-${i}`,language:'en',lemma:`sample${i}`,meaning:`测试释义${i}`,sourceId:'synthetic',order:i+1,audio:'/static/synthetic-voice.wav'})),units:[{id:'u1',title:'Unit 1',lessons:[{id:'l1',title:'测试课节',wordIds:Array.from({length:count},(_,i)=>`safe-word-${i}`)}]}]}}
function mature(id:string,now:Date):MemoryCard{return {...newCard(id,now),state:2,stability:20,difficulty:5,reps:5,lapses:0,elapsed_days:20,scheduled_days:20,last_review:new Date(+now-20*86400000).toISOString(),due:new Date(+now-1000).toISOString()}}
function finalStage(learning:ReturnType<typeof useLearningStore>){for(let i=0;learning.session?.flow?.step!=='consolidate'&&i<130;i++)answerDailyWord(learning);assert.equal(learning.session?.flow?.step,'consolidate');assert(learning.reveal())}

// 同一共享卡版本即使拥有不同作答 ID，也只能结算一次。
test('T01/T02：共享卡跨教材旧会话只能作为练习，不重复资产与排程',async()=>{
 const {profile,learning,course}=reset();await installTextCourse(pack('safe-a'));await installTextCourse(pack('safe-b'))
 const id='safe-word-0';profile.transact(d=>{d.cards[id]=mature(id,new Date())})
 assert(course.choose('safe-a').ok);assert(learning.startDue([id]));assert(course.choose('safe-b').ok);assert(learning.startDue([id]));learning.reveal();assert(learning.submit(3))
 const expected=JSON.stringify({card:profile.db.cards[id],pets:profile.db.pets,gems:profile.db.gems,rewards:profile.db.rewardIds,history:profile.db.history})
 assert(course.choose('safe-a').ok);learning.reveal();assert(learning.submit(3))
 assert.equal(JSON.stringify({card:profile.db.cards[id],pets:profile.db.pets,gems:profile.db.gems,rewards:profile.db.rewardIds,history:profile.db.history}),expected)
 assert.equal(profile.db.practiceAnswers?.at(-1)?.source,'practice')
})

// 最终遗忘立即评估，教学重试不能把首次 Again 改成 Hard。
test('T06/T07：最终 Again 记录正式失败，成功重试只推进教学',()=>{
 const {profile,learning}=reset();const now=new Date(),id='cat',before=mature(id,now);profile.transact(d=>{d.cards[id]=before});assert(learning.start());finalStage(learning)
 learning.reveal();assert(learning.submit(1));assert.equal(profile.db.history.length,1);assert.equal(profile.db.history[0].rating,1);assert.equal(profile.db.history[0].correct,false)
 const answer=profile.db.history[0],expected=new FSRSScheduler().schedule(before,1,new Date(answer.at)).card;assert.deepEqual({...profile.db.cards[id]},expected)
 const assets=JSON.stringify({card:profile.db.cards[id],pets:profile.db.pets,gems:profile.db.gems,rewards:profile.db.rewardIds,history:profile.db.history})
 assert(learning.next());learning.reveal();assert(learning.submit(3));assert.equal(JSON.stringify({card:profile.db.cards[id],pets:profile.db.pets,gems:profile.db.gems,rewards:profile.db.rewardIds,history:profile.db.history}),assets)
 assert(learning.session!.flow!.completed.consolidate.includes(id))
})

// 不允许单选项教材假装完成连接，更不能默默跳过听音。
test('T10/T12：缺资源单词不会产生连接通过或完整学习',async()=>{
 const {profile,learning,course}=reset(),empty=pack('safe-empty',1);delete empty.vocabulary[0].audio;await installTextCourse(empty);assert(course.choose(empty.courseId).ok);assert(learning.start());answerDailyWord(learning)
 assert.equal(learning.session!.flow!.step,'connect');learning.patch({selected:learning.current!.id});assert.equal(learning.submit(),false);assert.deepEqual(learning.session!.flow!.completed.connect,[]);assert.equal(profile.db.history.length,0);assert.equal(learning.textbookProgress.learned,0)
})

// 钱包在所有共享事务中拒绝非法数值，不静默封顶或部分提交。
test('T21/T22：余额不安全整数与小数使整笔事务回退',()=>{
 const {profile}=reset();for(const balance of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){const before=JSON.stringify(profile.db);assert.equal(profile.transact(d=>{d.gems=balance;d.pets.water.exp+=12}),false);assert.equal(JSON.stringify(profile.db),before)}
})

// 无新批次但有到期时，统一开始入口应真实可用。
test('T15/T16：全书完成后统一开始转入到期复习，空队列不造计划',()=>{
 const {profile,learning,course}=reset();profile.transact(d=>{d.courseProgress!.starter.curriculumSchema=1;d.courseProgress!.starter.fullLearnedWords=Object.fromEntries(course.wordIds.map(id=>[id,new Date().toISOString()]));d.cards.cat=mature('cat',new Date())})
 assert.equal(learning.todayPlan,null);assert(learning.start());assert.equal(learning.session!.kind,'review_due');assert.equal(learning.session!.wordIds[0],'cat')
})

test('T02/T03：旧版本即使已再次到期也失效，新队列可当天真正重学',async context=>{
 context.mock.timers.enable({apis:['Date'],now:new Date('2040-01-01T08:00:00Z')})
 const {profile,learning,course}=reset();await installTextCourse(pack('same-a'));await installTextCourse(pack('same-b'))
 const id='safe-word-0';profile.transact(d=>{d.cards[id]=newCard(id,new Date())});assert(course.choose('same-a').ok);assert(learning.startDue([id]));const old=learning.session!.memoryVersions![id]
 assert(course.choose('same-b').ok);assert(learning.startDue([id]));learning.reveal();assert(learning.submit(1));assert(learning.next());const due=Date.parse(profile.db.cards[id].due)
 context.mock.timers.tick(due-Date.now()+1);assert(course.choose('same-a').ok);learning.reveal();assert(learning.submit(3));assert.equal(profile.db.history.length,1);assert.equal(profile.db.practiceAnswers!.at(-1)!.settlement,'stale_due');assert(learning.next())
 assert(learning.startDue([id]));assert.notEqual(learning.session!.memoryVersions![id],old);learning.reveal();assert(learning.submit(3));assert.equal(profile.db.history.length,2);assert.equal(profile.db.gems,2)
})

test('T04：写入重入、双击和两个同步排队回调只结算一次',async()=>{
 const {profile,learning}=reset();profile.transact(d=>{d.cards.cat=newCard('cat',new Date())});learning.startDue(['cat']);learning.reveal()
 let reentrant:unknown;onWrite=()=>{onWrite=undefined;reentrant=learning.submit(3)}
 assert(learning.submit(3));assert.equal(reentrant,false);assert.deepEqual(await Promise.all([Promise.resolve().then(()=>learning.submit(3)),Promise.resolve().then(()=>learning.submit(3))]),[false,false]);assert.equal(profile.db.history.length,1);assert.equal(profile.db.gems,2);assert.equal(profile.db.cards.cat.reps,1)
})

test('T05/T06：最终 Again 保存失败全回退，重试与冷启动不重复评估',()=>{
 let {profile,learning}=reset();learning.start();finalStage(learning);const before=JSON.stringify(profile.db),stored=JSON.stringify([...storage]);failWrites=true
 assert.equal(learning.submit(1),false);assert.equal(JSON.stringify(profile.db),before);assert.equal(JSON.stringify([...storage]),stored);failWrites=false;assert(learning.submit(1));assert.equal(learning.submit(1),false)
 assert.equal(profile.db.history[0].rating,1);assert.equal(profile.db.cards.cat.state,1);const expected=JSON.stringify([profile.db.cards,profile.db.history,profile.db.rewardIds,profile.db.gems,profile.db.pets])
 setActivePinia(createPinia());profile=useProfileStore();learning=useLearningStore();assert(learning.session!.flow!.assessments!.cat);assert(learning.next());learning.reveal();assert(learning.submit(4));assert(learning.next());assert.equal(JSON.stringify([profile.db.cards,profile.db.history,profile.db.rewardIds,profile.db.gems,profile.db.pets]),expected);assert(validateDatabase(profile.db))
})

test('T08：前五阶段错误不永久降级最终独立成功，原错误仍保留',()=>{
 const {profile,learning}=reset();learning.start();assert(learning.submit(1));assert(learning.next());answerDailyWord(learning);finalStage(learning);assert(learning.submit(4))
 assert.equal(profile.db.history[0].rating,4);assert.equal(profile.db.history[0].requestedRating,4);assert(profile.db.practiceAnswers!.some(answer=>answer.wordId==='cat'&&!answer.correct&&answer.step==='flash'))
})

for(const rating of [1,3,4] as const)test(`T09：最终助答自评 ${rating} 最高 Hard，Again 不升级且重试不多扣费`,()=>{
 const {profile,learning}=reset();learning.start();finalStage(learning);profile.transact(d=>{d.gems=3;d.courseProgress!.starter.dailyPlan!.hinted=true;d.courseProgress!.starter.dailyPlan!.hintKind='answer'})
 assert(learning.hint());assert.equal(profile.db.gems,3);assert(learning.submit(rating));assert.equal(profile.db.history[0].rating,rating===1?1:2);assert.equal(profile.db.history[0].hintKind,'answer')
})

test('T09：当前 flash 鼓励提示不机械降级；扣费失败与重复点击受保护',()=>{
 const {profile,learning}=reset();learning.start();finalStage(learning);profile.transact(d=>{d.gems=3});const before=JSON.stringify(profile.db);failWrites=true;assert.equal(learning.hint(),false);assert.equal(JSON.stringify(profile.db),before);failWrites=false
 assert(learning.hint());assert(learning.hint());assert.equal(profile.db.gems,2);assert.equal(learning.session!.hintKind,'encouragement');assert(learning.submit(4));assert.equal(profile.db.history[0].rating,4);assert.equal(profile.db.gems,4)
})

test('T10/T11：没有结束证据、播放错误和迟到事件均不能通过听音',()=>{
 const {profile,learning}=reset();learning.start();while(learning.session!.mode!=='listen')answerDailyWord(learning);learning.patch({selected:learning.current!.id});const before=JSON.stringify(profile.db)
 assert.equal(learning.submit(),false);assert.equal(JSON.stringify(profile.db),before)
 const key=learning.beginQuestionAudio(),url=learning.current!.audio,progress={requestId:1,url,positionMs:10,durationMs:100,waiting:false}
 assert(learning.observeQuestionAudio(key,{...progress,state:'playing'}));assert.equal(learning.submit(),false);assert(learning.observeQuestionAudio(key,{...progress,state:'error'}));assert.equal(learning.observeQuestionAudio(key,{...progress,state:'ended'}),false);assert.equal(learning.submit(),false)
 hearQuestion(learning);assert(learning.submit());assert(learning.next());assert.equal(learning.observeQuestionAudio(key,{...progress,state:'ended'}),false);assert.equal(profile.db.history.length,0)
})

test('T12：重复词形/同义干扰项不能充数，真实两个不同干扰项才可评估',()=>{
 const {learning}=reset();learning.start();const word=learning.current!,other={...word,id:'other',word:'other',meaning:'其他'},duplicate={...other,id:'duplicate',meaning:' 其他 '}
 assert.equal(studyCapability(word,'connect',[word,other,duplicate]).status,'unavailable');assert.equal(studyCapability(word,'listen',[word,other,{...other,id:'third',word:'third',meaning:'第三'}]).status,'ready')
})

test('T10/T13：补齐发音后恢复同一冻结计划，之前阶段、输入和分母不丢失',async()=>{
 const {profile,learning,course}=reset(),missing=pack('repair-resources');for(const entry of missing.vocabulary)delete entry.audio
 await installTextCourse(missing);course.choose(missing.courseId);learning.start();while(learning.session!.mode!=='listen')answerDailyWord(learning)
 const id=learning.session!.id,completed=JSON.stringify(learning.session!.flow!.completed),ids=[...learning.session!.wordIds];assert.equal(learning.capability.status,'unavailable');learning.patch({selected:learning.current!.id});assert.equal(learning.submit(),false)
 const repaired=pack(missing.courseId);repaired.contentVersion='1.0.1';await installTextCourse(repaired);assert(learning.refreshResources());assert.equal(learning.session!.id,id);assert.equal(learning.session!.resourceVersion,'1.0.1');assert.equal(JSON.stringify(learning.session!.flow!.completed),completed);assert.deepEqual(learning.session!.wordIds,ids);assert.equal(learning.capability.status,'ready');assert.equal(learning.session!.selected,learning.current!.id)
 finishDaily(learning);assert.equal(learning.textbookProgress.learned,5);assert.equal(profile.db.history.length,5);assert(validateDatabase(profile.db))
})

test('T16：全书完成且无到期保持完成态，不创建空计划或新会话',()=>{
 const {profile,learning,course}=reset();profile.transact(d=>{d.courseProgress!.starter.curriculumSchema=1;d.courseProgress!.starter.fullLearnedWords=Object.fromEntries(course.wordIds.map(id=>[id,new Date().toISOString()]))})
 const before=JSON.stringify(profile.db);assert.equal(learning.start(),false);assert.equal(learning.session,null);assert.equal(JSON.stringify(profile.db),before)
})

test('T17：最终评估跨教材/跨午夜/备份恢复后仅教学重试，旧无版本会话保守练习',async context=>{
 context.mock.timers.enable({apis:['Date'],now:new Date('2040-01-01T08:00:00Z')});let {profile,learning,course}=reset();learning.start();finalStage(learning);learning.submit(1);const ids=[...learning.session!.wordIds],assets=JSON.stringify([profile.db.history,profile.db.gems,profile.db.pets,profile.db.cards,profile.db.rewardIds]);assert(validateDatabase(previewLearningBackup(makeLearningBackup(profile.db))))
 await installTextCourse(pack('resume-b'));course.choose('resume-b');context.mock.timers.tick(86400000);course.choose('starter');setActivePinia(createPinia());profile=useProfileStore();learning=useLearningStore();assert.deepEqual(learning.session!.wordIds,ids);learning.next();learning.submit(3);assert.equal(JSON.stringify([profile.db.history,profile.db.gems,profile.db.pets,profile.db.cards,profile.db.rewardIds]),assets)
 profile.transact(d=>{d.courseProgress!.starter.studyActivity='independent';d.session={id:'old-session',courseId:'starter',kind:'review_due',startedAt:new Date().toISOString(),date:'2040-01-02',wordIds:['cat'],index:0,mode:'flash',input:'',selected:'',revealed:true,answers:[]}});assert(learning.submit(3));assert.equal(profile.db.practiceAnswers!.at(-1)!.settlement,'legacy_session');assert.equal(JSON.stringify([profile.db.history,profile.db.gems,profile.db.pets,profile.db.cards,profile.db.rewardIds]),assets)
})

test('T18/T19：5 次正式事件奖励一次，2 词末批只获得真实词奖励',()=>{
 const {profile,learning}=reset();learning.start();finishDaily(learning);assert.equal(profile.db.history.length,5);assert.equal(profile.db.gems,11);assert.equal(profile.db.pets.water.exp,70);assert.equal(profile.db.rewardIds.filter(id=>id.startsWith('daily-task:')).length,1)
 for(const answer of profile.db.history)applyLearningReward(profile.db,answer);assert.equal(profile.db.gems,11)
 const db=freshDatabase();for(let i=0;i<5;i++){const answer={id:'wrong-'+i,wordId:'cat',rating:1 as const,correct:false,at:new Date().toISOString(),source:'review_due' as const,mode:'flash' as const,input:''};db.history.push(answer);applyLearningReward(db,answer)}assert.equal(db.gems,1);assert.equal(db.pets.water.exp,30)
})

test('T19：仅剩两词时保持四组真实分母，不伪造第五事件奖励',()=>{
 const {profile,learning,course}=reset();profile.transact(d=>{d.courseProgress!.starter.curriculumSchema=1;d.courseProgress!.starter.fullLearnedWords=Object.fromEntries(course.wordIds.slice(0,-2).map(id=>[id,new Date().toISOString()]))});learning.start();assert(learning.tasks.every(task=>task.total===2));finishDaily(learning);assert.equal(profile.db.history.length,2);assert.equal(profile.db.gems,4);assert(!profile.db.rewardIds.some(id=>id.startsWith('daily-task:')))
})

test('T20：普通练习/浏览/重播不修改卡、正式历史或资产',()=>{
 const {profile,learning}=reset();learning.start();finishDaily(learning);const before=JSON.stringify([profile.db.cards,profile.db.history,profile.db.gems,profile.db.pets,profile.db.rewardIds]);assert(learning.startPractice());learning.reveal();assert(learning.submit(3));assert.equal(JSON.stringify([profile.db.cards,profile.db.history,profile.db.gems,profile.db.pets,profile.db.rewardIds]),before)
})

test('T21/T22：学习奖励溢出拒绝整笔交易，非法旧档只读保护原文',()=>{
 let {profile,learning}=reset();profile.transact(d=>{d.gems=Number.MAX_SAFE_INTEGER;d.cards.cat=newCard('cat',new Date())});learning.startDue(['cat']);learning.reveal();const before=JSON.stringify(profile.db);assert.equal(learning.submit(3),false);assert.equal(JSON.stringify(profile.db),before)
 const corrupt={...profile.db,gems:0.5},raw=JSON.stringify(corrupt);storage.set(V2_KEY,raw);storage.set(POINTER_KEY,JSON.stringify('v2'));setActivePinia(createPinia());profile=useProfileStore();assert(profile.readOnly);assert.equal(storage.get(V2_KEY),raw);assert.equal(profile.transact(d=>{d.gems=0}),false)
})

test('T21：喂食/家园升级/家具购买退款共享安全整数钱包与原子边界',()=>{
 const {profile}=reset();profile.transact(d=>{d.gems=1000});const commands:Partial<HouseCommand>[]=[{kind:'upgrade',targetLevel:1},{kind:'place',furnitureId:'water-bed',slotId:'left'}]
 let serial=0;for(const command of commands){assert(profile.transact(d=>{const result=executeHouseCommand(d,{requestId:'safe-house-'+ ++serial,expectedRevision:(d.lifeHouse as LifeHouseDomain|undefined)?.revision??0,catalogVersion:1,element:'water',kind:'upgrade',...command},{at:new Date().toISOString()});assert(result.ok);d.gems=result.gems;d.lifeHouse=result.domain}))}
 const house=(profile.db.lifeHouse as LifeHouseDomain).housesByElement.water,owned=house.owned.find(item=>item.furnitureId==='water-bed')!;const refund:HouseCommand={requestId:'safe-return',expectedRevision:(profile.db.lifeHouse as LifeHouseDomain).revision,catalogVersion:1,element:'water',kind:'return',instanceId:owned.instanceId}
 assert(profile.transact(d=>{const result=executeHouseCommand(d,refund,{at:new Date().toISOString()});assert(result.ok);d.gems=result.gems;d.lifeHouse=result.domain}));assert.equal(profile.db.gems,660)
 assert(profile.transact(d=>{const result=feedPet(d.pets.water,d.gems);assert(result.success);d.pets.water=result.pet;d.gems=result.gems}));assert.equal(profile.db.gems,655);assert.equal(feedPet(profile.db.pets.water,0.5).success,false)
})

test('T23：正式正确率含 Again；首次无助答评估只统计新可信样本，旧记录不猜测',()=>{
 const {profile,learning,course}=reset();assert.deepEqual(selectFirstRecallData(profile.db),{accuracy:null,samples:0,scope:'global'});learning.start();finalStage(learning);learning.submit(1)
 assert.equal(selectHomeLearningData(profile.db,course.current)!.accuracy,0);assert.deepEqual(selectFirstRecallData(profile.db),{accuracy:0,samples:1,scope:'global'});learning.next();learning.submit(3);assert.equal(selectFirstRecallData(profile.db).samples,1)
 const old=freshDatabase();old.history=profile.db.history.map(({assessmentVersion,recallAttempt,...answer})=>answer);assert.deepEqual(selectFirstRecallData(old),{accuracy:null,samples:0,scope:'global'})
})

test('T24：合成大小档案每百次输入零次整库保存，flush/失败/重启保持草稿和奖励',()=>{
 const measurements=[]
 for(const size of [100,50000]){
  let {profile,learning}=reset();learning.start();while(learning.session!.mode!=='spell')answerDailyWord(learning)
  profile.transact(d=>{d.practiceAnswers=Array.from({length:size},(_,i)=>({id:'large-'+i,wordId:'cat',rating:3,correct:true,at:'2040-01-01T08:00:00Z',source:'practice',mode:'spell',input:'cat'}))})
  const bytes=Buffer.byteLength(JSON.stringify(profile.db)),writes=writeCount,start=performance.now();for(let i=0;i<100;i++)assert(learning.patch({input:'c'.repeat(i%20+1)}));const inputMs=performance.now()-start;assert.equal(writeCount,writes)
  const flushStart=performance.now();assert(learning.flushDraft());const flushMs=performance.now()-flushStart;assert.equal(writeCount,writes+1);const assets=JSON.stringify([profile.db.history,profile.db.rewardIds,profile.db.gems,profile.db.pets,profile.db.cards]),saved=JSON.stringify(profile.db)
  learning.patch({input:'cat'});failWrites=true;assert.equal(learning.flushDraft(),false);assert.equal(JSON.stringify(profile.db),saved);assert.equal(learning.session!.input,'cat');failWrites=false;assert(learning.flushDraft())
  setActivePinia(createPinia());profile=useProfileStore();learning=useLearningStore();assert.equal(learning.session!.input,'cat');assert.equal(JSON.stringify([profile.db.history,profile.db.rewardIds,profile.db.gems,profile.db.pets,profile.db.cards]),assets)
  measurements.push({records:size,bytes,inputUpdates:100,inputTotalMs:Math.round(inputMs*100)/100,inputFullWrites:0,flushMs:Math.round(flushMs*100)/100,flushFullWrites:1})
 }
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/learning-safety-performance.json',JSON.stringify({environment:'desktop Node; synthetic data; not a mobile benchmark',node:process.version,platform:process.platform,measurements},null,2))
})

test('旧新词无卡且无正式历史可证明首次评估；共享卡一经创建旧会话不再结算',()=>{
 const {profile,learning}=reset();learning.start();finalStage(learning);profile.transact(d=>{delete d.courseProgress!.starter.dailyPlan!.memoryVersions});assert(learning.submit(3));assert.equal(profile.db.history.length,1);assert.equal(profile.db.gems,2)
 profile.transact(d=>{d.courseProgress!.starter.studyActivity='independent';d.session={id:'legacy-new-other',courseId:'starter',kind:'new_word',startedAt:new Date().toISOString(),date:'2040-01-01',wordIds:['cat'],index:0,mode:'flash',input:'',selected:'',revealed:true,answers:[]}});assert(learning.submit(3));assert.equal(profile.db.history.length,1);assert.equal(profile.db.gems,2);assert.equal(profile.db.practiceAnswers!.at(-1)!.settlement,'legacy_session')
})

test('T10：空协议、无载荷及占位音频不能被静态能力检查当作有效资源',()=>{
 const {learning}=reset();learning.start();const word=learning.current!;for(const audio of ['', '/static/placeholder.wav','about:blank','file:','blob:','data:audio/wav;base64,','javascript:play()'])assert.equal(studyCapability({...word,audio},'dictation',[]).status,'unavailable',audio)
})
