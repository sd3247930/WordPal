import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {freshDatabase,useProfileStore} from '../src/stores/profile'
import {usePetLifeHouseStore} from '../src/stores/pet-lifehouse'
import {executeHouseCommand} from '../src/services/pet-lifehouse/HouseCommands'
import {emptyLifeHouse,inspectLifeHouse,safeLifeHouseWrite,validLifeHouse} from '../src/services/pet-lifehouse/HouseValidation'
import {catalogForElement,compatibleSlots,housePrices} from '../src/services/pet-lifehouse/HouseRegistry'
import type {HouseAccount,HouseCommand,HouseSuccess,LifeHouseDomain} from '../src/services/pet-lifehouse/types'
import {elements,type Element} from '../packages/pet_engine'
import {makeLearningBackup,previewLearningBackup} from '../src/services/storage/LearningBackup'
import {loadCourseRegistry} from '../src/services/content/ContentRegistry'
const at='2026-10-26T10:00:00.000Z'
let serial=0
function command(a:HouseAccount,element:Element,body:Partial<HouseCommand>):HouseCommand{return {requestId:'test-'+ ++serial,expectedRevision:(a.lifeHouse as LifeHouseDomain|undefined)?.revision??0,catalogVersion:1,element,kind:'upgrade',...body}}
function apply(a:HouseAccount,c:HouseCommand){const result=executeHouseCommand(a,c,{at});assert.equal(result.ok,true,JSON.stringify(result));const r=result as HouseSuccess;if(!r.replayed){a.gems=r.gems;a.lifeHouse=r.domain}return r}
function upgrade(a:HouseAccount,e:Element,target:number){for(let n=(a.lifeHouse as LifeHouseDomain|undefined)?.housesByElement[e].level??0;n<target;n++)apply(a,command(a,e,{kind:'upgrade',targetLevel:n+1}))}

