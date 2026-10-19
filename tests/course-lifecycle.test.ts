import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useLearningStore} from '../src/stores/learning'
import {useWordbookStore} from '../src/stores/wordbook'
import {courseRegistry,configureLocalCourses,loadCourseRegistry,wordById,words,getCourseWord,getCourseLessons,getCourseWordIds,courseSnapshot,resolveFrozenWord,resolveCourseAsset,registerCourse,isCourseInstalled} from '../src/services/content/ContentRegistry'
import {isUserDeleted,deletedCourses,DELETED_COURSES_KEY} from '../packages/content_schema/course-lifecycle'
import {installTextCourse,uninstallCourseContent,hydrateMedia,retryCourseCleanup,rollbackCourse,exportCourse,CATALOG_KEY} from '../src/services/content/StorageRepository'
import {courseDirectory,loadDirectory,retainDescriptor,DIRECTORY_KEY} from '../src/services/content/CourseDirectory'
import {readManifest,readMedia,mediaUrl} from '../src/services/content/MediaRepository'
import {selectDailyPlan} from '../src/services/learning/DailyLearningPlan'
import {orderedCourseWords} from '../src/services/learning/CourseStudySequence'
import {REMOVAL_BACKUP_PREFIX} from '../src/services/content/CourseRemovalData'
import {V2_KEY} from '../src/services/storage/MigrationV1toV2'
import {newCard} from '../packages/srs_fsrs'
import {lifecyclePack} from './helpers/lifecycle-fixture'

const storage=new Map<string,string>();let fail=''
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(key===fail)throw Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key),getStorageInfoSync:()=>({keys:[...storage.keys()]})}
async function setup(){
 storage.clear();fail='';configureLocalCourses([]);loadCourseRegistry();loadDirectory();setActivePinia(createPinia())
 for(const id of ['lifecycle-a','lifecycle-b','lifecycle-d'])await installTextCourse(lifecyclePack(id))
 const profile=useProfileStore(),course=useCourseStore();course.choose('lifecycle-a')
 profile.transact(db=>{db.cards['lifecycle-shared']=newCard('lifecycle-shared',new Date('2000-01-01'));db.cards['lifecycle-b-word']=newCard('lifecycle-b-word',new Date('2000-01-01'));db.history=[{id:'b-shared',wordId:'lifecycle-shared',courseId:'lifecycle-b',correct:true,rating:3,at:new Date().toISOString(),source:'new_word',mode:'flash',input:''},{id:'a-shared',wordId:'lifecycle-shared',courseId:'lifecycle-a',correct:true,rating:3,at:new Date().toISOString(),source:'new_word',mode:'flash',input:''}];db.gems=27;db.rewardIds=['settled-reward'];db.pets.water.exp=32})
 storage.set('wordpal.wordbook.preferences.v1',JSON.stringify({favorites:['lifecycle-b-word','lifecycle-shared'],later:['lifecycle-b-word']}))
 return {profile,course,learning:useLearningStore()}
}

test('A/B/D：删除专属词、历史与缓存；共享卡、其他教材与全局奖励保持',async()=>{
 const {profile,course}=await setup(),shared=JSON.stringify(profile.db.cards['lifecycle-shared']),pets=JSON.stringify(profile.db.pets),a=JSON.stringify(profile.db.courseProgress?.['lifecycle-a'])
 const stale=lifecyclePack('lifecycle-b'),frozen=getCourseWord(stale.courseId,'lifecycle-b-word')!,key=JSON.parse(storage.get(CATALOG_KEY)!).find((entry:any)=>entry.courseId===stale.courseId).key
 const result=await course.uninstall(stale.courseId,true)
 assert.equal(result.pendingCleanup,0);assert(isUserDeleted(stale.courseId));assert.equal(courseRegistry[stale.courseId],undefined);assert(!storage.has(key));assert(storage.has(REMOVAL_BACKUP_PREFIX+stale.courseId))
 assert.equal(profile.db.cards['lifecycle-b-word'],undefined);assert.equal(wordById['lifecycle-b-word'],undefined);assert(!words.some(word=>word.id==='lifecycle-b-word'));assert.deepEqual(profile.db.history.map(answer=>answer.id),['a-shared'])
 assert.equal(JSON.stringify(profile.db.cards['lifecycle-shared']),shared);assert.equal(JSON.stringify(profile.db.pets),pets);assert.equal(profile.db.gems,27);assert.deepEqual(profile.db.rewardIds,['settled-reward']);assert.equal(JSON.stringify(profile.db.courseProgress?.['lifecycle-a']),a);assert(isCourseInstalled('lifecycle-d'))
 assert.equal(getCourseWord(stale.courseId,'lifecycle-shared'),undefined);assert.deepEqual(getCourseLessons(stale.courseId),[]);assert.deepEqual(getCourseWordIds(stale.courseId),[]);assert.equal(courseSnapshot(stale.courseId,stale.contentVersion),undefined);assert.equal(resolveFrozenWord(frozen,stale.courseId,stale.contentVersion),undefined);assert.equal(resolveCourseAsset(stale.courseId,'media'), '');assert.deepEqual(orderedCourseWords(stale),[]);assert.equal(selectDailyPlan(profile.db,stale),null)
 assert.throws(()=>registerCourse(stale),/删除/);await assert.rejects(readManifest(key),/删除/);await assert.rejects(readMedia(key,stale),/删除/);assert.equal(mediaUrl(key,'asset',stale),'');assert.equal(course.choose(stale.courseId).ok,false)
 await assert.rejects(rollbackCourse(stale.courseId),/删除/);await assert.rejects(exportCourse(stale.courseId),/删除/)
 const book=useWordbookStore();assert.deepEqual(book.preferences,{favorites:['lifecycle-shared'],later:[]});for(const scope of ['currentCourse','installedCourses','learnedGlobal'] as const)assert(!book.query({scope,currentCourseId:stale.courseId,installedCourseIds:['lifecycle-a','lifecycle-b','lifecycle-d'],category:'all',keyword:''}).rows.some(word=>word.id==='lifecycle-b-word'))
})

