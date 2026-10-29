import test from 'node:test'
import assert from 'node:assert/strict'
import {elements} from '../packages/pet_engine'
import {builderItems,builderSlots,furnitureState,outdoorUnlockLevel} from '../src/services/pet-lifehouse/HouseBuilderCatalog'
import {catalogForElement,furnitureRegistry} from '../src/services/pet-lifehouse/HouseRegistry'
import {sceneDefinition} from '../src/services/pet-lifehouse/SceneConfig'
import {executeHouseCommand} from '../src/services/pet-lifehouse/HouseCommands'
import {goldenDatabase} from './ui/fixtures'
function lifeFixture(level:number,gems=10000){const db=goldenDatabase();db.gems=100000;for(let n=1;n<=level;n++){const r=executeHouseCommand(db,{requestId:'builder-fixture:'+n,expectedRevision:n-1,catalogVersion:1,element:'water',kind:'upgrade',targetLevel:n},{at:'2026-10-28T08:00:00Z'});if(!r.ok)throw Error(r.error);db.gems=r.gems;db.lifeHouse=r.domain}db.gems=gems;return db}
import type {LifeHouseDomain} from '../src/services/pet-lifehouse/types'

test('分区对应真实商品；五类筛选不漏不重，房屋不返回家具',()=>{
 const h=(lifeFixture(3).lifeHouse as LifeHouseDomain).housesByElement.water
 for(const e of elements){const catalog=catalogForElement(e);assert.deepEqual(builderItems(e,h,'room'),[]);assert.deepEqual(builderItems(e,h,'furniture'),catalog)
 const parts=['rest','function','activity','decor'].flatMap(c=>builderItems(e,h,'furniture',c as any).map(i=>i.id));assert.equal(new Set(parts).size,parts.length);assert.deepEqual(parts.sort(),catalog.map(i=>i.id).sort());assert.ok(builderItems(e,h,'decor').every(i=>i.category==='decor'))}
})
test('庭院开放与槽位来自场景；房屋未开放时没有可买户外产品',()=>{
 const h=(lifeFixture(5).lifeHouse as LifeHouseDomain).housesByElement.water
 for(const e of elements){const unlock=outdoorUnlockLevel(e);assert.equal(unlock,3);assert.deepEqual(builderItems(e,{...h,level:2},'garden'),[])
 for(const item of builderItems(e,h,'garden')){const slots=builderSlots(item,e,5,'garden');assert.ok(slots.length);assert.ok(slots.every(id=>sceneDefinition(e,5).slots.some(s=>s.id===id&&['garden','courtyard'].includes(s.zoneId))))}}
})
test('收纳箱含已放置赠品，所有权和锁定、差额、图片状态可辨认',()=>{
 const db=lifeFixture(1,10),h=(db.lifeHouse as LifeHouseDomain).housesByElement.water,raw=JSON.stringify(h),bed=furnitureRegistry['water-bed'],gift=furnitureRegistry['starter-bed']
 assert.equal(builderItems('water',h,'owned').length,h.owned.length);assert.equal(furnitureState(gift,h,10).kind,'placed');assert.equal(furnitureState(bed,h,10).label,'还差 70 灵石');assert.equal(furnitureState(furnitureRegistry['water-shelf'],h,999).kind,'locked');assert.equal(furnitureState(bed,h,999,false).kind,'unavailable');assert.equal(furnitureState(bed,h,999).label,'80 灵石');assert.equal(JSON.stringify(h),raw)
})
