import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase,setAppearance,openCustomPractice} from './helpers'
import {freshDatabase} from '../../src/stores/profile'

async function practice(page:Page,level='L5'){
 await seedDatabase(page,{...freshDatabase(),abilityLevel:level});await go(page,'home');await page.locator('.hero-cta').click();await openCustomPractice(page)
}
const group=(page:Page)=>page.getByRole('group',{name:'选择学习方式',exact:true})

for(const colorMode of ['light','dark'])for(const largeText of [false,true])test(`${colorMode} 大字${largeText} 五种紧凑图标在所有窗口保持一排`,async({page})=>{
 await setAppearance(page,'swiss',colorMode,{largeText,highContrast:largeText,reducedMotion:true});await practice(page);const before=await database(page)
 for(const width of [320,390,600,768,840,1024,1280]){
  await page.setViewportSize({width,height:1100});await expect(group(page).getByRole('button')).toHaveCount(5)
  for(const image of await group(page).locator('.study-mode-image img').all()){await expect(image).toHaveJSProperty('naturalWidth',256);await expect(image).toHaveJSProperty('naturalHeight',256)}
  const metrics=await group(page).evaluate(root=>({compact:!!root.closest('.compact-mode-control'),columns:getComputedStyle(root).gridTemplateColumns.split(' ').length,overflow:root.scrollWidth>root.clientWidth+1,tiles:Array.from(root.querySelectorAll('.study-mode-tile')).map(tile=>{const box=tile.getBoundingClientRect(),art=tile.querySelector('.study-mode-art')!.getBoundingClientRect(),label=tile.querySelector('.study-mode-title')!,title=label.getBoundingClientRect();return {width:box.width,height:box.height,top:box.top,artSize:art.width,font:parseFloat(getComputedStyle(label).fontSize),inside:art.left>=box.left&&art.right<=box.right&&title.left>=box.left&&title.right<=box.right+1,transition:getComputedStyle(tile).transitionDuration}})}))
  expect(metrics.columns).toBe(5);expect(metrics.overflow).toBe(false);expect(metrics.tiles.every(tile=>tile.width>=48&&tile.height>=48&&tile.font>=(metrics.compact?14:16)&&tile.artSize>=(metrics.compact?26:36)&&tile.artSize<=40&&tile.height<=96&&Math.abs(tile.top-metrics.tiles[0].top)<1&&tile.inside&&tile.transition==='0s')).toBe(true);expect(metrics.tiles[4].width).toBeCloseTo(metrics.tiles[0].width,0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,768,1280].includes(width))await group(page).screenshot({path:test.info().outputPath(`modes-${width}.png`)})
 }
 expect(await database(page)).toEqual(before)
})

test('五图标选择对应真实模式，键盘切换且不创建新轮次、不改正式档案',async({page})=>{
 await practice(page);const before=await database(page)
 for(const [id,title]of [['flash','闪现'],['connect','连接'],['listen','听音'],['spell','拼写'],['dictation','听写']]){
  const tile=group(page).locator(`[data-mode="${id}"]`);if(await tile.getAttribute('aria-pressed')!=='true')await tile.click();await expect(tile).toHaveAttribute('aria-pressed','true');await expect(tile.locator('.study-mode-title')).toHaveText(title);await expect(tile.locator('.study-mode-check')).toHaveCount(0)
  const db=await database(page);expect(db.session.id).toBe(before.session.id);expect(db.session.mode).toBe(id);expect(db.session.wordIds).toEqual(before.session.wordIds)
  for(const field of ['cards','history','gems','pets','rewardIds','courseProgress'])expect(db[field]).toEqual(before[field])
  if(['listen','spell'].includes(id))await expect(page.locator('.word-core .word')).toHaveText('···');if(id==='dictation'){await expect(page.locator('.dictation-hero')).toBeVisible();await expect(page.locator('.word-core,.meaning')).toHaveCount(0)}
 }
 const flash=group(page).locator('[data-mode="flash"]');await flash.focus();await page.keyboard.press('Enter');await expect(flash).toHaveAttribute('aria-pressed','true')
 const spell=group(page).locator('[data-mode="spell"]');await spell.focus();await page.keyboard.press('Space');await expect(spell).toHaveAttribute('aria-pressed','true');await page.locator('.spelling-input input').fill('cat');await page.getByRole('button',{name:'确认答案 →',exact:true}).click()
 for(const tile of await group(page).getByRole('button').all())await expect(tile).toBeDisabled()
})

test('不可用模式保持禁用与说明，图片失效时仍能认读并使用其他模式',async({page})=>{
 await page.route('**/static/icons/study-modes/*_256.png',route=>route.abort());await practice(page,'L1');await expect(group(page).locator('.study-mode-fallback')).toHaveCount(5)
 const dictation=group(page).locator('[data-mode="dictation"]');await expect(dictation).toBeDisabled();await expect(page.locator('.study-mode-availability')).toContainText('听写');await expect(page.locator('.study-mode-availability')).toContainText('暂不可用');await expect(dictation).toHaveAttribute('aria-label',/暂不可用/)
 const flash=group(page).locator('[data-mode="flash"]');if(await flash.getAttribute('aria-pressed')!=='true')await flash.click();await expect(flash).toHaveAttribute('aria-pressed','true')
})
