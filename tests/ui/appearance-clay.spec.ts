import {test,expect,type Page} from '@playwright/test'
import {go,app,setAppearance,seedDatabase,database,waitForArtwork} from './helpers'
import {goldenDatabase} from './fixtures'

const screens=['home','learn','pet','review','settings'] as const
const themeButton=(page:Page,id:string)=>page.locator(`[data-theme-choice="${id}"]`)
for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`${theme} ${mode} 五页对照与数据不变`,async({page})=>{
 test.setTimeout(90000);await page.clock.install({time:new Date('2026-10-04T08:00:00Z')});await setAppearance(page,theme,mode,{reducedMotion:true});await seedDatabase(page,goldenDatabase());await page.setViewportSize({width:390,height:844});await go(page,'home');const before=await database(page)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 for(const screen of screens){
  await go(page,screen);await expect(app(page)).toHaveAttribute('data-theme',theme);await expect(app(page)).toHaveAttribute('data-mode',mode)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await waitForArtwork(page)
  await page.screenshot({path:test.info().outputPath(`${theme}-${mode}-${screen}.png`),fullPage:true,animations:'disabled'})
  if(theme==='clay'){const card=page.locator('.wp-card').first();await expect(card).toHaveCSS('border-radius',screen==='home'||screen==='learn'?'28px':'24px');const shadow=await card.evaluate(el=>getComputedStyle(el).boxShadow);if((screen==='home'||screen==='learn')&&mode==='dark')expect(shadow).toBe('none');else expect(shadow).not.toBe('none')}
 }
 expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})

test('双卡独立预览、二十轮切换、反选状态与冷启动持久化',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'settings');const before=await database(page),swiss=themeButton(page,'swiss'),clay=themeButton(page,'clay')
 await expect(page.locator('.theme-choice')).toHaveCount(2)
 const colors=()=>page.locator('.theme-mini').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundColor));expect(new Set(await colors()).size).toBe(2)
 for(let index=0;index<20;index++){await clay.locator('.theme-mini').click();await expect(app(page)).toHaveAttribute('data-theme','clay');await swiss.click();await expect(app(page)).toHaveAttribute('data-theme','swiss')}
 await clay.click();await expect(clay).toHaveAttribute('aria-current','true');await clay.click();await expect(clay).toHaveAttribute('aria-pressed','false');await expect(clay).toHaveAttribute('aria-current','true');await expect(clay).toContainText('当前使用中');await expect(app(page)).toHaveAttribute('data-theme','clay');expect(new Set(await colors()).size).toBe(2)
 await page.reload();await expect(app(page)).toHaveAttribute('data-theme','clay');await clay.focus();await page.keyboard.press('Space');await expect(clay).toHaveAttribute('aria-current','true');await swiss.focus();await page.keyboard.press('Enter');await expect(app(page)).toHaveAttribute('data-theme','swiss');expect(await database(page)).toEqual(before)
})

for(const mode of ['light','dark'])test(`clay ${mode} 大字双卡与五页窗口边界`,async({page})=>{
 test.setTimeout(120000);await setAppearance(page,'clay',mode,{largeText:true,highContrast:true,reducedMotion:true});await seedDatabase(page,goldenDatabase());await go(page,'settings');const before=await database(page)
 for(const width of [320,390,599,600,768,839,840,1024,1280]){
  await page.setViewportSize({width,height:1000});await go(page,'settings')
  const group=page.locator('.theme-choice-grid'),metrics=await group.evaluate(root=>({overflow:root.scrollWidth>root.clientWidth+1,items:Array.from(root.children).map(item=>{const r=item.getBoundingClientRect();return {top:Math.round(r.top),width:r.width,height:r.height,overflow:item.scrollWidth>item.clientWidth+1}})}));expect(metrics.overflow).toBe(false);expect(new Set(metrics.items.map(item=>item.top)).size).toBe(1);expect(metrics.items.every(item=>item.width>=44&&item.height>=48&&!item.overflow)).toBe(true)
  for(const screen of screens){await go(page,screen);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen} ${width}`).toBe(true)}
 }
 expect(await database(page)).toEqual(before)
})

test('深浅系统模式与四象场景独立，主题保存失败可恢复',async({page})=>{
 await setAppearance(page,'clay','system');await seedDatabase(page,goldenDatabase());await page.addInitScript(()=>{if(!localStorage.getItem('wordpal.pethouse.appearance.v1'))localStorage.setItem('wordpal.pethouse.appearance.v1',JSON.stringify({sceneId:'fire'}))});await go(page,'settings');const before=await database(page)
 await page.emulateMedia({colorScheme:'dark'});await expect(app(page)).toHaveAttribute('data-mode','dark');await page.emulateMedia({colorScheme:'light'});await expect(app(page)).toHaveAttribute('data-mode','light')
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wordpal.appearance.v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value)}})
 await themeButton(page,'swiss').click();await expect(app(page)).toHaveAttribute('data-theme','swiss');await expect(page.getByRole('status')).toContainText('外观暂时无法保存');await page.reload();await expect(app(page)).toHaveAttribute('data-theme','clay')
 for(const scene of ['水之主题','火之主题','土之主题','风之主题']){await go(page,'pet');await page.getByRole('button',{name:scene,exact:true}).click();const saved=await page.evaluate(()=>localStorage.getItem('wordpal.pethouse.appearance.v1'));await go(page,'settings');await themeButton(page,'swiss').click();await themeButton(page,'clay').click();expect(await page.evaluate(()=>localStorage.getItem('wordpal.pethouse.appearance.v1'))).toBe(saved)}
 expect(await database(page)).toEqual(before)
})

test('未提交输入经主题切换与续学保留，练习选择不提前提交',async({page})=>{
 const db=goldenDatabase();db.session!.mode='spell';db.session!.input='ca';db.session!.answers=[];db.session!.index=0
 await setAppearance(page,'swiss','light');await seedDatabase(page,db);await go(page,'learn');await expect(page.locator('.spelling-input input')).toHaveValue('ca');const before=await database(page)
 await go(page,'settings');await themeButton(page,'clay').click();await go(page,'learn');await expect(page.locator('.spelling-input input')).toHaveValue('ca');expect(await database(page)).toEqual(before)
})
