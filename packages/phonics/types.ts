export type PhonicsChunkType='single'|'digraph'|'trigraph'|'blend'|'rime'|'silent-e'|'ending'
export interface PhonicsChunk {
 id:string;grapheme:string;phoneme:string;start:number;end:number
 startMs?:number;endMs?:number;type?:PhonicsChunkType
}
export interface PhonicsData {chunks:PhonicsChunk[];syllables?:string[];stressIndex?:number}
export type PhonicsSource='content'|'dictionary'|'rule'|'whole'
export interface ResolvedPhonics {data:PhonicsData;source:PhonicsSource}
export type PhonicsPlaybackState='idle'|'playing'|'ended'|'error'
