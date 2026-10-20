import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {priorityItems} from '../src/services/home-review-priority'
import {queryWordbook,type WordbookIndex} from '../src/services/content/WordbookQueryBuilder'
import {wordById} from '../packages/content_schema'
import {newCard} from '../packages/srs_fsrs'

test('优先级按既有可用词条身份去重，重叠集合独立计数且只读',()=>{
 const rows=['cat','dog','cat','fish'].map(id=>({word:wordById[id]})),before=JSON.stringify(rows)
 assert.deepEqual(priorityItems(rows,['dog','cat','cat','missing']).map(row=>row.word.id),['cat','dog'])
 assert.equal(priorityItems(rows,[]).length,0)
 assert.equal(priorityItems(rows,['cat','dog']).length,2)
 assert.equal(priorityItems(rows,['cat','fish']).length,2)
 assert.equal(JSON.stringify(rows),before)
})
test('教材位置和全局记忆沿用词表选择器；无记忆卡的练习证据不能进入已经认识',()=>{
 const position=(courseId:string,id:string)=>({id:courseId+id,courseId,unitId:'u',unitTitle:'u',lexemeId:id,lessonIds:['l'],order:0})
 const index:WordbookIndex={words:['cat','dog','fish'].map(id=>wordById[id]),positions:[position('a','cat'),position('a','dog'),position('b','cat'),position('b','fish')],cards:{cat:newCard('cat'),fish:newCard('fish')},dueIds:['cat','fish'],favorites:['dog'],mistakes:[],learnedIds:['cat','fish','dog'],suggestions:['fish']}
 const request={scope:'allWords' as const,currentCourseId:'a',installedCourseIds:['a','b'],category:'all' as const,keyword:''}
 assert.deepEqual(priorityItems(queryWordbook(request,index).items,Object.keys(index.cards)).map(row=>row.word.id),['cat','fish'])
 assert.deepEqual(priorityItems(queryWordbook({...request,scope:'currentCourse'},index).items,index.dueIds).map(row=>row.word.id),['cat'])
 assert.deepEqual(priorityItems(queryWordbook(request,index).items,['cat','fish']).map(row=>row.word.id),['cat','fish'])
})
test('优先级独立透明矢量导出无源图元数据，支持离线平台加载',async()=>{
 for(const name of ['heading','due','weak','known']){
  const data=await fs.readFile(`src/static/icons/home-priority/${name}.png`),meta=await sharp(data).metadata()
  assert.equal(meta.width,256);assert.equal(meta.height,256);assert(meta.hasAlpha)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type));offset+=length+12}
 }
})
