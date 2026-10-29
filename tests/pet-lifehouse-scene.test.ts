import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {elements} from '../packages/pet_engine'
import {sceneViewport,scenePointer,scenePath,clearSceneSegment,rectanglePolygon,walkablePoint,polygonArea} from '../src/services/pet-lifehouse/SceneGeometry'
import {SceneActionController,type SceneClock,type SceneActionState} from '../src/services/pet-lifehouse/SceneActionController'
import {allSceneDefinitions,sceneDefinition,interactionAvailability,sceneObstacles} from '../src/services/pet-lifehouse/SceneConfig'
import {scenePackReady,isScenePackReady,sceneActorSource,sceneAsset} from '../src/services/pet-lifehouse/SceneVisualPack'
import {emptyLifeHouse,validLifeHouse,safeLifeHouseWrite,inspectLifeHouse} from '../src/services/pet-lifehouse/HouseValidation'
import {executeHouseCommand} from '../src/services/pet-lifehouse/HouseCommands'
import type {HouseCommand,HouseContext,HouseLevel} from '../src/services/pet-lifehouse/types'
import manifest from '../src/static/pet-house/lifehouse/v3/manifest.json'
import {backupBeforeHouseMigration,HOUSE_V4_BACKUP_KEY} from '../src/services/pet-lifehouse/HouseMigration'

