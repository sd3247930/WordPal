/** Presentation data only. Final correctness stays in the existing spelling service. */
export interface BlockUnit {id:string;kind:'letter'|'fixed'|'space';char:string;group:number;letterIndex?:number}
export interface LetterTile {id:string;char:string;group:number}
export interface SpellingChallenge {originalWord:string;normalizedWord:string;wordsArray:string[];units:BlockUnit[];slots:BlockUnit[];tiles:LetterTile[];letterPool:string[];supported:boolean;reason:string}
export interface LetterBlockDraft {version:1;wordId:string;source:string;questionKey:string;inputMode:'tiles'|'keyboard';assignments:(string|null)[];history:number[]}
export interface SpellingInputChange {input:string;letterDraft?:LetterBlockDraft;inputAssistance?:'tiles'}
export function canonicalSpelling(value:string){return value.normalize('NFC').replace(/[\u2018\u2019\u02bc]/g,"'").replace(/[\u2010\u2011]/g,'-').trim().replace(/\s+/g,' ')}
// The native app service can run on an older JS engine without Unicode property escapes.
const combining=/^[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]$/
const latinLetter=/^[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u024f\u1e00-\u1eff][\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]*$/
function glyphs(value:string){const result:string[]=[];for(const char of value.normalize('NFC')){if(combining.test(char)&&result.length)result[result.length-1]+=char;else result.push(char)}return result}
function seedOf(value:string){let seed=2166136261;for(const char of value){seed^=char.codePointAt(0)!;seed=Math.imul(seed,16777619)}return seed>>>0}
export function normalizeSpellingWord(originalWord:string,seed:string|number=''):SpellingChallenge{
 const source=originalWord.normalize('NFC').trim().replace(/\s+/g,' '),units:BlockUnit[]=[],tiles:LetterTile[]=[];let group=0,reason=''
 for(const [index,char]of glyphs(source).entries()){
  const id='unit-'+index
  if(char===' '){units.push({id,kind:'space',char,group});group++;continue}
  if(latinLetter.test(char)){const letterIndex=tiles.length;units.push({id,kind:'letter',char,group,letterIndex});tiles.push({id:'tile-'+letterIndex,char:char.toLowerCase(),group})}
  else if(/^[’‘ʼ'\-‐‑.,!?;:()]$/u.test(char)){units.push({id,kind:'fixed',char,group});if(/[-‐‑]/u.test(char))group++}
  else{units.push({id,kind:'fixed',char,group});reason='这个词条包含特殊字符，请使用键盘完整输入。'}
 }
 if(!tiles.length)reason='这个词条暂无可拼装字母，请使用键盘输入。'
 if(source.length>240||tiles.some(tile=>tiles.filter(other=>other.group===tile.group).length>24))reason='这个词条较长，请使用键盘完整输入。'
 const pool=[...tiles];let random=seedOf(String(seed)+':'+source)
 for(let i=pool.length-1;i>0;i--){random=(Math.imul(random,1664525)+1013904223)>>>0;const j=random%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]]}
 return {originalWord,normalizedWord:canonicalSpelling(source).toLowerCase(),wordsArray:source.split(' '),units,slots:units.filter(unit=>unit.kind==='letter'),tiles:pool,letterPool:pool.map(tile=>tile.char),supported:!reason,reason}
}
export function validBlockDraft(challenge:SpellingChallenge,draft:LetterBlockDraft|undefined,wordId:string,key:string):draft is LetterBlockDraft{
 if(!draft||draft.version!==1||draft.wordId!==wordId||draft.source!==challenge.originalWord||draft.questionKey!==key||!['tiles','keyboard'].includes(draft.inputMode)||!Array.isArray(draft.assignments)||draft.assignments.length!==challenge.slots.length||!Array.isArray(draft.history))return false
 const ids=new Set(challenge.tiles.map(tile=>tile.id)),used=draft.assignments.filter((id):id is string=>id!==null)
 return used.every(id=>ids.has(id))&&new Set(used).size===used.length&&draft.history.length===used.length&&draft.history.every(index=>Number.isInteger(index)&&index>=0&&index<draft.assignments.length&&!!draft.assignments[index])&&new Set(draft.history).size===draft.history.length
}
export function makeBlockDraft(challenge:SpellingChallenge,wordId:string,key:string,input='',inputMode:'tiles'|'keyboard'='tiles'):LetterBlockDraft{
 const draft:LetterBlockDraft={version:1,wordId,source:challenge.originalWord,questionKey:key,inputMode,assignments:challenge.slots.map(()=>null),history:[]},raw=glyphs(canonicalSpelling(input)),used=new Set<string>()
 for(let index=0;index<raw.length&&index<challenge.units.length;index++){
  const unit=challenge.units[index],char=raw[index]
  if(unit.kind!=='letter'){if(canonicalSpelling(char)!==canonicalSpelling(unit.char))break;continue}
  const tile=challenge.tiles.find(tile=>!used.has(tile.id)&&tile.char===char.toLowerCase())
  if(!tile)break;draft.assignments[unit.letterIndex!]=tile.id;used.add(tile.id);draft.history.push(unit.letterIndex!)
 }
 return draft
}
export function placeLetter(challenge:SpellingChallenge,draft:LetterBlockDraft,tileId:string){
 const index=draft.assignments.indexOf(null)
 if(index<0||!challenge.tiles.some(tile=>tile.id===tileId)||draft.assignments.includes(tileId))return draft
 const next={...draft,assignments:[...draft.assignments],history:[...draft.history,index]};next.assignments[index]=tileId;return next
}
export function removeLetter(draft:LetterBlockDraft,index:number){
 if(!Number.isInteger(index)||index<0||index>=draft.assignments.length||!draft.assignments[index])return draft
 const next={...draft,assignments:[...draft.assignments],history:draft.history.filter(value=>value!==index)};next.assignments[index]=null;return next
}
export function composeBlockAnswer(challenge:SpellingChallenge,draft:LetterBlockDraft){
 if(!draft.assignments.some(Boolean))return ''
 const tiles=new Map(challenge.tiles.map(tile=>[tile.id,tile.char]));return challenge.units.map(unit=>unit.kind==='letter'?tiles.get(draft.assignments[unit.letterIndex!]||'')||'_':unit.char).join('')
}
export function blocksComplete(challenge:SpellingChallenge,draft:LetterBlockDraft){return challenge.supported&&draft.assignments.length===challenge.slots.length&&draft.assignments.length>0&&draft.assignments.every(id=>id!==null)}
export function spellingInputReady(input:string,word:{word:string;id:string},draft?:LetterBlockDraft){
 if(!input.trim())return false
 if(!draft||draft.inputMode==='keyboard')return true
 const challenge=normalizeSpellingWord(word.word,draft.questionKey)
 return validBlockDraft(challenge,draft,word.id,draft.questionKey)&&blocksComplete(challenge,draft)&&canonicalSpelling(composeBlockAnswer(challenge,draft))===canonicalSpelling(input)
}
