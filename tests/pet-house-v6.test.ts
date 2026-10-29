import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {elements} from '../packages/pet_engine'
import {houseIdentity,houseLevelName} from '../src/services/pet-lifehouse/HouseIdentity'
import {currentScenePack,currentSceneReady,currentSceneAsset,poseArt} from '../src/services/pet-lifehouse/CurrentScenePack'
import {sceneDefinition,sceneObstacles,interactionAvailability} from '../src/services/pet-lifehouse/SceneConfig'
import {validateCurrentScene} from '../src/services/pet-lifehouse/CurrentSceneLayouts'
import {sceneAsset} from '../src/services/pet-lifehouse/SceneVisualPack'
import {executeHouseCommand} from '../src/services/pet-lifehouse/HouseCommands'
import {validLifeHouse} from '../src/services/pet-lifehouse/HouseValidation'
import {scenePath,walkablePoint} from '../src/services/pet-lifehouse/SceneGeometry'
import {equipmentLayers,poseEquipmentLayers} from '../src/services/pet-lifehouse/DressRenderer'
import {spiritStoneAsset} from '../src/services/ui/SpiritStoneAsset'
import type {HouseAccount,HouseLevel,LifeHouseDomain} from '../src/services/pet-lifehouse/types'
const at='2026-10-29T08:00:00Z'
let counter=0
function upgrade(a:HouseAccount,e:typeof elements[number],level:number,revision:1|2|3=3){const command={requestId:'v6:'+counter++,expectedRevision:(a.lifeHouse as LifeHouseDomain)?.revision??0,catalogVersion:1 as const,element:e,kind:'upgrade' as const,targetLevel:level},r=executeHouseCommand(a,command,{at,assetVersion:3,sceneRevision:revision,form:2});assert.ok(r.ok,JSON.stringify(r));a.gems=r.gems;a.lifeHouse=r.domain;return{r,command}}
test('星座命名遵循专用映射，同时保持四象身份与六个独立等级',()=>{
 assert.deepEqual(elements.map(e=>houseIdentity[e].levels.length),[6,6,6,6]);assert.equal(new Set(elements.flatMap(e=>houseIdentity[e].levels)).size,24)
 assert.equal(houseLevelName('water',5),'星海幻梦堡');assert.equal(houseLevelName('earth',1),'原木安眠所');assert.equal(houseLevelName('fire',0),'无畏起航营');assert.equal(houseLevelName('wind',4),'风动双子台')
 assert.equal(houseIdentity.water.signs,'巨蟹 · 天蝎 · 双鱼');assert.equal(houseIdentity.fire.traits,'热情 · 行动 · 冒险 · 被看见')
})
test('24个新场景按独立版本发布，旧相册仍使用原始来源',()=>{
 assert.equal(currentSceneReady,true);const ids=new Set<string>()
 for(const e of elements)for(let l=0;l<6;l++){const scene=sceneDefinition(e,l as HouseLevel,3);assert.deepEqual(validateCurrentScene(scene,id=>!!sceneAsset(id)),[]);ids.add(scene.zones[0].backgroundAsset!);assert.ok(scene.zones.every(z=>walkablePoint(z.spawn,z.walkable)));assert.equal(scene.zones[0].name,houseLevelName(e,l));assert.match(sceneAsset(scene.zones[0].backgroundAsset!)!,/lifehouse\/v6\//);const old=sceneDefinition(e,l as HouseLevel,2);assert.match(sceneAsset(old.zones[0].backgroundAsset!)!,/lifehouse\/v2\//);assert.equal(old.revision,2)}assert.equal(ids.size,24)
})
test('共享钱包按真实价格扣费，四象独立，旧留影字节不改且重放不扣费',()=>{
 const a:HouseAccount={gems:100000};upgrade(a,'water',1,2);const old=JSON.stringify((a.lifeHouse as LifeHouseDomain).memoryEvents),count=(a.lifeHouse as LifeHouseDomain).memoryEvents.length
 const {r,command}=upgrade(a,'water',2);assert.equal(r.domain.schemaVersion,4);assert.equal(JSON.stringify(r.domain.memoryEvents.slice(0,count)),old);assert.equal(r.domain.memoryEvents.at(-1)?.snapshot.scene?.revision,3);assert.ok(validLifeHouse(r.domain))
 const again=executeHouseCommand(a,command,{at,assetVersion:3,sceneRevision:3});assert.ok(again.ok&&again.replayed);assert.equal(again.gems,a.gems)
 for(const e of elements)for(let l=(a.lifeHouse as LifeHouseDomain).housesByElement[e].level+1;l<6;l++)upgrade(a,e,l)
 assert.equal(a.gems,63600);for(const e of elements)assert.equal((a.lifeHouse as LifeHouseDomain).housesByElement[e].level,5)
})
test('新场景全部互动到达点可行走，睡卧接触另由家具表面定位',()=>{
 for(const e of elements){const a:HouseAccount={gems:100000};for(let l=1;l<6;l++){upgrade(a,e,l);const scene=sceneDefinition(e,l as HouseLevel,3),house=(a.lifeHouse as LifeHouseDomain).housesByElement[e];assert.equal(scene.interactions[1].pose,'sleep');for(const action of scene.interactions){const v=interactionAvailability(action,scene,house,()=>true);if(v.ready)assert.ok(scenePath(v.zone!.spawn,v.target,v.zone!.walkable,sceneObstacles(scene,house,v.zone!.id)),e+':'+l+':'+action.name)}}}
})
test('灯位依附真实支撑桌面，墙面与地毯位置仍按家具类型约束',()=>{
 for(const e of elements)for(const level of [1,2,3,4,5] as HouseLevel[]){const scene=sceneDefinition(e,level,3),light=scene.slots.find(s=>s.id==='light')!,parent=scene.zones[0].nodes.find(n=>n.id===light.parentAnchor?.nodeId);assert.ok(parent);assert.deepEqual(light.support,light.parentAnchor!.surface);assert.ok(light.depth>parent.depth);assert.deepEqual(light.allowedKinds,['lamp']);assert.deepEqual(scene.slots.find(s=>s.id==='center')!.allowedKinds,['rug']);if(level>=2)assert.equal(scene.slots.find(s=>s.id==='wall')!.allowedKinds!.includes('rug'),false)}
})
test('32张专用姿态有独立透明像素、接触点与分槽装扮锚点',async()=>{
 assert.equal(currentScenePack.poses.length,32);const hashes=new Set<string>()
 for(const p of currentScenePack.poses){const source=currentSceneAsset(p.fileId)!;assert.ok(source);const bytes=await fs.readFile('src'+source),meta=await sharp(bytes).metadata();assert.equal(meta.width,576);assert.equal(meta.height,768);assert.equal(meta.hasAlpha,true);hashes.add(createHash('sha256').update(bytes).digest('hex'));assert.ok(p.support.y>=p.bounds.bottom-.002);for(const a of Object.values(p.anchors))assert.ok([a.x,a.y,a.width].every(v=>v>0&&v<1));const layers=equipmentLayers(p.element,p.form,['dress-cloud-clip-v1','dress-cloud-scarf-v1','dress-dream-moon-v1'],'chibi'),posed=poseEquipmentLayers(p.element,p.form,layers,p);assert.equal(new Set(posed.map(l=>l.slot)).size,3);assert.ok(posed.every(l=>l.poseTransform&&!l.poseTransform.includes('NaN')));assert.equal(poseArt(p.element,p.form,p.pose)?.fileId,p.fileId)}assert.equal(hashes.size,32)
})
test('场景层与96张缩略图的实际尺寸、哈希和元数据均可校验',async()=>{
 assert.equal(currentScenePack.files.filter(f=>f.id.startsWith('v6-thumb-')).length,96)
 for(const f of currentScenePack.files){const bytes=await fs.readFile('src/static/pet-house/lifehouse/v6/'+f.path),meta=await sharp(bytes).metadata();assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('base64'),f.sha256Base64);assert.equal(meta.exif,undefined);assert.equal(meta.xmp,undefined);assert.equal(meta.icc,undefined);assert.equal(bytes.includes(Buffer.from('caBX')),false);if(f.id.startsWith('v6-thumb-')){assert.equal(meta.width,384);assert.equal(meta.height,256)}if(f.id.startsWith('v6-room-')){assert.equal(meta.width,1536);assert.equal(meta.height,1024)}}
})
test('三档蓝钻同源且透明，余额组件与购买入口使用统一语义资源',async()=>{
 for(const [size,n]of [['small',128],['medium',192],['large',256]] as const){const source=spiritStoneAsset(size),bytes=await fs.readFile('src'+source),meta=await sharp(bytes).metadata();assert.equal(meta.width,n);assert.equal(meta.height,n);assert.ok(meta.hasAlpha);assert.equal(meta.exif,undefined);assert.equal(bytes.includes(Buffer.from('caBX')),false)}
 for(const file of ['src/components/brand/WPSpiritStoneBadge.vue','src/components/brand/WPSpiritStoneInfo.vue','src/components/pet-house/lifehouse/HouseBuilderPanel.vue']){const content=await fs.readFile(file,'utf8');assert.ok(content.includes('spiritStoneAsset'));assert.equal(content.includes('/brand/spirit-stone-'),false)}
})
