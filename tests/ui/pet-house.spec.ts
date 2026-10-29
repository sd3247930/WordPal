import {test,expect} from '@playwright/test'
import {go,database,waitForArtwork} from './helpers'
import {openLife,lifeTab,selectCompanion,expectNoOverflow,openCatalog,manageFurniture} from './lifehouse-helpers'
import {elements} from '../../packages/pet_engine'
import {activeVisualVersion} from '../../src/services/pet-lifehouse/VisualPack'

test('旧档案浏览零初始化；五页签重复点击不清空，学习和钱包不变',async({page})=>{
 await openLife(page);const before=await database(page);expect(before.lifeHouse).toBeUndefined()
 for(const [name,panel]of [['家园','.lh-builder'],['喂食','.pet-feed-panel'],['成长','.pet-growth-panel'],['装扮','.pet-dress-panel'],['相册','.pet-album-panel']]){const tab=lifeTab(page,name);await tab.click();await tab.click();await expect(tab).toHaveAttribute('aria-pressed','true');await expect(page.locator(panel)).toBeVisible()}
 expect(await database(page)).toEqual(before);await page.reload();expect((await database(page)).lifeHouse).toBeUndefined()
})

test('逐级升级、四象独立、赠礼与相册留影持久化，正式学习档案不变',async({page})=>{
 await openLife(page);const before=await database(page)
 for(const id of elements){await selectCompanion(page,id);await page.getByRole('button',{name:'房屋 Lv.0，查看升级',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('300 灵石');await page.getByRole('button',{name:'使用 300 灵石升级',exact:true}).click();await expect(page.locator('.lh-stage')).toHaveAttribute('data-house-level','1')}
 const after=await database(page);expect(after.gems).toBe(before.gems-1200);for(const id of elements){expect(after.lifeHouse.housesByElement[id].level).toBe(1);expect(after.lifeHouse.housesByElement[id].owned).toHaveLength(1)}for(const key of ['history','session','cards','pets','rewardIds'])expect(after[key]).toEqual(before[key])
 await lifeTab(page,'相册').click();await expect(page.locator('.lh-memory-card')).toHaveCount(2);await expect(page.locator('.lh-snapshot-scene').first()).toBeVisible();await page.reload();expect(await database(page)).toEqual(after)
})

test('购买预览取消零扣费；替换默认收纳，免费放回，退回仅返一次实付50%',async({page})=>{
 await openLife(page,{level:1});const before=await database(page);await openCatalog(page)
 const bed=page.locator('.lh-product').filter({hasText:'贝壳小床'});await bed.click();await expect(page.locator('.lh-placement-panel')).toContainText('购买 80 灵石');expect(await database(page)).toEqual(before);await page.getByRole('button',{name:'取消摆放预览',exact:true}).click();expect(await database(page)).toEqual(before)
 await bed.click();await page.getByRole('button',{name:'确认购买并放置',exact:true}).click();await expect(page.locator('.lh-stage [data-furniture="water-bed"]')).toBeVisible();const bought=await database(page);expect(bought.gems).toBe(before.gems-80);expect(bought.lifeHouse.housesByElement.water.owned).toHaveLength(2)
 await manageFurniture(page,'贝壳小床');await page.getByRole('button',{name:'收纳 · 不返灵石',exact:true}).click();expect((await database(page)).gems).toBe(bought.gems);await expect(page.locator('.lh-stage [data-furniture="water-bed"]')).toHaveCount(0)
 await bed.click();await page.getByRole('button',{name:'确认放置 · 免费',exact:true}).click();expect((await database(page)).gems).toBe(bought.gems)
 await manageFurniture(page,'贝壳小床');await page.getByRole('button',{name:'退回物品',exact:true}).click();expect((await database(page)).gems).toBe(bought.gems);await expect(page.getByRole('dialog')).toContainText('不再拥有');await page.getByRole('button',{name:'确认退回 · 返 40 灵石',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);const returned=await database(page);expect(returned.gems).toBe(bought.gems+40);expect(returned.lifeHouse.housesByElement.water.owned).toHaveLength(1);await page.reload();expect(await database(page)).toEqual(returned)
})

test('写入失败钱包与家具均不变；释放空间后同一预览可重试且只扣一次',async({page})=>{
 await openLife(page,{level:1});const before=await database(page);await openCatalog(page);await page.locator('.lh-product').filter({hasText:'珍珠台灯'}).click();await page.evaluate(()=>{const set=Storage.prototype.setItem;(window as any).lifeRestore=()=>Storage.prototype.setItem=set;Storage.prototype.setItem=function(k,v){if(k.startsWith('wordpal.database.v2')&&!k.includes('active'))throw Error('Test quota');return set.call(this,k,v)}})
 await page.getByRole('button',{name:'确认购买并放置',exact:true}).click();await expect(page.locator('.lh-feedback')).toContainText('灵石和物品都没有改变');expect(await database(page)).toEqual(before);await page.evaluate(()=>(window as any).lifeRestore());await page.getByRole('button',{name:'确认购买并放置',exact:true}).click();await expect(page.locator('.lh-stage [data-furniture="water-lamp"]')).toBeVisible();expect((await database(page)).gems).toBe(before.gems-60)
})

test('余额不足、跨级预览、赠品收纳限制与弹层键盘关闭',async({page})=>{
 await openLife(page,{level:1,gems:10});const before=await database(page);await openCatalog(page);await page.locator('.lh-product').filter({hasText:'贝壳小床'}).click();await expect(page.locator('.lh-placement-panel')).toContainText('还差 70');await expect(page.getByRole('button',{name:'去学习收获灵石',exact:true})).toBeVisible();await page.getByRole('button',{name:'取消摆放预览',exact:true}).click()
 await manageFurniture(page,'奶油基础床');await expect(page.getByRole('button',{name:'退回物品',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'房屋 Lv.1，查看升级',exact:true}).click();await page.getByRole('button',{name:'预览房屋 Lv.5 星海幻梦堡',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('先解锁 Lv.2');await expect(page.getByRole('button',{name:/使用 .* 灵石升级/})).toHaveCount(0);await page.keyboard.press('Escape');expect(await database(page)).toEqual(before)
})

for(const mode of ['light','dark'])test(mode+' 手机平板横屏大字，高清图与44px热区完整，页面无脚本错误',async({page})=>{
 test.setTimeout(90000);await openLife(page,{level:5,mode,large:mode==='dark',contrast:mode==='dark'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const before=await database(page)
 for(const size of [{width:320,height:700},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){await page.setViewportSize(size);for(const name of ['家园','喂食','成长','装扮','相册']){await lifeTab(page,name).click();await expectNoOverflow(page);const heights=await page.locator('.lh-workspace .wp-action-tile:visible').evaluateAll(nodes=>nodes.filter(n=>!n.classList.contains('lh-placed-button')).map(n=>n.getBoundingClientRect().height));expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)} }
 await page.setViewportSize({width:390,height:844});await lifeTab(page,'家园').click();await waitForArtwork(page);await expect(page.locator('.lh-asset-failed')).toHaveCount(0);await page.screenshot({path:test.info().outputPath('lifehouse-'+mode+'-mobile.png'),fullPage:true});expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})

test('丢图可重试恢复，资产与钱包不被删除；切换伙伴取消旧摆放预览',async({page})=>{
 const bedImage=activeVisualVersion===2?'**/lifehouse/v2/items/water/furniture/l1/water-furniture-l1-v1-256.png':'**/lifehouse/furniture/water-bed-256.png';await page.route(bedImage,route=>route.abort());await openLife(page,{level:1});await openCatalog(page);const before=await database(page);await expect(page.locator('.lh-product .lh-asset-failed')).toHaveCount(1);await page.unroute(bedImage);await page.locator('.lh-product').filter({hasText:'贝壳小床'}).getByRole('button',{name:'重试',exact:true}).click();await expect(page.locator('.lh-product .lh-asset-failed')).toHaveCount(0);expect(await database(page)).toEqual(before)
 await page.locator('.lh-product').filter({hasText:'贝壳小床'}).click();await selectCompanion(page,'fire');await expect(page.locator('.lh-placement-panel')).toHaveCount(0);await expect(page.locator('.lh-scene-ghost')).toHaveCount(0);const after=await database(page);expect(after.gems).toBe(before.gems);expect(after.lifeHouse).toEqual(before.lifeHouse)
})
