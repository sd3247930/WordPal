import test from 'node:test'
import assert from 'node:assert/strict'
import {customCourse} from './helpers/custom-course'
import {occurrences} from '../src/services/content/IdentityModel'
import {wordSourceLabel,resolveTextbookWordPosition} from '../src/services/content/WordSourcePosition'
import {queryWordbook,type WordbookIndex,type WordbookQuery} from '../src/services/content/WordbookQueryBuilder'
import {entryWord} from '../packages/content_schema/course'
import {deletedCourses} from '../packages/content_schema/course-lifecycle'
import {newCard} from '../packages/srs_fsrs'
import {ListTapGuard} from '../src/services/ui/ListInteraction'

// 单元与词序来自教材，而不是倒序传入的数组、筛选结果位置或到期时间。
test('Unit 1/2/10自然序、单元内词序与来源位置在筛选后保持真实',()=>{
 const pack=customCourse(),rows=occurrences(pack)
 assert.deepEqual(rows.map(row=>row.lexemeId),pack.vocabulary.map(word=>word.id))
 for(const index of [0,9,10,55,112]){const row=rows[index];assert.equal(row.bookWordOrder,index+1);assert.equal(row.unitWordOrder,index%10+1);assert.match(wordSourceLabel(pack.title,row),new RegExp(`第${index%10+1}词$`))}
 assert.equal(resolveTextbookWordPosition(pack,pack.vocabulary[90].id)!.unitTitle,'Unit 10')
})

// 部分或重复显式序号回退到可信导入数组，不给元数据缺失的单元捏造位置。
test('无Unit全书序号、缺失/重复序号、空单元和未归属词条均有明确结果',()=>{
 const pack=customCourse('reading-no-unit',3);pack.units=[]
 assert.deepEqual(occurrences(pack).map(row=>wordSourceLabel(pack.title,row)),[1,2,3].map(index=>`${pack.title} · 全书第${index}词`))
 pack.units=[{id:'u1',title:'Unit01',lessons:[{id:'l',title:'课',wordIds:[pack.vocabulary[2].id,pack.vocabulary[0].id]}]}]
 delete pack.vocabulary[0].order;pack.vocabulary[2].order=1
 assert.deepEqual(occurrences(pack).map(row=>row.lexemeId),[pack.vocabulary[2].id,pack.vocabulary[0].id,pack.vocabulary[1].id])
 assert.match(wordSourceLabel(pack.title,occurrences(pack).at(-1)),/位置待确认/)
 pack.vocabulary.forEach(word=>word.order=1);assert.equal(occurrences(pack)[0].lexemeId,pack.vocabulary[2].id)
 assert.match(wordSourceLabel(pack.title,undefined),/位置待确认/)
 pack.units[0].lessons[0].wordIds.push('missing');assert.match(wordSourceLabel(pack.title,resolveTextbookWordPosition(pack,'missing')),/位置待确认/)
})

function fixture(){
 const packs=[customCourse('reading-a',20),customCourse('reading-b',20)]
 // 同英文不同词条/释义必须保留，不能按拼写去重。
 packs[0].vocabulary[0].lemma='play';packs[1].vocabulary[0].lemma='play';packs[1].vocabulary[0].meaning='另一教材的词义'
 const words=packs.flatMap(pack=>pack.vocabulary.map(word=>entryWord(word,pack))),ids=words.map(word=>word.id)
 const index:WordbookIndex={words:[...words].reverse(),positions:packs.flatMap(occurrences).reverse(),cards:Object.fromEntries(ids.map((id,index)=>[id,newCard(id,new Date(index%2?0:1000))])),dueIds:ids.filter((_,i)=>i%2===0),favorites:ids.filter((_,i)=>i%3===0).reverse(),mistakes:ids.filter((_,i)=>i%5===0).reverse(),learnedIds:ids.filter((_,i)=>i%2===0),suggestions:[],wordFor:(courseId,id)=>{const pack=packs.find(pack=>pack.courseId===courseId);const entry=pack?.vocabulary.find(word=>word.id===id);return pack&&entry?entryWord(entry,pack):undefined}}
 return {packs,words,ids,index}
}
for(const scope of ['currentCourse','installedCourses','allWords','learnedGlobal'] as const)for(const category of ['due','focus','mistakes','all'] as const)test(`${scope}/${category}资格不变且默认教材顺序、不改任何学习数据`,()=>{
 const {packs,index,ids}=fixture(),before=JSON.stringify(index)
 const request:WordbookQuery={scope,category,currentCourseId:packs[0].courseId,installedCourseIds:packs.map(pack=>pack.courseId).reverse(),keyword:''}
 const allowed=category==='due'?index.dueIds:category==='focus'?index.favorites:category==='mistakes'?index.mistakes:ids
 const expected=ids.filter(id=>allowed.includes(id)&&(scope!=='currentCourse'||id.startsWith('reading-a'))&&(scope!=='learnedGlobal'||index.learnedIds.includes(id)))
 const result=queryWordbook(request,index);assert.deepEqual(result.rows.map(word=>word.id),expected);assert.equal(JSON.stringify(index),before)
 const secondUnit=queryWordbook({...request,scope:'currentCourse',unitId:packs[0].courseId+'-u2'},index)
 if(secondUnit.items.length)assert.match(wordSourceLabel(packs[0].title,secondUnit.items[0].position),/Unit 2/)
})

test('跨教材同英文可定位不同释义，删除与版本重排不会使用旧位置',()=>{
 const {packs,index}=fixture(),request:WordbookQuery={scope:'allWords',category:'all',currentCourseId:packs[0].courseId,installedCourseIds:packs.map(pack=>pack.courseId),keyword:'play'}
 const result=queryWordbook(request,index);assert.equal(result.items.length,2);assert.notEqual(result.items[0].key,result.items[1].key);assert.notEqual(result.items[0].word.meaning,result.items[1].word.meaning)
 deletedCourses[packs[1].courseId]={versions:[],deletedAt:''}
 try{assert.equal(queryWordbook(request,index).items.length,1)}finally{delete deletedCourses[packs[1].courseId]}
 const id=packs[0].vocabulary[0].id;packs[0].contentVersion='2.0.0';packs[0].vocabulary[0].order=100
 assert.equal(resolveTextbookWordPosition(packs[0],id)!.unitWordOrder,10)
})

test('手势观察不拦截滚动：慢拖/甩动/惯性/取消/长按拒绝，明确轻触和键盘可用',()=>{
 let now=1000;const guard=new ListTapGuard(()=>now),touch=(x:number,y:number)=>({touches:[{clientX:x,clientY:y}]})
 assert(guard.allow());guard.start(touch(10,100));guard.end({changedTouches:[{clientX:10,clientY:100}]});assert(guard.allow())
 for(const distance of [10,80,300]){now+=500;guard.start(touch(10,100));guard.move(touch(10,100-distance));guard.end({changedTouches:[{clientX:10,clientY:100-distance}]});assert(!guard.allow());now+=401;assert(guard.allow())}
 now+=500;guard.scroll();guard.start(touch(20,100));guard.end({changedTouches:[{clientX:20,clientY:100}]});assert(!guard.allow())
 now+=500;guard.start(touch(20,100));guard.cancel();assert(!guard.allow());now+=500;guard.start(touch(20,100));now+=700;guard.end({});assert(!guard.allow());now+=401;assert(guard.allow())
})