test('四家六状态逐级升级，价格、赠品、记忆与钱包一致，读取不初始化档案',()=>{
 const a:HouseAccount={gems:100000},pristine=JSON.stringify(a);assert.equal(inspectLifeHouse(a.lifeHouse),'empty');assert.equal(JSON.stringify(a),pristine)
 for(const e of elements){upgrade(a,e,5);const d=a.lifeHouse as LifeHouseDomain;assert.equal(d.housesByElement[e].level,5);assert.equal(d.housesByElement[e].owned.length,3);assert.equal(d.memoryEvents.filter(x=>x.element===e&&x.type==='upgrade').length,5);assert.equal(validLifeHouse(d),true)}
 assert.equal(a.gems,100000-4*housePrices.slice(1).reduce<number>((s,n)=>s+n,0))
 assert.deepEqual(elements.map(e=>(a.lifeHouse as LifeHouseDomain).housesByElement[e].level),[5,5,5,5])
 const c=command(a,'water',{targetLevel:6});assert.deepEqual(executeHouseCommand(a,c,{at}),{ok:false,error:'max-level'})
})
test('余额不足、跳级、跨元素、未解锁槽位均拒绝且输入不变',()=>{
 const a:HouseAccount={gems:299};const raw=JSON.stringify(a)
 assert.deepEqual(executeHouseCommand(a,command(a,'water',{targetLevel:1}),{at}),{ok:false,error:'insufficient',needed:1});assert.equal(JSON.stringify(a),raw)
 a.gems=5000;assert.equal(executeHouseCommand(a,command(a,'water',{targetLevel:2}),{at}).ok,false);upgrade(a,'water',1)
 const before=JSON.stringify(a)
 for(const c of [command(a,'water',{kind:'place',furnitureId:'earth-bed',slotId:'left'}),command(a,'water',{kind:'place',furnitureId:'common-garden',slotId:'garden'}),command(a,'water',{kind:'place',furnitureId:'water-bed',slotId:'wall'})])assert.equal(executeHouseCommand(a,c,{at}).ok,false)
 assert.equal(JSON.stringify(a),before)
})
test('首次购买确认才扣费、收纳与再放免费、真实实付退回一次、赠品不能退',()=>{
 const a:HouseAccount={gems:10000};upgrade(a,'water',2);const before=a.gems
 const buy=command(a,'water',{kind:'place',furnitureId:'water-bed',slotId:'left'}),quote=executeHouseCommand(a,buy,{at});assert.equal(quote.ok,true);assert.equal(a.gems,before)
 apply(a,buy);assert.equal(a.gems,before-80)
 const house=()=> (a.lifeHouse as LifeHouseDomain).housesByElement.water,owned=()=>house().owned.find(o=>o.furnitureId==='water-bed')!
 apply(a,command(a,'water',{kind:'store',instanceId:owned().instanceId}));assert.equal(a.gems,before-80);assert.ok(owned())
 apply(a,command(a,'water',{kind:'place',furnitureId:'water-bed',slotId:'left'}));assert.equal(a.gems,before-80)
 const refund=command(a,'water',{kind:'return',instanceId:owned().instanceId});apply(a,refund);assert.equal(a.gems,before-40);assert.equal(owned(),undefined)
 apply(a,refund);assert.equal(a.gems,before-40)
 assert.equal(executeHouseCommand(a,command(a,'water',{kind:'return',instanceId:house().owned.find(x=>x.origin==='level-gift')!.instanceId}),{at}).ok,false)
 apply(a,command(a,'water',{kind:'place',furnitureId:'water-bed',slotId:'left'}));assert.equal(a.gems,before-120)
 assert.equal((a.lifeHouse as LifeHouseDomain).memoryEvents.filter(e=>e.id==='house-first-place:water:rest').length,1)
})
test('替换与退回可同次结算，礼物自动回仓，实例不会复制或跨槽位',()=>{
 const a:HouseAccount={gems:20000};upgrade(a,'water',4)
 apply(a,command(a,'water',{kind:'place',furnitureId:'water-lamp',slotId:'light'}))
 const before=a.gems
 apply(a,command(a,'water',{kind:'place',furnitureId:'water-lamp',slotId:'extra'}));assert.equal(a.gems,before)
 const h=(a.lifeHouse as LifeHouseDomain).housesByElement.water;assert.equal(h.slots.light,undefined);assert.ok(h.slots.extra)
 apply(a,command(a,'water',{kind:'place',furnitureId:'common-plant',slotId:'extra',replaceMode:'return'}));assert.equal(a.gems,before+30-50)
 assert.equal((a.lifeHouse as LifeHouseDomain).housesByElement.water.owned.some(o=>o.furnitureId==='water-lamp'),false)
 assert.equal(validLifeHouse(a.lifeHouse),true)
})
test('幂等请求验证签名，旧报价与过期回执均不能重放扣费',()=>{
 const a:HouseAccount={gems:20000},c=command(a,'water',{targetLevel:1});apply(a,c);const saved=JSON.stringify(a)
 assert.equal(apply(a,c).replayed,true);assert.equal(JSON.stringify(a),saved)
 assert.deepEqual(executeHouseCommand(a,{...c,element:'earth'},{at}),{ok:false,error:'replay-mismatch'})
 const stale=command(a,'water',{targetLevel:2});apply(a,command(a,'earth',{targetLevel:1}));assert.deepEqual(executeHouseCommand(a,stale,{at}),{ok:false,error:'stale'})
 upgrade(a,'water',2)
 for(let n=0;n<55;n++){const h=(a.lifeHouse as LifeHouseDomain).housesByElement.water;const current=h.owned.find(o=>o.furnitureId==='starter-bed')!;apply(a,command(a,'water',Object.values(h.slots).includes(current.instanceId)?{kind:'store',instanceId:current.instanceId}:{kind:'place',furnitureId:'starter-bed',slotId:'left'}))}
 assert.equal((a.lifeHouse as LifeHouseDomain).recentReceipts.length,50)
 assert.deepEqual(executeHouseCommand(a,c,{at}),{ok:false,error:'stale'})
})
test('损坏、未来版本与重复所有权受保护，未知字段无损透传',()=>{
 const future={schemaVersion:7,custom:{surprise:['keep',{value:42}]}},invalid={schemaVersion:1,broken:true}
 for(const lifeHouse of [future,invalid,null]){const a={gems:1000,lifeHouse},before=JSON.stringify(a);assert.deepEqual(executeHouseCommand(a,command({gems:1000},'water',{targetLevel:1}),{at}),{ok:false,error:'protected'});assert.equal(JSON.stringify(a),before);assert.equal(safeLifeHouseWrite(lifeHouse,JSON.parse(JSON.stringify(lifeHouse))),true);assert.equal(safeLifeHouseWrite(lifeHouse,emptyLifeHouse()),false)}
 const a:HouseAccount={gems:10000};upgrade(a,'water',2);const d=structuredClone(a.lifeHouse as LifeHouseDomain);d.housesByElement.water.owned.push({...d.housesByElement.water.owned[0]});assert.equal(validLifeHouse(d),false)
 for(const e of elements)assert.equal(catalogForElement(e).length,8)
 assert.ok(compatibleSlots(catalogForElement('water')[0],1).includes('left'))
})
function harness(){const storage:Record<string,string>={};let fail=false;(globalThis as any).uni={getStorageSync:(k:string)=>storage[k]||'',setStorageSync:(k:string,v:string)=>{if(fail)throw Error('disk full');storage[k]=v},removeStorageSync:(k:string)=>delete storage[k]};setActivePinia(createPinia());loadCourseRegistry();const profile=useProfileStore();profile.transact(d=>{d.gems=10000});return {storage,profile,house:usePetLifeHouseStore(),setFail:(v:boolean)=>{fail=v}}}
test('真实Store保存失败不扣费，重试只结算一次，切伙伴与重启不串家',()=>{
 const h=harness(),before=JSON.stringify(h.profile.db),c=h.house.makeCommand('water',{kind:'upgrade',targetLevel:1});h.setFail(true);assert.equal(h.house.commit(c),undefined);assert.equal(JSON.stringify(h.profile.db),before)
 h.setFail(false);assert.equal(h.house.commit(c)?.ok,true);const after=JSON.stringify(h.profile.db);h.house.commit(c);assert.equal(JSON.stringify(h.profile.db),after)
 setActivePinia(createPinia());const restored=useProfileStore(),house=usePetLifeHouseStore();assert.equal(house.domain.housesByElement.water.level,1);assert.equal(house.domain.housesByElement.fire.level,0);assert.equal(restored.db.gems,9700)
})
test('学习备份包含房屋与原钱包，未知家园版本经过学习写入、备份与重启保留',()=>{
 const h=harness();h.house.commit(h.house.makeCommand('water',{kind:'upgrade',targetLevel:1}));const restored=previewLearningBackup(makeLearningBackup(h.profile.db));assert.deepEqual(restored.lifeHouse,h.profile.db.lifeHouse);assert.equal(restored.gems,h.profile.db.gems)
 const future={schemaVersion:99,items:{untouched:['alpha',14]}};const raw=JSON.parse(JSON.stringify(h.profile.db));raw.lifeHouse=future
 // Imported opaque state stays round-trippable through the existing backup contract.
 h.profile.restore(previewLearningBackup(makeLearningBackup(raw)));const before=JSON.stringify(h.profile.db.lifeHouse)
 assert.equal(h.profile.transact(d=>{d.gems+=2}),true);assert.equal(JSON.stringify(h.profile.db.lifeHouse),before)
 setActivePinia(createPinia());assert.deepEqual(useProfileStore().db.lifeHouse,future);assert.equal(usePetLifeHouseStore().unavailable,true)
 assert.equal(useProfileStore().transact(d=>{d.lifeHouse=emptyLifeHouse()}),false)
})

