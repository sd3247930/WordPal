import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database,seedDatabase,openPetAction} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements,petInfo} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'

async function fixture(page:Page,options:{complete?:boolean;ready?:boolean;level?:number}={}){
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[]
 db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:options.complete?Object.fromEntries(starterPack.vocabulary.map(w=>[w.id,'2026-10-03T07:00:00Z'])):{}}}
 if(options.level)for(const id of elements)db.pets[id]={...db.pets[id],level:options.level,exp:(options.level-1)*100}
 if(options.ready){db.session=null;for(const card of Object.values(db.cards))card.due='2100-01-01T00:00:00.000Z'}
 await page.clock.install({time:new Date('2026-10-03T08:00:00Z')})
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
}
async function inspect(page:Page){
 const card=page.locator('.study-companion-card');await expect(card).toBeVisible()
 const image=card.locator('.pet-cutout-image img');await expect(image).toHaveJSProperty('naturalWidth',960)
 const result=await card.evaluate(node=>{
  const card=node.getBoundingClientRect(),portrait=node.querySelector('.companion-portrait')!.getBoundingClientRect(),image=node.querySelector('.pet-cutout-image')!.getBoundingClientRect(),copy=node.querySelector('.companion-card-copy')!.getBoundingClientRect()
  const inside=(a:DOMRect,b:DOMRect)=>a.left>=b.left-.5&&a.top>=b.top-.5&&a.right<=b.right+.5&&a.bottom<=b.bottom+.5
  const separate=image.right<=copy.left+.5||image.bottom<=copy.top+.5
  return {inside:inside(portrait,card)&&inside(image,portrait)&&inside(copy,card),separate,ratio:image.width/image.height,overflow:node.scrollWidth>node.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1,portraitWidth:portrait.width,titleFont:parseFloat(getComputedStyle(node.querySelector('.companion-card-title')!).fontSize),stacked:portrait.bottom<=copy.top,animated:getComputedStyle(node.querySelector('.pet-cutout')!).animationName}
 })
 expect(result.inside&&result.separate&&!result.overflow,JSON.stringify(result)).toBe(true);expect(result.ratio).toBeCloseTo(.75,2);expect(result.titleFont).toBeGreaterThanOrEqual(20);expect(result.animated).toBe('none')
 return result
}

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`clay ${mode} 大字=${largeText} 手机平板横竖屏与窄容器完整展示`,async({page})=>{
 test.setTimeout(90000);await fixture(page);await setAppearance(page,'clay',mode,{largeText,highContrast:largeText});await go(page,'learn');const before=await database(page)
 for(const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:412,height:915},{width:844,height:390},{width:600,height:900},{width:768,height:1024},{width:834,height:1194},{width:1024,height:768},{width:1280,height:800}]){await page.setViewportSize(viewport);await inspect(page);if(viewport.width===390||viewport.width===834)await page.locator('.study-pet-companion').screenshot({path:test.info().outputPath(`clay-${mode}-${largeText?'large':'normal'}-${viewport.width}.png`)})}
 await page.setViewportSize({width:1280,height:900});await page.locator('.study-pet-companion').evaluate(node=>(node as HTMLElement).style.width='250px');await expect(page.locator('.study-pet-companion')).toHaveClass(/study-companion-stacked/);expect((await inspect(page)).stacked).toBe(true)
 await page.locator('.study-pet-companion').evaluate(node=>(node as HTMLElement).style.removeProperty('width'));await expect(page.locator('.study-pet-companion')).not.toHaveClass(/study-companion-stacked/)
 await page.setViewportSize({width:320,height:900});await page.addStyleTag({content:'.wp-app{--wp-font-body:32px!important;--wp-font-small:28px!important;--wp-font-caption:24px!important}'});await inspect(page)
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=1.6});await expect(page.locator('.study-pet-companion')).toHaveClass(/study-companion-stacked/);expect((await inspect(page)).stacked).toBe(true)
 expect(await database(page)).toEqual(before);await page.locator('.study-pet-companion').screenshot({path:test.info().outputPath(`clay-${mode}-${largeText?'large':'normal'}-200.png`)})
})

