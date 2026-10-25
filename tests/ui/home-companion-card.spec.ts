import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,seedDatabase,database,waitForArtwork} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements,petInfo} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'

async function prepare(page:Page,mode='light',largeText=false){await page.clock.install({time:new Date('2026-10-03T08:00:00Z')});await setAppearance(page,'clay',mode,{largeText,highContrast:largeText,reducedMotion:true});await seedDatabase(page,goldenDatabase());await go(page,'home')}
async function inspect(page:Page){
 const card=page.locator('.home-companion-lite');await expect(card).toBeVisible();await expect(card.locator('.pet-cutout-image img')).toHaveJSProperty('naturalWidth',960)
 const metrics=await card.evaluate(node=>{const rect=node.getBoundingClientRect(),art=node.querySelector('.companion-art')!.getBoundingClientRect(),image=node.querySelector('.pet-cutout-image')!.getBoundingClientRect(),copy=node.querySelector('.companion-copy')!.getBoundingClientRect(),button=node.querySelector('.companion-open')!.getBoundingClientRect(),paw=node.querySelector('.companion-paw')!.getBoundingClientRect(),label=node.querySelector('.companion-open>uni-text:last-of-type')!.getBoundingClientRect(),inside=(a:DOMRect,b:DOMRect)=>a.left>=b.left-.2&&a.right<=b.right+.2&&a.top>=b.top-.2&&a.bottom<=b.bottom+.2;return {width:rect.width,height:rect.height,ratio:image.width/image.height,inside:inside(art,rect)&&inside(image,art)&&inside(copy,rect)&&inside(button,copy),separate:art.right<=copy.left+.2||art.bottom<=copy.top+.2,overflow:node.scrollWidth>node.clientWidth+1,buttonHeight:button.height,center:Math.abs((paw.left+label.right)/2-(button.left+button.width/2)),titleFont:parseFloat(getComputedStyle(node.querySelector('.companion-name')!).fontSize),stacked:node.classList.contains('companion-stacked')}})
 const icons=await card.evaluate(node=>{const smile=node.querySelector('.companion-smile')!.getBoundingClientRect(),heart=node.querySelector('.companion-heart-wrap')!.getBoundingClientRect(),mood=node.querySelector('.companion-mood')!.getBoundingClientRect(),affection=node.querySelector('.companion-affection')!.getBoundingClientRect(),cx=(r:DOMRect)=>r.left+r.width/2,cy=(r:DOMRect)=>r.top+r.height/2;return {sizeDelta:Math.max(Math.abs(smile.width-heart.width),Math.abs(smile.height-heart.height)),axisDelta:Math.abs(cx(smile)-cx(heart)),rowsOrdered:heart.top>=smile.bottom,smileRowDelta:Math.abs(cy(smile)-cy(mood)),heartRowDelta:Math.abs(cy(heart)-cy(affection))}})
 expect(icons.sizeDelta).toBeLessThan(.1);expect(icons.axisDelta).toBeLessThan(.1);expect(icons.rowsOrdered).toBe(true);expect(icons.smileRowDelta).toBeLessThan(.1);expect(icons.heartRowDelta).toBeLessThan(.1)
 expect(metrics.inside&&metrics.separate&&!metrics.overflow,JSON.stringify(metrics)).toBe(true);expect(metrics.ratio).toBeCloseTo(.75,2);expect(metrics.buttonHeight).toBeGreaterThanOrEqual(48);expect(metrics.center).toBeLessThan(1.5);expect(metrics.titleFont).toBeGreaterThanOrEqual(26);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);return metrics
}

