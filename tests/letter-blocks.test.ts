import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeSpellingWord,makeBlockDraft,placeLetter,removeLetter,composeBlockAnswer,validBlockDraft,blocksComplete,spellingInputReady} from '../packages/phonics/letter-blocks'
import {isCorrectSpelling} from '../packages/phonics'

for(const [word,counts,total]of [['doctor',[6],6],['food group',[4,5],9],['a few',[1,3],4],["that's enough",[5,6],11],['Merry Christmas!',[5,9],14],['be late for school',[2,4,3,6],15],['well-known',[4,5],9]] as const)test('分组、固定符号与字母总数：'+word,()=>{
 const challenge=normalizeSpellingWord(word,'frozen-key'),draft=makeBlockDraft(challenge,'word','frozen-key')
 assert.equal(challenge.supported,true);assert.equal(challenge.tiles.length,total);assert.equal(new Set(challenge.tiles.map(tile=>tile.id)).size,total)
 assert.deepEqual([...new Set(challenge.slots.map(slot=>slot.group))].map(group=>challenge.slots.filter(slot=>slot.group===group).length),counts)
 assert(challenge.tiles.every(tile=>/^\p{Script=Latin}/u.test(tile.char)));assert.equal(composeBlockAnswer(challenge,draft),'');assert.equal(blocksComplete(challenge,draft),false)
 let current=draft
 for(const slot of challenge.slots){const tile=challenge.tiles.find(tile=>tile.char===slot.char.toLowerCase()&&!current.assignments.includes(tile.id))!;current=placeLetter(challenge,current,tile.id)}
 const answer=composeBlockAnswer(challenge,current);assert.equal(blocksComplete(challenge,current),true);assert.equal(isCorrectSpelling(answer,{word} as any),true);assert.equal(spellingInputReady(answer,{word,id:'word'},current),true)
})

test('相同种子刷新不重新洗牌，重复字母按 ID 消耗、移除保留其他位置，撤销可恢复',()=>{
 const challenge=normalizeSpellingWord('letter','same'),draft=makeBlockDraft(challenge,'w','same'),letters=challenge.tiles.filter(tile=>tile.char==='t')
 assert.deepEqual(challenge.tiles,normalizeSpellingWord('letter','same').tiles)
 const first=placeLetter(challenge,draft,letters[1].id),second=placeLetter(challenge,first,letters[0].id);assert.equal(placeLetter(challenge,second,letters[1].id),second)
 const removed=removeLetter(second,0);assert.equal(removed.assignments[0],null);assert.equal(removed.assignments[1],letters[0].id);assert.deepEqual(removed.history,[1]);assert.equal(removed.assignments.includes(letters[1].id),false)
 const restored=JSON.parse(JSON.stringify(removed));assert(validBlockDraft(challenge,restored,'w','same'));assert.deepEqual(restored,removed);assert.equal(validBlockDraft(challenge,restored,'w','next'),false)
 const filled=placeLetter(challenge,removed,letters[1].id);assert.equal(filled.assignments[0],letters[1].id);assert.equal(filled.assignments[1],letters[0].id)
})

test('池字母顺序不是正确答案，填满不自动判正确，空格和固定标点仍参与原判题',()=>{
 const word="that's enough",challenge=normalizeSpellingWord(word,'wrong');let draft=makeBlockDraft(challenge,'w','wrong')
 for(const tile of challenge.tiles)draft=placeLetter(challenge,draft,tile.id)
 assert(blocksComplete(challenge,draft));assert.equal(isCorrectSpelling(composeBlockAnswer(challenge,draft),{word} as any),false)
 for(const wrong of ['thatsenough',"that'senough",'thats enough',"that s enough"])assert.equal(isCorrectSpelling(wrong,{word} as any),false,wrong)
 assert.equal(isCorrectSpelling('  THAT’S   ENOUGH  ',{word} as any),true);assert.equal(isCorrectSpelling('well‑known',{word:'well-known'} as any),true);assert.equal(isCorrectSpelling('well known',{word:'well-known'} as any),false)
 assert.equal(isCorrectSpelling('Merry Christmas',{word:'Merry Christmas!'} as any),false)
})

test('支持 NFC 附加符号，异常字符显式键盘降级，数字不伪装成字母',()=>{
 const accent=normalizeSpellingWord('cafe\u0301');assert.equal(accent.tiles.length,4);assert(accent.tiles.some(tile=>tile.char==='é'));assert.equal(isCorrectSpelling('café',{word:'cafe\u0301'} as any),true)
 for(const word of ['room 1','hello 😀','', 'q'.repeat(30)]){const challenge=normalizeSpellingWord(word);assert.equal(challenge.supported,false);assert(challenge.reason)}
 const phrase=normalizeSpellingWord('one two three four five six seven eight nine ten');assert.equal(phrase.supported,true);assert(phrase.tiles.length>24)
})

test('半填草稿和伪造重复 ID 不能提交，键盘输入沿用原判分并保留原文',()=>{
 const challenge=normalizeSpellingWord('doctor','question'),draft=makeBlockDraft(challenge,'w','question','do'),partial=composeBlockAnswer(challenge,draft)
 assert.equal(partial,'do____');assert.equal(spellingInputReady(partial,{word:'doctor',id:'w'},draft),false)
 const corrupt={...draft,assignments:challenge.slots.map(()=>challenge.tiles[0].id)};assert.equal(validBlockDraft(challenge,corrupt,'w','question'),false);assert.equal(spellingInputReady('doctor',{word:'doctor',id:'w'},corrupt),false)
 assert.equal(spellingInputReady('docotr',{word:'doctor',id:'w'},{...draft,inputMode:'keyboard'}),true);assert.equal(isCorrectSpelling('docotr',{word:'doctor'} as any),false)
 const original=normalizeSpellingWord('Merry Christmas!');assert.equal(original.originalWord,'Merry Christmas!');assert.equal(original.normalizedWord,'merry christmas!')
})
