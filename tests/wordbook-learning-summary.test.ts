import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import type {Answer} from '../packages/core_learning'
import {newCard} from '../packages/srs_fsrs'
import {familiarityFor} from '../src/services/content/FamiliaritySelector'
import {summarizeWordbookLearning} from '../src/services/content/WordbookLearningSummary'
import {wordbookPageIcons} from '../src/services/wordbook-page-icons'

const now=Date.parse('2026-10-24T08:00:00Z')
function answer(wordId:string,day:number,extra:Partial<Answer>={}):Answer{return {id:wordId+':'+day,wordId,at:`2026-10-${String(day).padStart(2,'0')}T08:00:00Z`,mode:'spell',source:'practice',correct:true,rating:3,input:'',...extra}}

// 六个真实等级聚合后仍互斥，旧复习卡不被误认为已掌握或学习中。
test('六状态汇总为四个互斥阶段，掌握仍需跨天与真正到期的证据',()=>{
 const states=[
  familiarityFor('unseen',undefined,[],now),
  familiarityFor('introduced',undefined,[answer('introduced',20,{mode:'flash'})],now),
  familiarityFor('practicing',undefined,[answer('practicing',20)],now),
  familiarityFor('familiar',undefined,[answer('familiar',20),answer('familiar',21)],now),
  familiarityFor('mastered',undefined,[answer('mastered',20),answer('mastered',21),answer('mastered',22,{source:'review_due',dueAtSubmit:'2026-10-22T07:00:00Z'})],now),
  familiarityFor('legacy',newCard('legacy',new Date(0)),[],now)
 ]
 assert.deepEqual(states.map(state=>state.level),['unseen','introduced','practicing','familiar','mastered','unrated'])
 const before=JSON.stringify(states),summary=summarizeWordbookLearning(states)
 assert.deepEqual(summary,{mastered:1,learning:3,unseen:1,unrated:1,total:6})
 assert.equal(summary.mastered+summary.learning+summary.unseen+summary.unrated,summary.total)
 assert.equal(JSON.stringify(states),before)
})

// 空范围没有除零或假的掌握百分比；无效旧证据保持待评估。
test('空集合与损坏的旧证据不伪造学习状态',()=>{
 assert.deepEqual(summarizeWordbookLearning([]),{mastered:0,learning:0,unseen:0,unrated:0,total:0})
 const state=familiarityFor('legacy',undefined,[answer('legacy',22,{at:'invalid'})],now)
 assert.equal(state.level,'unrated');assert.equal(summarizeWordbookLearning([state]).unrated,1)
})

// 真实记录增量直接派生新统计；没有新增的可写状态或调度改动。
test('答题记录变化即时投影，浏览与手动重点不构成掌握证据',()=>{
 const card=newCard('cat',new Date(0)),before=JSON.stringify(card)
 assert.equal(summarizeWordbookLearning([familiarityFor('cat',card,[],now)]).mastered,0)
 const evidence=[answer('cat',20),answer('cat',21),answer('cat',22)]
 assert.equal(summarizeWordbookLearning([familiarityFor('cat',card,evidence,now)]).learning,1)
 evidence.push(answer('cat',23,{source:'review_due'}))
 assert.equal(summarizeWordbookLearning([familiarityFor('cat',card,evidence,now)]).mastered,1)
 assert.equal(JSON.stringify(card),before)
})

// 新素材只验证交付约束：透明度、尺寸、元数据与本机引用隔离。
test('四枚单词本页面图标透明、离线且没有源元数据',async()=>{
 for(const icon of Object.values(wordbookPageIcons)){
  const data=await fs.readFile('src'+icon.src),meta=await sharp(data).metadata()
  assert.equal(meta.width,256);assert.equal(meta.height,256);assert(meta.hasAlpha)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type));offset+=length+12}
 }
})
