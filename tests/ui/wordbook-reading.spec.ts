import {test,expect,type Page} from '@playwright/test'
import sharp from 'sharp'
import {go,seedDatabase,database,setAppearance,selectWordbookScope,waitForArtwork} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {customCourse} from '../helpers/custom-course'

async function fixture(page:Page){
 const packs=[customCourse('reading-a',113),customCourse('reading-b',12)]
 const names=['cat','chocolate','Merry Christmas!',"I'm","don't",'well-known','pneumonoultramicroscopicsilicovolcanoconiosis']
 packs[0].title='合成阅读教材 A';packs[1].title='合成阅读教材 B'
 names.forEach((name,index)=>{packs[0].vocabulary[index].lemma=name});packs[0].vocabulary[1].meaning='巧克力；巧克力糖；一种可用于烘焙和制作甜点的食品'
 for(const word of packs[0].vocabulary.slice(0,7))word.image='/static/reading-fixture-image.png'
 const png=await sharp({create:{width:1024,height:768,channels:4,background:{r:100,g:170,b:210,alpha:.4}}}).png().toBuffer()
 await page.route('**/reading-fixture-image.png',route=>route.fulfill({contentType:'image/png',body:png}))
 await page.addInitScript(packs=>{localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));return {key,courseId:pack.courseId,archived:false,aliases:{}}})));localStorage.setItem('wordpal.wordbook.preferences.v1',JSON.stringify({favorites:packs.flatMap(pack=>pack.vocabulary.filter((_,index)=>index%3===0).map(word=>word.id)),later:[]}))},packs)
 const db=freshDatabase();db.currentCourseId=packs[0].courseId;db.courseProgress={[packs[0].courseId]:{currentLessonId:'reading-a-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}}
 for(const pack of packs)for(const [index,word]of pack.vocabulary.entries()){
  if(index%2===0)db.cards[word.id]=newCard(word.id,new Date(index%4?0:1000))
  if(index%5===0)for(let attempt=0;attempt<2;attempt++)db.history.push({id:word.id+':wrong:'+attempt,wordId:word.id,courseId:pack.courseId,mode:'flash',source:'review_due',rating:1,correct:false,at:'2026-01-01T00:00:00.000Z',input:''})
 }
 await page.addInitScript(db=>{localStorage.setItem('wordpal.database.v2',JSON.stringify({...db,version:2,auxiliaryRecords:[]}));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db);return packs
}
async function all(page:Page){await page.getByRole('group',{name:'单词本筛选'}).getByRole('button',{name:'所有单词',exact:true}).click()}
async function firstAtTop(page:Page,selector:string){await expect.poll(()=>page.locator(selector).first().evaluate(node=>Math.round(node.getBoundingClientRect().top))).toBeGreaterThanOrEqual(10);await expect.poll(()=>page.locator(selector).first().evaluate(node=>Math.round(node.getBoundingClientRect().top))).toBeLessThanOrEqual(18)}

test('四分类和来源范围保持资格与教材顺序，同词条来源精确且档案不变',async({page})=>{
 await fixture(page);await go(page,'review');const before=await database(page)
 for(const scope of ['当前教材','全部单词'] as const){await selectWordbookScope(page,scope);for(const [name,divisor]of [['到期复习',2],['重点复习',3],['错词本',5],['所有单词',1]] as const){
  await page.getByRole('group',{name:'单词本筛选'}).getByRole('button',{name,exact:true}).click();const visible=await page.locator('.wordbook-row').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id')))
  const expected=Array.from({length:113},(_,index)=>index).filter(index=>index%divisor===0).map(index=>'reading-a-w'+String(index+1).padStart(3,'0'))
  if(scope==='全部单词')expected.push(...Array.from({length:12},(_,index)=>index).filter(index=>index%divisor===0).map(index=>'reading-b-w'+String(index+1).padStart(3,'0')))
  expect(visible,scope+'/'+name).toEqual(expected.slice(0,30))
 }}
 await page.getByRole('textbox',{name:'搜索单词本'}).fill('term 12');await expect(page.locator('.wordbook-source').first()).toContainText('Unit 2 · 第2词')
 expect(await database(page)).toEqual(before)
})

test('单词本上一页和下一页定位新页第一词，详情返回保持页码、筛选和滚动位置',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await go(page,'review');await all(page);const before=await database(page)
 for(const [label,index]of [['下一页',31],['下一页',61],['上一页',31],['上一页',1]] as const){await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.wordbook-row').first()).toHaveAttribute('data-word-id','reading-a-w'+String(index).padStart(3,'0'));await firstAtTop(page,'.wordbook-row')}
 await page.locator('.wordbook-row').nth(12).scrollIntoViewIfNeeded();const top=await page.evaluate(()=>scrollY),source=await page.locator('.wordbook-row').nth(12).locator('.wordbook-source').textContent()
 await page.locator('.wordbook-row').nth(12).locator('.wordbook-open').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.detail-primary-source')).toHaveText(source!);await page.getByRole('button',{name:'关闭单词详情',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Math.round(scrollY))).toBe(Math.round(top));expect(await database(page)).toEqual(before)
})

test('教材完整词卡也使用明确查看区和翻页锚点，正文点击不会进入详情',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await go(page,'review');await page.getByRole('button',{name:/^查看教材全部单词/}).click()
 await page.locator('.course-word-content').first().click();await expect(page.getByRole('dialog')).toHaveCount(0)
 for(const [label,index]of [['下一页',31],['上一页',1]] as const){await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.course-word-row').first()).toHaveAttribute('data-occurrence',JSON.stringify(['reading-a','reading-a-u'+Math.ceil(index/10),'reading-a-w'+String(index).padStart(3,'0')]));await firstAtTop(page,'.course-word-row')}
 const source=await page.locator('.course-word-row').first().locator('.wordbook-source').textContent();await page.locator('.course-word-open').first().click();await expect(page.locator('.detail-primary-source')).toHaveText(source!);await expect(page.locator('.detail-word')).toHaveText('cat')
})

async function drag(page:Page,selector:string,kind='move'){
 await page.locator(selector).first().evaluate((node,kind)=>{const send=(type:string,y:number)=>node.dispatchEvent(Object.assign(new Event(type,{bubbles:true}),{touches:type==='touchend'?[]:[{clientX:30,clientY:y}],changedTouches:[{clientX:30,clientY:y}]}));send('touchstart',300);if(kind==='move')send('touchmove',100);send(kind==='cancel'?'touchcancel':'touchend',kind==='move'?100:300)},kind)
}
test('拖动/取消手势和惯性期间不会误开详情或切换重点，明确轻触仍可打开',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await go(page,'review');await all(page);const before=await database(page)
 await page.locator('.wordbook-row').first().click();await expect(page.getByRole('dialog')).toHaveCount(0)
 for(const kind of ['move','cancel']){await drag(page,'.wordbook-open',kind);await page.locator('.wordbook-open').first().click({force:true});await expect(page.getByRole('dialog')).toHaveCount(0);await page.waitForTimeout(450)}
 await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));await drag(page,'.wordbook-open','tap');await page.locator('.wordbook-open').first().click({force:true});await expect(page.getByRole('dialog')).toHaveCount(0);await page.waitForTimeout(450)
 await page.locator('.wordbook-open').first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape')
 await page.getByRole('button',{name:/^查看教材全部单词/}).click();const preferences=await page.evaluate(()=>localStorage.getItem('wordpal.wordbook.preferences.v1'));await drag(page,'.course-word-tools');await page.getByRole('button',{name:'取消重点 cat',exact:true}).click({force:true});expect(await page.evaluate(()=>localStorage.getItem('wordpal.wordbook.preferences.v1'))).toBe(preferences);await expect(page.getByRole('dialog')).toHaveCount(0);expect(await database(page)).toEqual(before)
})

