import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ConfusingLettersMap,confusingLetters} from '../packages/phonics/confusing-letters'
import {normalizeSpellingWord,makeBlockDraft,placeLetter,composeBlockAnswer,spellingInputReady,validBlockDraft} from '../packages/phonics/letter-blocks'
import {isCorrectSpelling} from '../packages/phonics'

test('字母池增加 3～5 项，包含目标字母相关的易混项，短元音与清浊音都可练习',()=>{
 assert(ConfusingLettersMap.b.includes('p'));assert(ConfusingLettersMap.a.includes('e'))
 for(const word of ['bag','cat','book','letter','schoolbag','a','I','a few',"that's enough"]){
  const challenge=normalizeSpellingWord(word,'fixed'),extras=challenge.tiles.filter(tile=>tile.id.startsWith('distractor-'))
  assert(extras.length>=3&&extras.length<=5);assert.equal(new Set(extras.map(tile=>tile.char)).size,extras.length)
  assert.equal(challenge.tiles.length,challenge.slots.length+extras.length)
  assert(extras.every(tile=>tile.group===-1));assert.deepEqual(challenge,normalizeSpellingWord(word,'fixed'))
 }
 assert(confusingLetters(['b','a','g']).includes('p'));assert(confusingLetters(['b','a','g']).includes('e'));assert.deepEqual(confusingLetters([]),[])
})

test('多种种子都不会把答案排在字母池开头，干扰项能被选中但仍按原拼写判错',()=>{
 for(let seed=0;seed<100;seed++){const challenge=normalizeSpellingWord('cat',seed);assert.notEqual(challenge.letterPool.slice(0,3).join(''),'cat')}
 const challenge=normalizeSpellingWord('cat','wrong'),extra=challenge.tiles.find(tile=>tile.char==='e')!
 let draft=makeBlockDraft(challenge,'w','wrong')
 for(const char of ['c','a'])draft=placeLetter(challenge,draft,challenge.tiles.find(tile=>tile.char===char)!.id)
 draft=placeLetter(challenge,draft,extra.id)
 assert.equal(composeBlockAnswer(challenge,draft),'cae');assert(spellingInputReady('cae',{id:'w',word:'cat'},draft));assert.equal(isCorrectSpelling('cae',{word:'cat'} as any),false)
})

test('旧版只有答案字母的积木草稿仍能恢复，重复字母和固定标点不丢失',()=>{
 const challenge=normalizeSpellingWord("that's enough",'saved'),legacy={...challenge,tiles:challenge.tiles.filter(tile=>!tile.id.startsWith('distractor-'))}
 const draft=makeBlockDraft(legacy,'w','saved',"that's e")
 assert(validBlockDraft(challenge,draft,'w','saved'));assert.equal(composeBlockAnswer(challenge,draft),"that's e_____")
 assert.equal(normalizeSpellingWord('room 1').supported,false)
})
