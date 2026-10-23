import test from 'node:test'
import assert from 'node:assert/strict'
import {activityAvailability,activityNames} from '../src/services/course/ActivityAvailability'
import {starterPack,wordById} from '../src/services/content/ContentRegistry'
import type {CourseLesson} from '../packages/content_schema/course'
import type {ActivityKind} from '../src/stores/activities'

const lesson:CourseLesson={id:'availability',title:'合成活动课',wordIds:['cat','dog']}
const pool=[wordById.cat,wordById.dog]
const check=(kind:ActivityKind,changes:Partial<CourseLesson>={},words=pool,known:Record<string,unknown>={},due:string[]=[])=>activityAvailability(kind,starterPack,{...lesson,...changes},words,known,due)
test('十一项菜单保留稳定顺序，空词表和单词量不足的选择题不能假启用',()=>{
 assert.deepEqual(Object.keys(activityNames),['check','pair','letters','sentence','cloze','story','picture','listen-picture','phonics','challenge','speed'])
 assert.equal(check('letters',{},[]).available,false)
 for(const kind of ['pair','challenge','speed'] as const){assert.equal(check(kind,{},[pool[0]]).available,false);assert.equal(check(kind).available,true)}
 assert.equal(check('letters',{},[pool[0]]).available,true)
})
test('整课检查沿用已学与到期复习条件，不写入或推断六环节进度',()=>{
 assert.equal(check('check').reason,'先学新词');assert.equal(check('check',{},pool,{cat:{},dog:{}},['cat']).reason,'先完成复习');assert.equal(check('check',{},pool,{cat:{},dog:{}}).available,true)
})
test('缺失故事实体、例句、合法拼读片段与音频时锁定，补齐资源立即可用',()=>{
 assert.equal(check('story',{storyId:'missing-story'}).reason,'暂无故事')
 const pack={...starterPack,stories:[{id:'ready-story',title:'合成故事',sentences:['A cat.'],targetWordIds:['cat']}]}
 assert.equal(activityAvailability('story',pack,{...lesson,storyId:'ready-story'},pool,{},[]).available,true)
 const empty=pool.map(w=>({...w,example:'',phonics:[],phonemes:[],audio:''}))
 assert.equal(check('sentence',{},empty).reason,'暂无例句');assert.equal(check('cloze',{},empty).available,false);assert.equal(check('sentence',{examples:{cat:'The cat sits.'}},empty).available,true)
 assert.equal(check('phonics',{},empty).reason,'暂无规则');assert.equal(check('phonics',{},pool.map(w=>({...w,phonics:['c','at'],phonemes:['k']}))).available,false);assert.equal(check('phonics').available,true)
})
test('听音选图需要现有的两份词图与目标音频，检查只读不改变输入',()=>{
 const one=pool.map((w,i)=>({...w,image:i?'':'/static/icons/study-compact/picture.png'})),both=one.map(w=>({...w,image:'/static/icons/study-compact/picture.png'}))
 assert.equal(check('listen-picture',{},one).reason,'词图不足');assert.equal(check('listen-picture',{},both).available,true);assert.equal(check('listen-picture',{},both.map(w=>({...w,audio:''}))).available,false)
 const before=JSON.stringify({starterPack,lesson,pool});for(const kind of Object.keys(activityNames) as ActivityKind[])check(kind);assert.equal(JSON.stringify({starterPack,lesson,pool}),before)
})
