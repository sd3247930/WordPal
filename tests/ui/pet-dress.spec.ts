import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'
const names=['探索丝带','暖暖围巾','星星徽章'],ids=['ribbon','scarf','star'],levels=[2,4,8]
async function dress(page:Page){await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:'装扮',exact:true}).click();await expect(page.locator('.pet-dress-panel')).toBeVisible()}
async function setup(page:Page,level:number){const db=goldenDatabase();db.pets.water={...db.pets.water,level,exp:(level-1)*100,equippedCosmetics:[]};await seedDatabase(page,db)}

for(const level of [1,4,8])test('Lv.'+level+' 装扮高清图、解锁、穿戴替换及取下维持原规则',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page,level);await go(page,'pet');await dress(page);const before=await database(page)
 for(let i=0;i<3;i++){
  const card=page.locator('.cosmetic-button').filter({hasText:names[i]});await expect(card.locator('img')).toHaveJSProperty('naturalWidth',1024)
  if(level<levels[i]){await expect(card).toBeDisabled();await expect(card).toContainText('Lv.'+levels[i]+' 解锁');continue}
  await card.click();await expect(card).toHaveAttribute('aria-pressed','true');await expect(page.locator('.dress-preview .pet-accessory img')).toHaveAttribute('src',new RegExp('water-1-'+ids[i]+'-front[.]png$'));expect((await database(page)).pets.water.equippedCosmetics).toEqual([ids[i]])
  await card.click();await expect(card).toHaveAttribute('aria-pressed','false');await expect(page.locator('.dress-preview .pet-accessory')).toHaveCount(0);expect(await database(page)).toEqual(before)
 }
})
test('键盘穿戴、单件替换和刷新恢复保持可用',async({page})=>{
 await setup(page,8);await go(page,'pet');await dress(page);const cards=page.locator('.cosmetic-button')
 await cards.nth(0).focus();await page.keyboard.press('Space');await expect(cards.nth(0)).toHaveAttribute('aria-pressed','true');await cards.nth(1).focus();await page.keyboard.press('Enter');await expect(cards.nth(0)).toHaveAttribute('aria-pressed','false');await expect(cards.nth(1)).toHaveAttribute('aria-pressed','true');const before=await database(page)
 await page.reload();await dress(page);await expect(cards.nth(1)).toHaveAttribute('aria-pressed','true');await expect(page.locator('.dress-preview .accessory-scarf img')).toBeVisible();expect(await database(page)).toEqual(before)
})
test('存储失败显示真实失败信息，不冒称已穿戴或已取下',async({page})=>{
 await setup(page,4);await go(page,'pet');await dress(page);const card=page.locator('.cosmetic-button');await card.nth(0).click();const before=await database(page)
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('wordpal.database.v2')&&!key.includes('active'))throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value)}})
 await card.nth(1).click();await expect(page.locator('.pet-house-notice')).toContainText('装扮未保存');await expect(card.nth(0)).toHaveAttribute('aria-pressed','true');expect(await database(page)).toEqual(before)
 await card.nth(0).click();await expect(page.locator('.pet-house-notice')).toContainText('装扮未保存');await expect(page.locator('.dress-preview .accessory-ribbon')).toBeVisible();expect(await database(page)).toEqual(before)
})
for(const [mode,extra] of [['light',{}],['dark',{}],['dark',{largeText:true,highContrast:true}]] as const)test(mode+' '+JSON.stringify(extra)+' 手机平板装扮卡片清晰完整',async({page})=>{
 await setup(page,4);await setAppearance(page,'swiss',mode,extra);await go(page,'pet');await dress(page);const before=await database(page)
 for(const width of [320,390,834,1194]){
  await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const cards=await page.locator('.cosmetic-button').evaluateAll(items=>items.map(item=>{const art=item.querySelector('.pet-dress-symbol')!,rect=art.getBoundingClientRect();return {overflow:item.scrollWidth>item.clientWidth+1,height:item.getBoundingClientRect().height,width:rect.width,iconHeight:rect.height,font:parseFloat(getComputedStyle(item.querySelector('.cosmetic-name')!).fontSize),top:Math.round(item.getBoundingClientRect().top)}}))
  expect(cards.every(card=>!card.overflow&&card.height>=128&&Math.abs(card.width-80)<.1&&Math.abs(card.iconHeight-80)<.1&&card.font>=18)).toBe(true);expect(new Set(cards.map(card=>card.top)).size).toBe(width>=1100&&!('largeText' in extra)?1:3)
 }
 expect(await database(page)).toEqual(before);await page.setViewportSize({width:390,height:950});await page.locator('.pet-dress-panel').screenshot({path:'test-results/pet-dress-'+mode+('largeText' in extra?'-accessible':'')+'.png'})
})