test('恢复旧备份按原档案恢复钱包，浏览不擅自创建家园；核心只读档案不能消费',()=>{
 const h=harness(),oldBackup=makeLearningBackup(h.profile.db)
 h.house.commit(h.house.makeCommand('water',{kind:'upgrade',targetLevel:1}));assert.equal(h.profile.db.gems,9700)
 assert.equal(h.profile.restore(previewLearningBackup(oldBackup)),true);assert.equal(h.profile.db.gems,10000);assert.equal(h.profile.db.lifeHouse,undefined);assert.equal(h.house.domain.housesByElement.water.level,0)
 const before=JSON.stringify(h.profile.db);(h.profile as any).readOnly=true
 assert.deepEqual(h.house.preview(h.house.makeCommand('water',{kind:'upgrade',targetLevel:1})),{ok:false,error:'protected'});assert.equal(JSON.stringify(h.profile.db),before)
})

test('损坏枚举字段不会在只读检查时触发类型转换异常',()=>{
 const a:HouseAccount={gems:10000};upgrade(a,'water',1)
 for(const field of ['origin','kind','type','cosmetic','category']){const d=structuredClone(a.lifeHouse as LifeHouseDomain),bad={toString:'invalid'};if(field==='origin')(d.housesByElement.water.owned[0] as any).origin=bad;else if(field==='kind')(d.recentReceipts[0] as any).kind=bad;else if(field==='cosmetic')(d.memoryEvents[0].snapshot as any).cosmetic=bad;else(d.memoryEvents[0] as any)[field]=bad;assert.doesNotThrow(()=>inspectLifeHouse(d));if(field!=='category')assert.equal(inspectLifeHouse(d),'invalid')}
})

test('异步确认先显示保存状态，排队期间拒绝重复提交且同一快照只扣一次',async()=>{
 const h=harness(),command=h.house.makeCommand('water',{kind:'upgrade',targetLevel:1}),promise=h.house.submit(command)
 assert.equal(h.house.busy,true);assert.equal(h.profile.db.gems,10000);assert.equal(await h.house.submit(command),undefined)
 assert.equal((await promise)?.ok,true);assert.equal(h.house.busy,false);assert.equal(h.profile.db.gems,9700)
 assert.equal((await h.house.submit(command))?.ok,true);assert.equal(h.profile.db.gems,9700)
})
