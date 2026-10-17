import {test,expect,type Page} from '@playwright/test'
import {go,seedDatabase,database,setAppearance} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements,petInfo} from '../../packages/pet_engine'
const status=(page:Page,id:string)=>page.locator('.pet-status-card[data-status="'+id+'"]')
async function checkLayout(page:Page,contrast=false){
 await expect(page.locator('.pet-status-card')).toHaveCount(4)
 for(const image of await page.locator('.pet-status-symbol img').all()){await expect(image).toHaveJSProperty('naturalWidth',contrast?256:1024);await expect(image).toHaveJSProperty('naturalHeight',contrast?256:1024)}
 const result=await page.locator('.pet-status-card').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect(),icon=el.querySelector('.pet-status-symbol')!.getBoundingClientRect(),bar=el.querySelector('.wp-pastel-progress')!.getBoundingClientRect(),value=el.querySelector('.pet-status-value')!.getBoundingClientRect(),note=el.querySelector('.pet-status-note')!.getBoundingClientRect();return{overflow:el.scrollWidth>el.clientWidth+1,square:Math.abs(icon.width-icon.height)<.1,inside:icon.left>=r.left&&icon.right<=r.right+.1&&icon.top>=r.top&&note.bottom<=r.bottom+.1,barInside:bar.left>=r.left&&bar.right<=r.right+.1,noOverlap:icon.bottom<=value.top+.1&&value.bottom<=bar.top+.1&&bar.bottom<=note.top+.1,font:parseFloat(getComputedStyle(el.querySelector('.pet-status-label')!).fontSize)}}))
 expect(result.every(x=>!x.overflow&&x.square&&x.inside&&x.barInside&&x.noOverlap&&x.font>=17)).toBe(true)
 expect(await page.locator('.pet-status-metrics').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
}
test('四项读取当前精灵的真实状态，查看说明与刷新不增加奖励',async({page})=>{
 await page.setViewportSize({width:390,height:950});await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 for(const e of elements){await page.locator('.pet-choice').filter({hasText:petInfo[e].name}).click();const db=await database(page)
  await expect(status(page,'experience').locator('.pet-status-value')).toHaveText((db.pets[e].exp%100)+' / 100');await expect(status(page,'affection').locator('.pet-status-value')).toHaveText(db.pets[e].affection+' / 100')
  for(const id of ['excitement','happiness']){await expect(status(page,id).locator('.wp-pastel-progress')).toHaveAttribute('data-empty','true');expect(await status(page,id).locator('.wp-pastel-progress').getAttribute('aria-valuenow')).toBeNull()}
  for(const [id,label] of [['excitement','兴奋'],['happiness','开心'],['experience','经验'],['affection','亲密度']]){await status(page,id).click();await expect(page.getByRole('region',{name:label+'指标说明',exact:true})).toBeVisible();await page.getByRole('button',{name:'收起状态说明',exact:true}).click()}
 }
 await page.locator('.pet-choice').filter({hasText:'玄冥'}).click();expect(await database(page)).toEqual(before);await page.reload();await expect(status(page,'experience').locator('.pet-status-value')).toHaveText('40 / 100');expect(await database(page)).toEqual(before)
 await status(page,'affection').focus();await page.keyboard.press('Enter');await expect(page.getByRole('region',{name:'亲密度指标说明',exact:true})).toBeVisible();expect(await database(page)).toEqual(before)
})
test('喂食仍消耗5灵石且只增加亲密度一次，状态立即刷新',async({page})=>{
 await page.setViewportSize({width:390,height:950});await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 await page.locator('.current-pet-actions').getByRole('button',{name:'喂一喂',exact:true}).click();await page.getByRole('button',{name:'预览分享小点心',exact:true}).click();await page.getByRole('button',{name:'确认分享 · 5 灵石',exact:true}).click()
 const after=await database(page);expect(after.gems).toBe(before.gems-5);expect(after.pets.water.affection).toBe(before.pets.water.affection+5);expect(after.pets.water.exp).toBe(before.pets.water.exp);expect(after.history).toEqual(before.history);expect(after.cards).toEqual(before.cards);expect(after.session).toEqual(before.session)
 await expect(status(page,'affection').locator('.pet-status-value')).toHaveText('41 / 100');await expect(status(page,'happiness').locator('.pet-status-value')).toHaveText('开心中');await expect(page.getByRole('button',{name:'✓ 今天已分享',exact:true})).toBeDisabled();await page.reload();expect(await database(page)).toEqual(after)
 await page.locator('.current-pet-actions').getByRole('button',{name:'去成长',exact:true}).click();await expect(page.locator('.pet-growth-dashboard')).toBeVisible()
})
for(const mode of ['light','dark'])for(const preferences of ['normal','large','contrast'])test('布局与渐变 '+mode+' '+preferences,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText:preferences==='large',highContrast:preferences==='contrast'});await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 for(const width of [320,390,768,1000,1280]){await page.setViewportSize({width,height:950});await checkLayout(page,preferences==='contrast')}
 for(const e of elements){await page.locator('.pet-theme-choice').filter({hasText:({water:'水之主题',fire:'火之主题',earth:'土之主题',wind:'风之主题'})[e]}).click();await checkLayout(page,preferences==='contrast')}
 const fills=await page.locator('.pet-status-card .pastel-progress-fill').evaluateAll(items=>items.map(el=>getComputedStyle(el).backgroundImage));expect(fills.every(fill=>preferences==='contrast'?fill==='none':fill.includes('linear-gradient'))).toBe(true)
 expect(await database(page)).toEqual(before);await page.locator('.pet-status-metrics').screenshot({path:test.info().outputPath('status-'+mode+'-'+preferences+'.png')})
})
test('进度零与满值、离线查看、减少动效、加载失败回退均安全',async({page})=>{
 const db=goldenDatabase();db.pets.water.exp=100;db.pets.water.level=2;db.pets.water.affection=100
 await setAppearance(page,'swiss','light',{reducedMotion:true});await seedDatabase(page,db);await page.route('**/static/icons/pet-status/*.png',route=>route.abort());await go(page,'pet');const before=await database(page)
 await expect(page.locator('.pet-status-icon-fallback')).toHaveCount(4);await expect(status(page,'experience').getByRole('progressbar')).toHaveAttribute('aria-valuenow','0');await expect(status(page,'affection').getByRole('progressbar')).toHaveAttribute('aria-valuenow','100')
 expect(await status(page,'experience').locator('.pastel-progress-fill').evaluate(el=>el.getBoundingClientRect().width)).toBe(0)
 const full=await status(page,'affection').locator('.wp-pastel-progress').evaluate(el=>({fill:el.firstElementChild!.getBoundingClientRect().width,track:el.clientWidth}));expect(Math.abs(full.fill-full.track)).toBeLessThan(1)
 await page.context().setOffline(true);await status(page,'experience').click();await expect(page.getByRole('region',{name:'经验指标说明',exact:true})).toContainText('累计经验为 100');expect(await database(page)).toEqual(before)
 expect(await status(page,'affection').locator('.pastel-progress-fill').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');await page.context().setOffline(false)
})
for(const dpr of [2,3])test('高清密度 '+dpr+' 倍与横屏、200%字体压力检查',async({browser})=>{
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:dpr}),page=await context.newPage()
 try{
  await setAppearance(page,'swiss','light',{largeText:true});await seedDatabase(page,goldenDatabase());await go(page,'pet');await checkLayout(page)
  await page.setViewportSize({width:852,height:393});await checkLayout(page)
  await page.addStyleTag({content:'.pet-status-label,.pet-status-value{font-size:34px!important}.pet-status-note{font-size:26px!important}'});await page.setViewportSize({width:320,height:700});await checkLayout(page)
  await page.locator('.pet-status-metrics').screenshot({path:test.info().outputPath('status-density-'+dpr+'.png')})
 }finally{await context.close()}
})
