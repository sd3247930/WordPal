import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database,openPetAction} from './helpers'
import {goldenDatabase} from './fixtures'
const actions=[['家园','pet-home-panel'],['喂食','pet-feed-panel'],['成长','pet-growth-panel'],['装扮','pet-dress-panel'],['相册','pet-album-panel']]
const menu=(page:import('@playwright/test').Page)=>page.getByRole('group',{name:'宠物屋功能',exact:true})

test('五项图标切换真实面板，重复点击与键盘操作正确，学习和伙伴档案不变',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 await expect(menu(page).locator('.pet-action-label')).toHaveText(actions.map(([name])=>name))
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const [name,panel]of actions){
  const button=menu(page).getByRole('button',{name,exact:true});await openPetAction(page,name);await expect(page.locator('.'+panel)).toBeVisible();await expect(button).toHaveAttribute('aria-pressed','true');await expect(menu(page).locator('[aria-pressed="true"]')).toHaveCount(1)
  await button.locator('img').click();await expect(page.locator('.'+panel)).toHaveCount(0);await expect(button).toHaveAttribute('aria-pressed','false');expect(await database(page)).toEqual(before)
 }
 await menu(page).getByRole('button',{name:'家园',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('.pet-home-panel')).toBeVisible()
 await menu(page).getByRole('button',{name:'成长',exact:true}).focus();await page.keyboard.press('Space');await expect(page.locator('.pet-growth-panel')).toBeVisible();expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})

test('五项入口配合场景主题保留预览、取消与原来的真实成长和相册状态',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 await page.getByRole('button',{name:'土之主题',exact:true}).click();await openPetAction(page,'喂食');await page.locator('.food-choice').nth(1).click();await expect(page.getByRole('region',{name:'分享预览'})).toBeVisible();expect(await database(page)).toEqual(before)
 await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('.feed-preview')).toHaveCount(0)
 await menu(page).getByRole('button',{name:'成长',exact:true}).click();await expect(page.locator('.pet-growth-panel')).toContainText('累计经验')
 await menu(page).getByRole('button',{name:'装扮',exact:true}).click();await expect(page.locator('.cosmetic-button')).toHaveCount(3)
 await menu(page).getByRole('button',{name:'相册',exact:true}).click();await expect(page.locator('.pet-album-entry')).toHaveCount(4);await expect(page.locator('.pet-album-panel')).toContainText('阶段解锁图鉴')
 expect(await database(page)).toEqual(before)
})

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字=${largeText} 五项导航整齐等宽、高清、无溢出并保留宽屏侧栏`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText,highContrast:largeText,reducedMotion:true});await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 for(const width of [320,390,768,840,1280]){
  await page.setViewportSize({width,height:1000});await expect(menu(page).locator('.pet-action-tab')).toHaveCount(5)
  for(const image of await menu(page).locator('.pet-action-symbol img').all()){await expect(image).toHaveJSProperty('complete',true);await expect(image).toHaveJSProperty('naturalWidth',largeText?256:1024);await expect(image).toHaveJSProperty('naturalHeight',largeText?256:1024);await expect(image).toHaveAttribute('src',largeText?/contrast-/:/hd-/)}
  const boxes=await menu(page).locator('.pet-action-tab').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect(),label=item.querySelector('.pet-action-label')!,image=item.querySelector('.pet-action-symbol')!,art=image.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:item.scrollWidth>item.clientWidth+1,labelOverflow:label.scrollWidth>item.clientWidth-4,labelSize:parseFloat(getComputedStyle(label).fontSize),iconWidth:art.width,iconHeight:art.height,inside:art.left>=r.left&&art.right<=r.right&&art.top>=r.top&&art.bottom<=r.bottom}}))
  expect(boxes.every(b=>b.height>=56&&!b.overflow&&!b.labelOverflow&&b.labelSize>=16&&b.iconWidth>=36&&b.iconWidth<=48&&Math.abs(b.iconWidth-b.iconHeight)<.1&&b.inside)).toBe(true)
  expect(Math.max(...boxes.map(b=>b.width))-Math.min(...boxes.map(b=>b.width))).toBeLessThan(1)
  expect(new Set(boxes.map(b=>Math.round(b.y))).size).toBe(width<840?1:5)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,840].includes(width))await menu(page).screenshot({path:test.info().outputPath(`pet-actions-${mode}-${largeText?'large':'normal'}-${width}.png`)})
 }
 expect(await database(page)).toEqual(before)
})
test('高清文件加载失败时使用本地回退，全部资源失败时仍保留五项可读可点入口',async({page})=>{
 await page.route('**/static/icons/pet-actions/hd-*.png',route=>route.abort());await page.setViewportSize({width:390,height:950});await go(page,'pet')
 for(const image of await menu(page).locator('img').all()){await expect(image).toHaveJSProperty('naturalWidth',144);await expect(image).toHaveAttribute('src',/light-normal-/)}
 await page.route('**/static/icons/pet-actions/*.png',route=>route.abort());await page.reload();await expect(menu(page).locator('.pet-action-fallback')).toHaveCount(5)
 for(const [name,panel]of actions){await openPetAction(page,name);await expect(page.locator('.'+panel)).toBeVisible()}
})
