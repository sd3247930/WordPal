import {startLegacyRound} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import Ajv from 'ajv'
import {createPinia,setActivePinia} from 'pinia'
import {zipSync,strToU8} from 'fflate'
import original from '../src/content/courses/original-primary.json'
import schema from '../packages/content_schema/course.schema.json'
import {validateCourse,availableModes,type CoursePack} from '../packages/content_schema/course'
import {sha256} from '../src/services/content/digest'
import {previewImport,defaultImportMetadata,parseCsv} from '../src/services/course-import/ImportWizard'
import {installTextCourse,installMediaCourse,CATALOG_KEY,setArchived,rollbackCourse,clearInstalledCourses} from '../src/services/content/StorageRepository'
import {courseRegistry,wordById,registerCourse,loadCourseRegistry,resolveFrozenWord} from '../src/services/content/ContentRegistry'
import {assertPublicMedia} from '../src/services/course-import/PublicMediaAudit'
import {loadDatabase,V1_KEY,V2_KEY,POINTER_KEY,convertV1} from '../src/services/storage/MigrationV1toV2'
import {makeLearningBackup,previewLearningBackup} from '../src/services/storage/LearningBackup'
import {freshDatabase,useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useActivitiesStore} from '../src/stores/activities'
import {useLearningStore} from '../src/stores/learning'
import {useWordbookStore} from '../src/stores/wordbook'
import {newCard} from '../packages/srs_fsrs'
import {readZip,makeZip} from '../src/services/course-import/ZipImporter'
const storage=new Map<string,string>();let failKey='',corruptKey=''
;(globalThis as any).uni={getStorageSync:(key:string)=>key===corruptKey?'broken':storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(key===failKey)throw new Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function reset(){storage.clear();failKey='';corruptKey='';setActivePinia(createPinia());loadCourseRegistry()}
function pack(id='course-test'):CoursePack{return {schemaVersion:2,courseId:id,contentVersion:'1.0.0',title:'自编动物课',route:'theme',abilityLevels:['L1'],sources:[{id:'local-source',type:'user-provided',rightsStatus:'private-use-declared',attribution:'家长自编本机课程',revision:'r1'}],vocabulary:['cat','dog','bird','fish','sun'].map(id=>({id,language:'en',lemma:wordById[id].word,meaning:wordById[id].meaning,pos:wordById[id].pos,sourceId:'local-source',example:wordById[id].example})),units:[{id:'u01',title:'动物朋友',lessons:[{id:'l01',title:'小小动物课',wordIds:['cat','dog','bird','fish','sun']},{id:'l02',title:'再见朋友',wordIds:['cat','dog']}]}],assets:[]}}
test('原创试点120唯一词/6单元/24课/6故事通过Schema和引用校验，摘要与标准SHA256一致',()=>{
 reset();assert.equal(new Ajv({strict:false}).validate(schema,original),true);assert.deepEqual(validateCourse(original,{publicUse:true}),[]);assert.equal(original.vocabulary.length,120);assert.equal(new Set(original.vocabulary.map(w=>w.id)).size,120);assert.equal(original.units.length,6);assert.equal(original.units.flatMap(u=>u.lessons).length,24);assert.equal(original.stories.length,6)
 for(const text of ['abc','小学英语',''])assert.equal(sha256(text),createHash('sha256').update(text).digest('hex'))
})
test('CSV BOM/引号/逗号/换行可清洗去重，受控Markdown与CSV/JSON保持课节关系',()=>{
 reset();const meta={...defaultImportMetadata(),courseId:'test-text',declared:true},csv='\uFEFFunit_id,lesson_id,word,meaning,pos,example\nu01,l01,cat,猫,n.,"A cat, on a mat.\nIt sits."\nu01,l01,cat,猫,n.,A cat.\nu01,l01,dog,狗,n.,A dog.'
 const p=previewImport(csv,'csv',meta,wordById);assert.equal(p.duplicates,1);assert.equal(p.pack?.vocabulary.length,2);assert.equal(p.issues.length,0);assert.ok(p.pack?.vocabulary[0].example?.includes('\n'));assert.equal(Object.keys(p.reuse).length,2)
 const md='|word|meaning|pos|\n|---|---|---|\n|cat|猫|n.|\n|dog|狗|n.|',a=previewImport(md,'markdown',meta,{}),b=previewImport('word,meaning,pos\ncat,猫,n.\ndog,狗,n.','csv',meta,{})
 assert.deepEqual(a.pack?.units,b.pack?.units);assert.deepEqual(previewImport(JSON.stringify(a.pack),'json',meta,{}).pack?.units,a.pack?.units);assert.throws(()=>parseCsv('word,meaning\n"cat,猫'))
})
test('格式错乱、越界引用、危险内容、绝对路径和不完整教材都阻断；不猜测缺失资源',()=>{
 reset();for(const invalid of [{...pack(),units:{}},{...pack(),stories:[null]},{...pack(),vocabulary:[{id:'bad',language:'en',lemma:'a',meaning:'一',sourceId:'local-source',phonics:4}]}])assert.ok(validateCourse(invalid).length)
 const bad=pack();bad.units[0].lessons[0].wordIds=['missing'];assert.ok(validateCourse(bad).length);bad.vocabulary[0].audio='/static/../x.wav';assert.ok(validateCourse(bad).some(i=>i.field==='media'))
 bad.vocabulary[0].example=String.fromCharCode(67,58,47)+'local/course';assert.ok(validateCourse(bad).some(i=>i.field==='safety'))
 const incomplete={...pack(),route:'textbook' as const};assert.ok(validateCourse(incomplete).some(i=>i.field==='textbook'))
 const word={...wordById.cat,audio:'',phonics:[],phonemes:[]};assert.deepEqual(availableModes(word,[word]),['flash','spell']);assert.equal(availableModes(wordById.cat,[wordById.cat,wordById.dog],false).includes('listen'),false)
 const conflicting=pack();conflicting.vocabulary[0].pos='v.';assert.ok(previewImport(JSON.stringify(conflicting),'json',{...defaultImportMetadata(),declared:true},wordById).issues.some(i=>i.field==='id'))
})
test('迁移逐字段保留词卡/历史/奖励/成长/正式输入，三阶段写入失败均继续使用v1',()=>{
 reset();const old=freshDatabase();old.cards.cat={...newCard('cat',new Date('2000-01-01')),last_review:'1999-12-30T00:00:00.000Z'};old.history=[{id:'saved-answer',wordId:'cat',rating:3,correct:true,at:'1999-12-30T00:00:00.000Z',source:'new_word',mode:'spell',input:'cat'}];old.pets.fire.exp=20;old.gems=17;old.rewardIds=['public-example'];old.session={id:'old-session',startedAt:'2026-01-01',date:'2026-01-01',kind:'new_word',wordIds:['cat','dog'],index:1,mode:'spell',input:'do',selected:'',revealed:false,answers:[]};old.lessonIndex=2
 const migrated=convertV1(old);for(const field of ['cards','history','rewardIds','pets','gems','streakDates','dailyLimit'] as const)assert.deepEqual(migrated[field],old[field]);assert.equal(migrated.session?.input,'do');assert.equal(migrated.courseProgress?.starter.currentLessonId,'lesson-3')
 for(const key of ['wordpal.migration.backup.v1',V2_KEY,POINTER_KEY]){reset();storage.set(V1_KEY,JSON.stringify(old));failKey=key;const result=loadDatabase(freshDatabase);assert.equal(result.key,V1_KEY);assert.deepEqual(result.database,old);assert.equal(storage.has(POINTER_KEY),false)}
 reset();storage.set(V1_KEY,JSON.stringify(old));loadDatabase(freshDatabase);storage.set(V2_KEY,'damaged');const result=loadDatabase(freshDatabase);assert.equal(result.readOnly,true);assert.equal(result.key,V2_KEY);assert.equal(storage.get(V2_KEY),'damaged')
})
test('课程候选或目录失败不安装；ID冲突不会部分修改注册表；反复安装同一版本幂等',async()=>{
 reset();const p=pack('transaction-course'),before=JSON.stringify(wordById.cat);failKey=CATALOG_KEY;await assert.rejects(installTextCourse(p));assert.equal(courseRegistry[p.courseId],undefined);assert.equal(JSON.stringify(wordById.cat),before)
 assert.equal(storage.has('wordpal.content.pack.'+p.courseId+'.'+sha256(JSON.stringify(p)).slice(0,16)),false)
 failKey='';const key=await installTextCourse(p);assert.equal(await installTextCourse(p),key);assert.equal(JSON.parse(storage.get(CATALOG_KEY)!).length,1)
 const conflict=pack('collision-course');conflict.vocabulary[0].meaning='另外词义';assert.throws(()=>registerCourse(conflict));assert.equal(courseRegistry[conflict.courseId],undefined);assert.equal(JSON.stringify(wordById.cat),before)
 const readback=pack('readback-course');corruptKey='wordpal.content.pack.'+readback.courseId+'.'+sha256(JSON.stringify(readback)).slice(0,16);await assert.rejects(installTextCourse(readback));assert.equal(courseRegistry[readback.courseId],undefined)
})
test('全部复用与部分复用课节检查使用完整分母，80%独立推进，不改FSRS历史或奖励',async()=>{
 reset();const profile=useProfileStore(),course=useCourseStore(),activities=useActivitiesStore();await installTextCourse(pack('reuse-course'));course.choose('reuse-course')
 profile.transact(d=>{for(const id of course.lesson.wordIds)d.cards[id]=newCard(id,new Date(Date.now()+86400000))})
 const before=JSON.stringify({cards:profile.db.cards,history:profile.db.history,gems:profile.db.gems,pets:profile.db.pets,rewardIds:profile.db.rewardIds})
 assert.equal(activities.start('check'),true);assert.equal(activities.total,5)
 for(let i=0;i<5;i++){activities.select(i<4?activities.current!.id:'wrong');assert.equal(activities.submit(),true);assert.equal(activities.submit(),false);activities.next()}
 assert.equal(course.progress.checkAccuracy.l01,.8);assert.ok(course.progress.completedLessons.includes('l01'));assert.equal(course.lesson.id,'l02');assert.equal(profile.db.auxiliaryRecords?.length,1);assert.equal(activities.record(),false)
 assert.equal(JSON.stringify({cards:profile.db.cards,history:profile.db.history,gems:profile.db.gems,pets:profile.db.pets,rewardIds:profile.db.rewardIds}),before)
 activities.close();course.chooseLesson('l01');profile.transact(d=>{delete d.cards.sun});assert.equal(activities.start('check'),false);assert.equal(useLearningStore().newWords.includes('sun'),false,'已完成教材章节的首轮进度不依赖全局卡片是否存在')
})
test('课程立即切换、相同局部课ID独立；活动跨重启恢复且更新/归档保留已学词',async()=>{
 reset();const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore();await installTextCourse(pack('one-course'));await installTextCourse(pack('two-course'));course.choose('one-course');startLegacyRound(learning);learning.setMode('spell');learning.patch({input:'ca'});const snapshot=JSON.stringify(learning.session)
 course.choose('two-course');assert.equal(course.currentId,'two-course');assert.equal(profile.db.pendingCourseId,undefined);assert.equal(JSON.stringify(profile.db.courseSessions?.['one-course']),snapshot)
 course.choose('one-course');assert.equal(profile.db.pendingCourseId,undefined);assert.equal(JSON.stringify(learning.session),snapshot);course.choose('two-course');setArchived('two-course',true);course.applyPending();assert.equal(profile.db.pendingCourseId,undefined);setArchived('two-course',false);course.choose('two-course')
 assert.equal(course.currentId,'two-course');assert.equal(course.progress.currentLessonId,'l01')
 const activities=useActivitiesStore();activities.start('letters');activities.input('ca');setActivePinia(createPinia());assert.equal(useActivitiesStore().state?.input,'ca')
 const update=pack('two-course');update.contentVersion='2.0.0';update.vocabulary=update.vocabulary.filter(w=>w.id!=='sun');update.units[0].lessons[0].wordIds=['cat','dog'];await installTextCourse(update);setArchived('two-course',true);loadCourseRegistry();assert.ok(wordById.sun);await rollbackCourse('two-course');assert.equal(courseRegistry['two-course'].contentVersion,'1.0.0')
})
test('ZIP路径/大小/摘要/文件签名与未知文件受控，媒体写入失败不会激活目录',async()=>{
 reset();const p=pack('zip-course'),audio=new Uint8Array(readFileSync('src/static/audio/cat.wav'));p.assets=[{id:'cat-audio',path:'audio/cat.wav',mediaType:'audio/wav',bytes:audio.length,sha256:sha256(audio),sourceId:'local-source',license:'本机使用声明'}];p.vocabulary[0].assetRefs={audio:'cat-audio'}
 const files={'audio/cat.wav':audio};assert.equal(readZip(makeZip(p,files)).pack.courseId,p.courseId)
 for(const name of ['../secret.txt','extra.js','extra.png'])assert.throws(()=>readZip(zipSync({'manifest.json':strToU8(JSON.stringify(p)),[name]:strToU8('x')})))
 const wrong=audio.slice();wrong[30]^=1;assert.throws(()=>readZip(makeZip(p,{'audio/cat.wav':wrong})));await assert.rejects(installTextCourse(p));await assert.rejects(installMediaCourse(p,files));assert.equal(courseRegistry[p.courseId],undefined)
})
test('备份摘要与引用校验，恢复切指针失败仍保留最新档案，成功恢复可继续正式队列',()=>{
 reset();const profile=useProfileStore(),learning=useLearningStore();startLegacyRound(learning);learning.setMode('spell');learning.patch({input:'ca'});const text=makeLearningBackup(profile.db),candidate=previewLearningBackup(text),before=JSON.stringify(profile.db)
 const altered=JSON.parse(text);altered.database.gems=123;assert.throws(()=>previewLearningBackup(JSON.stringify(altered)));failKey=POINTER_KEY;assert.equal(profile.restore(candidate),false);assert.equal(JSON.stringify(profile.db),before)
 failKey='';assert.equal(profile.restore(candidate),true);setActivePinia(createPinia());assert.equal(useLearningStore().session?.input,'ca');assert.equal(useProfileStore().db.version,2)
})
test('2000词课程检索分页数据准备不扫描每词全部历史，不出现重复唯一卡',async()=>{
 reset();const profile=useProfileStore(),book=useWordbookStore(),p=pack('large-course');p.vocabulary=Array.from({length:2000},(_,i)=>({id:'en-large-'+i,language:'en',lemma:'item'+i,meaning:'条目'+i,sourceId:'local-source',pos:'n.'}));p.units=[{id:'u01',title:'大词表',lessons:Array.from({length:400},(_,i)=>({id:'l'+i,title:'第'+i+'课',wordIds:p.vocabulary.slice(i*5,i*5+5).map(w=>w.id)}))}];await installTextCourse(p)
 const started=performance.now(),results=book.list('all','item199',{courseId:'large-course'});assert.equal(results.length,11);assert.ok(performance.now()-started<1500);assert.equal(Object.keys(profile.db.cards).length,0)
})

test('缺少列表、额外个人字段和资源类型错误以诊断返回，课程ID不会因CSV行重排改变',()=>{
 reset();assert.ok(validateCourse({}).length);const unexpected={...pack(),personalNote:'额外字段'};assert.ok(validateCourse(unexpected).some(i=>i.field==='course.personalNote'))
 const meta={...defaultImportMetadata(),declared:true},a=previewImport('word,meaning,pos\nquartz,石英,n.\ngrove,林地,n.','csv',meta,{}).pack!,b=previewImport('word,meaning,pos\ngrove,林地,n.\nquartz,石英,n.','csv',meta,{}).pack!
 assert.equal(a.vocabulary.find(w=>w.lemma==='quartz')!.id,b.vocabulary.find(w=>w.lemma==='quartz')!.id)
})

test('三个内容版本及归档在冷启动后保留旧词定义；内容版本不可覆盖，声明日期变化仍幂等',async()=>{
 reset();const p=pack('retained-course');p.vocabulary=[{id:'retained-quartz',language:'en',lemma:'quartz',meaning:'石英',pos:'n.',sourceId:'local-source'}];p.units=[{id:'u01',title:'自编课程',lessons:[{id:'l01',title:'旧版',wordIds:['retained-quartz']}]}];p.sources[0].declaredAt='2026-01-01';const first=await installTextCourse(p);p.sources[0].declaredAt='2026-01-02';assert.equal(await installTextCourse(p),first)
 p.units[0].lessons[0].title='新版';await assert.rejects(installTextCourse(p),/contentVersion/);p.units[0].lessons[0].title='旧版'
 for(const version of ['2.0.0','3.0.0']){p.contentVersion=version;p.vocabulary=[{id:'retained-grove',language:'en',lemma:'grove',meaning:'林地',pos:'n.',sourceId:'local-source'}];p.units[0].lessons[0].wordIds=['retained-grove'];await installTextCourse(p)}setArchived(p.courseId,true);loadCourseRegistry();assert.equal(wordById['retained-quartz'].meaning,'石英');assert.equal(courseRegistry[p.courseId].contentVersion,'3.0.0');await rollbackCourse(p.courseId);assert.equal(courseRegistry[p.courseId].contentVersion,'2.0.0')
 await clearInstalledCourses();assert.equal(JSON.parse(storage.get(CATALOG_KEY)!).length,0);assert.equal(storage.has(first),false)
})

test('冻结题面从指定旧版本重绑媒体句柄，当前版本更新不会替换输入或例句',()=>{
 reset();const p=pack('frozen-media'),audio=new Uint8Array(readFileSync('src/static/audio/cat.wav'));p.assets=[{id:'cat-audio',path:'audio/cat.wav',mediaType:'audio/wav',bytes:audio.length,sha256:sha256(audio),sourceId:'local-source',license:'本机声明'}];p.vocabulary[0].assetRefs={audio:'cat-audio'};registerCourse(p,()=> 'old-audio-handle');const frozen={...wordById.cat,audio:'expired-handle',example:'Original frozen example.'};registerCourse({...p,contentVersion:'2.0.0'},()=> 'new-audio-handle');const rebound=resolveFrozenWord(frozen,p.courseId,'1.0.0')!;assert.equal(rebound.audio,'old-audio-handle');assert.equal(rebound.example,frozen.example);assert.equal(frozen.audio,'expired-handle')
})

test('故事完整理解题和缺少目标词的句子填空不计入正式评分',async()=>{
 reset();const p=pack('story-course');p.units[0].lessons[0].storyId='story-one';p.stories=[{id:'story-one',title:'小故事',sentences:['The cat sits.'],targetWordIds:['cat'],questions:[{question:'谁坐着？',options:['猫','狗'],answer:0},{question:'猫在做什么？',options:['游泳','坐着'],answer:1}]}];for(const w of p.vocabulary)w.example='A different sentence.';await installTextCourse(p);const course=useCourseStore(),activities=useActivitiesStore(),profile=useProfileStore();course.choose(p.courseId);const before=JSON.stringify({cards:profile.db.cards,history:profile.db.history,gems:profile.db.gems,pets:profile.db.pets});assert.equal(activities.start('cloze'),false);assert.equal(activities.start('story'),true);assert.equal(activities.total,2);for(const answer of ['0','1']){activities.select(answer);activities.submit();activities.next()}assert.equal(profile.db.auxiliaryRecords![0].total,2);assert.equal(JSON.stringify({cards:profile.db.cards,history:profile.db.history,gems:profile.db.gems,pets:profile.db.pets}),before)
})

test('公开导出阻止PNG内容凭证和音频元数据，本机导入不因此删除私人资源',()=>{
 reset();const p=pack(),png=new Uint8Array(20);png.set([137,80,78,71,13,10,26,10]);png.set(strToU8('caBX'),12);p.assets=[{id:'picture',path:'image/cat.png',mediaType:'image/png',bytes:png.length,sha256:sha256(png),sourceId:'local-source',license:'示例许可'}];assert.throws(()=>assertPublicMedia(p,{'image/cat.png':png}),/元数据/);const audio=new Uint8Array(readFileSync('src/static/audio/cat.wav'));p.assets=[{...p.assets[0],id:'audio',path:'audio/cat.wav',mediaType:'audio/wav',bytes:audio.length,sha256:sha256(audio)}];assert.doesNotThrow(()=>assertPublicMedia(p,{'audio/cat.wav':audio}))
})
