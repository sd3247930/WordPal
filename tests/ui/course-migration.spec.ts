import {answerParentGate,unlockParent as openParentSettings} from './helpers'
import {test,expect,type Page} from '@playwright/test'
import {go} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import synthetic from '../../src/content/synthetic/course.json'

async function unlockParent(page:Page){await openParentSettings(page)}
/** 原内置教材已裁剪：用一枚已安装的导入课程覆盖「其他已安装教材」的切换路径。 */
async function seedInstalledCourse(page:Page){
 const pack={...JSON.parse(JSON.stringify(synthetic)),courseId:'migration-test',title:'迁移验证课',route:'theme',sources:synthetic.sources.map(source=>({...source,rightsStatus:'redistribution-approved'}))}
 const key='wordpal.content.pack.migration-test.0123456789abcdef'
 await page.addInitScript(({pack,key})=>{
  if(!localStorage.getItem('wordpal.content.catalog.v2')){
   localStorage.setItem(key,JSON.stringify(pack))
   localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))
  }
 },{pack,key})
}

test('档案写入失败时不再灰按钮，点击课程弹出可重试的升级说明',async({page})=>{
 // Force the v1 -> v2 readback to fail so the archive stays on v1 with writes allowed.
 await page.addInitScript(()=>{
  const original=Storage.prototype.setItem
  Storage.prototype.setItem=function(key:string,value:string){
   if(key==='wordpal.database.v2')throw new DOMException('Quota exceeded','QuotaExceededError')
   return original.call(this,key,value)
  }
  localStorage.setItem('wordpal.database.v1',JSON.stringify({version:1,cards:{},session:null,history:[],rewardIds:[],gems:0,pets:{water:{petId:'pet-water',element:'water',level:1,exp:0,affection:0,mood:'calm',evolutionStage:1,equippedCosmetics:[],lastInteractionAt:0},fire:{petId:'pet-fire',element:'fire',level:1,exp:0,affection:0,mood:'calm',evolutionStage:1,equippedCosmetics:[],lastInteractionAt:0},earth:{petId:'pet-earth',element:'earth',level:1,exp:0,affection:0,mood:'calm',evolutionStage:1,equippedCosmetics:[],lastInteractionAt:0},wind:{petId:'pet-wind',element:'wind',level:1,exp:0,affection:0,mood:'calm',evolutionStage:1,equippedCosmetics:[],lastInteractionAt:0}},companion:'water',dailyLimit:10,abilityLevel:'L3',parentSettingsVersion:2,parentSettingsUpdatedAt:0,lastLessonAccuracy:null,lessonIndex:0,streakDates:[]}))
 })
 await seedInstalledCourse(page)
 await unlockParent(page)
 // starter is the current course, so target another installed course for the switch action.
 const select=page.locator('.course-item').filter({hasText:'迁移验证课'}).first().getByRole('button',{name:'设为当前课程',exact:true})
 await expect(select).toBeEnabled()
 await expect(page.locator('.course-management')).toContainText('暂无法切换教材')
 await select.click()
 const sheet=page.locator('.sheet-panel')
 await expect(sheet).toContainText('档案升级未完成')
 await expect(sheet.getByRole('button',{name:'重试升级',exact:true})).toBeVisible()
 await expect(sheet.getByRole('button',{name:'导出故障快照',exact:true})).toBeVisible()
 await sheet.getByRole('button',{name:'重试升级',exact:true}).click()
 await expect(sheet.locator('.notice')).toBeVisible()
})

test('只读档案同样弹出可操作说明且不写入学习数据',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('wordpal.database.v2','{ damaged')
  localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))
 })
 await seedInstalledCourse(page)
 await unlockParent(page)
 const raw=()=>page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))
 const before=await raw()
 const select=page.locator('.course-item').filter({hasText:'迁移验证课'}).first().getByRole('button',{name:'设为当前课程',exact:true})
 await expect(select).toBeEnabled()
 await select.click()
 const sheet=page.locator('.sheet-panel')
 await expect(sheet).toContainText('档案升级未完成')
 await expect(sheet.getByRole('button',{name:'导出故障快照',exact:true})).toBeVisible()
 expect(await raw()).toBe(before)
})
