import type {Word} from '../core_learning'
import type {PhonicsChunk,PhonicsChunkType,PhonicsData,ResolvedPhonics} from './types'
const types=new Set(['single','digraph','trigraph','blend','rime','silent-e','ending'])
export function validPhonicsData(word:string,value:unknown):value is PhonicsData{
 const data=value as PhonicsData
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['chunks','syllables','stressIndex'].includes(k))||!Array.isArray(data.chunks)||!data.chunks.length||data.chunks.length>64)return false
 let end=0,time=0;const ids=new Set<string>()
 for(const c of data.chunks){
  if(!c||typeof c!=='object'||Object.keys(c).some(k=>!['id','grapheme','phoneme','start','end','startMs','endMs','type'].includes(k))||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.grapheme!=='string'||typeof c.phoneme!=='string'||!Number.isInteger(c.start)||!Number.isInteger(c.end)||c.start!==end||c.end<=c.start||c.end>word.length||c.grapheme.toLowerCase()!==word.slice(c.start,c.end).toLowerCase()||c.type!==undefined&&!types.has(c.type)||!c.phoneme.trim()&&c.type!=='silent-e')return false
  ids.add(c.id);end=c.end
  if(c.startMs!==undefined||c.endMs!==undefined){const startMs=c.startMs,endMs=c.endMs;if(typeof startMs!=='number'||typeof endMs!=='number'||!Number.isFinite(startMs)||!Number.isFinite(endMs)||startMs<time||endMs<startMs||endMs===startMs&&(c.type!=='silent-e'||!!c.phoneme.trim())||endMs>120000)return false;time=endMs}
 }
 if(end!==word.length||data.syllables!==undefined&&(!Array.isArray(data.syllables)||data.syllables.some(s=>typeof s!=='string'||!s)))return false
 return data.stressIndex===undefined||Number.isInteger(data.stressIndex)&&data.stressIndex>=0&&!!data.syllables?.length&&data.stressIndex<data.syllables.length
}
function chunkType(letters:string,index:number,total:number):PhonicsChunkType{
 if(letters.length===1)return 'single'
 if(index===total-1&&['le','ed','ing'].includes(letters))return 'ending'
 if(/^([bcdfghjklmnpqrstvwxyz])\1$/.test(letters))return 'blend'
 return letters.length===2?'digraph':letters.length===3?'trigraph':'rime'
}
function fromArrays(word:Word,letters:string[],sounds:string[],syllables=word.syllables):PhonicsData|undefined{
 if(!letters.length||letters.length!==sounds.length||letters.join('').toLowerCase()!==word.word.toLowerCase())return
 let offset=0
 const chunks=letters.map((grapheme,i)=>{const start=offset;offset+=grapheme.length;return {id:word.id+'-'+start,grapheme:word.word.slice(start,offset),phoneme:sounds[i],start,end:offset,type:chunkType(grapheme.toLowerCase(),i,letters.length)}})
 const data={chunks,syllables};return validPhonicsData(word.word,data)?data:undefined
}
// Small, reviewed teaching entries. They never replace course annotations.
const dictionary:Record<string,{letters:string[];sounds:string[];syllables:string[]}>= {
 apple:{letters:['a','pp','le'],sounds:['/æ/','/p/','/əl/'],syllables:['ap','ple']},
 ship:{letters:['sh','i','p'],sounds:['/ʃ/','/ɪ/','/p/'],syllables:['ship']},
 rain:{letters:['r','ai','n'],sounds:['/r/','/eɪ/','/n/'],syllables:['rain']},
 book:{letters:['b','oo','k'],sounds:['/b/','/ʊ/','/k/'],syllables:['book']},
 cake:{letters:['c','a','ke'],sounds:['/k/','/eɪ/','/k/'],syllables:['cake']}
}
const sounds:Record<string,string[]>={
 a:['æ'],e:['e','ɛ'],i:['ɪ'],o:['ɒ','ɑ'],u:['ʌ'],b:['b'],c:['k','s'],d:['d'],f:['f'],g:['ɡ','dʒ'],h:['h'],j:['dʒ'],k:['k'],l:['l'],m:['m'],n:['n'],p:['p'],r:['r'],s:['s','z'],t:['t'],v:['v'],w:['w'],x:['ks'],y:['j'],z:['z'],
 sh:['ʃ'],ch:['tʃ'],th:['θ','ð'],ph:['f'],wh:['w'],ck:['k'],ng:['ŋ'],qu:['kw'],
 ai:['eɪ'],ay:['eɪ'],ee:['iː','i'],ea:['iː','i','e','ɛ'],oa:['əʊ','oʊ'],oo:['uː','ʊ'],ou:['aʊ','ʌ','uː'],ow:['aʊ','əʊ','oʊ'],ar:['ɑː','ɑr'],er:['ɜː','ər','ɜr','ɝ'],ir:['ɜː','ɜr','ɝ'],or:['ɔː','ɔr'],ur:['ɜː','ɜr','ɝ']
}
const normalizeIPA=(ipa:string)=>ipa.replace(/^\[|\]$|^\/|\/$/g,'').replace(/[ˈˌ.\s]/g,'').replace(/g/g,'ɡ').replace(/ʧ/g,'tʃ').replace(/ʤ/g,'dʒ')
export function rulePhonics(word:Word):PhonicsData|undefined{
 const letters=word.word.toLowerCase(),ipa=normalizeIPA(word.ipa||'')
 // A complete reviewed pronunciation must match; prefer supported longer phonograms.
 if(!/^[a-z]{2,30}$/.test(letters)||!ipa||word.tags?.includes('ipa-needs-review'))return
 const solutions:PhonicsChunk[][]=[];let visits=0
 function walk(offset:number,spoken:number,chunks:PhonicsChunk[]){
  if(++visits>4000||solutions.length>0)return
  if(offset===letters.length){if(spoken===ipa.length)solutions.push(chunks);return}
  for(const length of [3,2,1]){
   const grapheme=letters.slice(offset,offset+length);if(grapheme.length!==length)continue
   let variants=sounds[grapheme]||[],type=chunkType(grapheme,offset+length===letters.length?1:0,2)
   if(length===2&&/^([bcdfghjklmnpqrstvwxyz])\1$/.test(grapheme)&&sounds[grapheme[0]])variants=sounds[grapheme[0]]
   if(offset+length===letters.length){if(grapheme==='le'){variants=['əl'];type='ending'}if(grapheme==='ing'){variants=['ɪŋ'];type='ending'}if(grapheme==='ed'){variants=['ɪd','d','t'];type='ending'}if(grapheme==='y')variants=['i','iː','ɪ']}
   const silentEnding=letters.endsWith('e')&&/^[aeiou]$/.test(letters[letters.length-3]||'')&&/^[bcdfgklmnpstvxz]$/.test(letters[letters.length-2]||'')
   if(length===1&&offset===letters.length-3&&silentEnding){const long:Record<string,string[]>={a:['eɪ'],i:['aɪ'],o:['əʊ','oʊ'],u:['juː','uː'],e:['iː']};variants=[...(long[grapheme]||[]),...variants]}
   if(grapheme==='e'&&offset===letters.length-1&&silentEnding){variants=[''];type='silent-e'}
   for(const sound of variants){if(!ipa.startsWith(sound,spoken))continue;walk(offset+length,spoken+sound.length,[...chunks,{id:word.id+'-'+offset,grapheme:word.word.slice(offset,offset+length),phoneme:sound?'/'+sound+'/':'',start:offset,end:offset+length,type}])}
  }
 }
 walk(0,0,[])
 if(visits>4000||solutions.length!==1)return
 const data={chunks:solutions[0],syllables:word.syllables};return validPhonicsData(word.word,data)?data:undefined
}
export function resolvePhonics(word:Word):ResolvedPhonics{
 if(validPhonicsData(word.word,word.phonicsData))return {data:JSON.parse(JSON.stringify(word.phonicsData)),source:'content'}
 const legacy=fromArrays(word,word.phonics||[],word.phonemes||[]);if(legacy)return {data:legacy,source:'content'}
 const entry=dictionary[word.word.toLowerCase()],reviewed=entry&&fromArrays(word,entry.letters,entry.sounds,entry.syllables)
 if(reviewed)return {data:reviewed,source:'dictionary'}
 const rule=rulePhonics(word);if(rule)return {data:rule,source:'rule'}
 return {source:'whole',data:{chunks:[{id:word.id+'-whole',grapheme:word.word,phoneme:word.ipa||'整词发音',start:0,end:word.word.length}],syllables:word.syllables}}
}
