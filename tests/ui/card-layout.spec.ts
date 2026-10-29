import {test,expect,type Page} from '@playwright/test'
import {go,seedDatabase,database,setAppearance} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements,petInfo} from '../../packages/pet_engine'
async function growth(page:Page){await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:'成长',exact:true}).click()}
async function stages(page:Page){
 for(const image of await page.locator('.pet-growth-panel .pet-cutout-image img').all())await expect(image).toHaveJSProperty('naturalWidth',960)
 const metrics=await page.locator('.pet-growth-panel .pet-form-card').evaluateAll(items=>items.map(el=>{
  const r=el.getBoundingClientRect(),frame=el.querySelector('.pet-form-art')!.getBoundingClientRect(),image=el.querySelector('.pet-cutout-image')!.getBoundingClientRect(),copy=el.querySelector('.pet-form-copy')!.getBoundingClientRect(),title=el.querySelector('.pet-form-title')!.getBoundingClientRect(),status=el.querySelector('.pet-form-status')!.getBoundingClientRect(),scale=image.width/frame.width
  // The old box was 172px (200px on wide screens); aspectFit may be width-limited.
  const oldHeight=innerWidth>=1100?200:172,oldWidth=r.width-20
  const oldContained=Math.min(oldWidth*scale/960,oldHeight*scale/1280)*1280,newContained=Math.min(image.width/960,image.height/1280)*1280
  return {h:r.height,overflow:el.scrollWidth>el.clientWidth+1,inside:frame.left>=r.left-.2&&frame.right<=r.right+.2&&frame.top>=r.top-.2&&frame.bottom<=r.bottom+.2&&copy.left>=r.left-.2&&copy.right<=r.right+.2&&status.bottom<=r.bottom+.2,separate:frame.bottom<=copy.top+.2||frame.right<=copy.left+.2,titleVisible:title.width>0&&title.height>0,ratio:frame.width/frame.height,oldContained,newContained}
 }))
 expect(metrics.every(m=>!m.overflow&&m.inside&&m.separate&&m.titleVisible&&m.h>=48&&Math.abs(m.ratio-.75)<.01&&m.newContained>=m.oldContained-1)).toBe(true)
 expect(Math.max(...metrics.map(m=>m.h))-Math.min(...metrics.map(m=>m.h))).toBeLessThan(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 return metrics
}
const cardAppearanceVariants:Record<string,boolean>[]=[{},{largeText:true},{highContrast:true}]
for(const mode of ['light','dark'])for(const extra of cardAppearanceVariants)test('成长卡片完整、可见角色不缩小与四主题 '+mode+' '+JSON.stringify(extra),async({page})=>{
 await seedDatabase(page,goldenDatabase());await setAppearance(page,'swiss',mode,extra);await go(page,'pet');await growth(page);const before=await database(page)
 for(const width of [320,390,600,768,834,1000,1280]){await page.setViewportSize({width,height:950});await stages(page)}
 await page.setViewportSize({width:390,height:950})
 for(const e of elements){await page.getByRole('button',{name:'选择'+petInfo[e].name,exact:true}).click();await growth(page);await stages(page);await expect(page.locator('.lh-stage')).toHaveAttribute('data-element',e)}
 await page.getByRole('button',{name:'选择'+petInfo[before.companion as keyof typeof petInfo].name,exact:true}).click();await growth(page);expect(await database(page)).toEqual(before)
 const locked=page.locator('.pet-growth-panel .pet-form-card').nth(3);await expect(locked).toBeDisabled();await expect(locked.locator('.pet-form-veil')).toBeVisible();await expect(locked.locator('.pet-form-lock')).toBeVisible()
 await page.locator('.pet-growth-panel .pet-form-gallery').screenshot({path:test.info().outputPath('growth-'+mode+'-'+(extra.largeText?'large':extra.highContrast?'contrast':'normal')+'.png')})
})
test('五页卡片布局、设置入口和教材词卡操作保留，浏览不改档案',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'home');const before=await database(page)
 for(const width of [320,390,834,1280]){
  await page.setViewportSize({width,height:950})
  for(const screen of ['home','learn','pet','review','settings']){
   await go(page,screen)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   const cards=await page.locator('.main-content .wp-card:visible').evaluateAll(items=>items.map(el=>({overflow:el.scrollWidth>el.clientWidth+1,height:el.getBoundingClientRect().height})));expect(cards.every(c=>!c.overflow&&c.height>0)).toBe(true)
  }
 }
 await page.setViewportSize({width:390,height:950});await go(page,'home');expect((await page.locator('.home-data').boundingBox())!.height).toBeLessThan(250)
 await go(page,'settings');await expect(page.getByRole('button',{name:'家长设置',exact:true})).toBeEnabled();const targets=await page.locator('.preference-row').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().height));expect(targets.every(h=>h>=56)).toBe(true)
 await expect(page.locator('.settings-pet,.settings-summary')).toHaveCount(0);await page.getByRole('navigation',{name:'底部导航'}).getByRole('button',{name:'宠物屋',exact:true}).click();await expect(page.locator('.pet-house')).toBeVisible()
 await go(page,'review');await page.getByRole('button',{name:/^查看教材全部单词 ·/}).click();await expect(page.locator('.course-word-row').first()).toBeVisible()
 for(const width of [320,390,834,1280]){await page.setViewportSize({width,height:950});const rows=await page.locator('.course-word-row').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect(),open=el.querySelector('.course-word-content')!.getBoundingClientRect(),tools=el.querySelector('.course-word-tools')!.getBoundingClientRect();return {overflow:el.scrollWidth>el.clientWidth+1,separate:open.right<=tools.left+.2||open.bottom<=tools.top+.2,inside:tools.right<=r.right+.2&&tools.bottom<=r.bottom+.2}}));expect(rows.every(r=>!r.overflow&&r.separate&&r.inside)).toBe(true)}
 await page.setViewportSize({width:390,height:950});await page.locator('.course-word-open').first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'关闭单词详情',exact:true}).click();expect(await database(page)).toEqual(before)
})
test('200%字体压力下阶段卡片由内容撑高且按钮、说明完整',async({page})=>{
 await seedDatabase(page,goldenDatabase());await setAppearance(page,'swiss','dark',{largeText:true});await go(page,'pet');await growth(page);await page.setViewportSize({width:320,height:700})
 await page.addStyleTag({content:'.pet-form-title{font-size:32px!important}.pet-form-requirement,.pet-form-progress-label{font-size:24px!important}.pet-form-status{font-size:26px!important}'})
 await stages(page);await page.locator('.pet-growth-panel .pet-form-gallery').screenshot({path:test.info().outputPath('growth-font-stress.png')})
})
