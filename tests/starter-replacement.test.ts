import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {configureStarterCourse,configureLocalCourses,starterPack,loadCourseRegistry,wordById,getCourseWord,resolveFrozenWord,wordIdentityMatches,courseRegistry} from '../packages/content_schema/registry'
import {validateCourse,type CoursePack} from '../packages/content_schema/course'
import {useProfileStore} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {installTextCourse} from '../src/services/content/StorageRepository'
import {previewImport,defaultImportMetadata} from '../src/services/course-import/ImportWizard'
import {newCard} from '../packages/srs_fsrs'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import legacy from '../src/content/starter.json'
import {assertPublicMedia} from '../src/services/course-import/PublicMediaAudit'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,data:string)=>storage.set(key,data),removeStorageSync:(key:string)=>storage.delete(key)}
function reset(){storage.clear();configureStarterCourse(null);configureLocalCourses([]);loadCourseRegistry();setActivePinia(createPinia())}
function replacement(){
 const pack=JSON.parse(JSON.stringify(starterPack)) as CoursePack;pack.contentVersion='1.1.0';pack.sources=[{id:'local-source',type:'user-provided',rightsStatus:'private-use-declared',attribution:'合成本机覆盖示例',revision:'r1'}];pack.assets=[]
 for(const entry of pack.vocabulary){entry.sourceId='local-source';entry.audio='';entry.image='';entry.assetRefs={audio:'audio-'+entry.id,image:'image-'+entry.id};for(const kind of ['audio','image'])pack.assets.push({id:kind+'-'+entry.id,path:(kind==='audio'?'audio/':'images/')+entry.id+(kind==='audio'?'.mp3':'.webp'),mediaType:kind==='audio'?'audio/mpeg':'image/webp',bytes:1,sha256:'a'.repeat(64),sourceId:'local-source',license:'合成测试'})}
 pack.vocabulary.find(entry=>entry.id==='bag')!.meaning='包';pack.vocabulary.find(entry=>entry.id==='desk')!.meaning='书桌'
 return pack
}
test.afterEach(()=>{configureStarterCourse(null);configureLocalCourses([]);loadCourseRegistry()})

test('starter 替换保留课程和单词 ID、章节及冻结输入，旧会话绑定新图音而不写 SRS',()=>{
 reset();const profile=useProfileStore(),old=JSON.parse(JSON.stringify(wordById.bag));profile.transact(db=>{db.cards.bag=newCard('bag',new Date('2040-01-01'));db.session={id:'starter-existing',courseId:'starter',contentVersion:'1.0.0',date:'2026-10-16',startedAt:'2026-10-16T08:00:00Z',kind:'practice',wordIds:['bag'],wordSnapshot:{bag:old},index:0,mode:'spell',input:'ba',selected:'',revealed:false,answers:[]}})
 const before=JSON.stringify(profile.db),structure=JSON.stringify(starterPack.units),ids=starterPack.vocabulary.map(entry=>entry.id),pack=replacement();configureStarterCourse(pack);loadCourseRegistry();const learning=useLearningStore()
 assert.equal(starterPack.courseId,'starter');assert.equal(JSON.stringify(starterPack.units),structure);assert.deepEqual(starterPack.vocabulary.map(entry=>entry.id),ids)
 assert.equal(learning.current!.meaning,'包');assert.equal(learning.current!.audio,'/static/local-starter-media/audio/bag.mp3');assert.equal(learning.current!.image,'/static/local-starter-media/images/bag.webp');assert.equal(learning.session!.input,'ba');assert.equal(JSON.stringify(profile.db),before);assert.equal(profile.db.session!.wordSnapshot!.bag.meaning,'书包')
 for(const entry of pack.vocabulary){const word=getCourseWord('starter',entry.id);assert.ok(word);assert.ok(word.audio.startsWith('/static/local-starter-media/'));assert.ok(word.image.startsWith('/static/local-starter-media/'));assert.ok(word.phonics.length)}
})

test('指定的中文更新兼容旧教材翻译，其他同形异义和词性冲突仍拒绝',async()=>{
 reset();const pack=replacement();configureStarterCourse(pack);loadCourseRegistry()
 assert.equal(wordIdentityMatches(wordById.bag,{word:'bag',meaning:'书包',pos:'n.'}),true);assert.equal(wordIdentityMatches(wordById.bag,{word:'bag',meaning:'解雇',pos:'n.'}),false);assert.equal(wordIdentityMatches(wordById.bag,{word:'bag',meaning:'包',pos:'v.'}),false)
 const other={...JSON.parse(JSON.stringify(pack)),courseId:'another-course',title:'其他教材'} as CoursePack;other.vocabulary.find(entry=>entry.id==='bag')!.meaning='书包';other.assets=[];for(const entry of other.vocabulary){delete entry.assetRefs;entry.audio='';entry.image=''}
 await installTextCourse(other);assert.ok(courseRegistry[other.courseId]);assert.equal(getCourseWord(other.courseId,'bag')?.meaning,'书包');assert.equal(getCourseWord('starter','bag')?.meaning,'包')
 const preview=previewImport(JSON.stringify(other),'json',{...defaultImportMetadata(),declared:true},wordById);assert.equal(preview.issues.some(issue=>issue.field==='id'),false);assert.equal(preview.reuse.bag,'bag')
})