test('本机孤儿媒体按完整ID删除，失败待重试，名称相近的其他教材目录保留',async()=>{
 const {course}=await setup(),prefix='wordpal-content-pack-',b=prefix+'lifecycle-b-'+'a'.repeat(16),similar=prefix+'lifecycle-b-extra-'+'b'.repeat(16),d=prefix+'lifecycle-d-'+'c'.repeat(16)
 const directories=new Set([b,similar,d]);let failDelete=true
 ;(globalThis as any).plus={io:{resolveLocalFileSystemURL:(path:string,success:Function,failure:Function)=>{
  if(path==='_doc/wordpal/packs/'){let read=false;success({createReader:()=>({readEntries:(done:Function)=>{const entries=read?[]:[...directories].map(name=>({name}));read=true;done(entries)}})});return}
  const name=path.split('/').filter(Boolean).slice(-1)[0]
  if(!directories.has(name)){failure();return}success({removeRecursively:(done:Function,error:Function)=>{if(failDelete&&name===b)error();else{directories.delete(name);done()}}})
 }}}
 try{const result=await course.uninstall('lifecycle-b',true);assert(result.pendingCleanup>0);assert(directories.has(b));assert(directories.has(similar));assert(directories.has(d));failDelete=false;assert.equal(await retryCourseCleanup(),0);assert(!directories.has(b));assert(directories.has(similar));assert(directories.has(d))}finally{delete (globalThis as any).plus}
})

test('C 从未安装与已有卸载证据分开，重启及种子重扫不复活 B',async()=>{
 const {course}=await setup(),b=lifecyclePack('lifecycle-b'),c=lifecyclePack('lifecycle-c')
 await course.uninstall(b.courseId,true);configureLocalCourses([b,c]);storage.set('wordpal.content.installation.v1',JSON.stringify({[c.courseId]:'notInstalled'}));loadCourseRegistry();loadDirectory()
 assert(isUserDeleted(b.courseId));assert(!isUserDeleted(c.courseId));assert(!courseDirectory.value.some(pack=>pack.courseId===b.courseId));assert(courseDirectory.value.some(pack=>pack.courseId===c.courseId));assert.equal(courseRegistry[b.courseId],undefined);assert.equal(getCourseWord(c.courseId,'lifecycle-shared'),undefined)
 configureLocalCourses([])
})

test('明确重新导入成功才解除删除标记，原专属词记忆和进度不暗中恢复',async()=>{
 const {profile,course}=await setup(),b=lifecyclePack('lifecycle-b')
 await course.uninstall(b.courseId,true)
 await assert.rejects(installTextCourse({...b,vocabulary:[]}),/校验/);assert(isUserDeleted(b.courseId))
 await installTextCourse(b);assert(!isUserDeleted(b.courseId));assert(isCourseInstalled(b.courseId));assert.equal(profile.db.cards['lifecycle-b-word'],undefined);course.choose(b.courseId);assert.equal(useLearningStore().session,null);assert.deepEqual(selectDailyPlan(profile.db,b)?.wordIds,['lifecycle-shared','lifecycle-b-word'])
})

