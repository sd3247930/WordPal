import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database,openPetAction} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements} from '../../packages/pet_engine'
import {petStages} from '../../src/services/pet-growth'
import {starterPack} from '../../src/services/content/ContentRegistry'

async function fixture(page:Page,level:number,complete=false,learned=0){
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[];db.session=null
 db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.slice(0,complete?undefined:learned).map(word=>[word.id,'2026-10-16T08:00:00Z']))}}
 for(const id of elements)db.pets[id]={...db.pets[id],level,exp:(level-1)*100,evolutionStage:level>=8?3:level>=4?2:1}
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
}
async function growth(page:Page){await openPetAction(page,'成长');await expect(page.locator('.pet-growth-panel')).toBeVisible()}

for(const level of [3,4,7,8])test('Lv.'+level+' 形态解锁边界、默认幼年期及等比高清展示',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,level);await go(page,'pet');const before=await database(page)
 await expect(page.locator('.scene-character .pet-cutout')).toHaveAttribute('data-form','1');await growth(page)
 const cards=page.locator('.pet-growth-panel .pet-form-card');await expect(cards).toHaveCount(4)
 for(let i=0;i<4;i++){
  if(i<3&&(i===0||level>=[1,4,8][i]))await expect(cards.nth(i)).toBeEnabled();else await expect(cards.nth(i)).toBeDisabled()
  const art=cards.nth(i).locator('.pet-cutout'),image=art.locator('.pet-cutout-image')
  await expect(image.locator('img')).toHaveJSProperty('naturalWidth',960)
  const sizes=await image.evaluate(el=>({width:el.getBoundingClientRect().width/Math.max(1,el.parentElement!.getBoundingClientRect().width),height:el.getBoundingClientRect().height/Math.max(1,el.parentElement!.getBoundingClientRect().height)}))
  expect(sizes.width).toBeCloseTo(petStages[i].scale,2);expect(sizes.height).toBeCloseTo(petStages[i].scale,2)
 }
 await expect(cards.nth(3).locator('img')).toHaveCount(1);await expect(cards.nth(3)).toBeDisabled();expect(await database(page)).toEqual(before)
})

test('四象高清图互不混用，解锁后手选跨页持久化且完整学习档案不变',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,8);await go(page,'pet');const before=await database(page)
 for(const [id,name]of [['water','玄冥'],['fire','祝融'],['earth','后土'],['wind','飞廉']]){
  await page.locator('.pet-choice').filter({hasText:name}).click();await growth(page)
  for(const [i,stage]of ['juvenile','growing','evolved','unknown'].entries())await expect(page.locator('.pet-growth-panel .pet-form-card').nth(i).locator('img')).toHaveAttribute('src',new RegExp(id+'-'+stage+'[.]png$'))
  await expect(page.locator('.current-pet-hero')).toContainText(name)
 }
 await page.locator('.pet-choice').filter({hasText:'玄冥'}).click();await growth(page);await page.locator('.pet-growth-panel .pet-form-card').nth(2).click()
 await expect(page.locator('.scene-character .pet-cutout')).toHaveAttribute('data-form','3');expect(await database(page)).toEqual(before)
 await go(page,'home');await expect(page.locator('.companion-portrait img')).toHaveAttribute('src',/water-evolved[.]png$/)
 await page.reload();await expect(page.locator('.companion-portrait img')).toHaveAttribute('src',/water-evolved[.]png$/)
 await go(page,'pet');await growth(page);await expect(page.locator('.pet-growth-panel .pet-form-card').nth(2)).toHaveAttribute('aria-pressed','true')
 await page.locator('.pet-growth-panel .pet-form-card').nth(0).click();await expect(page.locator('.scene-character .pet-cutout')).toHaveAttribute('data-form','1');expect(await database(page)).toEqual(before)
})

