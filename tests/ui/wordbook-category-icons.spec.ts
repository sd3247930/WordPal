import {test,expect} from '@playwright/test'
import {go,database,seedDatabase,setAppearance,selectWordbookScope} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'

const categories=[['due','到期复习'],['weak','重点复习'],['mistakes','错词本'],['all','所有单词']] as const
function fixture(){
 const db=freshDatabase()
 for(const id of ['cat','dog','bird'])db.cards[id]=newCard(id,new Date(id==='dog'?'2100-01-01':'2000-01-01'))
 db.practiceAnswers=[0,1].map(index=>({id:'category-error:'+index,wordId:'fish',rating:1 as const,correct:false,at:`2026-10-01T07:0${index}:00Z`,source:'practice' as const,mode:'spell' as const,input:'wrong'}))
 return db
}
async function seed(page:Parameters<typeof seedDatabase>[0]){
 await seedDatabase(page,fixture());await page.addInitScript(()=>{if(!localStorage.getItem('wordpal.wordbook.preferences.v1'))localStorage.setItem('wordpal.wordbook.preferences.v1',JSON.stringify({favorites:['cat','dog'],later:[]}))})
}
for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字${largeText} 四分类图标始终一行四列且不溢出`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText,highContrast:largeText,reducedMotion:true});await seed(page);await go(page,'review');const before=await database(page),group=page.getByRole('group',{name:'单词本筛选'})
 await expect(group.getByRole('button')).toHaveCount(4)
 for(const width of [320,390,600,768,1024,1280]){
  await page.setViewportSize({width,height:1100});for(const img of await group.locator('img').all())await expect(img).toHaveJSProperty('naturalWidth',256)
  const metrics=await group.evaluate(root=>({columns:getComputedStyle(root).gridTemplateColumns.split(' ').length,overflow:root.scrollWidth>root.clientWidth+1,items:Array.from(root.children).map(item=>{const rect=item.getBoundingClientRect(),art=item.querySelector('.wordbook-category-art')!.getBoundingClientRect();return {top:Math.round(rect.top),width:rect.width,height:rect.height,art:art.width,overflow:item.scrollWidth>item.clientWidth+1}})}))
  expect(metrics.columns).toBe(4);expect(new Set(metrics.items.map(item=>item.top)).size).toBe(1);expect(new Set(metrics.items.map(item=>item.width.toFixed(1))).size).toBe(1);expect(metrics.overflow).toBe(false);expect(metrics.items.every(item=>!item.overflow&&item.art<=40&&item.width>=44&&item.height>=48)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(width===390)await group.screenshot({path:test.info().outputPath('categories-390.png')})
 }
 expect(await database(page)).toEqual(before)
})

test('范围与四分类联动，手动重点和到期不同，重复点击只取消高亮并保留筛选',async({page})=>{
 await seed(page);await go(page,'review');const before=await database(page),group=page.getByRole('group',{name:'单词本筛选'})
 for(const scope of ['当前教材','全部单词','只看已学'] as const){
  await selectWordbookScope(page,scope)
  for(const [id,name]of categories){
   const tile=group.getByRole('button',{name,exact:true});if(await tile.getAttribute('aria-pressed')!=='true')await tile.locator('img').click()
   await expect(tile).toHaveAttribute('aria-pressed','true');await expect(page.locator('.review-list .section-heading')).toContainText(name)
   const rows=await page.locator('.review-word').allTextContents(),words=rows.map(text=>text.replace('★','').trim()).sort()
   if(id==='due')expect(words).toEqual(['bird','cat']);if(id==='weak')expect(words).toEqual(['cat','dog']);if(id==='mistakes')expect(words).toEqual(['fish'])
   if(id==='all')for(const word of ['bird','cat','dog','fish'])expect(words).toContain(word)
   await tile.click();await expect(tile).toHaveAttribute('aria-pressed','false');await expect(tile).not.toHaveClass(/selected|icon-highlighted/);expect(await page.locator('.review-word').allTextContents()).toEqual(rows)
   await tile.click();await expect(tile).toHaveAttribute('aria-pressed','true')
   await page.locator('.wordbook-search input').fill('cat');await expect(page.locator('.review-row')).toHaveCount(id==='mistakes'?0:1);await page.locator('.wordbook-search input').fill('')
  }
 }
 await group.getByRole('button',{name:'重点复习',exact:true}).click();await expect(page.locator('.wordbook-filter-note')).toContainText('手动星标');await group.getByRole('button',{name:'到期复习',exact:true}).click();await expect(page.locator('.wordbook-filter-note')).toContainText('复习时间')
 expect(await database(page)).toEqual(before);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.wordbook.preferences.v1')!))).toEqual({favorites:['cat','dog'],later:[]})
})

test('图片加载失败仍可操作四分类，空范围和键盘高亮取消可用',async({page})=>{
 await page.route('**/static/icons/wordbook-categories/*_256.png',route=>route.abort());await seedDatabase(page,freshDatabase());await go(page,'review');const before=await database(page),group=page.getByRole('group',{name:'单词本筛选'})
 await expect(group.locator('.wordbook-category-fallback')).toHaveCount(4)
 await selectWordbookScope(page,'只看已学')
 for(const [,name]of categories){const tile=group.getByRole('button',{name,exact:true});await tile.focus();if(await tile.getAttribute('aria-pressed')!=='true')await page.keyboard.press('Enter');await expect(tile).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Space');await expect(tile).toHaveAttribute('aria-pressed','false');await expect(page.locator('.review-row')).toHaveCount(0)}
 expect(await database(page)).toEqual(before)
})
