import {test,expect,type Page} from '@playwright/test'
import sharp from 'sharp'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import type {Answer} from '../../packages/core_learning'
import {customCourse} from '../helpers/custom-course'
import {go,database,setAppearance,selectWordbookScope} from './helpers'

async function fixture(page:Page){
 const packs=[customCourse('overview-a',12),customCourse('overview-b',3)],db=freshDatabase(),ids=packs[0].vocabulary.map(word=>word.id)
 packs[0].title='合成教材 A';packs[1].title='合成教材 B'
 packs[0].vocabulary[1].lemma='Merry Christmas!'
 packs[0].vocabulary[1].meaning='圣诞快乐！这是一条用于核对窄屏换行与完整显示的较长中文释义。'
 for(const [index,word]of packs[0].vocabulary.entries())if(index<3)word.image='/static/overview-picture-'+index+'.png'
 for(const [index,size]of [[0,{width:1024,height:512}],[1,{width:512,height:1024}]] as const){const png=await sharp({create:{...size,channels:4,background:{r:110,g:170,b:130,alpha:.5}}}).png().toBuffer();await page.route('**/overview-picture-'+index+'.png',route=>route.fulfill({contentType:'image/png',body:png}))}
 await page.route('**/overview-picture-2.png',route=>route.fulfill({status:404,body:''}))
 const answer=(index:number,day:number,extra:Partial<Answer>={}):Answer=>({id:ids[index]+':'+day,wordId:ids[index],courseId:packs[0].courseId,rating:3,correct:true,mode:'spell',source:'practice',at:`2026-01-${String(day).padStart(2,'0')}T08:00:00Z`,input:'',...extra})
 db.currentCourseId=packs[0].courseId;db.courseProgress=Object.fromEntries(packs.map(pack=>[pack.courseId,{currentLessonId:pack.courseId+'-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}]));db.cards[ids[0]]=newCard(ids[0],new Date(0));db.cards[ids[2]]=newCard(ids[2],new Date('2100-01-01'))
 db.history=[answer(0,1),answer(0,2),answer(0,3,{source:'review_due'})]
 db.practiceAnswers=[answer(1,1,{mode:'flash'}),answer(3,1,{correct:false,rating:1}),answer(3,2,{correct:false,rating:1})]
 await page.addInitScript(({packs,db,ids})=>{
  if(!localStorage.getItem('wordpal.content.catalog.v2'))localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));return {key,courseId:pack.courseId,archived:false,aliases:{}}})))
  if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify({...db,version:2,auxiliaryRecords:[]}));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.wordbook.preferences.v1',JSON.stringify({favorites:[ids[0],ids[3]],later:[]}))}
 },{packs,db,ids})
 return {packs,ids}
}
async function category(page:Page,name:string){const tile=page.getByRole('group',{name:'单词本筛选'}).getByRole('button',{name,exact:true});if(await tile.getAttribute('aria-pressed')!=='true')await tile.click()}
async function metrics(page:Page){return page.locator('.wordbook-learning-metrics>uni-view').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.getAttribute('data-stage'),Number(node.querySelector('.wordbook-metric-number')!.textContent)])))}

