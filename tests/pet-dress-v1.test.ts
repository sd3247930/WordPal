import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {createPinia,setActivePinia} from 'pinia'
import {elements,createPet} from '../packages/pet_engine'
import {useProfileStore} from '../src/stores/profile'
import {usePetStore} from '../src/stores/pet'
import {dressCatalog,newDressItems,dressDefinition,equipmentBySlot,equippedItems,toggleEquipment,validEquipment} from '../src/services/pet-lifehouse/DressCatalog'
import {equipmentLayers} from '../src/services/pet-lifehouse/DressRenderer'
import {executeHouseCommand} from '../src/services/pet-lifehouse/HouseCommands'
import {validLifeHouse} from '../src/services/pet-lifehouse/HouseValidation'
import manifest from '../src/static/pet-house/lifehouse/dress-v1/manifest.json'
import originalManifest from '../src/static/pet-house/lifehouse/manifest.json'

test('九件新物品三类各三款，18件目录沿用原等级解锁，不重命名旧道具',()=>{
 assert.equal(newDressItems.length,9);assert.equal(new Set(newDressItems.map(i=>i.id)).size,9)
 for(const slot of ['head','neck','badge'])assert.equal(newDressItems.filter(i=>i.slot===slot).length,3)
 for(const element of elements){const list=dressCatalog(element);assert.equal(list.length,18);assert.equal(new Set(list.map(i=>i.id)).size,18);for(const item of list)assert.ok([2,4,8].includes(item.level));assert.equal(dressDefinition('star',element)?.slot,'badge');assert.equal(dressDefinition('scarf',element)?.slot,'neck')}
})
test('每槽独立互斥，未知旧记录保留，读档不修改源数组，连点按实际次数切换',()=>{
 const original=['unknown-future-item','ribbon'],before=JSON.stringify(original)
 let next=toggleEquipment(original,'dress-cloud-clip-v1','water')!;next=toggleEquipment(next,'star','water')!
 assert.deepEqual(equipmentBySlot(next,'water'),{neck:'ribbon',head:'dress-cloud-clip-v1',badge:'star'})
 next=toggleEquipment(next,'dress-cloud-scarf-v1','water')!;assert.ok(!next.includes('ribbon'));assert.ok(next.includes('unknown-future-item'))
 next=toggleEquipment(next,'star','water')!;assert.equal(equipmentBySlot(next,'water').badge,undefined);assert.equal(equippedItems(next,'water').length,2)
 for(let i=0;i<3;i++)next=toggleEquipment(next,'star','water')!
 assert.equal(equipmentBySlot(next,'water').badge,'star');assert.equal(JSON.stringify(original),before)
 assert.equal(toggleEquipment(next,'fire-dress-l5-v1','water'),undefined)
 assert.equal(validEquipment(['ribbon','scarf'],'water'),false);assert.equal(validEquipment(['missing'],'water'),false)
})
test('144个新增组合的两种母图坐标、透明资源与旋转边界均合法；三槽组合徽章挂点独立',()=>{
 let combinations=0
 for(const element of elements)for(const form of [1,2,3,4] as const)for(const item of newDressItems){
  combinations++
  for(const mode of ['chibi','original-fallback'] as const){
   const layers=equipmentLayers(element,form,[item.id],mode);assert.equal(layers.length,item.slot==='neck'?2:1)
   for(const layer of layers){const r=layer.rect!;assert.ok(Object.values(r).every(Number.isFinite));const angle=r.rotation*Math.PI/180,w=r.width/2,h=r.height/2;for(const x of [-w,w])for(const y of [-h,h]){const px=r.x+w+x*Math.cos(angle)-y*Math.sin(angle)/.75,py=r.y+h+x*Math.sin(angle)*.75+y*Math.cos(angle);assert.ok(px>=0&&px<=1&&py>=0&&py<=1,element+form+item.id)}}
  }
 }
 assert.equal(combinations,144)
 for(const element of elements)for(const form of [1,2,3,4] as const){const ids=['dress-cloud-clip-v1','dress-cloud-scarf-v1','dress-dream-moon-v1'];const layers=equipmentLayers(element,form,ids,'chibi');assert.equal(layers.filter(l=>l.depth==='front').length,3);assert.equal(new Set(layers.map(l=>l.key)).size,layers.length);const solo=equipmentLayers(element,form,[ids[2]],'chibi')[0];assert.notEqual(layers.find(l=>l.slot==='badge')!.rect!.y,solo.rect!.y)}
})
test('30份正式PNG摘要、透明通道、尺寸、来源元数据均通过；原16张母图未改',async()=>{
 const hashes=new Set<string>()
 for(const item of manifest.items)for(const file of item.files){const bytes=await fs.readFile('src/static/pet-house/lifehouse/dress-v1/'+file.path),meta=await sharp(bytes).metadata();assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);assert.equal(meta.width,file.width);assert.equal(meta.height,file.height);assert.ok(meta.hasAlpha&&!meta.exif&&!meta.xmp&&!meta.iptc&&!meta.icc);assert.ok(!(await sharp(bytes).stats()).isOpaque);for(const mark of ['caBX','ChatGPT','OpenAI Media Service'])assert.ok(!bytes.includes(Buffer.from(mark)));if(file.layer==='front'){assert.ok(!hashes.has(file.sha256));hashes.add(file.sha256)}}
 for(const source of originalManifest.companionSources){const bytes=await fs.readFile(`src/static/pet-house/growth/${source.element}-${['juvenile','growing','evolved','unknown'][source.form-1]}.png`);assert.equal(createHash('sha256').update(bytes).digest('base64'),source.sha256Base64)}
})
test('真实事务支持三槽、跨象恢复、等级校验、写失败回滚，学习与灵石无改动',()=>{
 const previous=(globalThis as any).uni,storage=new Map<string,string>();let fail=false
 ;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('full');storage.set(key,value)}}
 try{
  setActivePinia(createPinia());const profile=useProfileStore();let pet=usePetStore();profile.transact(db=>{for(const element of elements)db.pets[element]={...createPet(element),level:8,exp:700};db.gems=173})
  const ids=['dress-dew-wreath-v1','dress-cloud-scarf-v1','dress-courage-sun-v1']
  for(const id of ids)assert.equal(pet.equip(id),true)
  assert.equal(equippedItems(pet.current.equippedCosmetics,'water').length,3)
  const before=JSON.stringify(profile.db);fail=true;assert.equal(pet.equip('dress-wish-bow-v1'),false);assert.equal(JSON.stringify(profile.db),before);assert.equal(pet.equip(ids[0]),false);assert.equal(JSON.stringify(profile.db),before);fail=false
  pet.choose('fire');assert.deepEqual(pet.current.equippedCosmetics,[]);pet.equip('dress-moon-crown-v1');setActivePinia(createPinia());pet=usePetStore();assert.deepEqual(pet.current.equippedCosmetics,['dress-moon-crown-v1']);pet.choose('water');assert.deepEqual(pet.current.equippedCosmetics,ids);assert.equal(useProfileStore().db.gems,173)
  useProfileStore().transact(db=>{db.pets.earth.level=1});pet.choose('earth');assert.equal(pet.equip(ids[0]),false)
 }finally{(globalThis as any).uni=previous}
})
test('穿新三槽装备仍能升级房屋；新留影冻结三槽，旧留影按原协议恢复',()=>{
 const cosmetics=['dress-cloud-clip-v1','dress-cloud-scarf-v1','dress-dream-moon-v1'],command={requestId:'dress-upgrade',expectedRevision:0,catalogVersion:1 as const,element:'water' as const,kind:'upgrade' as const,targetLevel:1}
 const result=executeHouseCommand({gems:1000},command,{at:'2026-10-28T10:00:00Z',form:1,assetVersion:3,cosmetic:cosmetics[0],cosmetics})
 assert.ok(result.ok);assert.equal(result.gems,700);assert.ok(validLifeHouse(result.domain));assert.deepEqual(result.domain.memoryEvents.at(-1)!.snapshot.cosmetics,cosmetics)
 cosmetics.pop();assert.equal(result.domain.memoryEvents.at(-1)!.snapshot.cosmetics!.length,3)
 assert.equal(executeHouseCommand({gems:1000},command,{at:'2026-10-28T10:00:00Z',assetVersion:3,cosmetics:['ribbon','scarf']}).ok,false)
})