test('全教材完成100%后未知形态恢复全彩，可切换且跨页保存',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,1,true);await go(page,'pet');const before=await database(page);await growth(page)
 const unknown=page.locator('.pet-growth-panel .pet-form-card').nth(3);await expect(unknown).toHaveAttribute('data-state','unlocked');await expect(unknown).toBeEnabled();await expect(unknown.locator('img')).toHaveAttribute('src',/water-unknown[.]png$/)
 await expect(unknown.locator('.pet-form-veil')).toHaveCount(0);expect(await unknown.locator('.pet-form-sprite').evaluate(el=>getComputedStyle(el).filter)).toBe('none')
 await unknown.click();await expect(page.locator('.scene-character .pet-cutout')).toHaveAttribute('data-form','4');await go(page,'home');await expect(page.locator('.companion-portrait img')).toHaveAttribute('src',/water-unknown[.]png$/)
 await page.reload();await expect(page.locator('.companion-portrait img')).toHaveAttribute('src',/water-unknown[.]png$/)
 await go(page,'pet');await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:'相册',exact:true}).click();await expect(page.locator('.pet-album-entry').nth(3)).toHaveAttribute('aria-pressed','true');expect(await database(page)).toEqual(before)
})

test('未学和学习中预览采用不同灰度遮罩，锁定不改变同阶段尺寸',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,2,false,10);await go(page,'pet');await growth(page);const before=await database(page),cards=page.locator('.pet-growth-panel .pet-form-card')
 await expect(cards.nth(1)).toHaveAttribute('data-state','learning');await expect(cards.nth(2)).toHaveAttribute('data-state','locked');await expect(cards.nth(3)).toHaveAttribute('data-state','learning')
 await expect(cards.nth(1).getByRole('progressbar')).toHaveAttribute('aria-valuenow','33');await expect(cards.nth(3).getByRole('progressbar')).toHaveAttribute('aria-valuenow','50')
 for(const i of [1,2,3]){await expect(cards.nth(i).locator('.pet-form-veil')).toBeVisible();await expect(cards.nth(i).locator('.pet-form-lock')).toBeVisible();expect(await cards.nth(i).evaluate(el=>getComputedStyle(el).opacity)).toBe('1')}
 const adultWidth=(await cards.nth(1).locator('.pet-cutout-image').boundingBox())!.width,updated=await database(page);updated.pets.water.level=4;updated.pets.water.exp=300
 await page.evaluate(db=>localStorage.setItem('wordpal.database.v2',JSON.stringify(db)),updated);await page.reload();await growth(page);await expect(cards.nth(1)).toHaveAttribute('data-state','unlocked');await expect(cards.nth(1).locator('.pet-form-veil')).toHaveCount(0)
 expect((await cards.nth(1).locator('.pet-cutout-image').boundingBox())!.width).toBeCloseTo(adultWidth,2);expect(await cards.nth(1).locator('.pet-form-sprite').evaluate(el=>getComputedStyle(el).filter)).toBe('none');expect((await database(page)).cards).toEqual(before.cards);expect((await database(page)).history).toEqual(before.history)
})

for(const mode of ['light','dark'])test(mode+' 手机和平板成长卡片无溢出，高清图完整且按钮可操作',async({page})=>{
 await fixture(page,8);await setAppearance(page,'swiss',mode,{largeText:mode==='dark',highContrast:mode==='dark'});await go(page,'pet');await growth(page)
 for(const width of [320,390,834,1194]){
  await page.setViewportSize({width,height:1000});await expect(page.locator('.pet-growth-panel .pet-form-card')).toHaveCount(4)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const cards=await page.locator('.pet-growth-panel .pet-form-card').evaluateAll(items=>items.map(item=>({height:item.getBoundingClientRect().height,overflow:item.scrollWidth>item.clientWidth+1})))
  expect(cards.every(card=>card.height>=56&&!card.overflow)).toBe(true)
  const pictures=await page.locator('.pet-growth-panel .pet-form-art').evaluateAll(frames=>frames.map(frame=>{const a=frame.getBoundingClientRect(),b=frame.querySelector('.pet-cutout-image')!.getBoundingClientRect();return {within:b.left>=a.left-1&&b.right<=a.right+1&&b.top>=a.top-1&&b.bottom<=a.bottom+1}}));expect(pictures.every(picture=>picture.within)).toBe(true)
 }
 await page.setViewportSize({width:390,height:950});await page.locator('.pet-growth-panel').screenshot({path:'test-results/pet-growth-'+mode+'.png'})
})