test('范围总览不受分类或中英文搜索影响，入口计数、结果与到期启动一致',async({page})=>{
 await fixture(page);await go(page,'review');const before=await database(page)
 const expected={mastered:1,learning:2,unseen:8,unrated:1};expect(await metrics(page)).toEqual(expected)
 const group=page.getByRole('group',{name:'单词本筛选'})
 for(const [name,count]of [['到期复习',1],['重点复习',2],['错词本',1],['所有单词',12]] as const){await category(page,name);await expect(page.locator('.wordbook-row')).toHaveCount(count);await expect(group.getByRole('button',{name,exact:true}).locator('.wordbook-category-count')).toHaveText(count+' 词');expect(await metrics(page)).toEqual(expected)}
 for(const keyword of ['merry','圣诞','Unit 2','不存在']){await page.getByRole('textbox',{name:'搜索单词本'}).fill(keyword);expect(await metrics(page)).toEqual(expected);await expect(page.locator('.wordbook-due-action')).toContainText('复习到期词 · 1');await expect(group.locator('[data-category=all] .wordbook-category-count')).toHaveText('12 词')}
 await page.getByRole('button',{name:'清空单词搜索',exact:true}).click();await expect(page.locator('.wordbook-row')).toHaveCount(12)
 await page.locator('uni-picker[aria-label="选择浏览单元"]').click();await page.locator('.uni-picker-select:visible .uni-picker-item').getByText('Unit 2',{exact:true}).click();expect(await metrics(page)).toEqual({mastered:0,learning:0,unseen:2,total:2});await expect(page.locator('.wordbook-due-action')).toBeDisabled();await expect(page.locator('.wordbook-source').first()).toContainText('Unit 2 · 第1词')
 await selectWordbookScope(page,'全部单词');await expect(page.locator('.wordbook-textbook-row')).toHaveCount(0);await expect(page.locator('.wordbook-overview-context')).toContainText('个独立词');await selectWordbookScope(page,'当前教材');expect(await metrics(page)).toEqual(expected)
 expect(await database(page)).toEqual(before)
 await page.getByRole('textbox',{name:'搜索单词本'}).fill('不存在');await page.locator('.wordbook-due-action').click();await expect(page.locator('.learn-workspace')).toBeVisible();expect((await database(page)).session.wordIds[0]).toBe('overview-a-w001')
})

test('详情星标、真实答题与教材切回时总览和卡片同步，原教材进度保留',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {ids}=await fixture(page);await go(page,'review');await category(page,'所有单词');const before=await database(page)
 await page.locator('.wordbook-open').nth(1).click();await page.getByRole('button',{name:'标记为我的重点',exact:true}).click();await page.getByRole('button',{name:'关闭单词详情',exact:true}).click();await expect(page.locator('[data-category=weak] .wordbook-category-count')).toHaveText('3 词')
 await page.evaluate(async id=>{const {useProfileStore}=await import('/src/stores/profile.ts' as string);useProfileStore().transact((db:any)=>{db.practiceAnswers.push({id:'overview-live-answer',wordId:id,courseId:'overview-a',rating:3,correct:true,mode:'spell',source:'practice',at:'2026-01-04T08:00:00Z',input:'term 5'})})},ids[4])
 expect(await metrics(page)).toEqual({mastered:1,learning:3,unseen:7,unrated:1});await expect(page.locator('.wordbook-row').nth(4).locator('.familiarity-label')).toHaveText('练习中')
 await page.evaluate(async()=>{const {useCourseStore}=await import('/src/stores/course.ts' as string);useCourseStore().choose('overview-b')});await expect(page.locator('.wordbook-textbook-title')).toHaveText('合成教材 B');expect(await metrics(page)).toEqual({mastered:0,learning:0,unseen:3,total:3})
 await page.evaluate(async()=>{const {useCourseStore}=await import('/src/stores/course.ts' as string);useCourseStore().choose('overview-a')});expect(await metrics(page)).toEqual({mastered:1,learning:3,unseen:7,unrated:1});const after=await database(page);expect(after.cards).toEqual(before.cards);expect(after.history).toEqual(before.history);expect(after.gems).toBe(before.gems);expect(after.courseProgress['overview-a']).toEqual(before.courseProgress['overview-a'])
})

test('全局到期筛选保留其他教材，练习按钮仅承诺当前教材可启动的到期词',async({page})=>{
 await fixture(page);await go(page,'review')
 await page.evaluate(async()=>{const {useProfileStore}=await import('/src/stores/profile.ts' as string),{newCard}=await import('/packages/srs_fsrs/index.ts' as string);useProfileStore().transact((db:any)=>{db.cards['overview-b-w001']=newCard('overview-b-w001',new Date(0))})})
 await selectWordbookScope(page,'全部单词');await category(page,'到期复习');await expect(page.locator('.wordbook-row')).toHaveCount(2);await expect(page.locator('[data-category=due] .wordbook-category-count')).toHaveText('2 词');await expect(page.locator('.wordbook-due-action')).toContainText('复习当前教材到期词 · 1')
 await page.locator('.wordbook-due-action').click();await expect(page.locator('.learn-workspace')).toBeVisible();const session=(await database(page)).session;expect(session.courseId).toBe('overview-a');expect(session.wordIds).not.toContain('overview-b-w001')
})

