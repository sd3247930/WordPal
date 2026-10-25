import {test,expect} from '@playwright/test'
import {go,database,seedDatabase,setAppearance,selectWordbookScope} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'

for(const setup of [{width:390,height:844,largeText:false,mode:'light'},{width:320,height:768,largeText:true,mode:'dark'},{width:1024,height:900,largeText:false,mode:'dark'}])test(`${setup.width} 大字${setup.largeText} 切换当前教材保持范围卡片与滚动位置`,async({page})=>{
 await page.setViewportSize({width:setup.width,height:setup.height});await setAppearance(page,'swiss',setup.mode,{largeText:setup.largeText,highContrast:setup.largeText,reducedMotion:true});const db=freshDatabase();db.cards.cat=newCard('cat',new Date('2000-01-01'));await seedDatabase(page,db);await go(page,'review');const before=await database(page)
 await selectWordbookScope(page,'全部单词');const group=page.getByRole('group',{name:'单词本课程范围'})
 await group.evaluate(root=>window.scrollTo({top:Math.max(0,root.getBoundingClientRect().top+scrollY-100),behavior:'instant'}));await page.waitForTimeout(100)
 const position=()=>group.evaluate(root=>({top:root.getBoundingClientRect().top,scroll:scrollY}))
 const initial=await position();expect(initial.top).toBeGreaterThanOrEqual(0)
 for(let round=0;round<4;round++)for(const name of ['当前教材','全部单词']){
  await group.getByRole('button',{name,exact:true}).click();await expect(group.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(100)
  const current=await position();expect(Math.abs(current.top-initial.top)).toBeLessThanOrEqual(2);expect(Math.abs(current.scroll-initial.scroll)).toBeLessThanOrEqual(2)
 }
 expect(await group.locator('.wordbook-scope-check').count()).toBe(0);expect(await group.innerText()).not.toContain('✓')
 const toggle=page.getByRole('button',{name:'只看已学',exact:true}),indicator=toggle.locator('.wordbook-learned-indicator')
 await expect(indicator).toBeVisible();await expect(toggle.locator('.wordbook-learned-dot')).toHaveCount(0)
 for(let round=0;round<3;round++){
  await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(toggle).toHaveClass(/selected/);await expect(toggle.locator('.wordbook-learned-dot')).toBeVisible();expect(await toggle.innerText()).not.toContain('✓');await expect(page.locator('.wordbook-learning-overview')).toHaveAttribute('data-total','1')
  await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');await expect(toggle).not.toHaveClass(/selected/);await expect(toggle.locator('.wordbook-learned-dot')).toHaveCount(0);expect(Math.abs((await position()).top-initial.top)).toBeLessThanOrEqual(2)
 }
 expect(await database(page)).toEqual(before);await page.locator('.wordbook-scope-control').screenshot({path:test.info().outputPath('scope-selection.png')})
})
