import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import sharp from 'sharp'
import {createPinia,setActivePinia} from 'pinia'
import {createPet} from '../packages/pet_engine'
import {newCard} from '../packages/srs_fsrs'
import {useProfileStore} from '../src/stores/profile'
import {usePetStore,cosmetics} from '../src/stores/pet'
import {loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {petDressIconNames,petDressIconSource,petDressIconSvg,isPetDressIconName} from '../src/services/pet-dress-icons'
import {activeVisualVersion} from '../src/services/pet-lifehouse/VisualPack'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw new Error('Quota');storage.set(key,value)}}
function reset(){storage.clear();fail=false;loadCourseRegistry();setActivePinia(createPinia())}
function withoutDress(db:ReturnType<typeof useProfileStore>['db']){const copy=JSON.parse(JSON.stringify(db));for(const pet of Object.values(copy.pets) as any[])pet.equippedCosmetics=[];return JSON.stringify(copy)}

test('穿戴严格遵守原Lv.2/4/8门槛，替换与取下只修改装扮',()=>{
 for(const level of [1,2,3,4,7,8]){
  reset();const profile=useProfileStore(),pet=usePetStore();profile.transact(db=>{db.pets.water={...createPet('water'),level,exp:(level-1)*100};db.cards.cat=newCard('cat');db.gems=17});const before=withoutDress(profile.db)
  for(const item of cosmetics){const allowed=level>=item.level;assert.equal(pet.equip(item.id),allowed);if(allowed){assert.deepEqual(pet.current.equippedCosmetics,[item.id]);assert.equal(pet.equip(item.id),true);assert.deepEqual(pet.current.equippedCosmetics,[])}assert.equal(withoutDress(profile.db),before)}
  assert.equal(pet.equip('missing'),false);assert.equal(withoutDress(profile.db),before)
 }
})
test('装扮跨重启恢复，各宠独立且不同槽位同时保留',()=>{
 reset();let pet=usePetStore();const profile=useProfileStore();profile.transact(db=>{db.pets.water={...createPet('water'),level:8,exp:700};db.pets.fire={...createPet('fire'),level:4,exp:300}})
 assert.equal(pet.equip('ribbon'),true);assert.equal(pet.equip('star'),true);assert.deepEqual(pet.current.equippedCosmetics,['ribbon','star']);pet.choose('fire');assert.equal(pet.equip('scarf'),true);assert.deepEqual(profile.db.pets.water.equippedCosmetics,['ribbon','star'])
 setActivePinia(createPinia());pet=usePetStore();assert.equal(pet.current.element,'fire');assert.deepEqual(pet.current.equippedCosmetics,['scarf']);pet.choose('water');assert.deepEqual(pet.current.equippedCosmetics,['ribbon','star'])
})
test('磁盘写入失败时穿戴或取下都保持完整原档案',()=>{
 reset();const profile=useProfileStore(),pet=usePetStore();profile.transact(db=>{db.pets.water={...createPet('water'),level:4,exp:300}});pet.equip('ribbon');const before=JSON.stringify(profile.db);fail=true
 assert.equal(pet.equip('scarf'),false);assert.equal(JSON.stringify(profile.db),before);assert.equal(pet.equip('ribbon'),false);assert.equal(JSON.stringify(profile.db),before);assert.match(profile.storageError,/保存失败/)
})

test('新配饰未交付时拒绝穿戴和跨象请求，已有新款可安全取下且不改钱包',()=>{
 reset();const profile=useProfileStore(),pet=usePetStore();profile.transact(db=>{db.pets.water={...createPet('water'),level:8,exp:700};db.gems=73})
 const before=JSON.stringify(profile.db)
 if(activeVisualVersion===1)assert.equal(pet.equip('water-dress-l5-v1'),false)
 assert.equal(pet.equip('fire-dress-l5-v1'),false);assert.equal(JSON.stringify(profile.db),before)
 profile.transact(db=>{db.pets.water.equippedCosmetics=['water-dress-l5-v1']})
 const unchanged=withoutDress(profile.db)
 assert.equal(pet.equip('water-dress-l5-v1'),true);assert.deepEqual(pet.current.equippedCosmetics,[])
 assert.equal(withoutDress(profile.db),unchanged);assert.equal(profile.db.gems,73)
})
test('十二张装扮PNG均为高清透明离线素材，无来源元数据，高对比独立可用',async()=>{
 for(const value of [undefined,null,'unknown','../../private',''])assert.equal(isPetDressIconName(value),false)
 for(const name of petDressIconNames)for(const dark of [false,true])for(const highContrast of [false,true]){
  const data=await readFile('src'+petDressIconSource(name,{dark,highContrast})),meta=await sharp(data).metadata();assert.equal(meta.width,highContrast?512:1024);assert.equal(meta.height,meta.width);assert.equal(meta.hasAlpha,true);assert.ok(!meta.exif&&!meta.xmp&&!meta.iptc&&!meta.icc)
  for(const marker of ['caBX','ChatGPT','OpenAI Media Service'])assert.equal(data.includes(Buffer.from(marker)),false)
  const svg=petDressIconSvg(name,{dark,highContrast});assert.doesNotMatch(svg,/<(?:script|image|text|foreignObject)|(?:href|onload|onclick)=|data:|file:/i);if(highContrast)assert.doesNotMatch(svg,/Gradient|opacity=/)
  const {data:raw,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true});let transparent=0,opaque=0;for(let i=3;i<raw.length;i+=info.channels){if(raw[i]===0)transparent++;if(raw[i]>230)opaque++}assert.ok(transparent>512*512*.1);assert.ok(opaque>512*512*.08)
 }
})
