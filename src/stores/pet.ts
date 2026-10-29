import {defineStore} from 'pinia'
import {computed} from 'vue'
import {createPet,elements,feedPet,petInfo,type Element} from '../../packages/pet_engine'
import {useProfileStore} from './profile'
import {itemDesign,designWearable} from '../services/pet-lifehouse/ItemVisualRegistry'
import {designDressUnlocked} from '../services/pet-lifehouse/DesignWearables'
import {inspectLifeHouse} from '../services/pet-lifehouse/HouseValidation'
import type {LifeHouseDomain} from '../services/pet-lifehouse/types'
import {legacyCosmetics,dressDefinition,hasDressAssets,toggleEquipment} from '../services/pet-lifehouse/DressCatalog'
import {displayPetForm,allCourseLearningProgress} from '../services/pet-growth'
import {readStorage} from '../services/storage'
export const cosmetics=legacyCosmetics
export const usePetStore=defineStore('pet',()=>{
 const profile=useProfileStore()
 if(elements.some(e=>!profile.db.pets[e]))profile.transact(d=>{elements.forEach(e=>{d.pets[e]??=createPet(e)})})
 const current=computed(()=>profile.db.pets[profile.db.companion]??createPet(elements.includes(profile.db.companion as Element)?profile.db.companion as Element:'water'))
 const info=computed(()=>petInfo[current.value.element])
 const all=computed(()=>elements.map(e=>profile.db.pets[e]??createPet(e)))
 function choose(element:Element){return profile.transact(d=>{d.companion=element})}
 function feed(){let success=false;const saved=profile.transact(d=>{const result=feedPet(current.value,d.gems);success=result.success;if(success){d.pets[current.value.element]=result.pet;d.gems=result.gems}});return saved&&success}
 function equip(id:string){
  const definition=dressDefinition(id,current.value.element),removing=current.value.equippedCosmetics.includes(id)
  if(!definition)return false
  // Resolve the actual active form without creating a second forms store or a store cycle.
  const preferences=readStorage<Partial<Record<Element,number>>>('wordpal.pets.forms.v1',{})
  const form=displayPetForm(current.value,preferences?.[current.value.element],allCourseLearningProgress(profile.db).complete)
  if(!removing&&(current.value.level<definition.level||!hasDressAssets(definition,current.value.element,form)))return false
  const legacy=cosmetics.find(c=>c.id===id),design=itemDesign(id)
  if(legacy){if(!removing&&current.value.level<legacy.level)return false}
  else if(definition.kind==='design'){
   if(!design||design.module!=='dress'||design.element!==current.value.element)return false
   const houseLevel=inspectLifeHouse(profile.db.lifeHouse)==='ready'?(profile.db.lifeHouse as LifeHouseDomain).housesByElement[current.value.element].level:undefined
   if(!removing&&(!designDressUnlocked(design,current.value,houseLevel)||!designWearable(id,current.value.element,form)))return false
  }
  const element=current.value.element
  return profile.transact(d=>{const p=d.pets[element],next=toggleEquipment(p.equippedCosmetics,id,element);if(next)p.equippedCosmetics=next})
 }
 return {current,info,all,choose,feed,equip}
})
