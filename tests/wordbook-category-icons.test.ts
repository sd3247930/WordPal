import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {wordbookCategoryIcons} from '../src/services/wordbook-category-icons'
import {queryWordbook,type WordbookIndex,type WordbookQuery} from '../src/services/content/WordbookQueryBuilder'
import {wordById} from '../packages/content_schema'
import {newCard} from '../packages/srs_fsrs'

test('到期与手动重点允许交叠且互不替代，切换不改排程或记录',()=>{
 const index:WordbookIndex={words:['cat','dog','fish'].map(id=>wordById[id]),positions:['cat','dog','fish'].map(lexemeId=>({id:lexemeId,courseId:'category-fixture',unitId:'u1',unitTitle:'Unit 1',lexemeId,order:0,lessonIds:['l1']})),cards:{cat:newCard('cat',new Date(0)),dog:newCard('dog',new Date('2100-01-01'))},dueIds:['cat','fish'],favorites:['cat','dog'],mistakes:['fish'],learnedIds:['cat','dog','fish'],suggestions:['fish']}
 const request:WordbookQuery={scope:'currentCourse',currentCourseId:'category-fixture',installedCourseIds:['category-fixture'],category:'all',keyword:''},before=JSON.stringify(index)
 const ids=(category:WordbookQuery['category'])=>queryWordbook({...request,category},index).rows.map(w=>w.id).sort()
 assert.deepEqual(ids('due'),['cat','fish']);assert.deepEqual(ids('focus'),['cat','dog']);assert.deepEqual(ids('mistakes'),['fish']);assert.deepEqual(ids('all'),['cat','dog','fish'])
 const focus=queryWordbook({...request,category:'focus'},index);assert.equal(focus.stats.focusCount,2);assert.equal(focus.stats.dueUniqueLexemeCount,2);assert.deepEqual(focus.suggestions.map(w=>w.id),['fish']);assert.equal(JSON.stringify(index),before)
})

test('四分类显示资源保留透明度与完整尺寸并清除 C2PA/EXIF 元数据',async()=>{
 for(const icon of Object.values(wordbookCategoryIcons))for(const size of [256,1024]){
  const data=await fs.readFile('src'+icon.src.replace('_256.png',`_${size}.png`)),meta=await sharp(data).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);assert(meta.hasAlpha)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type));offset+=length+12}
 }
})
