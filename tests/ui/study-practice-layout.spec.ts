import {test,expect} from '@playwright/test'
import {go,seedDatabase,setAppearance,database,openCustomPractice} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import type {CoursePack} from '../../packages/content_schema/course'

const longCourse:CoursePack={schemaVersion:2,courseId:'layout-long-course',contentVersion:'1.0.0',title:'合成排版教材 · 长标题与短语',route:'theme',abilityLevels:['L5'],sources:[{id:'layout-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'原创排版测试',revision:'r1'}],vocabulary:['be ready for a big adventure','plate','cup','spoon'].map((word,index)=>({id:'layout-word-'+index,language:'en',lemma:word,meaning:index===0?'准备好参加一次充满新发现的大冒险，也可以和伙伴一起探索':word,pos:'短语',sourceId:'layout-source',audio:'/static/audio/cat.wav',image:'/static/icons/study-modes/flash_256.png'})),units:[{id:'layout-unit',title:'合成单元',lessons:[{id:'layout-lesson',title:'合成课节',wordIds:[0,1,2,3].map(i=>'layout-word-'+i)}]}],assets:[]}

for(const screen of [{width:359,height:780,theme:'clay',largeText:false},{width:320,height:780,theme:'clay',largeText:true},{width:768,height:1024,theme:'swiss',largeText:false},{width:1280,height:800,theme:'clay',largeText:false}])test(`切换教材与长短内容不改变练习面板宽度 · ${screen.theme}-${screen.width}`,async({page})=>{
 await page.setViewportSize(screen)
 await setAppearance(page,screen.theme,'light',{largeText:screen.largeText})
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5'})
 await page.addInitScript(pack=>{const key='wordpal.content.pack.layout-long-course.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))},longCourse)
 await go(page,'learn');await openCustomPractice(page)
 const panel=page.getByRole('region',{name:'自定义练习内容',exact:true})
 const original=await database(page),baseline=await panel.boundingBox()
 if(await page.getByRole('button',{name:'查看学习概览',exact:true}).count())await page.getByRole('button',{name:'查看学习概览',exact:true}).click()
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await page.locator('.course-gallery-card').filter({hasText:longCourse.title}).click()
 await expect(page.locator('.current-course-card')).toContainText(longCourse.title)
 await openCustomPractice(page)
 await panel.locator('[data-mode="flash"]').click()
 await page.getByRole('button',{name:'开始自评',exact:true}).click()
 await expect(page.locator('.meaning')).toHaveText(longCourse.vocabulary[0].meaning)
 for(const mode of ['flash','connect','listen','spell','dictation']){
  const tile=panel.locator(`[data-mode="${mode}"]`)
  if(await tile.isEnabled()&&await tile.getAttribute('aria-pressed')!=='true')await tile.click()
  const bounds=await panel.boundingBox(),main=await page.locator('.study-main').boundingBox(),tools=await page.locator('.study-modes').boundingBox()
  expect(bounds!.width).toBeCloseTo(baseline!.width,0)
  expect(tools!.y).toBeGreaterThanOrEqual(main!.y+main!.height-1)
  const geometry=await panel.locator('.study-mode-tile').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}))
  expect(geometry.every(tile=>Math.abs(tile.y-geometry[0].y)<1&&Math.abs(tile.width-geometry[0].width)<1&&Math.abs(tile.height-geometry[0].height)<1)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }
 const selected=(await database(page)).session
 if(await page.getByRole('button',{name:'查看学习概览',exact:true}).count())await page.getByRole('button',{name:'查看学习概览',exact:true}).click()
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await page.locator('.course-gallery-card').filter({hasText:'原创启蒙课程'}).click()
 await expect(panel).toBeVisible()
 expect((await panel.boundingBox())!.width).toBeCloseTo(baseline!.width,0)
 const restored=await database(page)
 expect(restored.session).toEqual(original.session)
 expect(restored.cards).toEqual(original.cards)
 expect(restored.history).toEqual(original.history)
 if(await page.getByRole('button',{name:'查看学习概览',exact:true}).count())await page.getByRole('button',{name:'查看学习概览',exact:true}).click()
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await page.locator('.course-gallery-card').filter({hasText:longCourse.title}).click()
 expect((await database(page)).session).toEqual(selected)
 await expect(panel).toBeVisible()
})

const screens=[
 {name:'phone-small',width:359,height:780,largeText:false},
 {name:'phone',width:390,height:844,largeText:false},
 {name:'tablet',width:768,height:1024,largeText:false},
 {name:'wide',width:1280,height:800,largeText:false},
 {name:'phone-large-text',width:320,height:700,largeText:true},
]

for(const screen of screens)test(`兼容题型工具位于词卡后，展开收起与返回不改变正式进度 · ${screen.name}`,async({page},testInfo)=>{
 await page.setViewportSize(screen)
 await setAppearance(page,'swiss','light',{largeText:screen.largeText})
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5'})
 await go(page,'home')
 await page.locator('.hero-cta').click()
 await expect(page.locator('.daily-step-list')).toBeVisible()
 const original=await database(page),daily=original.courseProgress.starter.dailyPlan
 const entry=page.getByRole('button',{name:'本轮题型工具',exact:true})
 await expect(entry).toHaveCount(1)
 const mainBox=await page.locator('.study-main').boundingBox(),entryBox=await entry.boundingBox()
 expect(entryBox!.y).toBeGreaterThanOrEqual(mainBox!.y+mainBox!.height-1)
 await entry.evaluate(el=>el.scrollIntoView({block:'center'}))
 await entry.click()
 const panel=page.getByRole('region',{name:'自定义练习内容',exact:true}),toggle=page.locator('.study-practice-toggle')
 await expect(panel).toBeVisible()
 await expect(toggle).toHaveAttribute('aria-expanded','true')
 await expect(panel.locator('.study-mode-tile')).toHaveCount(5)
 const rows=await panel.locator('.study-mode-tile').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {top:r.top,width:r.width,left:r.left,right:r.right}}))
 expect(Math.max(...rows.map(row=>row.top))-Math.min(...rows.map(row=>row.top))).toBeLessThan(1)
 expect(rows.every(row=>row.width>35)).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false)
 await panel.getByRole('button',{name:/^连接，/}).click()
 await expect(panel.locator('.study-mode-tile.selected')).toHaveAttribute('data-mode','connect')
 if(screen.width>=840){
  await panel.getByRole('button',{name:/^闪现，/}).click()
  await page.getByRole('button',{name:'开始自评',exact:true}).click()
  await page.getByRole('button',{name:'展开自然拼读与例句',exact:true}).click()
  const content=await page.locator('.study-main').boundingBox(),context=await page.locator('.study-context').boundingBox(),tools=await page.locator('.study-modes').boundingBox()
  expect(context!.x).toBeGreaterThanOrEqual(content!.x+content!.width)
  expect(tools!.y).toBeGreaterThanOrEqual(Math.max(content!.y+content!.height,context!.y+context!.height)-1)
 }
 await toggle.evaluate(el=>el.scrollIntoView({block:'center'}))
 await toggle.click()
 await expect(panel).toBeHidden()
 await expect(toggle).toHaveAttribute('aria-expanded','false')
 await toggle.click()
 await expect(panel).toBeVisible()
 const returnButton=panel.getByRole('button',{name:'返回今日六环节',exact:true})
 await returnButton.evaluate(el=>el.scrollIntoView({block:'center'}))
 const returnBox=await returnButton.boundingBox(),navBox=await page.locator('.bottom-nav').boundingBox()
 expect(returnBox!.y+returnBox!.height).toBeLessThanOrEqual((navBox?.y??screen.height)+1)
 await page.screenshot({path:testInfo.outputPath('custom-practice.png')})
 const practicing=await database(page)
 expect(practicing.courseProgress.starter.dailyPlan).toEqual(daily)
 expect(practicing.cards).toEqual(original.cards)
 expect(practicing.history).toEqual(original.history)
 expect(practicing.gems).toEqual(original.gems)
 expect(practicing.pets).toEqual(original.pets)
 await returnButton.click()
 await expect(page.locator('.daily-step-list')).toBeVisible()
 expect((await database(page)).courseProgress.starter.dailyPlan).toEqual(daily)
 await expect(entry).toHaveCount(1)
})
