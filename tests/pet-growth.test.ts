import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import sharp from 'sharp'
import {createPinia,setActivePinia} from 'pinia'
import {createPet,elements,petInfo} from '../packages/pet_engine'
import {newCard} from '../packages/srs_fsrs'
import {freshDatabase,useProfileStore} from '../src/stores/profile'
import {allCourseLearningProgress,displayPetForm,petGrowthAsset,petStages,stageUnlocked,petStagePresentation,petFormBaseScale} from '../src/services/pet-growth'
import {loadCourseRegistry,courseRegistry,archiveStatus,installationStatus,starterPack} from '../src/services/content/ContentRegistry'
import {initialProgress} from '../src/services/storage/MigrationV1toV2'
import {usePetFormsStore,petFormsKey} from '../src/stores/pet-forms'

const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw new Error('Quota');storage.set(key,value)}}
function reset(){storage.clear();fail=false;loadCourseRegistry();setActivePinia(createPinia())}
function fullProgress(courseId:string){return {...initialProgress(courseId),introducedWords:Object.fromEntries(courseRegistry[courseId].vocabulary.map(word=>[word.id,'2026-10-16T08:00:00Z']))}}

test('四象身份稳定，四阶段逐次放大10%并预留解锁动效空间',()=>{
 assert.deepEqual(elements.map(id=>petInfo[id].name),['玄冥','祝融','后土','飞廉'])
 assert.equal(petStages[0].scale,petFormBaseScale);for(let i=1;i<4;i++)assert.ok(Math.abs(petStages[i].scale/petStages[i-1].scale-1.1)<1e-10)
 assert.ok(petStages[3].scale*1.025<1);assert.deepEqual(petStages.map(stage=>stage.title),['幼年期','成年期','进化期','未知形态'])
 for(const id of elements){assert.equal(createPet(id).petId,'pet-'+id);assert.match(petGrowthAsset(id,4),/unknown[.]png$/);assert.equal(petGrowthAsset(id,99),'')}
})
test('Lv.4、Lv.8边界与全教材完成解锁独立，未知形态需要真实完成证据',()=>{
 for(const [level,expected] of [[1,[true,false,false]],[3,[true,false,false]],[4,[true,true,false]],[7,[true,true,false]],[8,[true,true,true]]] as const){
  assert.deepEqual([0,1,2].map(i=>stageUnlocked({level},i)),expected)
  assert.equal(stageUnlocked({level},3),false);assert.equal(stageUnlocked({level},3,true),true)
 }
 assert.equal(stageUnlocked({level:99},99,true),false)
 assert.equal(displayPetForm({level:99},undefined),1);assert.equal(displayPetForm({level:99},4),1);assert.equal(displayPetForm({level:1},4,true),4)
 assert.equal(displayPetForm({level:3},2),1);assert.equal(displayPetForm({level:4},2),2)
 assert.equal(displayPetForm({level:7},3),1);assert.equal(displayPetForm({level:8},3),3)
})
test('全部教材分别统计，SRS与历史词不能替代教材进度；读取不改档案',()=>{
 reset();const db=freshDatabase();db.courseProgress={starter:fullProgress('starter')}
 const second=JSON.parse(JSON.stringify(starterPack));second.courseId='growth-second';courseRegistry[second.courseId]=second
 for(const word of starterPack.vocabulary)db.cards[word.id]=newCard(word.id)
 const before=JSON.stringify(db),result=allCourseLearningProgress(db)
 assert.equal(result.total,starterPack.vocabulary.length*2);assert.equal(result.learned,starterPack.vocabulary.length);assert.equal(result.percent,50);assert.equal(result.complete,false);assert.equal(JSON.stringify(db),before)
 db.courseProgress[second.courseId]=fullProgress(second.courseId);assert.equal(allCourseLearningProgress(db).complete,true)
})
test('教材增加、归档、卸载、空目录与接近100%均按实时内容判定',()=>{
 reset();const db=freshDatabase();db.courseProgress={starter:fullProgress('starter')}
 const second=JSON.parse(JSON.stringify(starterPack));second.courseId='growth-second';courseRegistry[second.courseId]=second
 assert.equal(allCourseLearningProgress(db).complete,false)
 archiveStatus[second.courseId]=true;assert.equal(allCourseLearningProgress(db).complete,true)
 archiveStatus[second.courseId]=false;installationStatus[second.courseId]='notInstalled';assert.equal(allCourseLearningProgress(db).complete,true)
 delete courseRegistry[second.courseId];db.courseProgress['deleted-book']=fullProgress('starter');assert.equal(allCourseLearningProgress(db).complete,true)
 const longBook=JSON.parse(JSON.stringify(starterPack));longBook.courseId='long-book';longBook.vocabulary=Array.from({length:1001},(_,i)=>({...starterPack.vocabulary[0],id:'large-'+i}));longBook.units=[];courseRegistry[longBook.courseId]=longBook
 db.courseProgress[longBook.courseId]=fullProgress(longBook.courseId);delete db.courseProgress[longBook.courseId].introducedWords!['large-1000']
 assert.equal(allCourseLearningProgress(db).percent,99);assert.equal(allCourseLearningProgress(db).complete,false)
 for(const id of Object.keys(courseRegistry))delete courseRegistry[id];assert.equal(allCourseLearningProgress(db).complete,false);assert.equal(allCourseLearningProgress(db).percent,0)
})
test('已完成课程章节和当前正式首轮答题可兼容，越界词不计入',()=>{
 reset();const db=freshDatabase(),first=starterPack.units[0].lessons[0]
 db.courseProgress={starter:{...initialProgress('starter'),completedLessons:[first.id],introducedWords:{foreign:'2026-10-16T08:00:00Z'}}}
 assert.equal(allCourseLearningProgress(db).learned,new Set(first.wordIds).size)
 const next=starterPack.vocabulary.find(word=>!first.wordIds.includes(word.id))!.id,at='2026-10-16T08:00:00Z'
 db.session={id:'growth-evidence',courseId:'starter',date:'2026-10-16',startedAt:at,kind:'new_word',wordIds:[next],index:0,mode:'flash',input:'',selected:'',revealed:true,answers:[{id:'growth-evidence:0',wordId:next,rating:3,correct:true,at,source:'new_word',mode:'flash',input:''}]}
 const before=JSON.stringify(db);assert.equal(allCourseLearningProgress(db).learned,new Set(first.wordIds).size+1);assert.equal(JSON.stringify(db),before)
})
test('默认幼年期不随等级自动切换，形态独立持久化，锁定或存储失败不写学习档案',()=>{
 reset();const profile=useProfileStore();profile.transact(db=>{db.pets.water={...createPet('water'),level:8,exp:700,evolutionStage:3}})
 let forms=usePetFormsStore();const before=JSON.stringify(profile.db)
 assert.equal(forms.stage('water'),1);assert.equal(forms.choose('water',2),true);assert.equal(forms.stage('water'),2)
 assert.equal(forms.choose('fire',2),false);assert.equal(forms.choose('water',4),false);assert.equal(JSON.stringify(profile.db),before)
 setActivePinia(createPinia());forms=usePetFormsStore();assert.equal(forms.stage('water'),2);assert.equal(forms.stage('fire'),1)
 fail=true;assert.equal(forms.choose('water',3),false);assert.equal(forms.stage('water'),2);assert.match(forms.error,/暂未保存/);assert.equal(JSON.stringify(useProfileStore().db),before)
 fail=false;storage.set(petFormsKey,JSON.stringify({water:4,fire:'2',earth:{},wind:3}));setActivePinia(createPinia());forms=usePetFormsStore();assert.deepEqual(elements.map(id=>forms.stage(id)),[1,1,1,1])
})
test('16张高清素材含未知形态，真实透明通道且无来源元数据',async()=>{
 const files=await readdir('src/static/pet-house/growth');assert.equal(files.length,16)
 for(const id of elements)for(const stage of [1,2,3,4]){
  const data=await readFile('src'+petGrowthAsset(id,stage)),m=await sharp(data).metadata()
  assert.equal(m.width,960);assert.equal(m.height,1280);assert.equal(m.hasAlpha,true);assert.ok(!m.exif&&!m.xmp&&!m.iptc&&!m.icc)
  for(const marker of ['caBX','ChatGPT','OpenAI Media Service'])assert.equal(data.includes(Buffer.from(marker)),false)
  const {data:raw,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true});let transparent=0,opaque=0
  for(let i=3;i<raw.length;i+=info.channels){if(raw[i]===0)transparent++;if(raw[i]>230)opaque++}
  assert.ok(transparent>info.width*info.height*.1);assert.ok(opaque>info.width*info.height*.1)
 }
})