test('替换包不能新增单词身份或改变章节归属，失败不会部分覆盖原课程',()=>{
 reset();const pack=replacement(),original=JSON.stringify(starterPack);pack.vocabulary[0].id='new-cat';assert.throws(()=>configureStarterCourse(pack));assert.equal(JSON.stringify(starterPack),original)
 const moved=replacement();moved.units[0].lessons[0].wordIds.reverse();assert.throws(()=>configureStarterCourse(moved));assert.equal(JSON.stringify(starterPack),original)
})

test('本机词典录音不进入公开课程，关闭替换后恢复已核验的内置图音',()=>{
 reset();configureStarterCourse(replacement());loadCourseRegistry();assert.ok(validateCourse(starterPack,{publicUse:true}).some(issue=>issue.severity==='error'));configureStarterCourse(null);loadCourseRegistry();assert.equal(starterPack.contentVersion,'1.2.0');assert.equal(wordById.cat.audio,'/static/audio/cat.wav');assert.equal(wordById.cat.image,'/static/starter-media/images/cat.webp');assert.equal(wordById.cat.audioUK,undefined);assert.equal(wordById.bag.meaning,'书包');assert.equal(validateCourse(starterPack,{publicUse:true}).length,0)
})

test('内置课程 20 组图音完整、哈希与清单相同，学习身份和课节不变',()=>{
 reset();const files:Record<string,Uint8Array>={}
 assert.equal(starterPack.assets.length,40);assert.deepEqual(starterPack.vocabulary.map(word=>word.id),legacy.words.map(word=>word.id))
 assert.deepEqual(starterPack.units.flatMap(unit=>unit.lessons.map(lesson=>({id:lesson.id,wordIds:lesson.wordIds}))),legacy.lessons.map(lesson=>({id:lesson.id,wordIds:lesson.wordIds})))
 for(const asset of starterPack.assets){const bytes=readFileSync('src/static/'+asset.path);files[asset.path]=bytes;assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.ok(!asset.path.includes('local-'));if(asset.mediaType==='image/webp'){assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');for(const tag of ['EXIF','XMP ','C2PA'])assert.equal(bytes.includes(Buffer.from(tag)),false)}}
 assert.doesNotThrow(()=>assertPublicMedia(starterPack,files))
 for(const original of legacy.words){const word=getCourseWord('starter',original.id)!;assert.equal(word.word,original.word);assert.equal(word.meaning,original.meaning);assert.equal(word.audio,original.audio);assert.equal(word.image,'/static/starter-media/images/'+original.id+'.webp');assert.deepEqual(word.phonics,original.phonics);assert.ok(wordById[original.id].image)}
})

test('公开课程升级给旧冻结会话补图，不改输入、答案、进度及 SRS',()=>{
 reset();const profile=useProfileStore(),old=JSON.parse(JSON.stringify(legacy.words[0]));profile.transact(db=>{db.cards.cat=newCard('cat',new Date('2040-01-01'));db.session={id:'before-bundled-pictures',courseId:'starter',contentVersion:'1.0.0',date:'2026-10-16',startedAt:'2026-10-16T08:00:00Z',kind:'practice',wordIds:['cat'],wordSnapshot:{cat:old},index:0,mode:'spell',input:'ca',selected:'',revealed:false,answers:[]}})
 const before=JSON.stringify(profile.db),stored=[...storage.entries()],learning=useLearningStore();assert.equal(learning.current!.image,'/static/starter-media/images/cat.webp');assert.equal(learning.session!.input,'ca');assert.equal(profile.db.session!.wordSnapshot!.cat.image,'');assert.equal(JSON.stringify(profile.db),before);assert.deepEqual([...storage.entries()],stored)
 const unrelated={...old,meaning:'其他词义',audio:'_doc/other/cat.mp3',image:'_doc/other/cat.webp'};assert.deepEqual(resolveFrozenWord(unrelated),unrelated)
 const dedicated={...old,audio:'_doc/other/cat.mp3',image:'_doc/other/cat.webp'};assert.deepEqual(resolveFrozenWord(dedicated),dedicated)
 assert.equal(resolveFrozenWord(dedicated,'starter',starterPack.contentVersion)!.audio,dedicated.audio);assert.equal(resolveFrozenWord(dedicated,'starter',starterPack.contentVersion)!.image,dedicated.image)
})

test('已有其他课程的专用录音不被 starter 覆盖，旧内置资源句柄可重新绑定',()=>{
 reset();const word=JSON.parse(JSON.stringify(wordById.cat));configureStarterCourse(replacement());loadCourseRegistry();const before=JSON.stringify(word)
 const rebound=resolveFrozenWord(word,'starter','1.0.0')!;assert.equal(rebound.audio,'/static/local-starter-media/audio/cat.mp3');assert.equal(rebound.image,'/static/local-starter-media/images/cat.webp');assert.equal(JSON.stringify(word),before)
 configureLocalCourses([{...JSON.parse(JSON.stringify(starterPack)),courseId:'other-course',title:'合成其他教材'}]);loadCourseRegistry();const dedicated={...word,audio:'_doc/other-course/cat.mp3'};assert.equal(resolveFrozenWord(dedicated,'other-course','1.0.0')!.audio,dedicated.audio)
})
