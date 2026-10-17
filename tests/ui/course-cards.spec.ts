import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase,setAppearance} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import type {CoursePack} from '../../packages/content_schema/course'
import {wordById} from '../../packages/content_schema'
async function openCards(page:Page){await go(page,'review');await page.getByRole('button',{name:/^查看教材全部单词 ·/}).click();await expect(page.locator('.course-card-browser')).toBeVisible()}
const filter=(page:Page,name:string)=>page.getByRole('group',{name:'教材词卡快捷筛选'}).getByRole('button',{name,exact:true})
async function picker(page:Page,label:string,index:number){await page.locator(`uni-picker[aria-label="${label}"]`).click();const option=page.locator('.uni-picker-select:visible .uni-picker-item').nth(index);await expect(option).toBeVisible();await option.click()}
function largeCourse():CoursePack {const ids=Array.from({length:600},(_,i)=>'fixture-'+i);return {schemaVersion:2,courseId:'long-original-fixture',contentVersion:'1.0.0',title:'合成长列表验收教材',route:'theme',abilityLevels:['L3'],sources:[{id:'fixture-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'Original synthetic test data',textLicense:'CC0-1.0',revision:'1'}],assets:[],vocabulary:ids.map((id,i)=>({id,language:'en',lemma:'sample'+String(i).padStart(3,'0'),meaning:'合成示例 '+i,pos:'n.',sourceId:'fixture-source'})),units:[{id:'fixture-u1',title:'Unit 1 First',lessons:[{id:'fixture-l1',title:'First',wordIds:ids.slice(0,300)}]},{id:'fixture-u2',title:'Unit 2 Second',lessons:[{id:'fixture-l2',title:'Second',wordIds:ids.slice(300)}]}]}}
async function seedLarge(page:Page){const pack=largeCourse(),db={...freshDatabase(),version:2,currentCourseId:pack.courseId,courseProgress:{[pack.courseId]:{currentLessonId:'fixture-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]};await page.addInitScript(({pack,db})=>{localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key:'wordpal.test.long-course',aliases:{},archived:false}]));localStorage.setItem('wordpal.test.long-course',JSON.stringify(pack))},{pack,db})}

test('整册未学词、十次本地发音重播、红绿蓝音块和返回均不写学习档案',async({page})=>{
 test.setTimeout(45000);await page.setViewportSize({width:390,height:844});await seedDatabase(page,freshDatabase());await openCards(page);const before=await database(page)
 await page.getByRole('textbox',{name:'搜索教材词卡'}).fill('CAT');await expect(page.locator('.course-word-row')).toHaveCount(1);await expect(page.locator('.course-word-row')).toHaveAttribute('data-familiarity','unseen')
 await page.locator('.course-word-open').click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:/^为什么是这个状态/}).click();await expect(page.locator('.detail-familiarity')).toContainText('浏览和听发音不计入已学')
 await page.getByRole('button',{name:/^拼读帮助/}).click();await expect(page.locator('.phonics-breakdown')).toBeVisible()
 const audio=page.getByRole('button',{name:'播放 cat 的标准发音',exact:true});for(let i=0;i<10;i++){await audio.click();await expect(audio).toHaveClass(/playing/);await expect(audio).not.toHaveClass(/playing/)}
 await expect(page.locator('.detail-familiarity')).toContainText('未学');expect(await database(page)).toEqual(before)
 await page.getByRole('button',{name:'关闭单词详情'}).click();await expect(page.getByRole('textbox',{name:'搜索教材词卡'})).toHaveValue('CAT');await expect(page.locator('.course-word-row')).toHaveAttribute('data-familiarity','unseen')
 await filter(page,'到期').click();await expect(page.locator('.course-word-row')).toHaveCount(0);await expect(page.locator('.empty-small')).toContainText('该范围暂无符合条件');expect(await database(page)).toEqual(before)
})

test('明确开始真实学习后提交一次，熟知度更新且原调度/新词上限沿用',async({page})=>{
 await seedDatabase(page,{...freshDatabase(),dailyLimit:5});await openCards(page);await page.getByRole('textbox',{name:'搜索教材词卡'}).fill('cat');await page.locator('.course-word-open').click();await page.getByRole('button',{name:'学习这个词',exact:true}).click()
 await expect(page.locator('.answer-actions')).toBeVisible();let db=await database(page);expect(db.session.wordIds[0]).toBe('cat');expect(db.session.wordIds).toHaveLength(5);expect(db.history).toHaveLength(0)
 await page.getByRole('button',{name:'查看答案',exact:true}).click();await page.getByRole('button',{name:'记住了',exact:true}).click();db=await database(page);expect(db.history).toHaveLength(1);expect(db.cards.cat.reps).toBe(1)
 await openCards(page);await page.getByRole('textbox',{name:'搜索教材词卡'}).fill('cat');await expect(page.locator('.course-word-row')).toHaveAttribute('data-familiarity','introduced');expect((await database(page)).history).toHaveLength(1)
})

test('熟练与今日到期并存，旧档待评估，重点不改变熟知度',async({page})=>{
 const db=freshDatabase();db.cards.cat={...newCard('cat',new Date('2000-01-01')),state:2,reps:3,stability:30};db.cards.dog={...newCard('dog',new Date('2100-01-01')),state:2,reps:3,stability:30};db.history=[7,8,9].map(day=>({id:'fixture:'+day,wordId:'cat',rating:3 as const,correct:true,at:`2026-10-0${day}T07:00:00Z`,source:day===9?'review_due' as const:'new_word' as const,mode:'spell' as const,input:'cat'}));await seedDatabase(page,db);await openCards(page);const before=await database(page)
 await page.getByRole('textbox',{name:'搜索教材词卡'}).fill('cat');await expect(page.locator('.course-word-row')).toHaveAttribute('data-familiarity','mastered');await expect(page.locator('.course-word-row')).toContainText('今日到期');await page.getByRole('button',{name:'标记重点 cat',exact:true}).click();await expect(page.locator('.course-word-row')).toHaveAttribute('data-familiarity','mastered')
 await page.getByRole('textbox',{name:'搜索教材词卡'}).fill('dog');await expect(page.locator('.course-word-row')).toHaveAttribute('data-familiarity','unrated');expect(await database(page)).toEqual(before)
})

test('600 词30条分页回到首词、搜索/Unit/排序/去重及离线文本无旧结果串入',async({page,context})=>{
 await seedLarge(page);await openCards(page);const before=await database(page);await expect(page.locator('.course-word-row')).toHaveCount(30);await expect(page.locator('.course-card-actions')).toContainText('600 个词条')
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900})
  const first=await page.locator('.course-word-row').first().getAttribute('data-occurrence');await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.course-word-row')).toHaveCount(30);expect(await page.locator('.course-word-row').first().getAttribute('data-occurrence')).not.toBe(first)
  await expect.poll(async()=>Math.abs((await page.locator('.course-word-row').first().boundingBox())!.y-8)).toBeLessThan(2)
  await page.getByRole('button',{name:'上一页',exact:true}).click();await expect(page.locator('.course-word-row').first()).toHaveAttribute('data-occurrence',first!)
  await expect.poll(async()=>Math.abs((await page.locator('.course-word-row').first().boundingBox())!.y-8)).toBeLessThan(2)
 }
 await picker(page,'课程词卡单元',2);await expect(page.locator('.course-card-actions')).toContainText('300 个词条');await expect(page.locator('.course-word-row').first()).toContainText('sample300')
 await page.getByRole('textbox',{name:'搜索教材词卡'}).fill('sample42');await expect(page.locator('.course-word-row')).toHaveCount(10);await page.getByRole('button',{name:/^筛选与排序/}).click();await picker(page,'教材词卡排序',1);await page.getByRole('button',{name:'显示重复教材出现',exact:true}).click();await expect(page.locator('.course-card-actions')).toContainText('10 个独立词')
 await context.setOffline(true);await page.locator('.course-word-open').first().click();await expect(page.locator('.detail-word')).toHaveText('sample420');await expect(page.getByRole('button',{name:'播放 sample420 的标准发音',exact:true})).toBeDisabled();expect(await database(page)).toEqual(before)
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'关闭单词详情'}).click();await expect(page.getByRole('textbox',{name:'搜索教材词卡'})).toHaveValue('sample42');await context.setOffline(false)
})

for(const theme of ['swiss'])for(const width of [320,600,1024])test(`教材卡片 ${theme} ${width} 大字/暗色可达与旋转`,async({page})=>{
 await setAppearance(page,theme,theme==='oled'?'dark':'light',{largeText:true,highContrast:true,reducedMotion:true});await seedDatabase(page,freshDatabase());await page.setViewportSize({width,height:900});await openCards(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.locator('.course-word-open').first().click();await expect(page.locator('.detail-word')).toHaveText('cat');const controls=await page.locator('.course-card-browser [role=button]:visible').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));expect(Math.min(...controls)).toBeGreaterThanOrEqual(48)
 await page.setViewportSize({width:width===1024?390:1280,height:900});await expect(page.locator('.detail-word')).toHaveText('cat');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