test('灰度和遮罩随真实进度减轻，解锁变全彩，预览尺寸不随锁定变化',()=>{
 const empty={total:133,learned:0,complete:false},pet=createPet('water')
 const locked=petStagePresentation(pet,1,empty);assert.equal(locked.state,'locked');assert.equal(locked.grayscale,80);assert.equal(locked.opacity,.7);assert.equal(locked.percent,0);assert.equal(locked.remaining,300)
 const learning=petStagePresentation({...pet,level:2,exp:150},1,empty);assert.equal(learning.state,'learning');assert.equal(learning.percent,50);assert.equal(learning.grayscale,50);assert.equal(learning.opacity,.8);assert.ok(learning.veil<locked.veil)
 const adult=petStagePresentation({...pet,level:4,exp:300},1,empty);assert.equal(adult.state,'unlocked');assert.equal(adult.percent,100);assert.equal(adult.grayscale,0);assert.equal(adult.opacity,1);assert.equal(adult.veil,0)
 const evolving=petStagePresentation({...pet,level:6,exp:500},2,empty);assert.equal(evolving.percent,50);assert.equal(evolving.remaining,200)
 const unknown=petStagePresentation(pet,3,{...empty,learned:132});assert.equal(unknown.unlocked,false);assert.equal(unknown.percent,99);assert.equal(unknown.remaining,1)
 const full=petStagePresentation(pet,3,{...empty,learned:133,complete:true});assert.equal(full.unlocked,true);assert.equal(full.percent,100);assert.equal(full.grayscale,0);assert.equal(full.veil,0)
 assert.equal(petStagePresentation(pet,3,{total:0,learned:0,complete:false}).unlocked,false)
})
test('未知形态可选择并持久化，新增未学教材使其安全回退，学习档案不被改写',()=>{
 reset();const profile=useProfileStore();profile.transact(db=>{db.courseProgress={starter:fullProgress('starter')}});let forms=usePetFormsStore();const before=JSON.stringify(profile.db)
 assert.equal(forms.choose('water',4),true);assert.equal(forms.stage('water'),4);assert.equal(JSON.stringify(profile.db),before)
 setActivePinia(createPinia());forms=usePetFormsStore();assert.equal(forms.stage('water'),4)
 const second=JSON.parse(JSON.stringify(starterPack));second.courseId='growth-added';courseRegistry[second.courseId]=second;assert.equal(forms.stage('water'),1);assert.equal(forms.choose('water',4),false)
 assert.equal(JSON.stringify(useProfileStore().db),before)
})
