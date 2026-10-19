import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'
const names=['水滴果','星光珍珠','月光树叶','风之羽']
const foods=(page:Page)=>page.getByRole('group',{name:'选择分享小点心',exact:true})
async function open(page:Page){await go(page,'pet');await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:'喂食',exact:true}).click()}

test('四款喂食道具可预览、切换、取消及键盘选择，确认扣费和每天一次规则保持',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seedDatabase(page,goldenDatabase());await open(page);const before=await database(page)
 await expect(foods(page).locator('.food-choice-name')).toHaveText(names)
 for(const name of names){
  const button=foods(page).getByRole('button',{name,exact:true});if(await button.getAttribute('aria-pressed')==='true')await button.click();await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(foods(page).locator('[aria-pressed="true"]')).toHaveCount(1);await expect(page.getByRole('region',{name:'分享预览',exact:true})).toContainText(name);expect(await database(page)).toEqual(before)
  await button.click();await expect(button).toHaveAttribute('aria-pressed','false');await expect(page.locator('.feed-preview')).toHaveCount(0);expect(await database(page)).toEqual(before)
  await button.click();await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('.feed-preview')).toHaveCount(0);expect(await database(page)).toEqual(before)
 }
 await foods(page).getByRole('button',{name:'星光珍珠',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('.feed-preview')).toContainText('星光珍珠');await foods(page).getByRole('button',{name:'月光树叶',exact:true}).focus();await page.keyboard.press('Space');await expect(page.locator('.feed-preview')).toContainText('月光树叶');expect(await database(page)).toEqual(before)
 await page.getByRole('button',{name:'确认分享 · 5 灵石',exact:true}).click();const after=await database(page);expect(after.gems).toBe(before.gems-5);expect(after.pets.water.affection).toBe(before.pets.water.affection+5)
 for(const field of ['cards','history','session','courseProgress','rewardIds'])expect(after[field]).toEqual(before[field]);expect(after.pets.water.exp).toBe(before.pets.water.exp)
 await foods(page).getByRole('button',{name:'风之羽',exact:true}).click();await expect(page.getByRole('button',{name:'确认分享 · 5 灵石',exact:true})).toBeDisabled();expect(await database(page)).toEqual(after)
})

for(const mode of ['light','dark'])for(const preference of ['normal','large','contrast'])test(`${mode} ${preference} 喂食道具在四种场景下高清，手机两列、宽屏四列且文字无溢出`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText:preference!=='normal',highContrast:preference==='contrast',reducedMotion:true});await seedDatabase(page,goldenDatabase());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);const before=await database(page)
 const widths=[320,390,768,840,1000,1280],scenes=['水之主题','火之主题','土之主题','风之主题']
 for(let i=0;i<widths.length;i++){
  const width=widths[i];await page.setViewportSize({width,height:1000});await page.getByRole('button',{name:scenes[i%4],exact:true}).click();await expect(foods(page).locator('.food-choice')).toHaveCount(4)
  const images=foods(page).locator('.pet-food-symbol img');await expect(images).toHaveCount(4);const sources:string[]=[]
  for(const image of await images.all()){
   await expect(image).toHaveJSProperty('complete',true);expect(await image.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);const src=(await image.getAttribute('src'))!;sources.push(src);expect(decodeURIComponent(src.split(',')[1]).includes('Gradient')).toBe(preference!=='contrast')
  }
  expect(new Set(sources).size).toBe(4)
  const boxes=await foods(page).locator('.food-choice').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect(),label=item.querySelector('.food-choice-name')!,price=item.querySelector('.food-choice-price')!,icon=item.querySelector('.pet-food-symbol')!;return {y:r.y,width:r.width,height:r.height,overflow:item.scrollWidth>item.clientWidth+1,labelSize:parseFloat(getComputedStyle(label).fontSize),priceSize:parseFloat(getComputedStyle(price).fontSize),iconWidth:icon.getBoundingClientRect().width,contents:[label,price,icon,item.querySelector('.food-choice-state')!].map(el=>{const b=el.getBoundingClientRect();return b.left>=r.left-.1&&b.right<=r.right+.1&&b.top>=r.top-.1&&b.bottom<=r.bottom+.1})}}))
  expect(boxes.every(b=>b.height>=168&&!b.overflow&&b.labelSize>=16&&b.priceSize>=13&&b.iconWidth===64&&b.contents.every(Boolean))).toBe(true)
  expect(Math.max(...boxes.map(b=>b.width))-Math.min(...boxes.map(b=>b.width))).toBeLessThan(1);expect(new Set(boxes.map(b=>Math.round(b.y))).size).toBe(width>=1000?1:2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,1280].includes(width))await foods(page).screenshot({path:test.info().outputPath(`pet-foods-${mode}-${preference}-${width}.png`)})
 }
 expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})
