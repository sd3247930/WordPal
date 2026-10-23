import {test,expect} from '@playwright/test'
import {go,setAppearance,database} from './helpers'
import {compactStudyFixture} from '../helpers/compact-study'

test('独立学习非满分与错词回看保持各自统计口径，完成反馈无宠物且重复查看不重奖',async({page})=>{
 const {pack,db,lesson,now}=compactStudyFixture(false),wordIds=lesson.wordIds.slice(0,3),sessionId='compact-completed-independent'
 db.courseProgress![pack.courseId].studyActivity='independent'
 db.session={id:sessionId,courseId:pack.courseId,contentVersion:pack.contentVersion,kind:'practice',startedAt:now.toISOString(),completedAt:now.toISOString(),date:'2040-01-01',wordIds,index:2,mode:'spell',input:'',selected:'',revealed:true,answers:wordIds.map((wordId,index)=>({id:'independent-'+index,wordId,courseId:pack.courseId,mode:'spell',source:'practice',rating:index===0?3:1,correct:index===0,input:'',at:now.toISOString()}))}
 const presentation={sessionId,manual:true,revisitStarted:true,queue:wordIds.slice(1),index:2,input:'',selected:'',revealed:false,answer:null,answers:wordIds.slice(1).map(wordId=>({wordId,correct:true})),finished:true,petId:'water',startExp:0,rewardTracked:false}
 await page.clock.install({time:now});await setAppearance(page,'clay','light');await page.addInitScript(({pack,db,presentation})=>{if(localStorage.getItem('wordpal.database.active.v2'))return;const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.study.presentation.v1',JSON.stringify(presentation))},{pack,db,presentation})
 await go(page,'learn');const before=await database(page);await expect(page.locator('.study-completion .completion-number')).toHaveText(['1 / 3','2']);await expect(page.locator('.study-completion')).toContainText('回看 2 / 2 个回答正确，不重复发奖');await expect(page.locator('.study-pet-companion')).toHaveCount(0)
 await page.reload();await expect(page.locator('.study-completion .completion-number')).toHaveText(['1 / 3','2']);expect(await database(page)).toEqual(before)
})
