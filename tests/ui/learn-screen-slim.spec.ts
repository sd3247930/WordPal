import {test,expect,type Page} from '@playwright/test'
import {go} from './helpers'
import {freshDatabase} from '../../src/stores/profile'

/** Seed an active v2 archive that already points at the synthetic textbook. */
async function seedSyntheticCourse(page:Page){
 await page.addInitScript(db=>{
  localStorage.setItem('wordpal.test.synthetic-course','1')
  if(!localStorage.getItem('wordpal.database.active.v2')){
   localStorage.setItem('wordpal.database.v2',JSON.stringify(db))
   localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))
  }
 },{...freshDatabase(),version:2,currentCourseId:'synthetic-classroom',courseProgress:{'synthetic-classroom':{currentLessonId:'sl01',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]})
}

test('学习页瘦身：无 CourseSelector，首屏可见学习动作，标题不重复单元',async({page})=>{
 await seedSyntheticCourse(page)
 await page.setViewportSize({width:390,height:844})
 await go(page,'learn')

 await expect(page.locator('.course-selector')).toHaveCount(0)
 await expect(page.locator('.current-course-card')).toContainText('当前教材')
 await expect(page.locator('.current-course-card')).toContainText('合成测试教材')
 await expect(page.getByRole('button',{name:'选择教材',exact:true})).toBeVisible()

 const heading=(await page.locator('.study-heading').innerText()).replace(/\s+/g,' ')
 expect(heading.match(/合成单元一/g)?.length).toBe(1)
 expect(heading).toContain('当前单元：合成单元一')

 const action=page.getByRole('button',{name:'开始今日学习',exact:true})
 await expect(action).toBeVisible()
 const box=(await action.boundingBox())!
 expect(box.y+box.height).toBeLessThanOrEqual(844)
 const nav=(await page.locator('.bottom-nav').boundingBox())!
 expect(box.y+box.height).toBeLessThan(nav.y)
})
