import {defineStore} from 'pinia'
import {computed} from 'vue'
import {createPet,elements,feedPet,petInfo,type Element} from '../../packages/pet_engine'
import {useProfileStore} from './profile'
export const cosmetics=[{id:'ribbon',name:'探索丝带',level:2},{id:'scarf',name:'暖暖围巾',level:4},{id:'star',name:'星星徽章',level:8}]
export const usePetStore=defineStore('pet',()=>{
 const profile=useProfileStore()
 if(elements.some(e=>!profile.db.pets[e]))profile.transact(d=>{elements.forEach(e=>{d.pets[e]??=createPet(e)})})
 const current=computed(()=>profile.db.pets[profile.db.companion]??createPet(elements.includes(profile.db.companion as Element)?profile.db.companion as Element:'water'))
 const info=computed(()=>petInfo[current.value.element])
 const all=computed(()=>elements.map(e=>profile.db.pets[e]??createPet(e)))
 function choose(element:Element){return profile.transact(d=>{d.companion=element})}
 function feed(){let success=false;const saved=profile.transact(d=>{const result=feedPet(current.value,d.gems);success=result.success;if(success){d.pets[current.value.element]=result.pet;d.gems=result.gems}});return saved&&success}
 function equip(id:string){if(!cosmetics.find(c=>c.id===id&&current.value.level>=c.level))return false;return profile.transact(d=>{const p=d.pets[current.value.element];p.equippedCosmetics=p.equippedCosmetics.includes(id)?[]:[id]})}
 return {current,info,all,choose,feed,equip}
})
