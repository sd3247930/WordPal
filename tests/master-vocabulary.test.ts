import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import Ajv from 'ajv'
import {createPinia,setActivePinia} from 'pinia'
import {normalizePrimaryCsv} from '../tools/master-vocabulary/normalize'
import {validateCourse,entryWord,type CoursePack} from '../packages/content_schema/course'
import schema from '../packages/content_schema/course.schema.json'
import {configureLocalCourses,loadCourseRegistry,courseRegistry,archiveStatus,wordById,getCourseWord,resolveFrozenWord} from '../packages/content_schema/registry'
import {useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useLearningStore} from '../src/stores/learning'
import {useReviewStore} from '../src/stores/review'
import {useActivitiesStore} from '../src/stores/activities'
import {setArchived,exportCourse,clearInstalledCourses,installTextCourse} from '../src/services/content/StorageRepository'
import {newCard} from '../packages/srs_fsrs'
import {sha256} from '../src/services/content/digest'
import {readZip} from '../src/services/course-import/ZipImporter'
const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value),removeStorageSync:(key:string)=>storage.delete(key)}
const header='edition,grade,term,unit id,unit name,sn,english,chinese,phonetic\n'
const sample=header+'1,3,1,1,Animals,1,cat,猫,/kæt/\n1,3,1,1,Animals,2,dog,狗\n1,3,1,1,Animals,3,fish,鱼,/,fɪʃ/\n1,4,2,2,Pets,1,cat,猫,/kæt/\n'
function reset(packs:CoursePack[]=[]){storage.clear();configureLocalCourses(packs);setActivePinia(createPinia());loadCourseRegistry()}
const fixture=()=>normalizePrimaryCsv(sample,'pinned-test-revision').courses
test('主 CSV 规范化保留音标逗号和缺项；词义 ID 跨册与行重排稳定，不猜教材起点',()=>{
 reset();const a=normalizePrimaryCsv(sample,'r1'),b=normalizePrimaryCsv(header+sample.slice(header.length).trim().split('\n').reverse().join('\n'),'r1')
 assert.equal(a.audit.sourceRows,4);assert.equal(a.audit.repairs.length,2);assert.equal(a.courses.length,2)
 const first=a.courses[0],cat=first.vocabulary[0];assert.equal(cat.id,a.courses[1].vocabulary[0].id);assert.equal(cat.id,b.courses.find(c=>c.courseId===first.courseId)!.vocabulary.find(w=>w.lemma==='cat')!.id)
 assert.equal(first.startGrade,null);assert.equal(first.editionYear,null);assert.equal(first.abilityLevels[0],'L2');assert.equal(first.vocabulary[1].ipa,'');assert.equal(first.vocabulary[2].ipa,'/,fɪʃ/')
 assert.equal(first.units[0].order,1);assert.equal(first.units[0].lessons[0].wordIds.length,3);assert.equal(validateCourse(first).length,0);assert.ok(validateCourse(first,{publicUse:true}).length)
 assert.throws(()=>normalizePrimaryCsv(header+'1,3,1,1,Animals,1,cat','r1'));assert.throws(()=>normalizePrimaryCsv(header+'1,9,1,1,Animals,1,cat,猫,/kæt/','r1'))
})
test('教材系列与资源扩展通过双重契约；缺起点可标记，冲突年级和非法扩展阻断',()=>{
 reset();const p=fixture()[0];p.vocabulary[0].phoneticUS='/kæt/';p.vocabulary[0].audioUS='/static/audio/cat.wav';p.vocabulary[0].examples=[{en:'A cat sits.',zh:'一只猫坐着。'}];p.vocabulary[0].tags=['self-authored']
 const ajv=new Ajv({strict:false});assert.equal(ajv.validate(schema,p),true);assert.deepEqual(validateCourse(p),[]);const w=entryWord(p.vocabulary[0],p);assert.equal(w.audio,'/static/audio/cat.wav');assert.equal(w.examples?.[0].zh,'一只猫坐着。')
 for(const change of [{startGrade:2},{startGrade:3,grade:2},{editionYear:1800},{edition:undefined,editionYear:null}])assert.ok(validateCourse({...p,...change}).length)
 p.vocabulary[0].examples=[{en:'',zh:'缺文字'}];assert.ok(validateCourse(p).length)
 const q=fixture()[0];q.vocabulary[0].ipa='/hi:/';assert.equal(validateCourse(q).length,0);q.vocabulary[0].example=String.fromCharCode(67,58,47);assert.ok(validateCourse(q).some(i=>i.field==='safety'));q.vocabulary[0].example=String.fromCharCode(67,58,47)+'local/file';assert.ok(validateCourse(q).some(i=>i.field==='safety'))
})
test('本机目录冷启动、归档、清空导入保持词库，跨册同义词只保留一张 FSRS 卡',async()=>{
 const packs=fixture();reset(packs);const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore(),id=packs[0].vocabulary[0].id
 course.choose(packs[0].courseId);learning.start();learning.reveal();learning.submit(3);assert.equal(profile.db.cards[id].reps,1);const saved=JSON.stringify(profile.db.cards[id]);course.choose(packs[1].courseId);assert.equal(profile.db.pendingCourseId,packs[1].courseId)
 profile.transact(d=>{d.session!.completedAt=new Date().toISOString()});course.applyPending();assert.equal(learning.newWords.includes(id),false);assert.equal(JSON.stringify(profile.db.cards[id]),saved)
 setArchived(packs[0].courseId,true);loadCourseRegistry();assert.ok(wordById[id]);assert.equal(useReviewStore().due.filter(w=>w.wordId===id).length,0);await clearInstalledCourses();loadCourseRegistry();assert.ok(courseRegistry[packs[0].courseId]);assert.equal(!!archiveStatus[packs[0].courseId],false);await assert.rejects(exportCourse(packs[0].courseId),/本机/);await assert.rejects(installTextCourse(packs[0]),/内置/)
})
test('连胜与闪电独立记录不改变 FSRS、奖励或级别建议，限时恢复暂停且超时只记一次',()=>{
 reset();const profile=useProfileStore(),activity=useActivitiesStore(),before=JSON.stringify(profile.db)
 assert.equal(activity.start('challenge'),true);for(let i=0;i<activity.total;i++){activity.select(activity.current!.id);assert.equal(activity.submit(),true);assert.equal(activity.submit(),false);activity.next()}
 assert.equal(profile.db.auxiliaryRecords?.length,1);assert.equal(profile.db.auxiliaryRecords![0].objective,false);const after={...profile.db,auxiliaryRecords:[]};assert.equal(JSON.stringify(after),before)
 activity.close();activity.start('speed');assert.equal(activity.submit(),false);activity.resumeTimer(1000);activity.pauseTimer(4000);assert.equal(activity.remainingMs(100000),12000);activity.resumeTimer(100000);activity.pauseTimer(101000);assert.equal(activity.remainingMs(),11000)
 setActivePinia(createPinia());const restored=useActivitiesStore();assert.equal(restored.state?.timer?.runningSince,null);assert.equal(restored.remainingMs(),11000);restored.resumeTimer(200000);assert.equal(restored.expireTimer(211000),true);assert.equal(restored.expireTimer(211001),false);assert.equal(restored.state?.answers.length,1);restored.next();assert.equal(restored.remainingMs(),15000);assert.equal(restored.state?.timer?.runningSince,null)
})
const local=(JSON.parse(readFileSync('src/content/local-courses/catalog.json','utf8')) as CoursePack[]).filter(pack=>pack.sources.some(source=>source.id==='community-index'))
test('本机实际901行/12册/72单元/210课节全量资源与 ZIP 摘要验证，旧输入保持且到期优先',{skip:!local.length},()=>{
 reset(local);const audit=JSON.parse(readFileSync('private/master-vocabulary/import-audit.json','utf8'))
 assert.equal(audit.sourceRows,901);assert.equal(local.length,12);assert.equal(local.flatMap(c=>c.units).length,72);assert.equal(local.flatMap(c=>c.units.flatMap(u=>u.lessons)).length,210);assert.equal(new Set(local.flatMap(c=>c.vocabulary.map(w=>w.id))).size,795)
 for(const c of local){assert.equal(new Ajv({strict:false}).validate(schema,c),true);assert.equal(validateCourse(c).length,0);assert.equal(c.startGrade,null);assert.equal(c.editionYear,null);readZip(new Uint8Array(readFileSync('private/master-vocabulary/courses/'+c.courseId+'.zip')));for(const entry of c.vocabulary){const word=getCourseWord(c.courseId,entry.id);assert.ok(word.audio);const bytes=new Uint8Array(readFileSync('src'+word.audio)),asset=c.assets.find(a=>a.id===entry.assetRefs?.audio)!;assert.equal(sha256(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes)}}
 const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore();course.choose(local[4].courseId);profile.transact(d=>{d.cards.cat=newCard('cat',new Date(Date.now()-86400000))});learning.start();assert.equal(learning.session?.kind,'review_due');assert.ok(learning.session?.wordIds.includes('cat'));learning.patch({input:'ca'});const snapshot=JSON.stringify(learning.session);loadCourseRegistry();assert.equal(JSON.stringify(learning.session),snapshot);assert.ok(resolveFrozenWord(learning.session?.wordSnapshot?.cat,learning.session?.courseId,learning.session?.contentVersion)?.audio)
})
