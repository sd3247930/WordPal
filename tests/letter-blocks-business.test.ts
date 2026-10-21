import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {useActivitiesStore} from '../src/stores/activities'
import {useCustomPracticeStore} from '../src/stores/custom-practice'
import {normalizeSpellingWord,makeBlockDraft,placeLetter,composeBlockAnswer} from '../packages/phonics/letter-blocks'
import {answerDailyWord} from './helpers/daily-flow'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value),removeStorageSync:(key:string)=>storage.delete(key)}
function fresh(){storage.clear();setActivePinia(createPinia());const profile=useProfileStore();profile.transact(db=>{db.gems=3;db.abilityLevel='L1'});return {profile,learning:useLearningStore()}}
function assembled(word:{id:string;word:string},key:string,correct=true){const challenge=normalizeSpellingWord(word.word,key);let draft=makeBlockDraft(challenge,word.id,key);const order=correct?challenge.slots.map(slot=>slot.char.toLowerCase()):challenge.tiles.map(tile=>tile.char)
 for(const char of order){const tile=challenge.tiles.find(tile=>tile.char===char&&!draft.assignments.includes(tile.id))!;draft=placeLetter(challenge,draft,tile.id)}
 return {input:composeBlockAnswer(challenge,draft),letterDraft:draft,inputAssistance:'tiles' as const}
}

test('正式拼写默认无辅助；主动使用积木标记辅助且不跳过原提示扣费或重复结算',()=>{
 const {profile,learning}=fresh();assert(learning.start());while(learning.session!.mode!=='spell')answerDailyWord(learning);assert.equal(learning.session!.inputAssistance,undefined)
 const session=learning.session!,word=learning.current!,key=[session.id,word.id,session.mode,session.index].join(':'),before=profile.db.gems
 const partial=makeBlockDraft(normalizeSpellingWord(word.word,key),word.id,key);learning.patch({input:word.word,letterDraft:partial,inputAssistance:'tiles'});assert.equal(learning.submit(),false)
 learning.patch(assembled(word,key));assert.equal(profile.db.gems,before);assert(learning.hint());assert.equal(profile.db.gems,before-1);assert(learning.hint());assert.equal(profile.db.gems,before-1)
 assert(learning.submit());assert.equal(learning.submit(),false);const answer=learning.session!.answers[session.index];assert.equal(answer.correct,true);assert.equal(answer.inputAssistance,'tiles');assert.equal(answer.hinted,true);assert.equal(answer.rating,2)
 assert(learning.next());assert.equal(learning.session!.letterDraft,undefined);assert.equal(learning.session!.inputAssistance,undefined)
})

test('自定义积木保存草稿、冷恢复后继续，练习证据保留辅助标识且正式学习不变',()=>{
 const {profile}=fresh(),custom=useCustomPracticeStore();custom.openConfig();custom.count='1';custom.singleMode='spell';assert.equal(custom.start(),'started')
 const word=custom.current!,key=custom.token,before=JSON.parse(JSON.stringify({history:profile.db.history,cards:profile.db.cards,pets:profile.db.pets,gems:profile.db.gems,courseProgress:profile.db.courseProgress}))
 custom.patch(assembled(word,key));const snapshot=JSON.stringify(custom.session!.letterDraft);custom.pause();setActivePinia(createPinia());const restored=useCustomPracticeStore();assert.equal(JSON.stringify(restored.session!.letterDraft),snapshot);assert(restored.resume());assert(restored.submit());assert.equal(restored.submit(),false)
 const after=useProfileStore().db;assert.deepEqual({history:after.history,cards:after.cards,pets:after.pets,gems:after.gems,courseProgress:after.courseProgress},before);assert.equal(after.practiceAnswers!.at(-1)!.inputAssistance,'tiles');assert.equal(after.practiceAnswers!.at(-1)!.hinted,true)
})

test('字母拼装答错后重试不覆盖首次答错，重复确认和完成不重复记录',()=>{
 const {profile}=fresh(),activity=useActivitiesStore();assert(activity.start('letters'));const word=activity.current!,key=[activity.state!.id,word.id,0].join(':');const correct=assembled(word,key),letters=correct.letterDraft.assignments
 const reversed={...correct.letterDraft,assignments:[...letters].reverse()};activity.blockInput({input:composeBlockAnswer(normalizeSpellingWord(word.word,key),reversed),letterDraft:reversed,inputAssistance:'tiles'});assert(activity.submit());assert.equal(activity.state!.answers[0].correct,false);assert.equal(activity.submit(),false)
 assert(activity.retry());activity.blockInput(correct);assert(activity.submit());assert.equal(activity.state!.retryAnswer!.correct,true);assert.equal(activity.state!.answers[0].correct,false);assert.equal(activity.state!.retryAttempts!.length,1);assert.equal(profile.db.history.length,0);assert.equal(profile.db.gems,3)
})