test('完整词卡入口从顶部打开，返回保留搜索、分类与列表滚动位置',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await go(page,'review');await category(page,'所有单词');await page.getByRole('textbox',{name:'搜索单词本'}).fill('term')
 await page.locator('.course-card-entry').scrollIntoViewIfNeeded();const before=await page.evaluate(()=>Math.round(scrollY));await page.locator('.course-card-entry').click();await expect.poll(()=>page.evaluate(()=>Math.round(scrollY))).toBe(0);await expect(page.locator('.course-card-browser')).toBeVisible()
 await page.getByRole('button',{name:'返回我的单词本',exact:true}).click();await expect(page.getByRole('textbox',{name:'搜索单词本'})).toHaveValue('term');await expect.poll(()=>page.evaluate(()=>Math.round(scrollY))).toBe(before)
})

test('损坏档案显示不可用而非未学或零统计，不覆盖原始档案',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','unreadable-wordbook-archive')});await go(page,'review')
 await expect(page.getByRole('status').filter({hasText:'词表暂不可用'})).toBeVisible();await expect(page.locator('.wordbook-learning-overview,.wordbook-due-action,.wordbook-row')).toHaveCount(0);await expect(page.locator('.review-list .section-heading')).toContainText('筛选结果 —');expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('unreadable-wordbook-archive')
})

for(const setup of [{name:'android',width:360,height:800},{name:'iphone',width:390,height:844},{name:'ipad',width:768,height:1024},{name:'tablet-landscape',width:1180,height:820},{name:'split-large-text',width:320,height:900,largeText:true}])for(const mode of ['light','dark'])test(`奶油粘土 ${setup.name}/${mode} 完整配图、长文本与触控布局`,async({page})=>{
 await page.setViewportSize(setup);await setAppearance(page,'clay',mode,{largeText:!!setup.largeText});await fixture(page);await go(page,'review');await category(page,'所有单词')
 const rows=page.locator('.wordbook-row');await expect(rows.nth(0).locator('.wordbook-word-picture img')).toHaveJSProperty('naturalWidth',1024);await expect(rows.nth(1).locator('.wordbook-word-picture img')).toHaveJSProperty('naturalHeight',1024);await expect(rows.nth(2).locator('.wordbook-picture-fallback')).toBeVisible();await expect(rows.nth(3).locator('.wordbook-picture-fallback')).toBeVisible()
 await expect(rows.nth(0).locator('.wordbook-word-picture uni-image>div').first()).toHaveCSS('background-size','contain');await expect(rows.nth(1).locator('.wordbook-word-picture uni-image>div').first()).toHaveCSS('background-size','contain')
 const boxes=await rows.evaluateAll(nodes=>nodes.map(node=>{const copy=node.querySelector('.wordbook-row-copy')!,image=node.querySelector('.wordbook-word-picture')!,tools=node.querySelector('.wordbook-row-memory')!,button=node.querySelector('.wordbook-open')!,b=button.getBoundingClientRect(),c=copy.getBoundingClientRect(),i=image.getBoundingClientRect(),t=tools.getBoundingClientRect();return {overflow:node.scrollWidth>node.clientWidth+1,overlap:c.right>t.left+1&&c.bottom>t.top+1&&t.bottom>c.top+1,imageOverlap:i.right>c.left+1,target:b.width>=48&&b.height>=48,fit:node.querySelector('uni-image')?.getAttribute('mode')}}))
 expect(boxes.every(box=>!box.overflow&&!box.overlap&&!box.imageOverlap&&box.target)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await expect(page.locator('.bottom-nav .bottom-item')).toHaveCount(5)
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);await page.locator('.wordbook-artwork img,.wordbook-scope-image img,.wordbook-category-image img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));await page.screenshot({path:test.info().outputPath('wordbook-overview-'+setup.name+'-'+mode+'.png'),fullPage:true})
})
