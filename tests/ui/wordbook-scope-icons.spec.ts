import {test,expect} from '@playwright/test'
import {go,database,seedDatabase,setAppearance,selectWordbookScope} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {starterPack} from '../../src/services/content/ContentRegistry'
import synthetic from '../../src/content/synthetic/course.json'
import syntheticArchived from '../../src/content/synthetic/archived-course.json'

const count=new Set([...starterPack.units,...synthetic.units,...syntheticArchived.units].flatMap(unit=>unit.lessons.flatMap(lesson=>lesson.wordIds))).size
function fixture(){const db=freshDatabase();db.cards.cat=newCard('cat',new Date('2000-01-01'));db.practiceAnswers=[{id:'scope-fixture:dog',wordId:'dog',rating:3,correct:true,at:'2026-10-09T07:00:00Z',source:'practice',mode:'spell',input:'dog'}];return db}
for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字${largeText} 合并范围图标与两项布局`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText,highContrast:largeText,reducedMotion:true});await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'));await seedDatabase(page,fixture());await go(page,'review');const before=await database(page)
 const group=page.getByRole('group',{name:'单词本课程范围'});await expect(group.getByRole('button')).toHaveCount(2);await expect(group.getByRole('button',{name:'当前教材',exact:true})).toHaveAttribute('aria-pressed','true');await selectWordbookScope(page,'全部单词');await expect(page.getByRole('button',{name:'只看已学',exact:true})).toHaveAttribute('aria-pressed','false')
 await expect(group.locator('[data-scope="all"] .wordbook-scope-count')).toHaveText(`${count} 个独立词`);await expect(page.locator('.wordbook-learned-toggle')).toContainText('2 词')
 for(const width of [320,390,600,768,1024,1280]){
  await page.setViewportSize({width,height:1100});for(const image of await page.locator('.wordbook-scope-image img').all())await expect(image).toHaveJSProperty('naturalWidth',256)
  const metrics=await group.evaluate(root=>({columns:getComputedStyle(root).gridTemplateColumns.split(' ').length,overflow:root.scrollWidth>root.clientWidth+1,items:Array.from(root.children).map(item=>{const box=item.getBoundingClientRect(),art=item.querySelector('.wordbook-scope-art')!.getBoundingClientRect();return {top:Math.round(box.top),overflow:item.scrollWidth>item.clientWidth+1,width:art.width,height:box.height}})}));expect(metrics.columns).toBe(2);expect(new Set(metrics.items.map(item=>item.top)).size).toBe(1);expect(metrics.overflow).toBe(false);expect(metrics.items.every(item=>!item.overflow&&item.width<=40&&item.height>=48)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(width===390)await page.locator('.wordbook-course-filters').screenshot({path:test.info().outputPath('scope-390.png')})
 }
 await selectWordbookScope(page,'只看已学');await expect(page.locator('.wordbook-stats>uni-view').last()).toContainText('2');await expect(page.getByRole('button',{name:'只看已学',exact:true})).toHaveAttribute('aria-pressed','true');expect(await database(page)).toEqual(before)
})
test('合并入口涵盖未学、只看已学保留原词库，搜索/Unit/详情和分页不串范围',async({page})=>{
 await page.setViewportSize({width:1024,height:1000});await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'));await seedDatabase(page,fixture());await go(page,'review');const before=await database(page)
 await page.locator('.review-tabs').getByRole('button',{name:'所有单词',exact:true}).click();await selectWordbookScope(page,'全部单词');await expect(page.locator('uni-picker[aria-label="选择浏览单元"]')).toHaveCount(0);await expect(page.locator('.wordbook-stats>uni-view').last()).toContainText(String(count));await page.locator('.wordbook-search input').fill('fish');await expect(page.locator('.review-row')).toHaveCount(1);await page.locator('.review-row .wordbook-open').click();await expect(page.locator('.word-detail-panel')).toBeVisible()
 await selectWordbookScope(page,'只看已学');await expect(page.locator('.review-row')).toHaveCount(0);await expect(page.locator('.word-detail-panel')).toHaveCount(0);await expect(page.locator('.wordbook-search input')).toHaveValue('fish');await page.locator('.wordbook-search input').fill('');await expect(page.locator('.review-row')).toHaveCount(2)
 for(let round=0;round<5;round++)for(const scope of ['全部单词','只看已学','当前教材'] as const){await selectWordbookScope(page,scope);await expect(page.locator('uni-picker[aria-label="选择浏览单元"]')).toHaveCount(scope==='当前教材'?1:0);await expect(page.locator('.wordbook-stats>uni-view').last()).toContainText(String(scope==='当前教材'?starterPack.vocabulary.length:scope==='全部单词'?count:2))}
 expect(await database(page)).toEqual(before)
})
test('图标失败保留可操作文字，空已学范围不写入学习记录',async({page})=>{
 await page.route('**/static/icons/wordbook-scopes/*_256.png',route=>route.abort());await seedDatabase(page,freshDatabase());await go(page,'review');const before=await database(page);await expect(page.locator('.wordbook-scope-tile .wordbook-scope-fallback')).toHaveCount(2);await selectWordbookScope(page,'只看已学');await expect(page.locator('.wordbook-scope-fallback')).toHaveCount(3);await expect(page.locator('.wordbook-stats>uni-view').last()).toContainText('0');await expect(page.locator('.review-row')).toHaveCount(0);expect(await database(page)).toEqual(before)
})
