import {test,expect} from '@playwright/test'
import {unlockParent,database} from './helpers'
import {makeZip} from '../../src/services/course-import/ZipImporter'
import {sha256} from '../../src/services/content/digest'
import type {CoursePack} from '../../packages/content_schema/course'

function mediaFixture(){
 const files:Record<string,Uint8Array>={},pack:CoursePack={schemaVersion:2,courseId:'async-ui-probe',contentVersion:'1.0.0',title:'批量合成导入验证',route:'theme',abilityLevels:['L1'],sources:[{id:'synthetic',type:'author-created',rightsStatus:'private-use-declared',attribution:'自动测试合成数据'}],vocabulary:[],units:[{id:'u01',title:'合成单元',lessons:[{id:'l01',title:'合成课节',wordIds:[]}]}],assets:[]}
 for(let i=0;i<300;i++){const bytes=new Uint8Array(24*1024);bytes.set([137,80,78,71]);bytes[10]=i%256;const path='images/item-'+i+'.png',id='async-word-'+i;files[path]=bytes;pack.assets.push({id,path,mediaType:'image/png',bytes:bytes.length,sha256:sha256(bytes),sourceId:'synthetic',license:'合成测试数据'});pack.vocabulary.push({id,language:'en',lemma:'item'+i,meaning:'条目'+i,pos:'n.',sourceId:'synthetic',assetRefs:{image:id}});pack.units[0].lessons[0].wordIds.push(id)}
 return makeZip(pack,files)
}
test('批量导入显示真实阶段进度、保持界面心跳，重复操作被阻止，完成后才安装',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:390,height:844});await unlockParent(page);const before=await database(page)
 await page.evaluate(()=>{const state:any=(window as any).importProbe={ticks:0,gaps:[] as number[],last:performance.now(),phases:[] as string[]};state.timer=setInterval(()=>{const now=performance.now();state.ticks++;state.gaps.push(now-state.last);state.last=now;const label=document.querySelector('.course-import-progress-heading')?.textContent||'';if(label&&!state.phases.includes(label))state.phases.push(label)},16)})
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'选择 JSON / CSV / ZIP 文件',exact:true}).click();await(await chooser).setFiles({name:'async-ui-probe.zip',mimeType:'application/zip',buffer:Buffer.from(mediaFixture())})
 await expect(page.locator('.course-import-progress')).toContainText('课程预览已就绪');await expect(page.locator('.course-file-summary')).toContainText('async-ui-probe.zip');await expect(page.locator('.course-textarea')).toHaveCount(0)
 await page.locator('.course-management .course-check').first().click();await page.getByRole('button',{name:'检查课程内容',exact:true}).click();await expect(page.getByRole('button',{name:'确认导入课程',exact:true})).toBeEnabled()
 await page.getByRole('button',{name:'确认导入课程',exact:true}).click();await expect(page.getByRole('button',{name:'选择 JSON / CSV / ZIP 文件',exact:true})).toBeDisabled();await expect(page.locator('.course-import-progress')).toContainText('本阶段')
 await expect(page.locator('.course-management')).toContainText('课程安装完成',{timeout:30000});await expect(page.locator('.course-import-progress')).toContainText('导入完成');await expect(page.locator('.course-item[data-course="async-ui-probe"]')).toBeVisible()
 const probe=await page.evaluate(()=>{const state=(window as any).importProbe;clearInterval(state.timer);return {ticks:state.ticks,maxGap:Math.max(...state.gaps),phases:state.phases}});expect(probe.ticks).toBeGreaterThan(10);expect(probe.maxGap).toBeLessThan(500);expect(probe.phases.some((p:string)=>p.includes('保存课程资源'))).toBe(true);expect(probe.phases.some((p:string)=>p.includes('读回校验资源'))).toBe(true)
 const after=await database(page);for(const key of ['cards','history','gems','pets','rewardIds'] as const)expect(after[key]).toEqual(before[key])
})
test('取消批量资源保存会清理候选且不激活课程，可重新检查导入',async({page})=>{
 test.setTimeout(60000);await unlockParent(page)
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'选择 JSON / CSV / ZIP 文件',exact:true}).click();await(await chooser).setFiles({name:'async-ui-probe.zip',mimeType:'application/zip',buffer:Buffer.from(mediaFixture())});await expect(page.locator('.course-import-progress')).toContainText('课程预览已就绪')
 await page.locator('.course-management .course-check').first().click();await page.getByRole('button',{name:'检查课程内容',exact:true}).click();await expect(page.getByRole('button',{name:'确认导入课程',exact:true})).toBeEnabled();await page.getByRole('button',{name:'确认导入课程',exact:true}).click()
 await expect(page.locator('.course-import-progress-heading')).toContainText('保存课程资源');await page.getByRole('button',{name:'取消本次导入',exact:true}).click();await expect(page.locator('.course-management')).toContainText('导入已取消，课程未安装。');await expect(page.locator('.course-item[data-course="async-ui-probe"]')).toHaveCount(0)
 const remaining=await page.evaluate(()=>new Promise<number>((resolve,reject)=>{const r=indexedDB.open('wordpal-course-content');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('files').objectStore('files').getAllKeys();q.onsuccess=()=>{resolve(q.result.filter(key=>String(key).includes('async-ui-probe')).length);db.close()}}}));expect(remaining).toBe(0)
 await page.getByRole('button',{name:'检查课程内容',exact:true}).click();await expect(page.getByRole('button',{name:'确认导入课程',exact:true})).toBeEnabled()
})
