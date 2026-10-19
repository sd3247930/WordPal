import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {go,database,unlockParent} from './helpers'
import {lifecyclePack} from '../helpers/lifecycle-fixture'
import {sha256} from '../../src/services/content/digest'

test('当前教材删除后七个模块即时刷新，其他教材独立草稿和奖励保留，重启不复活',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await go(page,'learn')
 const a=await page.evaluate(async packs=>{
  const repo=await import('/src/services/content/StorageRepository.ts' as string),courseModule=await import('/src/stores/course.ts' as string),profileModule=await import('/src/stores/profile.ts' as string),learningModule=await import('/src/stores/learning.ts' as string)
  for(const pack of packs)await repo.installTextCourse(pack)
  const course=courseModule.useCourseStore(),learning=learningModule.useLearningStore(),profile=profileModule.useProfileStore()
  course.choose('lifecycle-a');learning.start();const a=JSON.parse(JSON.stringify(learning.session));course.choose('lifecycle-b');learning.start();profile.transact((db:any)=>{db.gems=23;db.rewardIds=['lifecycle-reward']});return a
 },['lifecycle-a','lifecycle-b','lifecycle-d'].map(id=>lifecyclePack(id)))
 await unlockParent(page)
 const row=page.locator('.course-item').filter({hasText:'合成生命周期 lifecycle-b'}).first();await row.getByRole('button',{name:'删除',exact:true}).click()
 const sheet=page.locator('.sheet-panel');await expect(sheet).toContainText('本册');await expect(sheet.getByRole('button',{name:'确认删除',exact:true})).toBeDisabled()
 await sheet.locator('.course-replacement').getByRole('button',{name:/合成生命周期 lifecycle-a/}).click();await sheet.getByRole('textbox',{name:'删除确认文字'}).fill('删除');await sheet.getByRole('button',{name:'确认删除',exact:true}).click();await expect(sheet).toHaveCount(0);await expect(row).toHaveCount(0)
 const after=await database(page);expect(after.currentCourseId).toBe('lifecycle-a');expect(after.courseProgress['lifecycle-a'].dailyPlan).toEqual(a);expect(after.gems).toBe(23);expect(after.rewardIds).toContain('lifecycle-reward');expect(after.courseProgress['lifecycle-b']).toBeUndefined()
 for(const screen of ['home','learn','review','pet','settings','parent','course']){await go(page,screen);await expect(page.locator('.wp-app')).not.toContainText('合成生命周期 lifecycle-b');await expect(page.locator('.wp-app')).not.toContainText('独有词 lifecycle-b-word');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
 await page.reload();await expect(page.locator('.wp-app')).toBeVisible();expect((await database(page)).courseProgress['lifecycle-a'].dailyPlan).toEqual(a)
 const denied=await page.evaluate(async()=>{const r=await import('/src/services/content/ContentRegistry.ts' as string),p=await import('/src/services/learning/DailyLearningPlan.ts' as string);return {word:r.getCourseWord('lifecycle-b','lifecycle-b-word'),lessons:r.getCourseLessons('lifecycle-b'),registered:!!r.courseRegistry['lifecycle-b']}})
 expect(denied).toEqual({word:undefined,lessons:[],registered:false});expect(errors).toEqual([])
})

test('IndexedDB按版本清理孤儿资源，同路径共享音频的其他教材仍能读取',async({page})=>{
 await go(page,'learn');const bytes=[...readFileSync('src/static/audio/cat.wav')],hash=sha256(new Uint8Array(bytes))
 const packs=['media-b','media-d'].map(id=>{const pack=lifecyclePack(id);pack.assets=[{id:'shared-audio',path:'audio/shared.wav',mediaType:'audio/wav',bytes:bytes.length,sha256:hash,sourceId:'lifecycle-source',license:'合成测试'}];pack.vocabulary[0].assetRefs={audio:'shared-audio'};return pack})
 const result=await page.evaluate(async({packs,bytes})=>{
  const repo=await import('/src/services/content/StorageRepository.ts' as string),media=await import('/src/services/content/MediaRepository.ts' as string),courseModule=await import('/src/stores/course.ts' as string)
  const keys:string[]=[];for(const pack of packs)keys.push(await repo.installMediaCourse(pack,{'audio/shared.wav':new Uint8Array(bytes)}))
  await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('wordpal-course-content',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('files','readwrite');tx.objectStore('files').put(new Uint8Array([7]),keys[0]+'/cache/orphan.bin');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(Error('fixture write'))}})
  await courseModule.useCourseStore().uninstall('media-b',true)
  const kept=await media.readMedia(keys[1],packs[1]),deleted=await media.storedMediaVersions('media-b'),remaining=await media.storedMediaVersions('media-d')
  return {kept:[...kept['audio/shared.wav']],deleted,remaining,expectedKey:keys[1],deletedURL:media.mediaUrl(keys[0],'shared-audio',packs[0])}
 },{packs,bytes})
 expect(result.kept).toEqual(bytes);expect(result.deleted).toEqual([]);expect(result.remaining).toEqual([result.expectedKey]);expect(result.deletedURL).toBe('')
})
