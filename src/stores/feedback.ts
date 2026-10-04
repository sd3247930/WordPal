import {defineStore} from 'pinia'
import {ref,watch} from 'vue'
import {readStorage,writeStorage} from '../services/storage'
export interface FeedbackSettings {sound:boolean;haptics:boolean}
const key='wordpal.feedback.v1'
const defaults:FeedbackSettings={sound:true,haptics:true}
export function readFeedbackSettings(){return {...defaults,...readStorage<FeedbackSettings>(key,defaults)}}
export const useFeedbackStore=defineStore('feedback',()=>{
 const settings=ref(readFeedbackSettings())
 watch(settings,value=>writeStorage(key,value),{deep:true,flush:'sync'})
 return {settings}
})
