import {defineStore} from 'pinia'
import {computed,ref} from 'vue'
import {elements,type Element} from '../../packages/pet_engine'
import {readStorage,writeStorage} from '../services/storage'
import {allCourseLearningProgress,displayPetForm,type PetForm} from '../services/pet-growth'
import {usePetStore} from './pet'
import {useProfileStore} from './profile'

export const petFormsKey='wordpal.pets.forms.v1'
export const usePetFormsStore=defineStore('pet-forms',()=>{
 const pets=usePetStore(),saved=readStorage<unknown>(petFormsKey,null)
 const profile=useProfileStore(),curriculum=computed(()=>allCourseLearningProgress(profile.db))
 const preferences=ref<Partial<Record<Element,PetForm>>>({}),error=ref('')
 if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const id of elements){
  const value=(saved as Record<string,unknown>)[id]
  if(value===1||value===2||value===3||value===4)preferences.value[id]=value
 }
 function stage(element:Element){return displayPetForm(pets.all.find(p=>p.element===element)!,preferences.value[element],curriculum.value.complete)}
 function choose(element:Element,form:number){
  if(!elements.includes(element)||![1,2,3,4].includes(form)||displayPetForm(pets.all.find(p=>p.element===element)!,form,curriculum.value.complete)!==form)return false
  const next={...preferences.value,[element]:form as PetForm}
  try{writeStorage(petFormsKey,next);preferences.value=next;error.value='';return true}
  catch{error.value='形态偏好暂未保存，请稍后重试。';return false}
 }
 return {stage,choose,error,curriculum}
})
