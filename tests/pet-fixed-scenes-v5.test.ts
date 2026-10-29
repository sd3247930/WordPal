import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {elements} from '../packages/pet_engine'
import {allSceneDefinitions,sceneDefinition,interactionAvailability,sceneObstacles} from '../src/services/pet-lifehouse/SceneConfig'
import {fixedSceneKeys,validateFixedScene} from '../src/services/pet-lifehouse/FixedSceneLayouts'
import {sceneAsset} from '../src/services/pet-lifehouse/SceneVisualPack'
import {scenePath,walkablePoint} from '../src/services/pet-lifehouse/SceneGeometry'
import {executeHouseCommand} from '../src/services/pet-lifehouse/HouseCommands'
import {validLifeHouse,safeLifeHouseWrite} from '../src/services/pet-lifehouse/HouseValidation'
import type {HouseAccount,HouseCommand,HouseLevel,LifeHouseDomain} from '../src/services/pet-lifehouse/types'
import foregrounds from '../src/static/pet-house/lifehouse/v5/manifest.json'
const at='2026-10-28T08:00:00Z'
let id=0
function apply(a:HouseAccount,e:typeof elements[number],body:Partial<HouseCommand>,revision:1|2=2){const result=executeHouseCommand(a,{requestId:'fixed-test:'+id++,expectedRevision:(a.lifeHouse as LifeHouseDomain)?.revision??0,catalogVersion:1,element:e,kind:'upgrade',...body},{at,form:2,assetVersion:3,sceneRevision:revision,actorVariant:`chibi-${e}-f2-r1`,fitRevision:1});assert.ok(result.ok,JSON.stringify(result));a.gems=result.gems;a.lifeHouse=result.domain;return result}

test('24套固定场景独立注册，高清底图、逐级槽位与固定接触点合法',()=>{
 assert.equal(new Set(fixedSceneKeys).size,24);const backgrounds=new Set<string>()
 for(const scene of allSceneDefinitions(2)){
  assert.deepEqual(validateFixedScene(scene,id=>!!sceneAsset(id)),[]);backgrounds.add(scene.zones[0].backgroundAsset!);assert.equal(scene.revision,2);assert.ok(scene.zones.every(z=>walkablePoint(z.spawn,z.walkable)));assert.ok(scene.growth!.newSlots.length||scene.growth!.newZones.length||scene.level===0)
  const previous=scene.level?sceneDefinition(scene.element,(scene.level-1) as HouseLevel):undefined;if(previous)assert.ok(previous.slots.every(s=>scene.slots.some(n=>n.id===s.id&&n.zoneId===s.zoneId)))
 }
 assert.equal(backgrounds.size,24)
})

test('四象六级各互动使用可达接触点，固定安全锚点不会落在家具障碍中',()=>{
 for(const e of elements){const a:HouseAccount={gems:100000};for(let level=0;level<=5;level++){
  if(level)apply(a,e,{targetLevel:level});if(level===3){apply(a,e,{kind:'place',furnitureId:'common-garden',slotId:'garden'});apply(a,e,{kind:'place',furnitureId:'common-table',slotId:'activity'})}if(level===4)apply(a,e,{kind:'place',furnitureId:'common-chime',slotId:'extra'});const house=(a.lifeHouse as LifeHouseDomain|undefined)?.housesByElement[e]??{level:0,owned:[],slots:{},lastUpgradeAt:null},scene=sceneDefinition(e,level as HouseLevel)
  for(const action of scene.interactions){const availability=interactionAvailability(action,scene,house,()=>true);if(availability.ready){assert.ok(availability.zone);assert.ok(scenePath(availability.zone.spawn,availability.target,availability.zone.walkable,sceneObstacles(scene,house,availability.zone.id)),`${e}:${level}:${action.name}`)}}
 }}
})

test('新场景首次明确交易升级schema3，旧留影与所有权不改，退款和重放规则保留',()=>{
 const a:HouseAccount={gems:100000};apply(a,'water',{targetLevel:1},1);apply(a,'water',{targetLevel:2},1);const old=a.lifeHouse as LifeHouseDomain,events=JSON.stringify(old.memoryEvents),inventory=JSON.stringify(old.housesByElement.water.owned),gems=a.gems
 const result=apply(a,'water',{targetLevel:3});assert.equal(result.domain.schemaVersion,3);assert.equal(a.gems,gems-1500);assert.equal(JSON.stringify(result.domain.housesByElement.water.owned),inventory);assert.equal(JSON.stringify(result.domain.memoryEvents.slice(0,old.memoryEvents.length)),events);assert.equal(result.domain.memoryEvents.at(-1)?.snapshot.scene?.revision,2);assert.ok(validLifeHouse(result.domain));assert.equal(safeLifeHouseWrite(result.domain,{...result.domain,schemaVersion:2}),false)
 const request:HouseCommand={requestId:'v5-repeat',catalogVersion:1,expectedRevision:result.domain.revision,element:'water',kind:'place',furnitureId:'water-bed',slotId:'left'}
 const first=executeHouseCommand(a,request,{at,form:2,assetVersion:3,sceneRevision:2});assert.ok(first.ok);const second=executeHouseCommand({gems:first.gems,lifeHouse:first.domain},request,{at,form:2,assetVersion:3,sceneRevision:2});assert.ok(second.ok&&second.replayed);assert.equal(second.gems,first.gems);assert.equal(first.domain.housesByElement.water.owned.filter(i=>i.furnitureId==='water-bed').length,1)
 const archived=old.memoryEvents.at(-1)!.snapshot.scene!;assert.equal(archived.revision,1);const oldScene=sceneDefinition('water',2,1);assert.deepEqual(archived.actorAnchor,oldScene.zones[0].spawn)
})

test('24份前景来自已发布高清底图，透明且没有C2PA/EXIF元数据',async()=>{
 for(const file of foregrounds.files){const source='src/static/pet-house/lifehouse/v2/rooms/'+file.sourceKey.replace('room-','').replace('-l','/l').replace(':stage','.jpg'),raw=await fs.readFile(source),bytes=await fs.readFile('src/static/pet-house/lifehouse/v5/'+file.path),meta=await sharp(bytes).metadata();assert.equal(createHash('sha256').update(raw).digest('base64'),file.sourceSHA256Base64);assert.equal(createHash('sha256').update(bytes).digest('base64'),file.sha256Base64);assert.equal(meta.width,1536);assert.equal(meta.height,1024);assert.ok(meta.hasAlpha);assert.equal(meta.exif,undefined);assert.equal(meta.xmp,undefined);assert.equal(bytes.includes(Buffer.from('caBX')),false);const original=await sharp(raw).ensureAlpha().raw().toBuffer(),pixels=await sharp(bytes).ensureAlpha().raw().toBuffer();let wrong=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]===0){if(pixels[i]||pixels[i+1]||pixels[i+2])wrong++}else if(pixels[i]!==original[i]||pixels[i+1]!==original[i+1]||pixels[i+2]!==original[i+2])wrong++}assert.equal(wrong,0,'Visible pixels must match the clean source; invisible RGB must be cleared')}
})