test('配图失败可重试，换词不保留旧图，查看与重试不修改学习记录',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await fixture(page);let fail=true
 const image=await sharp({create:{width:1024,height:768,channels:4,background:{r:90,g:150,b:180,alpha:1}}}).png().toBuffer()
 await page.route('**/reading-fixture-image.png',route=>fail?route.fulfill({status:404,body:''}):route.fulfill({contentType:'image/png',body:image}))
 await go(page,'review');await all(page);const before=await database(page);await page.locator('.wordbook-open').first().click();await expect(page.getByRole('img',{name:'配图暂时无法显示',exact:true})).toBeVisible()
 fail=false;await page.getByRole('button',{name:'重试配图',exact:true}).click();await expect(page.locator('.detail-picture img')).toHaveJSProperty('naturalWidth',1024)
 await page.locator('.wordbook-open').nth(7).click();await expect(page.locator('.detail-picture')).toHaveCount(0);await expect(page.getByRole('img',{name:'暂无配图',exact:true})).toBeVisible();expect(await database(page)).toEqual(before)
})

for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`详情阅读 ${theme}/${mode} 手机平板、短词短句、高清图片与200%字体`,async({page})=>{
 await setAppearance(page,theme,mode);await fixture(page);await go(page,'review');await all(page);const before=await database(page)
 for(const width of [390,1280]){await page.setViewportSize({width,height:width===390?844:800});await page.locator('.wordbook-open').first().click();await expect(page.locator('.detail-word')).toHaveText('cat');await expect(page.locator('.detail-picture img')).toHaveJSProperty('naturalWidth',1024)
  const boxes=await page.locator('.detail-word-hero').evaluate(node=>{const c=node.querySelector('.detail-word-copy')!.getBoundingClientRect(),i=node.querySelector('.detail-image-frame')!.getBoundingClientRect();return {right:i.left>=c.right,ratio:i.width/node.getBoundingClientRect().width}});expect(boxes.right).toBe(true);expect(boxes.ratio).toBeGreaterThan(.48)
  await waitForArtwork(page);await page.screenshot({path:test.info().outputPath(`detail-${theme}-${mode}-${width}.png`),fullPage:true});if(width===390)await page.keyboard.press('Escape');else await page.locator('.wordbook-open').first().click()
 }
 for(const index of [1,2,3,4,5,6]){await page.locator('.wordbook-open').nth(index).click();expect(await page.locator('.detail-word').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(22);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.keyboard.press('Escape');expect(await database(page)).toEqual(before)
})
