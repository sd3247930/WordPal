import {flushStudyInput} from './helpers'
import {test,expect} from '@playwright/test'
import {go,app,setAppearance,seedDatabase,database,openCustomPractice,openCourseGallery} from './helpers'
import {goldenDatabase} from './fixtures'
const destinations=[['home','首页'],['learn','学习'],['pet','宠物屋'],['review','单词本'],['settings','设置']]

test('五枚友好图标真实切换页面，选中语义准确且完整学习档案保持',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seedDatabase(page,goldenDatabase());await go(page,'home');const before=await database(page)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const [screen,label]of destinations){
  const nav=page.getByRole('navigation',{name:'底部导航',exact:true})
  await nav.getByRole('button',{name:label,exact:true}).click();await expect(page).toHaveURL(new RegExp(`/pages/${screen}/index`))
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);await expect(nav.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-current','page')
  await expect(nav.locator('.bottom-label')).toHaveText(destinations.map(([,name])=>name))
  for(const image of await nav.locator('.wp-nav-icon img').all()){await expect(image).toHaveJSProperty('complete',true);await expect(image).toHaveJSProperty('naturalWidth',1024);await expect(image).toHaveJSProperty('naturalHeight',1024);await expect(image).toHaveAttribute('src',/\/hd-/)}
  const beforeAgain=await database(page);await nav.getByRole('button',{name:label,exact:true}).click();expect(await database(page)).toEqual(beforeAgain)
 }
 expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})

for(const mode of ['light','dark'])for(const highContrast of [false,true])test(`${mode} 对比增强=${highContrast} 底栏字体、五等分、安全留白和窗口切换`,async({page})=>{
 await setAppearance(page,'swiss',mode,{highContrast,largeText:true,reducedMotion:true});await seedDatabase(page,goldenDatabase())
 for(const width of [320,390,599,600,840]){
  await page.setViewportSize({width,height:900});await go(page,'settings');const nav=page.locator('.bottom-nav')
  if(width>=600){await expect(nav).toBeHidden();await expect(page.locator('.sidebar')).toBeVisible();continue}
  await expect(nav).toBeVisible();await expect(app(page)).toHaveAttribute('data-mode',mode)
  const metrics=await nav.locator('.bottom-item').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect(),label=item.querySelector('.bottom-label')!,icon=item.querySelector('.wp-nav-icon')!,copy=label.getBoundingClientRect(),i=icon.getBoundingClientRect(),frame=item.querySelector('.nav-icon-container')!.getBoundingClientRect();return {width:r.width,height:r.height,labelSize:parseFloat(getComputedStyle(label).fontSize),labelHeight:copy.height,labelOverflow:label.scrollWidth>item.clientWidth,iconWidth:i.width,square:Math.abs(i.width-i.height)<.1,inside:i.left>=frame.left&&i.right<=frame.right&&i.top>=frame.top&&i.bottom<=frame.bottom,separated:i.bottom<=copy.top,frameInside:frame.left>=r.left&&frame.right<=r.right&&frame.top>=r.top&&copy.bottom<=r.bottom}}))
  expect(Math.max(...metrics.map(m=>m.width))-Math.min(...metrics.map(m=>m.width))).toBeLessThan(1)
  expect(metrics.every(m=>m.height>=56&&m.labelSize>=15&&m.labelSize<=18&&!m.labelOverflow&&m.iconWidth===40&&m.square&&m.inside&&m.separated&&m.frameInside)).toBe(true)
  for(const image of await nav.locator('.wp-nav-icon img').all()){await expect(image).toHaveJSProperty('naturalWidth',highContrast?256:1024);await expect(image).toHaveJSProperty('naturalHeight',highContrast?256:1024)}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const box=(await nav.boundingBox())!;expect(box.x).toBeGreaterThan(0);expect(box.y+box.height).toBeLessThan(900)
  await expect(nav.locator('.bottom-item.active .nav-icon-container')).toHaveCSS('transform','none')
  await nav.getByRole('button',{name:'首页',exact:true}).focus();await expect(nav.getByRole('button',{name:'首页',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('.home-grid')).toBeVisible()
  if(width===390)await page.screenshot({path:test.info().outputPath(`friendly-${mode}-${highContrast?'contrast':'normal'}.png`),fullPage:false})
 }
})

test('常规字体适度增大，课程页隐藏底栏，刷新与横竖屏不丢失学习草稿',async({page})=>{
 await page.setViewportSize({width:390,height:844});await go(page,'learn')
 await expect(page.locator('.bottom-label').first()).toHaveCSS('font-size','15px')
 await page.getByRole('button',{name:'开始今日学习',exact:true}).click();await openCustomPractice(page);await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click();await page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true}).fill('ca');await flushStudyInput(page)
 const before=await database(page);await page.locator('.bottom-nav').getByRole('button',{name:'设置',exact:true}).click();await page.locator('.bottom-nav').getByRole('button',{name:'学习',exact:true}).click()
 for(const size of [{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(size);await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toHaveValue('ca')}
 await page.reload();await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toHaveValue('ca');expect(await database(page)).toEqual(before)
 await openCourseGallery(page);await expect(page.locator('.bottom-nav')).toHaveCount(0);await expect(page.locator('.wp-app')).toHaveCSS('--wp-bottom-nav-space','0px')
})

test('高清图标异常时使用本地备用图，全部图片失败仍可切换五个入口',async({page})=>{
 await page.route('**/static/icons/nav/hd-*.png',route=>route.abort());await page.setViewportSize({width:390,height:844});await seedDatabase(page,goldenDatabase());await go(page,'home');const before=await database(page)
 for(const icon of await page.locator('.bottom-nav .wp-nav-icon img').all()){await expect(icon).toHaveJSProperty('naturalWidth',96);await expect(icon).toHaveAttribute('src',/friendly-light-/)}
 await page.route('**/static/icons/nav/*.png',route=>route.abort());await page.reload();await expect(page.locator('.bottom-nav .wp-nav-icon-fallback')).toHaveCount(5)
 for(const [screen,label]of destinations){await page.locator('.bottom-nav').getByRole('button',{name:label,exact:true}).click();await expect(page).toHaveURL(new RegExp(`/pages/${screen}/index`));await expect(page.locator('.bottom-nav .wp-nav-icon-fallback')).toHaveCount(5)}
 expect(await database(page)).toEqual(before)
})
