import test from 'node:test'
import assert from 'node:assert/strict'
import Ajv from 'ajv'
import schema from '../packages/content_schema/word.schema.json'
import content from '../src/content/starter.json'
import { FSRSScheduler, LegacyScheduleStrategy, migrateLegacy, newCard } from '../packages/srs_fsrs'
import { canUnlockNextUnit } from '../packages/core_learning'
import { words, validateRelations } from '../packages/content_schema'
import { isCorrectSpelling } from '../packages/phonics'
test('原创词表通过 JSON Schema 和关系校验',()=>{
 const validate=new Ajv().compile(schema);assert.ok(validate(content),JSON.stringify(validate.errors));validateRelations(content)
 assert.throws(()=>validateRelations({...content,words:[...words,words[0]]}))
})
test('FSRS 四档反馈有不同时间且无需固定日程',()=>{
 const now=new Date('2026-10-03T08:00:00Z');const scheduler=new FSRSScheduler();const card=newCard('cat',now)
 const results=([1,2,3,4] as const).map(r=>scheduler.schedule(card,r,now))
 assert.ok(+new Date(results[0].nextDue)<+new Date(results[3].nextDue))
 for(const r of results){assert.equal(r.card.strategy,'fsrs');assert.equal(r.card.reps,1);assert.ok(r.card.stability>0)}
 assert.equal(card.reps,0)
})
test('到期卡片排序，持久化后恢复日期',()=>{
 const now=new Date('2026-10-03T08:00:00Z');const old=newCard('cat',new Date(+now-1000));const future=newCard('dog',new Date(+now+1000))
 const cards=JSON.parse(JSON.stringify([future,old]));assert.deepEqual(new FSRSScheduler(cards).getDueCards(now).map(c=>c.wordId),['cat'])
 assert.equal(new FSRSScheduler().schedule(cards[1],3,now).card.reps,1)
})
test('旧固定日程迁移保留到期日且后续仅 FSRS',()=>{
 const now=new Date('2026-10-03T08:00:00Z');const old=new LegacyScheduleStrategy().schedule(newCard('cat',now),3,now).card
 const migrated=migrateLegacy(old);assert.equal(migrated.due,old.due);assert.equal(migrated.strategy,'fsrs')
 assert.equal(new FSRSScheduler().schedule(migrated,3,new Date(old.due)).card.strategy,'fsrs')
})
test('低于 80% 不解锁下一课程；拼写不受首尾空白大小写影响',()=>{
 const correct=(value:boolean)=>({correct:value}) as any
 assert.equal(canUnlockNextUnit([correct(true),correct(false)]),false)
 assert.equal(canUnlockNextUnit([correct(true),correct(true),correct(true),correct(true),correct(false)]),true)
 assert.equal(isCorrectSpelling(' CAT ',words[0]),true);assert.equal(isCorrectSpelling('dog',words[0]),false)
})
