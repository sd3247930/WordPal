import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {courseCoverSrc,courseToolsArtwork} from '../src/services/course-tools-artwork'
import {clearLearningProgress} from '../src/services/parent/ClearLearningData'
import {freshDatabase} from '../src/stores/profile'
import {newCard} from '../packages/srs_fsrs'
test('扩展封面按课程ID稳定，不受排序、版本、其他课程加入影响；指定教材优先匹配',()=>{
 const ids=Array.from({length:100},(_,i)=>'imported-'+i),before=ids.map(courseCoverSrc)
 assert.deepEqual([...ids].reverse().map(courseCoverSrc).reverse(),before);assert(new Set(before).size>20)
 for(const source of before)assert.match(source,/course-icon-(0[1-9]|[1-4]\d|50)\.png$/)
 assert.match(courseCoverSrc('starter'),/starter\.png$/);assert.match(courseCoverSrc('fltrp-3start-g5a-u1-u6'),/grade5\.png$/);assert.match(courseCoverSrc('fltrp-3start-g4b'),/grade4\.png$/)
})
test('清理仅重置学习证据、排程、草稿，保留教材选择、等级、资产与防重复奖励标记',()=>{
 const db=freshDatabase();db.currentCourseId='starter';db.cards.cat=newCard('cat',new Date());db.gems=77;db.pets.water.exp=99;db.rewardIds=['reward-already-earned'];db.streakDates=['2026-10-24'];db.pendingCourseId='other';db.courseSessions={};db.customPracticeCursors=[]
 const preserved=JSON.stringify([db.gems,db.pets,db.rewardIds,db.abilityLevel,db.currentCourseId,db.parentSettingsUpdatedAt]);clearLearningProgress(db,['starter'])
 assert.equal(JSON.stringify([db.gems,db.pets,db.rewardIds,db.abilityLevel,db.currentCourseId,db.parentSettingsUpdatedAt]),preserved);assert.deepEqual(db.cards,{});assert.deepEqual(db.history,[]);assert.equal(db.session,null);assert.deepEqual(db.streakDates,[]);assert.equal(db.pendingCourseId,undefined);assert.equal(db.customPractice,null);assert.deepEqual(Object.keys(db.courseProgress!),['starter']);assert.deepEqual(db.courseProgress!.starter.completedLessons,[])
})
test('六张区块图和50张课程封面真实存在、等比透明、无辅助元数据',async()=>{
 const entries=[...Object.keys(courseToolsArtwork).map(n=>['src/static/icons/course-tools/'+n+'.png',n==='heading'?512:256,n==='heading'?320:256] as const),...Array.from({length:50},(_,i)=>['src/static/icons/course-covers/course-icon-'+String(i+1).padStart(2,'0')+'.png',256,256] as const)]
 for(const [file,width,height] of entries){const data=await fs.readFile(file),m=await sharp(data).metadata();assert.equal(m.width,width);assert.equal(m.height,height);assert.equal(m.hasAlpha,true);for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind),file+':'+kind);offset+=length+12}}
})
