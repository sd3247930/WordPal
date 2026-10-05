import type {PhonicsChunk,PhonicsData} from './types'
export type PhonicsTiming='exact'|'weighted'|'visual'
export interface ChunkTime {index:number;startMs:number;endMs:number}
export interface PhonicsTimeline {kind:PhonicsTiming;times:ChunkTime[]}
export const chunkWeight=(chunk:PhonicsChunk):number=>!chunk.phoneme.trim()?0:chunk.type==='ending'?1.5:/[aeiouæɑɒɔɛɜəɪʊʌ]/.test(chunk.phoneme)?1.3:.85
export function buildTimeline(data:PhonicsData,durationMs:number|null,currentTimeAvailable:boolean):PhonicsTimeline{
 const explicit=data.chunks.every(c=>c.startMs!==undefined&&c.endMs!==undefined)
 if(explicit&&currentTimeAvailable&&(durationMs===null||data.chunks[data.chunks.length-1].endMs!<=durationMs+30))return {kind:'exact',times:data.chunks.map((c,index)=>({index,startMs:c.startMs!,endMs:c.endMs!}))}
 const known=currentTimeAvailable&&durationMs!==null&&Number.isFinite(durationMs)&&durationMs>0
 const weights=data.chunks.map(chunkWeight),total=weights.reduce((a,b)=>a+b,0);let cursor=0
 return {kind:known?'weighted':'visual',times:data.chunks.map((c,index)=>{const startMs=cursor;cursor+=known?durationMs!*weights[index]/(total||1):weights[index]===0?0:c.type==='ending'?450:weights[index]>1?420:300;return {index,startMs,endMs:cursor}})}
}
export function activeChunkAt(timeline:PhonicsTimeline,positionMs:number):number|null{
 if(!Number.isFinite(positionMs)||positionMs<0)return null
 const spoken=timeline.times.filter(t=>t.endMs>t.startMs),last=spoken[spoken.length-1]
 return spoken.find(t=>positionMs>=t.startMs&&(positionMs<t.endMs||t===last&&positionMs===t.endMs))?.index??null
}
