import type {Word} from '../../../packages/core_learning'
import {wordById} from '../../../packages/content_schema'
import {readFeedbackSettings} from '../../stores/feedback'
import {audioPlayback} from './AudioPlaybackService'
export {audioPlayback,AudioPlaybackService} from './AudioPlaybackService'
export interface WordAudio {wordId:string;url:string;accent?:'US'|'UK'}
export function getWordAudio(wordId:string):WordAudio{return {wordId,url:wordById[wordId]?.audio||''}}
export function playWord(word:Word,onError?:(message:string)=>void){
 if(!readFeedbackSettings().sound){audioPlayback.stop();onError?.('学习发音已关闭，可在设置中开启。');return Promise.resolve()}
 return audioPlayback.play(word.audio).catch(error=>onError?.((error as Error).message))
}
export function stopAudio(){audioPlayback.stop()}
