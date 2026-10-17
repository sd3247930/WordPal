import localVoices from '../../src/content/local-courses/audio-fallbacks.json'
import type {Word} from '../core_learning'
export interface OfflineVoice {lemma:string;audio:string;locale:string}
const normalize=(word:string)=>word.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
/** Add a local system clip only when the original word has no playable recording. */
export function withOfflineWordAudio(word:Word|undefined,voices:ReadonlyArray<OfflineVoice>=localVoices):Word|undefined{
 if(!word||word.audio)return word
 const voice=voices.find(item=>normalize(item.lemma)===normalize(word.word)&&item.locale==='en-US'&&/^\/static\/local-master-audio\/[a-f0-9]{20}\.wav$/.test(item.audio))
 return voice?{...word,audio:voice.audio,audioUS:voice.audio,tags:[...(word.tags||[]),'offline-system-fallback-en-us']}:word
}