const at='2026-10-28T08:00:00Z',context:HouseContext={at,form:2,assetVersion:3,actorVariant:'chibi-water-f2-r1',fitRevision:1}
function command(rev:number,kind:HouseCommand['kind'],extra:Partial<HouseCommand>={}):HouseCommand{return{requestId:'scene-test:'+rev,expectedRevision:rev,catalogVersion:1,element:'water',kind,...extra}}
function levelAccount(level:number){let account:any={gems:100000};for(let i=1;i<=level;i++){const r=executeHouseCommand(account,command(i-1,'upgrade',{targetLevel:i}),context);assert.ok(r.ok);account={gems:r.gems,lifeHouse:r.domain}}return account}
test('画面逆变换拒绝留白，路径绕开障碍且不会穿越不可达区',()=>{
 for(const [w,h]of [[320,500],[834,500],[1194,600]]){const v=sceneViewport(w,h)!;assert.deepEqual(scenePointer({x:v.x+v.width*.37,y:v.y+v.height*.81},v),{x:.37,y:.81});if(v.y)assert.equal(scenePointer({x:1,y:1},v),undefined)}
 const areas=[rectanglePolygon({x:0,y:0,width:1,height:1})],barrier=rectanglePolygon({x:.4,y:.2,width:.2,height:.6}),start={x:.15,y:.5},target={x:.85,y:.5},path=scenePath(start,target,areas,[barrier])!
 assert.ok(path.length>2);for(let i=1;i<path.length;i++)assert.ok(clearSceneSegment(path[i-1],path[i],areas,[barrier]))
 assert.equal(scenePath(start,target,areas,[rectanglePolygon({x:.4,y:0,width:.2,height:1})]),undefined);assert.equal(scenePath(start,{x:NaN,y:0},areas),undefined)
})
class Clock implements SceneClock{time=0;next=0;waits=new Map<number,{at:number;fn:()=>void}>();set=(fn:()=>void,ms:number)=>{const id=++this.next;this.waits.set(id,{at:this.time+ms,fn});return id};clear=(id:unknown)=>{this.waits.delete(Number(id))};async tick(){const item=[...this.waits].sort((a,b)=>a[1].at-b[1].at)[0];if(item){this.time=item[1].at;this.waits.delete(item[0]);item[1].fn();await Promise.resolve();await Promise.resolve()}}}
test('整图动作可取消，旧计时器不串场；重复点击拒绝，帘后互动原路返回',async()=>{
 const clock=new Clock(),states:SceneActionState[]=[],start={x:.76,y:.81},controller=new SceneActionController(start,s=>states.push(s),clock),spec={id:'peek',targetId:'curtain',motion:'hide_reveal' as const,fx:'glow' as const,message:'找到了'}
 const first=controller.run(spec,[start,{x:.43,y:.79}]);assert.equal(await controller.run(spec,[start]),false);controller.reset({x:.5,y:.8});assert.equal(await first,false);assert.equal(clock.waits.size,0);await clock.tick();assert.deepEqual(controller.state.position,{x:.5,y:.8})
 controller.reset(start);const run=controller.run(spec,[start,{x:.43,y:.79}]);for(let i=0;i<8;i++)await clock.tick();assert.equal(await run,true);assert.deepEqual(controller.state.position,start);assert.ok(states.some(s=>s.phase==='responding'&&s.motion==='hide_reveal'))
 const reduced=controller.run(spec,[start,{x:.43,y:.79}],true);for(let i=0;i<5;i++)await clock.tick();assert.equal(await reduced,true);assert.equal(controller.state.motion,'idle');assert.deepEqual(controller.state.position,start)
 controller.dispose();assert.equal(await controller.run(spec,[start]),false);assert.equal(clock.waits.size,0)
})
test('四象六级有真实区域和设施，24类互动累计开放，缺家具或资源不播放',()=>{
 const scenes=allSceneDefinitions();assert.equal(scenes.length,24)
 for(const scene of scenes){assert.equal(scene.zones.length,[1,1,1,2,3,4][scene.level]);assert.equal(scene.interactions.length,scene.level+1);assert.ok(scene.zones.every(z=>z.walkable.every(p=>polygonArea(p)>.2)&&walkablePoint(z.spawn,z.walkable)));for(const z of scene.zones)for(const n of z.nodes)assert.ok(sceneAsset(n.assetId),n.assetId);const house=emptyLifeHouse().housesByElement[scene.element];house.level=scene.level;const basic=interactionAvailability(scene.interactions[0],scene,house,()=>true);assert.equal(basic.ready,true);assert.equal(interactionAvailability(scene.interactions[0],scene,house,()=>false).ready,false);if(scene.level>0)assert.equal(interactionAvailability(scene.interactions[1],scene,house,()=>true).ready,false)}
 const account=levelAccount(5),house=account.lifeHouse.housesByElement.water,scene=sceneDefinition('water',5);for(const s of scene.interactions){const a=interactionAvailability(s,scene,house,()=>true);if(a.ready){assert.ok(a.zone);assert.ok(scenePath(a.zone.spawn,a.target,a.zone.walkable,sceneObstacles(scene,house,a.zone.id)),s.id)}}
 const wind=emptyLifeHouse().housesByElement.wind;wind.level=4;assert.equal(interactionAvailability(sceneDefinition('wind',4).interactions[4],sceneDefinition('wind',4),wind,()=>true).ready,false)
})
test('16个Q身份和144个穿戴完整；缺装扮整组回退到同象同形态原图',()=>{
 assert.equal(scenePackReady,true);assert.equal(manifest.actors.length,16);assert.equal(manifest.wearableFits.length,144)
 for(const e of elements)for(const form of [1,2,3,4] as const){const q=sceneActorSource(e,form,'ribbon');assert.equal(q.mode,'chibi');assert.ok(q.front);assert.ok(q.back);const missing=sceneActorSource(e,form,'missing');assert.equal(missing.mode,'original-fallback');assert.equal(missing.variantId,`original-${e}-f${form}`);assert.equal(sceneActorSource(e,form,null,false).mode,'original-fallback')}
 assert.equal(isScenePackReady({...manifest,actors:manifest.actors.slice(1)} as any),false);assert.equal(isScenePackReady({...manifest,wearableFits:manifest.wearableFits.slice(1)} as any),false)
})
test('首次明确编辑才迁移schema2，旧留影不变，失败不改钱包，回执重放不重复迁移',()=>{
 const old=executeHouseCommand({gems:10000},command(0,'upgrade',{targetLevel:1}),{at,form:1,assetVersion:1});assert.ok(old.ok);const oldBytes=JSON.stringify(old.domain.memoryEvents),before=JSON.stringify(old.domain)
 assert.equal(inspectLifeHouse(old.domain),'ready');assert.equal(JSON.stringify(old.domain),before)
 const c=command(1,'upgrade',{targetLevel:2}),r=executeHouseCommand({gems:old.gems,lifeHouse:old.domain},c,context);assert.ok(r.ok);assert.equal(r.domain.schemaVersion,2);assert.equal(JSON.stringify(r.domain.memoryEvents.slice(0,old.domain.memoryEvents.length)),oldBytes);assert.equal(JSON.stringify(old.domain),before)
 const snap=r.domain.memoryEvents.at(-1)!.snapshot;assert.equal(snap.assetVersion,3);assert.equal(snap.scene?.zoneId,'room');assert.equal(snap.scene?.actorVariant,'chibi-water-f2-r1');assert.ok(validLifeHouse(r.domain));assert.equal(safeLifeHouseWrite(r.domain,{...r.domain,schemaVersion:1}),false)
 const replay=executeHouseCommand({gems:r.gems,lifeHouse:r.domain},c,context);assert.ok(replay.ok&&replay.replayed);assert.equal(replay.gems,r.gems)
 const invalid=structuredClone(r.domain);invalid.memoryEvents.at(-1)!.snapshot.scene!.actorVariant='chibi-fire-f2-r1';assert.equal(validLifeHouse(invalid),false)
 const future={schemaVersion:99};assert.equal(safeLifeHouseWrite(future,structuredClone(future)),true);assert.equal(executeHouseCommand({gems:0,lifeHouse:future},command(0,'upgrade',{targetLevel:1}),context).ok,false)
})
test('36份运行资源摘要与元数据准确，原16张精灵母图符合既有公开基线',async()=>{
 for(const file of manifest.files){const bytes=await fs.readFile('src/static/pet-house/lifehouse/v3/'+file.path),m=await sharp(bytes).metadata();assert.equal(createHash('sha256').update(bytes).digest('base64'),file.sha256Base64);assert.equal(m.width,file.width);assert.equal(m.height,file.height);assert.equal(m.exif,undefined);assert.equal(m.xmp,undefined);assert.equal(bytes.includes(Buffer.from('caBX')),false)}
 const old=JSON.parse(await fs.readFile('src/static/pet-house/lifehouse/manifest.json','utf8'));for(const source of old.companionSources){const bytes=await fs.readFile('src/static/pet-house/growth/'+source.element+'-'+['juvenile','growing','evolved','unknown'][source.form-1]+'.png');assert.equal(createHash('sha256').update(bytes).digest('base64'),source.sha256Base64)}
})
test('升级备份保存完整旧档，失败即拒绝，恢复另一份旧档时各自保留摘要备份',()=>{
 const previous=(globalThis as any).uni,data=new Map<string,string>();let fail=false
 ;(globalThis as any).uni={getStorageSync:(key:string)=>data.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('full');data.set(key,value)}}
 try{
  const database={lifeHouse:emptyLifeHouse(),learning:{cursor:2}},original=JSON.stringify(database)
  assert.equal(backupBeforeHouseMigration(database),true);assert.equal(JSON.stringify(database),original);assert.deepEqual(JSON.parse(data.get(HOUSE_V4_BACKUP_KEY)!).database,database)
  const size=data.size;assert.equal(backupBeforeHouseMigration(database),true);assert.equal(data.size,size)
  database.learning.cursor=3;assert.equal(backupBeforeHouseMigration(database),true);assert.equal(data.size,size+1);assert.equal(JSON.parse(data.get(HOUSE_V4_BACKUP_KEY)!).database.learning.cursor,2)
  fail=true;assert.equal(backupBeforeHouseMigration({lifeHouse:emptyLifeHouse(),learning:{cursor:4}} as any),false);assert.equal(backupBeforeHouseMigration({learning:{cursor:5}} as any),false)
 }finally{(globalThis as any).uni=previous}
})
