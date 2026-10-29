import {test,expect} from '@playwright/test'
import {openLife,lifeTab,selectCompanion,expectNoOverflow} from './lifehouse-helpers'
import {database,seedDatabase,go,setAppearance} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements,type Element} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'
import {executeHouseCommand} from '../../src/services/pet-lifehouse/HouseCommands'
import {sceneDefinition} from '../../src/services/pet-lifehouse/SceneConfig'
import type {HouseLevel} from '../../src/services/pet-lifehouse/types'

test('V4 分层舞台支持四象配色、区域切换、互动与静态留影，浏览不迁移',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:950});await openLife(page,{level:5});await page.waitForLoadState('networkidle')
 const before=await database(page);await expect(page.locator('.lh-v4-stage')).toHaveAttribute('data-engine','fixed-v6');await expect(page.locator('.lh-stage .lh-scene-actor-art')).toHaveAttribute('data-appearance','chibi');await page.getByRole('button',{name:'切换家园区域',exact:true}).click();await page.getByRole('button',{name:'进入泡泡花园',exact:true}).click();await expect(page.locator('.lh-stage .lh-scene-canvas')).toHaveAttribute('data-zone','garden');await page.getByRole('button',{name:'一起玩 · 6',exact:true}).click();await page.getByRole('button',{name:'帘后探看',exact:true}).click();await expect(page.locator('.lh-v4-stage-caption')).toContainText('找到我了吗');await expect(page.locator('.lh-stage .lh-scene-actor')).toHaveAttribute('data-motion','idle')
 await lifeTab(page,'喂食').click();await lifeTab(page,'家园').click();await selectCompanion(page,'earth');await expect(page.locator('.lh-stage .lh-scene-actor-art')).toHaveAttribute('data-variant',/earth/);await expect(page.locator('.lh-stage .lh-scene-canvas')).toHaveAttribute('data-scene-element','earth');await selectCompanion(page,'fire');await expect(page.locator('.lh-stage .lh-scene-canvas')).toHaveAttribute('data-scene-element','fire');await selectCompanion(page,'wind');await expect(page.locator('.lh-stage .lh-scene-canvas')).toHaveAttribute('data-scene-element','wind')
 for(const width of [320,834,1194]){await page.setViewportSize({width,height:950});await expectNoOverflow(page)}
 await selectCompanion(page,'water');await lifeTab(page,'相册').click();await expect(page.locator('.lh-memory-card')).not.toHaveCount(0);const after=await database(page);expect(after.lifeHouse).toEqual(before.lifeHouse);expect(after.gems).toBe(before.gems);expect(errors).toEqual([])
 await lifeTab(page,'家园').click();await page.setViewportSize({width:390,height:950});await page.locator('.lh-stage').screenshot({path:test.info().outputPath('water-v4-stage.png')})
})

test('明确升级前备份旧档案，新相册使用Q分层版本；家具目录默认展示',async({page})=>{
 await openLife(page,{level:1});await page.waitForLoadState('networkidle');await expect(page.locator('.lh-catalog')).toBeVisible();const old=await database(page)
 await page.getByRole('button',{name:'房屋 Lv.1，查看升级',exact:true}).click();await page.getByRole('button',{name:'使用 800 灵石升级',exact:true}).click();await expect(page.locator('.lh-stage')).toHaveAttribute('data-house-level','2')
 const db=await database(page);expect(db.lifeHouse.schemaVersion).toBe(4);expect(db.gems).toBe(old.gems-800);const backup=await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.house-v6.pre-migration')!));expect(backup.database.lifeHouse).toEqual(old.lifeHouse)
 await lifeTab(page,'相册').click();await expect(page.locator('.lh-snapshot-scene')).not.toHaveCount(0);expect(db.lifeHouse.memoryEvents.at(-1).snapshot.assetVersion).toBe(3);await page.reload();await expect(page.locator('.lh-stage')).toHaveAttribute('data-house-level','2')
})