test('首页复用真实宠物资料，取消信息小框和CTA箭头，独立今日任务与三栏统计保留',async({page})=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);const before=await database(page),card=page.locator('.home-companion-lite')
 await expect(card.locator('.companion-label')).toHaveText('当前陪伴 · 水象精灵');await expect(card.locator('.companion-name')).toHaveText('玄冥');await expect(card.locator('.companion-level')).toHaveText('Lv.2');await expect(card.locator('.companion-status')).toContainText('开心');await expect(card.locator('.companion-status')).toContainText('亲密度 36');await expect(card.locator('.companion-open')).toHaveText('看看伙伴');await expect(card.locator('.companion-paw')).toBeVisible();await expect(card).not.toContainText('今日任务');await expect(card).not.toContainText('→');await expect(card.locator('.companion-bubble')).toHaveCount(0)
 for(const icon of ['paw','smile','heart']){const image=card.locator(`.companion-clay-icon img[src*="clay-${icon}"]`);await expect(image).toHaveJSProperty('naturalWidth',256);await expect(image).toHaveJSProperty('naturalHeight',256)}
 await expect(page.locator('.home-today .section-heading')).toContainText('今日任务');await expect(page.locator('.home-stats-strip .home-stat-value')).toHaveText(['3','3','5']);await inspect(page);await card.locator('.companion-name').click();await expect(card).toBeVisible();expect(await database(page)).toEqual(before)
})

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`Clay ${mode} 大字=${largeText} 容器宽度、手机平板和配图完整`,async({page})=>{
 await prepare(page,mode,largeText);const before=await database(page);await page.locator('.companion-portrait img').evaluate(node=>node.setAttribute('data-stability-probe','original'))
 for(const [width,height]of [[320,568],[359,800],[390,844],[507,1024],[600,900],[768,1024],[834,1194],[1024,768],[1194,834],[1280,800],[1600,900]]){
  await page.setViewportSize({width,height});const metrics=await inspect(page);if(width===390&&!largeText)expect(metrics.stacked).toBe(false)
  if([390,1280].includes(width)){await waitForArtwork(page);await page.locator('.home-companion-lite').screenshot({path:test.info().outputPath(`companion-${mode}-${largeText?'large':'normal'}-${width}.png`)})}
 }
 await expect(page.locator('.companion-portrait img')).toHaveAttribute('data-stability-probe','original');expect(await database(page)).toEqual(before)
})

test('四象四形态切换同步名字等级心情亲密度和原画，保留场景偏好与学习记录',async({page})=>{
 test.setTimeout(90000);const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[];db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.map(word=>[word.id,'2026-10-03T08:00:00Z']))}}
 for(const [index,id]of elements.entries())db.pets[id]={...db.pets[id],level:8,exp:700,affection:11+index*13,mood:(['calm','happy','excited','curious'] as const)[index]}
 await setAppearance(page,'clay','light');await page.addInitScript(db=>{localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.pethouse.appearance.v1',JSON.stringify({sceneId:'water'}))},db);await go(page,'home');const before=await database(page);delete before.companion
 for(const id of elements){expect(await page.evaluate(async id=>{const {usePetStore}=await import('/src/stores/pet.ts' as string);return usePetStore().choose(id)},id)).toBe(true);for(const [index,name]of ['juvenile','growing','evolved','unknown'].entries()){
  expect(await page.evaluate(async({id,form})=>{const {usePetFormsStore}=await import('/src/stores/pet-forms.ts' as string);return usePetFormsStore().choose(id,form)},{id,form:index+1})).toBe(true);const card=page.locator('.home-companion-lite');await expect(card).toHaveAttribute('data-element',id);await expect(card).toHaveAttribute('data-form',String(index+1));await expect(card.locator('.companion-name')).toHaveText(petInfo[id].name);await expect(card.locator('.pet-cutout-image img')).toHaveAttribute('src',new RegExp(id+'-'+name+'[.]png$'));await expect(card.locator('.companion-level')).toHaveText('Lv.8');await expect(card.locator('.companion-affection')).toContainText(String(db.pets[id].affection));await expect(card).toHaveAttribute('data-scene','water');await inspect(page);const after=await database(page);delete after.companion;expect(after).toEqual(before)
 }}
})

