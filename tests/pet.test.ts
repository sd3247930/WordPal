import test from 'node:test'
import assert from 'node:assert/strict'
import {createPet,growPet,feedPet,applyLearningReward} from '../packages/pet_engine'
import {freshDatabase} from '../src/stores/profile'
import {newCard} from '../packages/srs_fsrs'
test('四宠独立，升级进化不改变 SRS',()=>{
 const pets=['water','fire','earth','wind'].map(e=>createPet(e as any))
 const grown=growPet(pets[0],{source:'review_due',exp:710,affection:200},Date.now())
 assert.equal(grown.level,8);assert.equal(grown.evolutionStage,3);assert.equal(grown.affection,100);assert.equal(pets[1].exp,0)
 const db=freshDatabase();db.cards.cat=newCard('cat');const before=JSON.stringify(db.cards)
 const answer={id:'a1',wordId:'cat',rating:3,correct:true,at:new Date().toISOString(),source:'review_due',mode:'flash',input:''} as any
 applyLearningReward(db,answer);const gems=db.gems;applyLearningReward(db,answer)
 assert.equal(db.gems,gems);assert.equal(db.pets.water.exp,12);assert.equal(JSON.stringify(db.cards),before)
})
test('喂养每天最多一份，不加学习经验、不让灵石负数',()=>{
 const pet=createPet('earth');const poor=feedPet(pet,4);assert.equal(poor.success,false);assert.equal(poor.gems,4)
 const first=feedPet(pet,10,'2026-10-03');assert.equal(first.success,true);assert.equal(first.gems,5);assert.equal(first.pet.exp,0)
 const again=feedPet(first.pet,first.gems,'2026-10-03');assert.equal(again.success,false)
 assert.equal(first.pet.affection,5);assert.equal('hunger' in first.pet,false);assert.equal('dead' in first.pet,false)
})
test('日任务只按真实历史奖励一次',()=>{
 const db=freshDatabase();for(let i=0;i<6;i++){const answer={id:`a${i}`,wordId:'cat',rating:3,correct:true,at:new Date().toISOString(),source:'new_word',mode:'spell',input:'cat'} as any;db.history.push(answer);applyLearningReward(db,answer)}
 assert.equal(db.gems,13);assert.equal(db.pets.water.exp,82);assert.equal(db.rewardIds.filter(id=>id.startsWith('daily-task:')).length,1)
})
