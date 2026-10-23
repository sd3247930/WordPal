import {defineStore} from 'pinia'
import {ref} from 'vue'
import {readStorage,writeStorage} from '../services/storage'
import type {LetterBlockDraft} from '../../packages/phonics/letter-blocks'

export type SpellingInputMode=LetterBlockDraft['inputMode']
export const spellingInputPreferenceKey='wordpal.spelling-input.v1'

/** Device preference only; answers, drafts and assistance evidence stay per question. */
export const useSpellingInputStore=defineStore('spelling-input',()=>{
 const saved=readStorage<unknown>(spellingInputPreferenceKey,null)
 const mode=ref<SpellingInputMode|null>(saved==='tiles'||saved==='keyboard'?saved:null),storageError=ref('')
 function preferred(defaultTiles:boolean):SpellingInputMode{return mode.value||(defaultTiles?'tiles':'keyboard')}
 function select(next:SpellingInputMode){
  if(mode.value===next&&!storageError.value)return
  mode.value=next
  try{writeStorage(spellingInputPreferenceKey,next);storageError.value=''}
  catch{storageError.value='输入方式暂未保存，本次仍会沿用。请检查设备存储空间。'}
 }
 return {mode,storageError,preferred,select}
})
