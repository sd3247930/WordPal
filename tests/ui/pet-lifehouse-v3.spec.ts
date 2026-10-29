import {test,expect} from '@playwright/test'
import {elements} from '../../packages/pet_engine'
import {activeVisualVersion} from '../../src/services/pet-lifehouse/VisualPack'
import v3Manifest from '../../src/static/pet-house/lifehouse/v2/manifest.json'
import {itemDesigns} from '../../src/services/pet-lifehouse/VisualInventory'
import {starterPack} from '../../src/services/content/ContentRegistry'
import {goldenDatabase} from './fixtures'
import {database,go,setAppearance} from './helpers'
import {lifeTab,selectCompanion,expectNoOverflow} from './lifehouse-helpers'

test.beforeEach(()=>test.skip(v3Manifest.status!=='ready','完整 V3 素材审核及导出后执行；当前资源包未启用。'))

function learningState(value:any){const copy=structuredClone(value);delete copy.companion;for(const pet of Object.values(copy.pets) as any[])delete pet.equippedCosmetics;return copy}
async function open(page:any,large=false){const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[];db.session=null;db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.map(word=>[word.id,'2026-10-17T08:00:00Z']))}};for(const id of elements)db.pets[id]={...db.pets[id],level:8,exp:700,equippedCosmetics:[]};await page.addInitScript((value:typeof db)=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(value));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db);await setAppearance(page,'clay',large?'dark':'light',{largeText:large,reducedMotion:true});await go(page,'pet');await expect(page.locator('.lh-companion').first()).toBeEnabled()}

test('完整资源包支持96个新装扮组合，免费穿脱且不修改学习和钱包',async({page})=>{
 test.setTimeout(240000);expect(activeVisualVersion).toBe(2);await page.setViewportSize({width:390,height:950});await open(page);const before=learningState(await database(page)),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 for(const element of elements){await selectCompanion(page,element);for(let form=1;form<=4;form++){
  await lifeTab(page,'成长').click();const formCard=page.locator('.pet-growth-panel .pet-form-card').nth(form-1);await expect(formCard).toBeEnabled();await formCard.click();await lifeTab(page,'装扮').click();await expect(page.locator('.cosmetic-button')).toHaveCount(18)
  for(const item of itemDesigns.filter(item=>item.element===element&&item.module==='dress')){
   await page.locator('.cosmetic-button[data-item="'+item.id+'"]').click()
   const art=page.locator('.lh-stage .lh-scene-actor-art');await expect(art).toHaveAttribute('data-form',String(form));const front=art.locator('.lh-q-front img');await expect(front).toHaveAttribute('src',new RegExp(item.id+'/f'+form+'-front[.]png$'));await expect(front).toHaveJSProperty('naturalWidth',960);await expect(front).toHaveJSProperty('naturalHeight',1280)
   await expect(art.locator('.lh-q-back img')).toHaveCount(item.designTier===4?0:1)
   if(item.designTier!==4)await expect(art.locator('.lh-q-back img')).toHaveJSProperty('naturalWidth',960)
   const valid=await art.locator('.lh-q-wear').evaluateAll(nodes=>nodes.every(node=>{const rect=node.getBoundingClientRect(),matrix=getComputedStyle(node).transform;return rect.width>0&&rect.height>0&&matrix!=='none'&&!matrix.includes('NaN')}));expect(valid).toBe(true)
   await page.locator('.cosmetic-button[data-item="'+item.id+'"]').click();await expect(art.locator('.lh-q-front')).toHaveCount(0)
  }
 }}
 expect(learningState(await database(page))).toEqual(before);expect(errors).toEqual([])
})

test('新款目录在小屏、平板、夜间大字下可浏览且预览不收费',async({page})=>{
 test.setTimeout(120000);expect(activeVisualVersion).toBe(2);await open(page,true);const before=await database(page)
 for(const element of elements){await selectCompanion(page,element);await lifeTab(page,'装扮').click();for(const width of [320,390,834,1194]){await page.setViewportSize({width,height:1000});await expectNoOverflow(page);const card=page.locator('.cosmetic-button').last();await card.scrollIntoViewIfNeeded();await expect(card.locator('img')).toHaveJSProperty('naturalWidth',256);await expect(card).toContainText(itemDesigns.find(item=>item.element===element&&item.module==='dress'&&item.designTier===5)!.name)}}
 const after=await database(page);expect(after.gems).toBe(before.gems);expect(after.history).toEqual(before.history);expect(after.cards).toEqual(before.cards)
 await page.setViewportSize({width:390,height:1000});await page.locator('.pet-dress-panel').screenshot({path:test.info().outputPath('v3-dress-dark-large.png')})
})
