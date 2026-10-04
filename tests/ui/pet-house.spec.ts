import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'
import {contrast} from '../../src/styles/themes'
const tab=(page:import('@playwright/test').Page,name:string)=>page.locator('.pet-action-tab').filter({hasText:name})
const sceneKey='wordpal.pethouse.appearance.v1'

test('场景独立持久化，不修改伙伴、学习、会话或全局外观',async({page})=>{
 await setAppearance(page,'swiss','light');await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 for(const name of ['火之主题','土之主题','风之主题','水之主题']){await page.getByRole('button',{name,exact:true}).click();await expect(page.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');expect(await database(page)).toEqual(before)}
 await page.getByRole('button',{name:'风之主题',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'风之主题',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.locator('.current-pet-hero')).toContainText('小澜');await expect(page.locator('.wp-app')).toHaveAttribute('data-theme','swiss');expect(await database(page)).toEqual(before)
 await go(page,'learn');expect((await database(page)).session).toEqual(before.session)
})
test('选择陪伴与场景互不联动，改变伙伴取消旧喂食预览',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'pet');await page.getByRole('button',{name:'土之主题',exact:true}).click();await tab(page,'喂食').click();await page.locator('.food-choice').filter({hasText:'风之羽'}).click()
 const before=await database(page);await page.locator('.pet-choice').filter({hasText:'小焰'}).click();await expect(page.locator('.feed-preview')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'土之主题',exact:true})).toHaveAttribute('aria-pressed','true');const after=await database(page);expect(after.companion).toBe('fire');expect(after.pets).toEqual(before.pets);expect(after.gems).toBe(before.gems)
 await page.getByRole('button',{name:'水之主题',exact:true}).click();expect((await database(page)).companion).toBe('fire')
})
test('喂食预览和取消不扣费，确认只执行原规则且每天一次',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'pet');await tab(page,'喂食').click();const before=await database(page)
 await expect(page.locator('.pet-feed-panel')).toContainText('可分享 3 份')
 await page.locator('.food-choice').filter({hasText:'星光珍珠'}).click();await expect(page.locator('.feed-preview')).toContainText('星光珍珠');expect(await database(page)).toEqual(before)
 await page.getByRole('button',{name:'取消',exact:true}).click();expect(await database(page)).toEqual(before)
 await page.locator('.food-choice').filter({hasText:'月光树叶'}).click();await page.locator('.confirm-feed').click();const after=await database(page)
 expect(after.gems).toBe(before.gems-5);expect(after.pets.water.affection).toBe(before.pets.water.affection+5);expect(after.pets.water.exp).toBe(before.pets.water.exp);expect(after.session).toEqual(before.session);expect(after.cards).toEqual(before.cards);expect(after.history).toEqual(before.history)
 await expect(page.getByRole('button',{name:'✓ 今天已分享',exact:true})).toBeDisabled();await page.locator('.food-choice').filter({hasText:'水滴果'}).click();await expect(page.locator('.confirm-feed')).toBeDisabled();expect(await database(page)).toEqual(after)
})
test('装扮取下与解锁图鉴只消费真实等级，累计学习不冒充单宠记录',async({page})=>{
 const db=goldenDatabase();db.pets.water={...db.pets.water,level:4,exp:350,evolutionStage:2};await seedDatabase(page,db);await go(page,'pet');await tab(page,'装扮').click();const before=await database(page)
 await page.locator('.cosmetic-button').filter({hasText:'暖暖围巾'}).click();expect((await database(page)).pets.water.equippedCosmetics).toEqual(['scarf']);await expect(page.locator('.dress-preview .accessory-scarf')).toBeVisible()
 await page.locator('.cosmetic-button').filter({hasText:'暖暖围巾'}).click();expect((await database(page)).pets.water.equippedCosmetics).toEqual([]);await expect(page.locator('.cosmetic-button').filter({hasText:'星星徽章'})).toBeDisabled()
 const after=await database(page);expect(after.pets.water.exp).toBe(before.pets.water.exp);expect(after.gems).toBe(before.gems)
 await tab(page,'相册').click();await expect(page.locator('.pet-album-entry:not(.locked)')).toHaveCount(2);await expect(page.locator('.pet-album-entry.locked')).toHaveCount(2);await expect(page.locator('.pet-album-panel')).toContainText('尚未开放');expect(await database(page)).toEqual(after)
 await tab(page,'成长').click();await expect(page.locator('.pet-growth-panel')).toContainText('本设备累计学习');await expect(page.locator('.growth-step.reached')).toHaveCount(2)
})
test('减少动效仍保留短淡入，HUD不覆盖角色，窗口变化保留面板和预览',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,'soft','light');await seedDatabase(page,goldenDatabase());await go(page,'pet')
 const art=(await page.locator('.scene-character').boundingBox())!,hud=(await page.locator('.scene-hud').boundingBox())!;expect(hud.y).toBeGreaterThanOrEqual(art.y+art.height)
 await page.getByRole('button',{name:'火之主题',exact:true}).click();expect(await page.locator('.current-scene').evaluate(e=>getComputedStyle(e).animationDuration)).toBe('0.14s');expect(await page.locator('.scene-ambient').evaluate(e=>getComputedStyle(e).animationName)).toBe('none')
 await tab(page,'喂食').click();await page.locator('.food-choice').filter({hasText:'风之羽'}).click();const before=await database(page)
 for(const width of [507,800,1194,1600,390]){await page.setViewportSize({width,height:900});await expect(tab(page,'喂食')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.feed-preview')).toContainText('风之羽');expect(await database(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
})
test('旧安装与无效场景安全回退，偏好写入失败不改场景或数据库',async({page})=>{
 const db=goldenDatabase();db.companion='earth';await seedDatabase(page,db);await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({sceneId:'broken'})),sceneKey);await go(page,'pet');await expect(page.getByRole('button',{name:'土之主题',exact:true})).toHaveAttribute('aria-pressed','true')
 const before=await database(page);await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v)}},sceneKey)
 await page.getByRole('button',{name:'火之主题',exact:true}).click();await expect(page.locator('.pet-theme-switch .notice')).toContainText('暂未保存');await expect(page.getByRole('button',{name:'土之主题',exact:true})).toHaveAttribute('aria-pressed','true');expect(await database(page)).toEqual(before)
})
test('四个宽屏领地各有不遮挡角色的 HUD 和至少56像素互动入口',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await go(page,'pet');await expect(page.locator('.pet-territory')).toHaveCount(4)
 for(const territory of await page.locator('.pet-territory').all()){const art=(await territory.locator('.territory-art').boundingBox())!,hud=(await territory.locator('.pet-status-hud').boundingBox())!;expect(hud.y).toBeGreaterThanOrEqual(art.y+art.height);expect((await territory.locator('.hud-interact').boundingBox())!.height).toBeGreaterThanOrEqual(56)}
 await page.locator('.pet-territory').filter({hasText:'小岚'}).getByRole('button').click();expect((await database(page)).companion).toBe('wind')
})

