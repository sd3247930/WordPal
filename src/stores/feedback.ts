import {defineStore} from 'pinia'
import {ref,watch} from 'vue'
import {readStorage,writeStorage} from '../services/storage'
export interface FeedbackSettings {sound:boolean;haptics:boolean}
const key='wordpal.feedback.v1'
const defaults:FeedbackSettings={sound:true,haptics:true}
export function readFeedbackSettings(){return {...defaults,...readStorage<FeedbackSettings>(key,defaults)}}
export const useFeedbackStore=defineStore('feedback',()=>{
 const settings=ref(readFeedbackSettings()),storageError=ref('')
 watch(settings,value=>{try{writeStorage(key,value);storageError.value=''}catch{storageError.value='声音与触感暂时无法保存，请释放设备空间后重试。'}},{deep:true,flush:'sync'})
 return {settings,storageError}
})