test('CTA鼠标、Enter与Space沿用宠物屋导航，快速点击仅调用一次且不改宠物或学习状态',async({page})=>{
 await prepare(page);const before=await database(page)
 await page.evaluate(()=>{const api=(window as any).uni,original=api.redirectTo;(window as any).__petNavigationCount=0;api.redirectTo=function(options:any){if(options.url==='/pages/pet/index')(window as any).__petNavigationCount++;return original.call(this,options)}})
 await page.locator('.companion-open').evaluate(node=>{for(let index=0;index<20;index++)(node as HTMLElement).click()});await expect(page.locator('.pet-house')).toBeVisible();expect(await page.evaluate(()=>(window as any).__petNavigationCount)).toBe(1);expect(await database(page)).toEqual(before)
 for(const key of ['Enter','Space']){await page.getByRole('button',{name:'首页',exact:true}).last().click();await expect(page.locator('.home-companion-lite')).toBeVisible();await page.locator('.companion-open').focus();await page.keyboard.press(key);await expect(page.locator('.pet-house')).toBeVisible();expect(await database(page)).toEqual(before)}
})

test('图片失败有占位和重试，背景故障不影响资料及CTA，恢复后显示同一精灵',async({page})=>{
 let fail=true;await page.route('**/static/pet-house/growth/water-juvenile.png',route=>fail?route.fulfill({status:404,body:''}):route.continue());await page.route('**/static/pet-house/water-scene.jpg',route=>route.abort());await prepare(page);const before=await database(page)
 await page.route('**/static/icons/companion/*.png',route=>route.abort());await page.reload();await expect(page.locator('.home-companion-lite .companion-clay-icon')).toHaveCount(0);await expect(page.locator('.companion-smile.icon-fallback')).toBeVisible();await expect(page.locator('.companion-heart')).toBeVisible();await expect(page.locator('.companion-paw>uni-view')).toHaveCount(5);await expect(page.locator('.companion-status')).toContainText('开心');await expect(page.locator('.companion-status')).toContainText('亲密度 36')
 await expect(page.getByRole('img',{name:'玄冥配图暂不可用',exact:true})).toBeVisible();await expect(page.locator('.home-companion-lite .companion-backdrop')).toHaveCount(0);await expect(page.locator('.companion-level')).toHaveText('Lv.2');fail=false;await page.getByRole('button',{name:'重试配图',exact:true}).click();await expect(page.locator('.companion-portrait img')).toHaveJSProperty('naturalWidth',960);expect(await database(page)).toEqual(before);await page.locator('.companion-open').click();await expect(page.locator('.pet-house')).toBeVisible();expect(await database(page)).toEqual(before)
})

test('只读档案不显示假宠物或假数值，保留故障原档案',async({page})=>{
 await setAppearance(page,'clay','light');await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','broken-companion-fixture')});await go(page,'home');await expect(page.locator('.home-companion-lite')).toContainText('伙伴资料暂不可用');await expect(page.locator('.companion-level')).toHaveCount(0);await expect(page.locator('.companion-portrait img')).toHaveCount(0);await expect(page.locator('.companion-open')).toBeDisabled();expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('broken-companion-fixture')
})

test('未知情绪、长名字、多位数据与200%字号不产生undefined、重叠或截断',async({page})=>{
 await setAppearance(page,'clay','dark');const db=goldenDatabase();db.pets.water.mood='unknown' as any;db.pets.water.level=12345;db.pets.water.affection=123456;await seedDatabase(page,db);await go(page,'home');const before=await database(page);await expect(page.locator('.companion-status')).toContainText('状态待更新');await expect(page.locator('.companion-level')).toHaveText('Lv.12345')
 await page.evaluate(async()=>{const {petInfo}=await import('/packages/pet_engine/index.ts' as string),{usePetStore}=await import('/src/stores/pet.ts' as string);petInfo.water={...petInfo.water,name:'玄冥与长名字测试伙伴'};usePetStore().choose('water');const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await page.setViewportSize({width:320,height:1100});await expect(page.locator('.companion-name')).toHaveText('玄冥与长名字测试伙伴');await expect(page.locator('.home-companion-lite')).toHaveClass(/companion-stacked/);await inspect(page);await expect(page.locator('.home-companion-lite')).not.toContainText(/undefined|null/);expect(await database(page)).toEqual(before)
})
