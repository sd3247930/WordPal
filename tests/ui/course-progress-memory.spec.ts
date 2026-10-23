import {test,expect} from '@playwright/test'
import {go,database,openCustomPractice,unlockParent,openCourseGallery} from './helpers'
import synthetic from '../../src/content/synthetic/course.json'

for(const width of [390,1024])test(`${width} 教材进度独立恢复，删除后清除该册缓存`,async({page})=>{
 await page.setViewportSize({width,height:900})
 const packs=['a','b'].map(id=>({...synthetic,courseId:'memory-ui-'+id,title:'进度教材 '+id.toUpperCase()}))
 await page.addInitScript(packs=>{
  if(localStorage.getItem('wordpal.content.catalog.v2'))return
  const catalog=packs.map((pack,index)=>{const key='wordpal.content.pack.'+pack.courseId+'.'+String(index+1).repeat(16);localStorage.setItem(key,JSON.stringify(pack));return {courseId:pack.courseId,key,archived:false,aliases:{}}})
  localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(catalog))
 },packs)
 async function choose(title:string){await openCourseGallery(page);await page.locator('.course-gallery-card').filter({hasText:title}).click();await expect(page.locator('.current-course-card')).toContainText(title)}
 async function draft(text:string){await openCustomPractice(page);await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click();await page.getByRole('textbox',{name:'输入中文对应的英文单词'}).fill(text)}
 await go(page,'learn');await choose('进度教材 A');await draft('draft-a');const a=(await database(page)).session
 await choose('进度教材 B');await expect(page.locator('.study-ready')).toBeVisible();await expect(page.locator('.spelling-input input')).toHaveCount(0);await draft('draft-b');const b=(await database(page)).session
 await choose('进度教材 A');await expect(page.locator('.spelling-input input')).toHaveValue('draft-a');expect((await database(page)).session).toEqual(a)
 await page.reload();await expect(page.locator('.spelling-input input')).toHaveValue('draft-a');await choose('进度教材 B');await expect(page.locator('.spelling-input input')).toHaveValue('draft-b');expect((await database(page)).session).toEqual(b)
 const before=await database(page);await unlockParent(page);const item=page.locator('.course-item').filter({hasText:'进度教材 A'});await item.getByRole('button',{name:'删除',exact:true}).click();await expect(page.getByRole('dialog',{name:'删除教材确认'})).toContainText('专属内容');await page.getByRole('textbox',{name:'删除确认文字',exact:true}).fill('删除');await page.getByRole('button',{name:'确认删除',exact:true}).click();await expect(page.locator('.course-item').filter({hasText:'进度教材 A'})).toHaveCount(0)
 const after=await database(page);expect(after.courseSessions?.['memory-ui-a']).toBeUndefined();expect(after.courseProgress?.['memory-ui-a']).toBeUndefined();expect(after.session).toEqual(b)
 for(const field of ['cards','history','gems','pets','rewardIds'])expect(after[field]).toEqual(before[field])
 await go(page,'learn');await expect(page.locator('.spelling-input input')).toHaveValue('draft-b');await page.reload();await expect(page.locator('.spelling-input input')).toHaveValue('draft-b')
})
