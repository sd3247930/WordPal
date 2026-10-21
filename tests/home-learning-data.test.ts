import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {freshDatabase} from '../src/stores/profile'
import {starterPack} from '../src/services/content/ContentRegistry'
import {initialProgress} from '../src/services/storage/MigrationV1toV2'
import {selectHomeLearningData} from '../src/services/learning/StudyStats'
import type {Answer} from '../packages/core_learning'

const now=new Date(2026,9,21,12),answer=(id:string,correct:boolean,source:Answer['source']='new_word',at=now,courseId='starter'):Answer=>({id,wordId:'cat',correct,source,at:at.toISOString(),courseId,mode:'flash',input:'',rating:correct?3:1})
test('首页保留当前教材完成词和全局已保存答题事件口径，不合并独立练习证据',()=>{
 const db=freshDatabase();db.courseProgress={starter:{...initialProgress('starter'),curriculumSchema:1,fullLearnedWords:{cat:now.toISOString(),dog:new Date(2026,9,20,23).toISOString(),'missing-word':now.toISOString()}},other:{...initialProgress('other'),fullLearnedWords:{fish:now.toISOString()}}}
 db.history=[answer('new',true),answer('review-1',false,'review_due'),answer('review-2',true,'review_due',now,'other'),answer('other-new',false,'new_word',now,'other')]
 db.practiceAnswers=[answer('custom',false,'practice')];const before=JSON.stringify(db)
 assert.deepEqual(selectHomeLearningData(db,starterPack,now),{accuracy:50,samples:4,newWords:1,reviewEvents:2,effectiveEvents:4})
 assert.equal(JSON.stringify(db),before)
})
test('无样本、真实0%、50%、100%和四舍五入保持区分，不产生非法百分比',()=>{
 const db=freshDatabase()
 for(const [correct,expected]of [[[],null],[[false,false],0],[[true,false],50],[[true,true],100],[[true,true,false],67]] as const){db.history=correct.map((value,index)=>answer(String(index),value));const result=selectHomeLearningData(db,starterPack,now)!;assert.equal(result.accuracy,expected);assert.equal(result.samples,correct.length)}
 assert.equal(selectHomeLearningData(db,starterPack,new Date(NaN)),null)
 db.history=[answer('invalid-date',true)];db.history[0].at='invalid';assert.equal(selectHomeLearningData(db,starterPack,now)!.accuracy,null)
})
test('同一词多次到期答题计事件次数，读取不凭词ID去重或改写历史',()=>{
 const db=freshDatabase();db.history=[answer('a',false,'review_due'),answer('b',true,'review_due')]
 assert.equal(selectHomeLearningData(db,starterPack,now)!.reviewEvents,2)
 // Older saved history keeps its original definition; no speculative migration on read.
 db.history.push(answer('legacy',true,'practice'));db.practiceAnswers=[answer('separate',true,'practice')]
 assert.equal(selectHomeLearningData(db,starterPack,now)!.effectiveEvents,3)
})
test('跨午夜按设备本地日期刷新，系统时间前后调整不残留旧日或写记录',()=>{
 const db=freshDatabase(),beforeMidnight=new Date(2026,9,20,23,59,59),afterMidnight=new Date(2026,9,21,0,0,1)
 db.history=[answer('old',false,'review_due',beforeMidnight),answer('new',true,'new_word',afterMidnight)];const snapshot=JSON.stringify(db)
 assert.equal(selectHomeLearningData(db,starterPack,beforeMidnight)!.accuracy,0);assert.equal(selectHomeLearningData(db,starterPack,afterMidnight)!.accuracy,100)
 assert.equal(selectHomeLearningData(db,starterPack,new Date(2026,9,22))!.accuracy,null);assert.equal(selectHomeLearningData(db,starterPack,beforeMidnight)!.reviewEvents,1);assert.equal(JSON.stringify(db),snapshot)
})
test('学习数据与开心图标保持透明与规格，不包含私有源图元数据',async()=>{
 for(const file of [...['heading','accuracy','new','review','effective'].map(name=>`src/static/icons/home-learning-data/${name}.png`),'src/static/icons/companion/clay-smile.png']){
  const bytes=await fs.readFile(file),meta=await sharp(bytes).metadata();assert.equal(meta.width,256);assert.equal(meta.height,256);assert(meta.hasAlpha)
  const pixels=await sharp(bytes).ensureAlpha().raw().toBuffer();assert.equal(pixels[3],0);assert.equal(pixels[pixels.length-1],0)
  for(let offset=8;offset<bytes.length;){const size=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert(['IHDR','IDAT','IEND','PLTE','tRNS'].includes(type));offset+=size+12}
 }
})
