import {test,expect} from '@playwright/test'
import {go,app,database,seedDatabase,setAppearance} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'

test('学习输入在旋转、五档缩放、换主题及异常退出后保留',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click();await page.locator('.mode-button').filter({hasText:'拼写'}).click()
 await page.locator('.spelling-input input').fill('ca')
 const original=await database(page)
 for(const width of [390,700,1000,1400,1800,768,390]){await page.setViewportSize({width,height:900});await expect(page.locator('.spelling-input input')).toHaveValue('ca');expect((await database(page)).session.id).toBe(original.session.id)}
 await go(page,'settings');await page.locator('.theme-choice').filter({hasText:'夜读星幕'}).click();await page.locator('.segmented [role=button]').filter({hasText:'深色'}).click()
 await go(page,'learn');await expect(page.locator('.spelling-input input')).toHaveValue('ca');await expect(app(page)).toHaveAttribute('data-theme','oled')
 await page.reload();await expect(page.locator('.spelling-input input')).toHaveValue('ca');expect((await database(page)).session.id).toBe(original.session.id)
 await page.locator('.spelling-input input').fill('cat');await page.locator('.answer-actions [role=button]').filter({hasText:'确认答案'}).click()
 await expect(page.locator('.answer-feedback')).toContainText('很棒，记住啦')
 const saved=await database(page);expect(saved.cards.cat.strategy).toBe('fsrs');expect(saved.history).toHaveLength(1);expect(saved.gems).toBe(2)
 await page.reload();expect((await database(page)).history).toHaveLength(1);expect((await database(page)).gems).toBe(2)
 await page.evaluate(()=>{const pointer=JSON.parse(localStorage.getItem('wordpal.database.active.v2')!);const key=pointer==='v2'?'wordpal.database.v2':pointer.key;const db=JSON.parse(localStorage.getItem(key)!);db.cards.cat.due='2000-01-01T00:00:00Z';localStorage.setItem(key,JSON.stringify(db))})
 await go(page,'review');await page.reload();await expect(app(page)).toBeVisible();const pending=await database(page);await page.getByRole('button',{name:'继续当前学习',exact:true}).click();await expect(page.locator('.answer-feedback')).toBeVisible();expect(await database(page)).toEqual(pending)
})
test('到期复习优先于请求的新词和自由练习',async({page})=>{
 const db=freshDatabase();db.cards.cat=newCard('cat',new Date('2020-01-01T00:00:00Z'));db.cards.cat.reps=1;db.cards.cat.stability=1;db.cards.cat.difficulty=5;db.cards.cat.state=2;db.cards.cat.last_review='2020-01-01T00:00:00Z'
 await seedDatabase(page,db);await go(page,'home');await expect(page.locator('.hero-counts')).toContainText('0');await page.locator('.hero-cta').click()
 const saved=await database(page);expect(saved.session.kind).toBe('review_due');expect(saved.session.wordIds).toEqual(['cat'])
})
test('首次错误进入本轮回看，灵石不能负数，低准确率巩固',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click()
 for(let i=0;i<5;i++){
  await page.locator('.mode-button').filter({hasText:'拼写'}).click();await page.locator('.spelling-input input').fill('wrong')
  await page.locator('.answer-actions [role=button]').filter({hasText:'查看提示'}).click()
  await page.locator('.answer-actions [role=button]').filter({hasText:'确认答案'}).click();await expect(page.locator('.answer-feedback')).toContainText('一起再认识它')
  await page.locator('.answer-feedback [role=button]').click()
 }
  const db=await database(page);expect(db.gems).toBe(1);expect(db.lessonIndex).toBe(0);expect(db.lastLessonAccuracy).toBe(0);expect(db.history).toHaveLength(5)
 await go(page,'review');await page.locator('.mode-button').filter({hasText:'错词本'}).click();await expect(page.locator('.review-row')).toHaveCount(0)
})
test('宠物切换和喂养不影响 SRS，数据删除需家长验证与明确文字',async({page})=>{
 const db=freshDatabase();db.gems=10;db.cards.cat=newCard('cat',new Date('2040-01-01T00:00:00Z'))
 await seedDatabase(page,db);await go(page,'pet');await page.locator('.pet-choice').filter({hasText:'小焰'}).click();await page.locator('.pet-action-tab').filter({hasText:'喂食'}).click();await page.locator('.pet-growth [role=button]').filter({hasText:'预览分享小点心'}).click();await page.locator('.confirm-feed').click()
 const saved=await database(page);expect(saved.companion).toBe('fire');expect(saved.gems).toBe(5);expect(saved.pets.fire.exp).toBe(0);expect(saved.pets.fire.affection).toBe(5);expect(saved.cards).toEqual(db.cards)
 await page.evaluate(()=>{localStorage.setItem('wordpal.wordbook.preferences.v1',JSON.stringify({favorites:['cat'],later:['cat']}));localStorage.setItem('wordpal.study.presentation.v1',JSON.stringify({sessionId:'old',input:'ca'}))});await go(page,'parent');await page.locator('.parent-gate input').fill('56');await page.locator('.parent-gate [role=button]').click()
 await expect(page.locator('.danger')).toBeDisabled();await page.locator('.parent-grid .spelling-input input').fill('删除学习数据');await page.locator('.danger').click()
 const erased=await database(page);expect(erased.cards).toEqual({});expect(erased.history).toEqual([]);expect(erased.gems).toBe(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.wordbook.preferences.v1')!))).toEqual({favorites:[],later:[]});expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.study.presentation.v1')!).input)).toBe('')
})
test('键盘快捷键与焦点行为，大字体和减少动效',async({page})=>{
 await setAppearance(page,'soft','light',{largeText:true,reducedMotion:true});await go(page,'home');await expect(app(page)).toHaveClass(/large-text/);await expect(app(page)).toHaveClass(/reduce-motion/)
 await page.locator('.hero-cta').click();await page.locator('body').click({position:{x:5,y:5}});await page.keyboard.press('Enter');await expect(page.locator('.rating-grid')).toBeVisible();await page.keyboard.press('3');await expect(page.locator('.answer-feedback')).toBeVisible();await page.keyboard.press('ArrowRight');expect((await database(page)).session.index).toBe(1)
 await page.keyboard.press('Control+3');await expect(page.locator('.pet-workspace')).toBeVisible()
})
test('五档窗口与手机平板横竖屏无水平溢出，导航合适',async({page})=>{
 for(const [width,height,size] of [[320,720,'compact'],[390,844,'compact'],[844,390,'expanded'],[768,1024,'medium'],[1024,768,'expanded'],[1280,800,'large'],[1800,1000,'extraLarge']] as const){
  await page.setViewportSize({width,height});await go(page,'home');await expect(app(page)).toHaveAttribute('data-window',size)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
  if(width<600)await expect(page.locator('.bottom-nav')).toBeVisible();else await expect(page.locator('.sidebar')).toBeVisible()
 }
})
test('没有外部统计、广告或业务请求',async({page})=>{
 const external:string[]=[];page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith('http://localhost:5173'))external.push(request.url())})
 for(const screen of ['home','learn','pet','parent','settings'])await go(page,screen)
 expect(external).toEqual([])
})


