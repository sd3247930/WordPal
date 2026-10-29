import {test,expect} from '@playwright/test'
import {elements,petInfo} from '../../packages/pet_engine'
import {housePrices} from '../../src/services/pet-lifehouse/HouseRegistry'
import {activeVisualVersion} from '../../src/services/pet-lifehouse/VisualPack'
import {openLife,selectCompanion,lifeTab,expectNoOverflow,openCatalog} from './lifehouse-helpers'
import {database,waitForArtwork,setAppearance,seedDatabase,go} from './helpers'
import {lifeFixture} from './lifehouse-helpers'

test('四象24个房屋状态真实升级，独立家具与场景分层，余额与当前场景一致',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});await openLife(page,{gems:50000});const before=await database(page),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const element of elements){await selectCompanion(page,element);for(let level=0;level<=5;level++){await expect(page.locator('.lh-stage')).toHaveAttribute('data-house-level',String(level));await expect(page.locator('.lh-scene-node img').first()).toHaveAttribute('src',new RegExp('v6/floor-'+element+'-l'+level+'[.]webp$'));await expect(page.locator('.lh-zone-tabs .wp-action-tile')).toHaveCount(0);await expect(page.locator('.lh-scene-actor .lh-q-body img').first()).toHaveAttribute('src',new RegExp(element+'-.*[.]png$'));if(level>0&&activeVisualVersion===1)await expect(page.locator('.lh-theme-motif img')).toHaveAttribute('src',new RegExp(element+'-motif[.]png$'));if(activeVisualVersion===2)await expect(page.locator('.lh-theme-motif')).toHaveCount(0);if(level===5)break;await page.getByRole('button',{name:'房屋 Lv.'+level+'，查看升级',exact:true}).click();await page.getByRole('button',{name:'使用 '+housePrices[level+1]+' 灵石升级',exact:true}).click()}
  await openCatalog(page);await page.locator('.lh-product').filter({hasText:({water:'贝壳小床',fire:'桃光小床',earth:'叶芽小床',wind:'云朵吊床'}[element])}).click();await page.getByRole('button',{name:'确认购买并放置',exact:true}).click();await expect(page.locator('.lh-stage [data-furniture="'+element+'-bed"] img')).toHaveAttribute('src',new RegExp(activeVisualVersion===2?element+'-furniture-l1-v1-512[.]png$':element+'-bed-512[.]png$'));await waitForArtwork(page);await page.screenshot({path:test.info().outputPath('lifehouse-'+element+'-mobile.png'),fullPage:true})
 }
 const after=await database(page);expect(after.gems).toBe(before.gems-36400-320);for(const id of elements)expect(after.lifeHouse.housesByElement[id].level).toBe(5);for(const key of ['cards','history','session','rewardIds','pets'])expect(after[key]).toEqual(before[key]);expect(errors).toEqual([])
 await page.setViewportSize({width:1280,height:800});await page.screenshot({path:test.info().outputPath('lifehouse-tablet.png'),fullPage:true})
})

for(const mode of ['light','dark'])test('奶油主题 '+mode+' 不带入棕色 UI，四象原图与大字布局保持',async({page})=>{
 await seedDatabase(page,lifeFixture(5));await setAppearance(page,'clay',mode,{largeText:true,highContrast:true,reducedMotion:true});await go(page,'pet');for(const id of elements){await selectCompanion(page,id);await expect(page.locator('.lh-v4-heading')).toContainText(petInfo[id].name);for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});await expectNoOverflow(page)}}
 const ink=await page.locator('.lh-workspace').evaluate(el=>getComputedStyle(el).color);expect(ink).toBe(mode==='dark'?'rgb(238, 247, 250)':'rgb(49, 79, 99)');await lifeTab(page,'喂食').click();if(activeVisualVersion===2){await expect(page.locator('.lh-design-card')).toHaveCount(6);expect(await page.locator('.lh-design-card').first().evaluate(el=>getComputedStyle(el).color)).toBe(ink)}else{expect(await page.locator('.food-choice').first().evaluate(el=>getComputedStyle(el).color)).toBe('rgb(37, 77, 70)');expect(await page.locator('.food-choice').last().evaluate(el=>getComputedStyle(el).color)).toBe(ink)}
})

test('未来版本家园保护且仍可浏览原功能，不把保护档案显示为零级家',async({page})=>{
 const db=lifeFixture();db.lifeHouse={schemaVersion:88,custom:{keep:['original',42]}};await seedDatabase(page,db);await go(page,'pet');const before=await database(page);await expect(page.locator('.lh-companion-level').first()).toHaveText('档案保护中');await expect(page.locator('.lh-stage')).toContainText('家园待恢复');await page.getByRole('button',{name:'家园待恢复',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'家园待恢复',exact:true})).toBeDisabled();await expect(page.getByRole('dialog').locator('.lh-upgrade-status')).toContainText('待恢复');await expect(page.locator('.lh-level-current')).toHaveCount(0);await page.keyboard.press('Escape');await lifeTab(page,'喂食').click();await expect(page.locator(activeVisualVersion===2?'.lh-design-card':'.food-choice')).toHaveCount(activeVisualVersion===2?6:4);expect(await database(page)).toEqual(before)
})