for(const mode of ['light','dark'])test(`clay ${mode} 四元素四形态切换，等级与已选择阶段来自真实状态`,async({page})=>{
 test.setTimeout(120000);await fixture(page,{complete:true,level:8});await setAppearance(page,'clay',mode);await page.setViewportSize({width:390,height:900});await go(page,'learn');const before=await database(page)
 for(const element of elements){
  await go(page,'pet');await page.locator('.pet-choice').filter({hasText:petInfo[element].name}).click()
  for(const [index,file]of ['juvenile','growing','evolved','unknown'].entries()){
   await openPetAction(page,'成长');await page.locator('.pet-growth-panel .pet-form-card').nth(index).click();await page.locator('.pet-study-link').click()
   const card=page.locator('.study-pet-companion');await expect(card).toHaveAttribute('data-element',element);await expect(card).toHaveAttribute('data-form',String(index+1));await expect(card.locator('.companion-card-title')).toHaveText(petInfo[element].name+'陪你一起学习');await expect(card.locator('.companion-card-status')).toContainText(petInfo[element].elementName+'精灵 · Lv.8');await expect(card.locator('img')).toHaveAttribute('src',new RegExp(element+'-'+file+'[.]png$'));await inspect(page)
   const current=await database(page);expect({...current,companion:before.companion}).toEqual(before);await go(page,'pet')
  }
 }
 await go(page,'learn');await page.locator('.study-pet-companion').screenshot({path:test.info().outputPath(`clay-${mode}-wind.png`)})
})

test('Lv.5 不硬编码成年期；已有复习答题升级后卡片立即刷新且不重复发奖',async({page})=>{
 const db=goldenDatabase();db.pets.water.level=5;db.pets.water.exp=499;await page.setViewportSize({width:390,height:900})
 await setAppearance(page,'clay','light');await seedDatabase(page,db);await go(page,'learn');await expect(page.locator('.companion-form-label')).toHaveText('幼年期');await expect(page.locator('.companion-card-status')).toContainText('Lv.5')
 const before=await database(page);await page.locator('.answer-choice').filter({hasText:'dog'}).click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click();await expect(page.locator('.companion-card-status')).toContainText('Lv.6');const after=await database(page);expect(after.history).toHaveLength(before.history.length+1);expect(after.pets.water.exp).toBe(before.pets.water.exp+12)
 await page.locator('.companion-card-title').click();await page.locator('.companion-form-label').click();await page.getByRole('navigation',{name:'底部导航'}).getByRole('button',{name:'首页',exact:true}).click();await page.getByRole('navigation',{name:'底部导航'}).getByRole('button',{name:'学习',exact:true}).click();await expect(page.locator('.companion-card-status')).toContainText('Lv.6');expect(await database(page)).toEqual(after)
})

for(const complete of [false,true])test(`原有${complete?'整课检查':'开始今日学习'}入口分离保留`,async({page})=>{
 await fixture(page,{ready:true,complete});await setAppearance(page,'clay','light');await go(page,'learn');const before=await database(page)
 await expect(page.locator('.study-companion-card').getByRole('button')).toHaveCount(0);const actions=page.locator('.study-companion-ready');await expect(actions).toBeVisible()
 await actions.getByRole('button',{name:complete?'整课检查':'开始今日学习',exact:true}).click()
 if(complete){await expect(page.locator('.activity-workspace')).toBeVisible();expect(await database(page)).toEqual(before);await page.getByRole('button',{name:'收起练习',exact:true}).click();await expect(actions).toBeVisible()}
 else{await expect(page.locator('.study-space')).toBeVisible();const after=await database(page);expect(after.history).toEqual(before.history);expect(after.rewardIds).toEqual(before.rewardIds);expect(after.gems).toBe(before.gems);expect(after.pets).toEqual(before.pets)}
})

test('配图失败保留文字与尺寸，切换伙伴会重新载入；装饰不产生额外焦点',async({page})=>{
 await fixture(page);await page.setViewportSize({width:390,height:900});await setAppearance(page,'clay','light');await page.route('**/static/pet-house/growth/water-*.png',route=>route.abort());await go(page,'learn');const before=await database(page),card=page.locator('.study-companion-card'),height=(await card.boundingBox())!.height
 await expect(card.locator('.study-companion-placeholder')).toHaveText('伙伴配图暂不可用');await expect(card.locator('.companion-card-title')).toHaveText('玄冥陪你一起学习');expect((await card.boundingBox())!.height).toBe(height);await expect(card.locator('[tabindex],button,[role=button]')).toHaveCount(0);await expect(card.locator('.companion-portrait')).toHaveAttribute('aria-hidden','true')
 await card.locator('.companion-form-label').click();expect(await database(page)).toEqual(before);await go(page,'pet');await page.locator('.pet-choice').filter({hasText:'祝融'}).click();await page.locator('.bottom-nav').getByRole('button',{name:'学习',exact:true}).click();await inspect(page);await expect(card.locator('.companion-card-title')).toHaveText('祝融陪你一起学习')
})

test('异常档案不展示默认玄冥且不覆盖原始档案',async({page})=>{
 await setAppearance(page,'clay','light');await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','unreadable-study-fixture')});await go(page,'learn');const card=page.locator('.study-companion-card');await expect(card.locator('.companion-card-title')).toHaveText('伙伴资料暂不可用');await expect(card.locator('.companion-card-status')).toHaveCount(0);await expect(card.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('unreadable-study-fixture')
})