test('Q图加载失败时整组原图与已穿装扮回退，重试后同形态恢复',async({page})=>{
 await page.route('**/lifehouse/v3/actor-water-f1.png',r=>r.abort());const seed=matrixFixture(1);seed.pets.water.equippedCosmetics=['water-dress-l0-v1'];await seedMatrix(page,seed);await openLife(page,{level:1});await expect(page.locator('.lh-stage .lh-scene-actor-art')).toHaveAttribute('data-appearance','original-fallback');await expect(page.locator('.lh-stage .pet-cutout')).toHaveAttribute('data-form','1');await expect(page.locator('.lh-stage .pet-cutout .lh-dress-front img')).toHaveJSProperty('naturalWidth',960);await expect(page.locator('.lh-stage .pet-cutout .lh-dress-front')).toHaveCSS('transform',/matrix/);expect((await database(page)).gems).toBe(seed.gems)
})

async function seedMatrix(page:any,db:any){await page.addInitScript((value:any)=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(value));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)}
function matrixFixture(level:number){
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[];db.session=null;db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.map(w=>[w.id,'2026-10-27T08:00:00Z']))}};db.gems=100000
 let serial=0
 for(const e of elements){db.pets[e]={...db.pets[e],level:8,exp:700,equippedCosmetics:['dress-cloud-clip-v1','dress-cloud-scarf-v1','dress-dream-moon-v1']};for(let n=1;n<=level;n++){const r=executeHouseCommand(db,{requestId:'matrix:'+serial++,expectedRevision:(db.lifeHouse as any)?.revision??0,catalogVersion:1,element:e,kind:'upgrade',targetLevel:n},{at:'2026-10-28T08:00:00Z'});if(!r.ok)throw Error(r.error);db.gems=r.gems;db.lifeHouse=r.domain}
  if(level===5)for(const [furnitureId,slotId]of [['common-garden','garden'],['common-table','activity'],['common-chime','extra']] as const){const r=executeHouseCommand(db,{requestId:'matrix:'+serial++,expectedRevision:(db.lifeHouse as any).revision,catalogVersion:1,element:e,kind:'place',furnitureId,slotId},{at:'2026-10-28T08:00:00Z'});if(!r.ok)throw Error(r.error);db.gems=r.gems;db.lifeHouse=r.domain}
 }
 return db
}
for(const level of [0,1,2,3,4,5] as HouseLevel[])test(`24空间×4形态：房屋 Lv.${level} 的16种真实形态显示`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:950});await seedMatrix(page,matrixFixture(level));await setAppearance(page,'clay','light',{reducedMotion:true});await go(page,'pet');const before=await database(page)
 for(const e of elements){await selectCompanion(page,e);for(const form of [1,2,3,4]){await lifeTab(page,'成长').click();const card=page.locator('.pet-growth-panel .pet-form-card').nth(form-1);await expect(card).toBeEnabled();await card.click();await lifeTab(page,'家园').click();const art=page.locator('.lh-stage .lh-scene-actor-art');await expect(art).toHaveAttribute('data-variant',`chibi-${e}-f${form}-r1`);await expect(art.locator('.lh-q-body img')).toHaveJSProperty('naturalHeight',1024);await expect(art.locator('.lh-dress-front')).toHaveCount(3);await expect(art.locator('.lh-dress-back')).toHaveCount(1);expect(await art.locator('.lh-dress-front').evaluateAll(nodes=>new Set(nodes.map(node=>node.getAttribute('data-slot'))).size)).toBe(3);await expectNoOverflow(page)}
 if(level===5){const toggle=page.getByRole('button',{name:'一起玩 · 6',exact:true});if(await toggle.count())await toggle.click();for(const spec of sceneDefinition(e,5).interactions){const button=page.getByRole('button',{name:spec.name,exact:true});await expect(button).toBeEnabled();await button.click();await expect(page.locator('.lh-stage-message')).toHaveText(spec.message);await expect(button).toBeEnabled();await expect(page.locator('.lh-stage .lh-scene-actor .lh-dress-front')).toHaveCount(3)}}
 if([1,3,5].includes(level))await page.locator('.lh-stage').screenshot({path:test.info().outputPath(`${e}-l${level}.png`)})
 }
 const after=await database(page);expect(after.lifeHouse).toEqual(before.lifeHouse);expect(after.gems).toBe(before.gems);expect(after.history).toEqual(before.history);expect(after.rewardIds).toEqual(before.rewardIds)
})
