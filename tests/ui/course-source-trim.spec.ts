import {test,expect,type Page} from '@playwright/test'
import {go,database,selectWordbookScope} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import synthetic from '../../src/content/synthetic/course.json'
import type {CoursePack} from '../../packages/content_schema/course'
import {cleanCourseLabel} from '../../src/services/course/CourseSelection'

const pack:CoursePack={...JSON.parse(JSON.stringify(synthetic)),courseId:'trim-demo',title:'裁剪验收课（待核对）',sources:synthetic.sources.map(source=>({...source,rightsStatus:'private-use-declared' as const}))}
const key='wordpal.content.pack.trim-demo.0123456789abcdef'
const learnedWordId=pack.vocabulary[0].id
const row=(page:Page)=>page.locator('.batch-uninstall .course-item').filter({hasText:pack.title}).or(page.locator('.batch-uninstall .course-item').filter({hasText:'已删除教材'}))

async function seed(page:Page){
 await page.addInitScript(({pack,key})=>{
  if(!localStorage.getItem('wordpal.content.catalog.v2')){
   localStorage.setItem(key,JSON.stringify(pack))
   localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))
  }
 },{pack,key})
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2'))localStorage.setItem('wordpal.database.v1',JSON.stringify(db))},{...freshDatabase(),cards:{[learnedWordId]:newCard(learnedWordId,new Date('2000-01-01'))}})
}
async function openPanel(page:Page){
 await go(page,'learn')
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await expect(page.locator('.course-gallery-card').filter({hasText:cleanCourseLabel(pack.title)})).toHaveCount(1)
 await page.getByRole('button',{name:'逐册卸载',exact:true}).click()
}
/** 面板按顺序逐册处理：先随包提供的册次，再导入册。 */
async function uninstallAll(page:Page){
 await page.getByRole('button',{name:'全部卸载',exact:true}).click()
 await expect(page.getByRole('button',{name:'卸载当前册',exact:true})).toBeDisabled()
}
async function trimImported(page:Page){
 await row(page).getByRole('button',{name:'裁剪内容源',exact:true}).click()
 await page.getByRole('dialog',{name:'裁剪内容源确认'}).getByRole('button',{name:'确认裁剪内容源',exact:true}).click()
}

test('导入课程卸载清理专属词，裁剪后不复活且审计隐藏教材标题',async({page})=>{
 await seed(page)
 await openPanel(page)
 const before=await database(page)
 await expect(row(page)).toContainText('待卸载')
 await uninstallAll(page)
 const removed=await database(page);expect(before.cards[learnedWordId]).toBeTruthy();expect(removed.cards[learnedWordId]).toBeUndefined();for(const field of ['history','pets','gems','rewardIds'])expect(removed[field]).toEqual(before[field])
 await expect(row(page)).toContainText('已卸载 · 可裁剪内容源')
 // 内容源裁剪后应用内只剩 starter，面板因此只列出这一枚导入册
 await expect(page.locator('.batch-uninstall')).toContainText('第 1 / 1 册')
 await trimImported(page)
 await expect(row(page)).toContainText('不再显示')
 await expect(page.locator('.delete-audit')).toContainText('已删除教材');await expect(page.locator('.delete-audit')).not.toContainText(pack.title)
 await expect(page.locator('.course-gallery-card').filter({hasText:cleanCourseLabel(pack.title)})).toHaveCount(0)
 expect(await database(page)).toEqual(removed)
})

test('裁剪后教材专属已学词不在合并单词本复活',async({page})=>{
 await seed(page)
 await openPanel(page)
 await uninstallAll(page)
 const before=await database(page)
 await trimImported(page)
 await go(page,'review')
 await selectWordbookScope(page,'只看已学')
 await expect(page.locator('.review-row')).toHaveCount(0)
 await selectWordbookScope(page,'全部单词');await page.locator('.review-tabs').getByRole('button',{name:'所有单词',exact:true}).click();await page.locator('.wordbook-search input').fill(pack.vocabulary[0].lemma);await expect(page.locator('.review-row')).toHaveCount(0)
 expect(await database(page)).toEqual(before)
})

test('手机视口 390×844：逐册卸载面板与裁剪二次确认都可见且确认按钮不被底部导航遮挡',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await seed(page)
 await openPanel(page)
 await expect(page.locator('.batch-uninstall')).toBeVisible()
 await expect(page.locator('.batch-uninstall')).toContainText('第 1 / 1 册')
 await expect(page.locator('.batch-uninstall')).toContainText('已卸载 0 册 · 共享 0 词保留')
 await uninstallAll(page)
 await row(page).getByRole('button',{name:'裁剪内容源',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'裁剪内容源确认'})
 await expect(dialog).toBeVisible()
 await expect(dialog).toContainText('需主动重新导入原课程包才能再用')
 const confirm=dialog.getByRole('button',{name:'确认裁剪内容源',exact:true})
 const box=await confirm.boundingBox()
 expect(box).toBeTruthy()
 expect(box!.y+box!.height).toBeLessThanOrEqual(844)
 await expect(confirm).toBeEnabled()
})
