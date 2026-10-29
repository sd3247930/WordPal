import {flushStudyInput} from './helpers'
import {openCustomPractice,selectWordbookScope,openCourseGallery} from './helpers'
import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase,setAppearance} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
const ids=['g3a','g3b','g4a','g4b','g5a','g5b']
async function setup(page:Page){await page.addInitScript(()=>localStorage.setItem('wordpal.test.textbook-series','1'));await page.setViewportSize({width:390,height:844});await go(page,'learn')}
async function choose(page:Page,key:string){await openCourseGallery(page);const grade=key[1],term=key.endsWith('a')?'上册':'下册';await page.locator('.course-gallery-card').filter({hasText:grade+'年级'+term}).click();await expect(page.locator('.current-course-card')).toBeVisible()}

test('默认 CI 六册合成课程：点击立即使用，不显示待核对，逐册切换不改学习记录',async({page})=>{
 await setup(page);const before=await database(page)
 for(const key of ids){
  await openCourseGallery(page)
  await expect(page.locator('.course-gallery-card').filter({hasText:'合成系列'})).toHaveCount(6)
  await page.locator('.course-gallery-card').filter({hasText:key[1]+'年级'+(key.endsWith('a')?'上册':'下册')}).click()
  await expect(page.locator('.current-course-card')).toBeVisible()
  await expect(page.locator('.current-course-card')).not.toContainText('待核对')
  const saved=await database(page)
  expect(saved.currentCourseId).toBe('fltrp-3start-'+key)
  expect({cards:saved.cards,history:saved.history,pets:saved.pets,gems:saved.gems}).toEqual({cards:before.cards,history:before.history,pets:before.pets,gems:before.gems})
  await expect(page.locator('.current-course-meta')).toContainText('10 词');await expect(page.locator('.current-course-meta')).toContainText('1 单元')
 }
})

test('默认 CI 五题型能实际运行，跨册立即切换并恢复冻结 Session，Scope 不改学习目标',async({page})=>{
 const db=freshDatabase();db.abilityLevel='L5';await seedDatabase(page,db);await setup(page);await choose(page,'g5b')
 await page.getByRole('button',{name:'开始今日学习',exact:true}).click()
 await openCustomPractice(page);for(const name of ['闪现','连接','听音','拼写','听写']){const button=page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:new RegExp('^'+name+'，')});await expect(button).toBeEnabled();await button.click()}
 await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click()
 await page.locator('.spelling-input input').fill('draft');await flushStudyInput(page)
 const frozen=JSON.stringify((await database(page)).session)
 await choose(page,'g4a');await expect(page.getByRole('dialog',{name:'排队切换教材'})).toHaveCount(0)
 const switched=await database(page);expect(switched.currentCourseId).toBe('fltrp-3start-g4a');expect(switched.pendingCourseId).toBeUndefined();expect(JSON.stringify(switched.courseSessions['fltrp-3start-g5b'])).toBe(frozen)
 await choose(page,'g5b');expect(JSON.stringify((await database(page)).session)).toBe(frozen)
 await go(page,'review');await selectWordbookScope(page,'全部单词');await page.getByRole('button',{name:'继续当前学习',exact:true}).click();expect(JSON.stringify((await database(page)).session)).toBe(frozen)
 const snapshot=await database(page),word=snapshot.session.wordSnapshot[snapshot.session.wordIds[0]].word
 await page.locator('.spelling-input input').fill(word);await page.getByRole('button',{name:'确认答案 →',exact:true}).click();await expect(page.locator('.answer-feedback')).toContainText('记住啦')
 const saved=await database(page);expect(saved.history).toHaveLength(0);expect(saved.practiceAnswers).toHaveLength(1);expect(saved.practiceAnswers[0].correct).toBe(true)
 await page.reload();expect((await database(page)).history).toEqual(saved.history);expect((await database(page)).gems).toBe(saved.gems)
})

test('默认 CI 瑞士主题明暗课程、单词本、宠物页无水平溢出，已学和同词跨册统计不重复',async({page})=>{
 await setAppearance(page,'swiss','light');await setup(page);await choose(page,'g3a')
 for(const mode of ['light','dark']){
  await go(page,'settings');await page.getByRole('group',{name:'明暗模式',exact:true}).getByRole('button',{name:mode==='dark'?'深色':'浅色',exact:true}).click()
  for(const screen of ['learn','review','pet']){await go(page,screen);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()}
 }
 await go(page,'review');await page.locator('.review-tabs .mode-button').filter({hasText:'所有单词'}).click();await expect(page.locator('.review-row')).toHaveCount(10)
 await selectWordbookScope(page,'只看已学');await expect(page.locator('.review-row')).toHaveCount(0)
})

test('默认 CI 单元入口确认后直接进入所选教材的实际 Study Session',async({page})=>{
 await setup(page);await choose(page,'g4a');await openCourseGallery(page);await page.getByRole('button',{name:'从这一单元开始',exact:true}).click();await expect(page.locator('.learn-workspace')).toBeVisible();const db=await database(page);expect(db.courseProgress['fltrp-3start-g4a'].dailyPlan.courseId).toBe('fltrp-3start-g4a');expect(db.courseProgress['fltrp-3start-g4a'].dailyPlan.flow.step).toBe('flash');expect(db.history).toHaveLength(0)
})
