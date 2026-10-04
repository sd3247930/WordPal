import type {Word} from '../../../packages/core_learning'
import {readFeedbackSettings} from '../../stores/feedback'
let audio:UniApp.InnerAudioContext | undefined
let errorHandler:((error:any)=>void)|undefined
export function playWord(word:Word,onError?:(message:string)=>void){
 if(!readFeedbackSettings().sound){onError?.('学习发音已关闭，可在设置中开启。');return}
 if(!audio)audio=uni.createInnerAudioContext()
 audio.stop();if(errorHandler)audio.offError(errorHandler)
 errorHandler=()=>onError?.('发音暂时无法播放，请检查音量或重新打开应用。')
 audio.onError(errorHandler)
 audio.src=word.audio;audio.play()
}
export function stopAudio(){audio?.destroy();audio=undefined;errorHandler=undefined}
