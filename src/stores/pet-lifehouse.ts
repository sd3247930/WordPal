import {currentSceneReady} from '../services/pet-lifehouse/CurrentScenePack'
import {computed,ref,nextTick} from 'vue'
import {defineStore} from 'pinia'
import {useProfileStore} from './profile'
import {usePetFormsStore} from './pet-forms'
import {executeHouseCommand,houseErrorText} from '../services/pet-lifehouse/HouseCommands'
import {emptyLifeHouse,inspectLifeHouse} from '../services/pet-lifehouse/HouseValidation'
import {houseCatalogVersion} from '../services/pet-lifehouse/HouseRegistry'
import type {HouseCommand,LifeHouseDomain,HouseResult} from '../services/pet-lifehouse/types'
import type {Element} from '../../packages/pet_engine'
import {activeVisualVersion} from '../services/pet-lifehouse/VisualPack'
import {scenePackReady,type SceneActorSource} from '../services/pet-lifehouse/SceneVisualPack'
import {backupBeforeHouseMigration} from '../services/pet-lifehouse/HouseMigration'
import {equippedItems} from '../services/pet-lifehouse/DressCatalog'

export const usePetLifeHouseStore=defineStore('pet-lifehouse',()=>{
 const profile=useProfileStore(),forms=usePetFormsStore(),busy=ref(false),queued=ref(false),message=ref('')
 const initial=emptyLifeHouse(),state=computed(()=>inspectLifeHouse(profile.db.lifeHouse))
 const domain=computed<LifeHouseDomain>(()=>state.value==='ready'?profile.db.lifeHouse as LifeHouseDomain:initial)
 const protectedHouse=computed(()=>state.value==='invalid'||state.value==='future')
 const unavailable=computed(()=>profile.readOnly||protectedHouse.value)
 const protectionMessage=computed(()=>protectedHouse.value?(state.value==='future'?'家园档案来自较新版本，已保护原数据。请更新应用后再布置。':'家园档案暂不能安全读取，原数据已保留。可在家长区导出备份。'):profile.readOnly?'当前档案处于保护状态，恢复后即可继续布置。':'')
 const appearanceByElement=new Map<Element,{form:number;equipment:string;source:SceneActorSource}>()
 function currentEquipment(element:Element){return equippedItems(profile.db.pets[element]?.equippedCosmetics??[],element)}
 function noteAppearance(element:Element,source:SceneActorSource){appearanceByElement.set(element,{form:forms.stage(element),equipment:currentEquipment(element).join(','),source})}
 function context(element:Element,at:string){const form=forms.stage(element),cosmetics=currentEquipment(element),cosmetic=cosmetics[0]??null,a=appearanceByElement.get(element),actual=a?.form===form&&a.equipment===cosmetics.join(',')?a.source:undefined;return{at,form,cosmetic,...(scenePackReady?{sceneRevision:currentSceneReady?3 as const:2 as const}:{}),...(scenePackReady?{cosmetics}:{}),assetVersion:scenePackReady?3 as const:activeVisualVersion,actorVariant:actual?.variantId??`original-${element}-f${form}`,fitRevision:actual?.fitRevision??0}}
 function makeCommand(element:Element,body:Omit<HouseCommand,'requestId'|'expectedRevision'|'catalogVersion'|'element'>):HouseCommand{return {requestId:`house:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,12)}`,expectedRevision:domain.value.revision,catalogVersion:houseCatalogVersion,element,...body}}
 function preview(command:HouseCommand):HouseResult{
  if(unavailable.value)return {ok:false,error:'protected'}
  const pet=profile.db.pets[command.element]
  return executeHouseCommand(profile.db,command,context(command.element,new Date().toISOString()))
 }
 function commit(command:HouseCommand):HouseResult|undefined{
  if(busy.value||queued.value)return
  const quote=preview(command)
  if(!quote.ok){message.value=houseErrorText(quote);return quote}
  if(quote.replayed){message.value='这次操作已经保存，不会重复扣费。';return quote}
  if(scenePackReady&&!backupBeforeHouseMigration(profile.db,currentSceneReady?4:3)){message.value='升级前备份暂未写入，小屋和灵石都没有改变，请释放空间后再试。';return}
  busy.value=true
  try{
   // No await between revalidation and the existing single-key transaction.
   let result:HouseResult|undefined
   const saved=profile.transact(draft=>{result=executeHouseCommand(draft,command,context(command.element,quote.receipt.at));if(result.ok){draft.gems=result.gems;draft.lifeHouse=result.domain}})
   if(!result)return
   if(!result.ok){message.value=houseErrorText(result);return result}
   if(!saved){message.value='家园暂未保存，灵石和物品都没有改变。请释放设备空间后重试。';return}
   message.value=result.response;return result
  }finally{busy.value=false}
 }
 async function submit(command:HouseCommand){
  if(busy.value||queued.value)return
  queued.value=true;message.value='正在保存小屋，请稍等一下。'
  // Let the view paint its saving state before the existing synchronous durable write.
  await nextTick();await new Promise<void>(resolve=>setTimeout(resolve,48))
  queued.value=false
  return commit(command)
 }
 return {domain,state,busy:computed(()=>busy.value||queued.value),message,protectedHouse,unavailable,protectionMessage,makeCommand,preview,commit,submit,noteAppearance}
})
