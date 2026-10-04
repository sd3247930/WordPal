import {defineStore} from 'pinia'
import {ref} from 'vue'
import {elements,type Element} from '../../packages/pet_engine'
import {readStorage,writeStorage} from '../services/storage'
import {useProfileStore} from './profile'

export const petHouseAppearanceKey='wordpal.pethouse.appearance.v1'
export function validPetScene(value:unknown,fallback:Element='water'):Element{return elements.includes(value as Element)?value as Element:fallback}
export const usePetHouseStore=defineStore('pet-house',()=>{
 const saved=readStorage<{sceneId?:unknown}|null>(petHouseAppearanceKey,null)
 const sceneId=ref<Element>(validPetScene(saved?.sceneId,validPetScene(useProfileStore().db.companion))),error=ref('')
 function setScene(id:Element){
  if(!elements.includes(id)||id===sceneId.value)return
  try{writeStorage(petHouseAppearanceKey,{sceneId:id});sceneId.value=id;error.value=''}catch{error.value='场景偏好暂未保存，请稍后重试。'}
 }
 return {sceneId,error,setScene}
})
