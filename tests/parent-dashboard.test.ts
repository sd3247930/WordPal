import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {freshDatabase} from '../src/stores/profile'
import {localDate,type Answer,type LearningSession} from '../packages/core_learning'
import {customCourse} from './helpers/custom-course'
import {selectParentDashboard,parentLearningCsv,parentLearningRecords} from '../src/services/parent/ParentDashboardData'
import {parseCsv} from '../src/services/course-import/ImportWizard'
import {parentSettingsArtwork,parentSettingsArtworkSrc} from '../src/services/parent-settings-artwork'
const pack=customCourse('parent-metrics',8),now=new Date(2026,9,24,12)
const answer=(id:string,date:Date,source:Answer['source']='new_word'):Answer=>({id,wordId:pack.vocabulary[0].id,courseId:pack.courseId,at:date.toISOString(),source,mode:'flash',input:'',rating:3,correct:true})
function plan(date=localDate(now)):LearningSession{const ids=pack.vocabulary.slice(0,5).map(w=>w.id);return {id:'parent-plan',courseId:pack.courseId,startedAt:new Date(2026,9,23,12).toISOString(),date,kind:'new_word',wordIds:ids,index:0,mode:'flash',input:'',selected:'',revealed:false,answers:[],flow:{schemaVersion:1,step:'flash',entryLevel:1,target:5,completed:{flash:ids,connect:[],listen:[],spell:[],dictation:[],consolidate:[]},attempts:[]}}}
test('本地七个自然日、跨午夜、去重和未来/无效记录；独立练习不混入正式统计，选择器不写数据',()=>{
 const db=freshDatabase(),a=answer('today',new Date(2026,9,24,0,0));db.history=[answer('first',new Date(2026,9,18,12)),answer('old',new Date(2026,9,17,12)),answer('last',new Date(2026,9,23,23,59)),a,{...a},answer('extra',now,'practice'),answer('future',new Date(2026,9,25)),{...a,id:'invalid',at:'invalid'}];db.practiceAnswers=[answer('custom',now,'practice')]
 const before=JSON.stringify(db),s=selectParentDashboard(db,pack,now)!
 assert.equal(s.days[0].date,'2026-10-18');assert.equal(s.days[6].date,'2026-10-24');assert.equal(s.learningDays,3);assert.equal(s.days.reduce((n,d)=>n+d.count,0),3);assert.equal(s.days[6].count,1);assert.equal(JSON.stringify(db),before);assert.equal(selectParentDashboard(db,pack,new Date(NaN)),null)
})
test('四项任务与首页同源，跨日未完成明确待续，过去已完成任务不冒充今日进度',()=>{
 const db=freshDatabase(),p=plan();db.courseProgress={[pack.courseId]:{currentLessonId:'',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},dailyPlan:p}}
 assert.deepEqual(selectParentDashboard(db,pack,now)!.tasks,{done:1,total:4,carried:false});p.date='2026-10-23';assert.equal(selectParentDashboard(db,pack,now)!.tasks!.carried,true)
 const flow=p.flow!;p.completedAt=new Date(2026,9,23,13).toISOString();flow.step='consolidate';for(const step of Object.keys(flow.completed) as (keyof typeof flow.completed)[])flow.completed[step]=[...p.wordIds];flow.finishedDate='2026-10-23';assert.equal(selectParentDashboard(db,pack,now)!.tasks,null)
 p.flow!.finishedDate='2026-10-24';assert.deepEqual(selectParentDashboard(db,pack,now)!.tasks,{done:4,total:4,carried:false})
})
test('教材完整学习词数不等于安装比例，排除其他教材及不在本册的完成标记',()=>{
 const db=freshDatabase();db.courseProgress={[pack.courseId]:{currentLessonId:'',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},curriculumSchema:1,fullLearnedWords:{[pack.vocabulary[0].id]:'2026-10-24',[pack.vocabulary[1].id]:'2026-10-24',other:'2026-10-24'}}}
 assert.deepEqual(selectParentDashboard(db,pack,now)!.course,{total:8,learned:2,units:1});assert.equal(selectParentDashboard(freshDatabase(),pack,now)!.learningDays,0)
})
test('CSV 只导出正式记录，真实字段可往返解析且阻止表格公式执行，不是 JSON 备份',()=>{
 const db=freshDatabase(),a={...answer('=SUM(1,2)',now),wordId:'word,"quoted"\nnext'};db.history=[a,{...a},answer('practice',now,'practice')]
 const csv=parentLearningCsv(db),rows=parseCsv(csv).map(row=>row.values)
 assert.equal(csv[0],'\ufeff');assert.equal(rows.length,2);assert.equal(rows[0][3],'单词ID');assert.equal(rows[1][0],"'=SUM(1,2)");assert.equal(rows[1][3],a.wordId);assert.equal(parentLearningRecords(db).length,1);assert.equal(rows[1][6],'新词学习');assert(!csv.includes('practice'));assert.throws(()=>JSON.parse(csv))
})
test('二十四枚图标真实存在、透明、规格正确，PNG 不含来源及隐私元数据',async()=>{
 assert.equal(Object.keys(parentSettingsArtwork).length,24)
 for(const name of Object.keys(parentSettingsArtwork) as (keyof typeof parentSettingsArtwork)[]){const data=await fs.readFile('src'+parentSettingsArtworkSrc(name)),m=await sharp(data).metadata();assert.equal(m.width,name==='heading'?512:256);assert.equal(m.height,name==='heading'?320:256);assert.equal(m.hasAlpha,true);for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind),name+':'+kind);offset+=length+12}}
})