const devices=[{name:'android-phone',width:412,height:915},{name:'iphone',width:393,height:852},{name:'android-tablet-portrait',width:800,height:1280},{name:'android-tablet-landscape',width:1280,height:800},{name:'ipad-portrait',width:834,height:1194},{name:'ipad-landscape',width:1194,height:834},{name:'ipad-split',width:507,height:1024}]
for(const scene of ['water','fire','earth','wind'])test(scene+' 夜间大字体全功能面板与核心热区',async({page})=>{
 await seedDatabase(page,goldenDatabase());await setAppearance(page,'oled','dark',{largeText:true,highContrast:true,reducedMotion:true});await page.addInitScript(({key,scene})=>localStorage.setItem(key,JSON.stringify({sceneId:scene})),{key:sceneKey,scene})
 for(const width of [320,768,1280,1800]){await page.setViewportSize({width,height:900});await go(page,'pet');for(const name of ['家园','喂食','成长','装扮','相册']){await tab(page,name).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const heights=await page.locator('.pet-house [role=button]:visible').evaluateAll(items=>items.map(e=>e.getBoundingClientRect().height));expect(Math.min(...heights)).toBeGreaterThanOrEqual(56);const disabled=await page.locator('.pet-house [role=button][disabled]:visible').evaluateAll(items=>items.map(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor]}));const hex=(rgb:string)=>'#'+rgb.match(/\d+/g)!.slice(0,3).map(Number).map(n=>n.toString(16).padStart(2,'0')).join('');for(const [fg,bg]of disabled)expect(contrast(hex(fg),hex(bg))).toBeGreaterThanOrEqual(4.5)}const colors=await page.locator('.pet-house .wp-card').evaluateAll(cards=>cards.map(e=>getComputedStyle(e).backgroundColor));for(const color of colors)expect(Math.max(...color.match(/\d+/g)!.slice(0,3).map(Number))).toBeLessThan(90)}
})
for(const scene of ['water','fire','earth','wind'])for(const size of devices)test(`宠物屋 ${scene} / ${size.name} 五页回归`,async({page})=>{
 await page.clock.install({time:new Date('2026-10-04T08:00:00Z')});await page.setViewportSize(size);await seedDatabase(page,goldenDatabase());await setAppearance(page,'soft','light');await page.addInitScript(({key,scene})=>localStorage.setItem(key,JSON.stringify({sceneId:scene})),{key:sceneKey,scene});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const screen of ['home','learn','pet','review','settings']){await go(page,screen);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator(size.width<600?'.bottom-nav':'.sidebar')).toBeVisible();expect((await database(page)).session?.id).toBe('golden-session');if(screen==='pet'){await expect(page.locator('.pet-scene')).toHaveClass(new RegExp('scene-'+scene));const boxes=await page.locator('.pet-theme-choice').evaluateAll(e=>e.map(x=>x.getBoundingClientRect()));expect(new Set(boxes.map(x=>x.y)).size).toBe(size.width<600?2:1);await expect(page).toHaveScreenshot(`pethouse-${scene}-${size.name}.png`,{fullPage:true,animations:'disabled'})}}
 expect(errors).toEqual([])
})