test('主动重装后再次学习与删除，会保存本次新记录的可恢复备份',async()=>{
 const {profile,course}=await setup(),id='lifecycle-b',key=REMOVAL_BACKUP_PREFIX+id
 await course.uninstall(id,true);const first=storage.get(key)
 await installTextCourse(lifecyclePack(id));profile.transact(db=>{db.cards['lifecycle-b-word']=newCard('lifecycle-b-word',new Date('2040-01-01'))})
 const current=JSON.stringify(profile.db.cards['lifecycle-b-word']);await course.uninstall(id,true)
 assert.equal(JSON.stringify(JSON.parse(storage.get(key)!).cards['lifecycle-b-word']),current);assert.equal(storage.get(key+'.previous'),first);assert.equal(profile.db.cards['lifecycle-b-word'],undefined)
})

test('确认、只读、备份失败和删除提交失败均不损坏当前档案',async()=>{
 const {profile,course}=await setup(),before=JSON.stringify(profile.db)
 await assert.rejects(course.uninstall('lifecycle-b',false),/确认/);assert.equal(JSON.stringify(profile.db),before)
 fail=REMOVAL_BACKUP_PREFIX+'lifecycle-b';await assert.rejects(course.uninstall('lifecycle-b',true),/备份/);fail='';assert.equal(JSON.stringify(profile.db),before);assert(isCourseInstalled('lifecycle-b'))
 fail=DELETED_COURSES_KEY;await assert.rejects(course.uninstall('lifecycle-b',true),/Quota/);fail='';assert.equal(JSON.stringify(profile.db),before);assert(!isUserDeleted('lifecycle-b'));assert(isCourseInstalled('lifecycle-b'))
 fail=V2_KEY;await assert.rejects(course.uninstall('lifecycle-b',true));fail='';assert.equal(JSON.stringify(profile.db),before)
})

test('当前教材未完成轮次在确认后安全退出并清理，替代教材草稿原样保留',async()=>{
 const {profile,course,learning}=await setup();learning.start();const a=JSON.stringify(learning.session);course.choose('lifecycle-b');learning.start();assert(learning.session?.flow?.begunAt)
 await course.uninstall('lifecycle-b',true,'lifecycle-a');assert.equal(course.currentId,'lifecycle-a');assert.equal(JSON.stringify(learning.session),a);assert.equal(profile.db.courseProgress?.['lifecycle-b'],undefined);assert.equal(profile.db.courseSessions?.['lifecycle-b'],undefined)
 const before=JSON.stringify(profile.db);await course.uninstall('lifecycle-b',true);assert.equal(JSON.stringify(profile.db),before)
})

test('提交后元数据清理失败保持删除状态，冷启动与重试完成而不复活',async()=>{
 const {course}=await setup();fail=CATALOG_KEY;const result=await course.uninstall('lifecycle-b',true);assert(result.pendingCleanup>0);assert(isUserDeleted('lifecycle-b'));assert(!isCourseInstalled('lifecycle-b'))
 fail='';loadCourseRegistry();loadDirectory();assert.equal(courseRegistry['lifecycle-b'],undefined);assert(!courseDirectory.value.some(pack=>pack.courseId==='lifecycle-b'));assert.equal(await retryCourseCleanup(),0);assert(!JSON.parse(storage.get(CATALOG_KEY)!).some((entry:any)=>entry.courseId==='lifecycle-b'))
})

test('卸载与媒体水合、旧安装请求竞态时，迟到结果不能复活教材',async()=>{
 const {course}=await setup(),hydration=hydrateMedia(),installing=installTextCourse({...lifecyclePack('lifecycle-b'),contentVersion:'2.0.0'})
 const settled=Promise.allSettled([hydration,installing]);await course.uninstall('lifecycle-b',true);const results=await settled
 assert.equal(results[1].status,'rejected');assert(isUserDeleted('lifecycle-b'));assert.equal(courseRegistry['lifecycle-b'],undefined);assert.equal(wordById['lifecycle-b-word'],undefined)
})

test('旧卸载描述符迁移先备份，再移除目录和词条；最小墓碑不含教材名称',async()=>{
 const {profile}=await setup(),b=lifecyclePack('lifecycle-b')
 retainDescriptor(b);storage.set('wordpal.content.installation.v1',JSON.stringify({[b.courseId]:'notInstalled'}));const before=JSON.stringify(profile.db.pets)
 loadCourseRegistry();loadDirectory();setActivePinia(createPinia());const restored=useProfileStore();assert(isUserDeleted(b.courseId));assert.equal(restored.db.cards['lifecycle-b-word'],undefined);assert(storage.has(REMOVAL_BACKUP_PREFIX+b.courseId));assert.equal(await retryCourseCleanup(),0)
 assert(!JSON.parse(storage.get(DIRECTORY_KEY)||'{}')[b.courseId]);assert.deepEqual(Object.keys(deletedCourses[b.courseId]).sort(),['deletedAt','versions']);assert.equal(JSON.stringify(restored.db.pets),before);assert(isCourseInstalled('lifecycle-a'))
})
