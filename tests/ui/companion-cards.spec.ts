import {test,expect,type Page,type Locator} from '@playwright/test'
import {go,database,setAppearance,openPetAction} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements,petInfo} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'

async function fixture(page:Page,readyForCheck=false){
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[]
 db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.map(w=>[w.id,'2026-10-17T08:00:00Z']))}}
 for(const id of elements)db.pets[id]={...db.pets[id],level:8,exp:700}
 if(readyForCheck){db.session=null;for(const card of Object.values(db.cards))card.due='2100-01-01T00:00:00.000Z'}
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
}
function learningOnly(db:Awaited<ReturnType<typeof database>>){const copy=JSON.parse(JSON.stringify(db));delete copy.companion;return copy}
async function inspect(card:Locator){
 await expect(card).toBeVisible();const image=card.locator('.pet-cutout-image img');await expect(image).toHaveJSProperty('naturalWidth',960);await expect(image).toHaveJSProperty('naturalHeight',1280)
 const metrics=await card.evaluate(el=>{
  const r=el.getBoundingClientRect(),p=el.querySelector('.companion-portrait')!.getBoundingClientRect(),i=el.querySelector('.pet-cutout-image')!.getBoundingClientRect(),c=el.querySelector('.companion-card-copy')!.getBoundingClientRect(),a=el.querySelector('.companion-card-actions')?.getBoundingClientRect()
  const inside=(x:DOMRect,y:DOMRect)=>x.left>=y.left-.2&&x.top>=y.top-.2&&x.right<=y.right+.2&&x.bottom<=y.bottom+.2
  const separate=(x:DOMRect,y:DOMRect)=>x.right<=y.left+.2||x.left>=y.right-.2||x.bottom<=y.top+.2||x.top>=y.bottom-.2
  return {portraitHeight:p.height,imageHeight:i.height,ratio:i.width/i.height,inside:inside(p,r)&&inside(i,p)&&inside(c,r)&&(!a||inside(a,r)),separate:separate(i,c)&&(!a||separate(i,a)),overflow:el.scrollWidth>el.clientWidth+1}
 })
 expect(metrics.portraitHeight).toBeGreaterThanOrEqual(112);expect(metrics.imageHeight).toBeGreaterThanOrEqual(80);expect(metrics.ratio).toBeCloseTo(.75,2);expect(metrics.inside&&metrics.separate&&!metrics.overflow).toBe(true)
 return metrics
}

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字与高对比=${largeText}：四元素四阶段在两页完整同步且不改学习档案`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:1000});await fixture(page);await setAppearance(page,'swiss',mode,{largeText,highContrast:largeText});await go(page,'pet');const before=learningOnly(await database(page)),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 const washes=[]
 for(const element of elements){
  await go(page,'pet');await page.locator('.pet-choice').filter({hasText:petInfo[element].name}).click()
  for(const [index,stage]of ['juvenile','growing','evolved','unknown'].entries()){
   await openPetAction(page,'成长');await page.locator('.pet-growth-panel .pet-form-card').nth(index).click()
   for(const [screen,selector]of [['learn','.study-pet-companion'],['settings','.settings-pet']]){
    await go(page,screen);const card=page.locator(selector);await expect(card).toHaveAttribute('data-element',element);await expect(card).toHaveAttribute('data-form',String(index+1));await expect(card.locator('.companion-card-title')).toContainText(petInfo[element].name);await expect(card.locator('.pet-cutout-image img')).toHaveAttribute('src',new RegExp(element+'-'+stage+'[.]png$'));await inspect(card)
    if(index===0&&screen==='learn')washes.push(await card.evaluate(el=>getComputedStyle(el).getPropertyValue('--companion-wash')))
    expect(learningOnly(await database(page))).toEqual(before)
   }
   await go(page,'pet')
  }
 }
 expect(new Set(washes).size).toBe(largeText?1:4);expect(errors).toEqual([])
 await go(page,'learn');await page.locator('.study-pet-companion').screenshot({path:test.info().outputPath(`learn-${mode}-${largeText?'accessible':'normal'}.png`)});await go(page,'settings');await page.locator('.settings-pet').screenshot({path:test.info().outputPath(`settings-${mode}-${largeText?'accessible':'normal'}.png`)})
})

test('手机、平板、横竖屏及200%字体下图片完整，设置导航与学习草稿保持',async({page})=>{
 test.setTimeout(120000);await fixture(page);await setAppearance(page,'swiss','dark',{largeText:true,reducedMotion:true});await go(page,'learn');const before=await database(page)
 for(const size of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:412,height:915},{width:844,height:390},{width:600,height:900},{width:768,height:1024},{width:834,height:1194},{width:1024,height:768},{width:1280,height:800}]){
  await page.setViewportSize(size)
  for(const [screen,selector]of [['learn','.study-pet-companion'],['settings','.settings-pet']]){
   await go(page,screen);await inspect(page.locator(selector));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   if(screen==='settings'){if(size.width>=1200)await inspect(page.locator('.settings-summary'));else await expect(page.locator('.settings-summary')).toBeHidden()}
  }
 }
 await page.setViewportSize({width:320,height:667});await page.locator('.wp-app').evaluate(el=>{for(const [name,size]of Object.entries({caption:24,small:28,card:34,section:44})) (el as HTMLElement).style.setProperty('--wp-font-'+name,size+'px')});await inspect(page.locator('.settings-pet'))
 await page.getByRole('button',{name:'查看精灵小伙伴',exact:true}).click();await expect(page.locator('.pet-current-hero')).toBeVisible();expect(await database(page)).toEqual(before)
 await go(page,'learn');await expect(page.locator('.study-space')).toBeVisible();expect(await database(page)).toEqual(before)
 await page.setViewportSize({width:1280,height:800});await go(page,'settings');await inspect(page.locator('.settings-summary'));await page.getByRole('button',{name:'回到首页',exact:true}).click();await expect(page.locator('.home-grid')).toBeVisible();expect(await database(page)).toEqual(before)
})

test('DPR 3手机与DPR 2平板使用同一高清原图，不因重载或尺寸切换跳变',async({browser})=>{
 for(const density of [2,3]){
  const context=await browser.newContext({baseURL:test.info().project.use.baseURL,viewport:density===3?{width:390,height:844}:{width:834,height:1194},deviceScaleFactor:density}),page=await context.newPage()
  try{
   await page.goto('/#/pages/learn/index');const card=page.locator('.study-pet-companion'),before=await inspect(card);await page.reload();const after=await inspect(card);expect(after.portraitHeight).toBe(before.portraitHeight);expect(after.imageHeight).toBe(before.imageHeight)
   await page.screenshot({path:test.info().outputPath(`density-${density}.png`)})
  }finally{await context.close()}
 }
})

test('宠物卡片内的整课检查保持原活动接口，开始与收起不创建正式Session或奖励',async({page})=>{
 await fixture(page,true);await page.setViewportSize({width:390,height:844});await go(page,'learn');const before=await database(page)
 const card=page.locator('.study-pet-companion');await inspect(card);await expect(card.locator('.study-ready')).toContainText('今天的任务已经完成')
 await card.getByRole('button',{name:'整课检查',exact:true}).click();await expect(page.locator('.activity-workspace')).toBeVisible();await expect(card.locator('.study-ready')).toHaveCount(0);expect(await database(page)).toEqual(before)
 await page.getByRole('button',{name:'收起练习',exact:true}).click();await expect(card.getByRole('button',{name:'整课检查',exact:true})).toBeVisible();expect(await database(page)).toEqual(before)
})
