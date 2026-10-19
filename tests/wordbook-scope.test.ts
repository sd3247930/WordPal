import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {wordbookScopeIcons} from '../src/services/wordbook-scope-icons'
import {queryWordbook,type WordbookIndex,type WordbookQuery} from '../src/services/content/WordbookQueryBuilder'
import {wordById} from '../packages/content_schema'
import {deletedCourses} from '../packages/content_schema/course-lifecycle'
import {newCard} from '../packages/srs_fsrs'

function fixture():WordbookIndex{
 const position=(courseId:string,lexemeId:string,unitId='unit-one')=>({id:`${courseId}:${unitId}:${lexemeId}`,courseId,lexemeId,unitId,unitTitle:unitId,order:0,lessonIds:['lesson']})
 return {words:['cat','dog','fish','bird','duck'].map(id=>wordById[id]),positions:[position('scope-a','cat'),position('scope-a','dog'),position('scope-b','cat'),position('scope-b','fish'),position('scope-retained','bird'),position('scope-retained','duck')],cards:{cat:newCard('cat',new Date(0)),bird:newCard('bird',new Date(0))},dueIds:['cat','bird'],favorites:['fish'],mistakes:['bird'],learnedIds:['cat','bird'],suggestions:['dog']}
}
const request=(extra:Partial<WordbookQuery>={}):WordbookQuery=>({scope:'allWords',currentCourseId:'scope-a',installedCourseIds:['scope-a','scope-b'],category:'all',keyword:'',...extra})
const ids=(rows:{id:string}[])=>rows.map(row=>row.id).sort()
test('合并范围是已安装和保留已学词的去重并集，已学开关保留原范围且不改记录',()=>{
 const index=fixture(),before=JSON.stringify(index),merged=queryWordbook(request(),index),installed=queryWordbook(request({scope:'installedCourses'}),index),learned=queryWordbook(request({scope:'learnedGlobal'}),index)
 assert.deepEqual(ids(merged.rows),[...new Set([...ids(installed.rows),...ids(learned.rows)])].sort());assert.deepEqual(ids(merged.rows),['bird','cat','dog','fish']);assert.equal(merged.stats.totalUniqueLexemes,4);assert.equal(merged.stats.totalCourseOccurrences,5);assert.equal(merged.stats.dueUniqueLexemeCount,2)
 assert.deepEqual(queryWordbook(request({learnedOnly:true,unitId:'invalid'}),index),learned);assert.equal(JSON.stringify(index),before)
})
test('搜索、重点、错词、到期与空范围共用合并条件，Unit 不污染跨教材结果',()=>{
 const index=fixture()
 assert.deepEqual(ids(queryWordbook(request({category:'due'}),index).rows),['bird','cat']);assert.deepEqual(ids(queryWordbook(request({category:'focus'}),index).rows),['fish']);assert.deepEqual(ids(queryWordbook(request({category:'mistakes',learnedOnly:true}),index).rows),['bird'])
 assert.equal(queryWordbook(request({keyword:'unit-one',unitId:'missing'}),index).stats.totalUniqueLexemes,4);assert.equal(queryWordbook(request({keyword:'dog',learnedOnly:true}),index).rows.length,0)
 assert.deepEqual(ids(queryWordbook(request({scope:'currentCourse',unitId:'unit-one'}),index).rows),['cat','dog'])
 assert.equal(queryWordbook(request(),{...index,positions:[],learnedIds:[]}).rows.length,0)
})
test('删除教材的专属已学词不从合并入口复活，共享词按有效教材保留',()=>{
 const index=fixture();deletedCourses['scope-retained']={versions:[],deletedAt:''};deletedCourses['scope-a']={versions:[],deletedAt:''}
 try{for(const learnedOnly of [false,true]){const result=queryWordbook(request({learnedOnly}),index);assert(!result.rows.some(word=>['bird','dog','duck'].includes(word.id)));assert(result.rows.some(word=>word.id==='cat'));assert(![...result.positionsById.values()].flat().some(row=>['scope-a','scope-retained'].includes(row.courseId)))}}finally{delete deletedCourses['scope-retained'];delete deletedCourses['scope-a']}
})
test('三张范围插画保留透明与规格，正式资源不含源元数据',async()=>{
 for(const icon of Object.values(wordbookScopeIcons))for(const size of [1024,256]){
  const data=await fs.readFile('src'+icon.src.replace('_256.png',`_${size}.png`)),meta=await sharp(data).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);assert(meta.hasAlpha)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type));offset+=length+12}
 }
})
