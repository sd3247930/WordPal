import {test,expect} from '@playwright/test'
import {go,setAppearance,database} from './helpers'

for(const mode of ['light','dark'])for(const appearance of ['normal','large','contrast'])test(`${mode} ${appearance} 教材粘土图标高清、字号适中，手机两列与宽屏四列无裁切`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText:appearance!=='normal',highContrast:appearance==='contrast',reducedMotion:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await go(page,'course');const before=await database(page)
 await expect(page.locator('.gallery-tool-title')).toHaveText(['返回学习','已安装','查找教材','逐册卸载'])
 for(const width of [320,390,768,1000,1280]){
  await page.setViewportSize({width,height:1000})
  const images=page.locator('.course-tool-symbol img');await expect(images).toHaveCount(4)
  const sources:string[]=[]
  for(const image of await images.all()){
   await expect(image).toHaveJSProperty('complete',true);await expect(image).toHaveJSProperty('naturalWidth',appearance==='contrast'?256:1024);await expect(image).toHaveJSProperty('naturalHeight',appearance==='contrast'?256:1024)
   const src=(await image.getAttribute('src'))!;sources.push(src);expect(src).toMatch(appearance==='contrast'?/contrast-/:/\/hd-/)
  }
  expect(new Set(sources).size).toBe(4)
  const boxes=await page.locator('.gallery-tool').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect(),label=item.querySelector('.gallery-tool-title')!,note=item.querySelector('.gallery-tool-note')!,icon=item.querySelector('.course-tool-symbol')!,i=icon.getBoundingClientRect(),badge=item.querySelector('.gallery-tool-badge')!.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:item.scrollWidth>item.clientWidth+1,labelSize:parseFloat(getComputedStyle(label).fontSize),noteSize:parseFloat(getComputedStyle(note).fontSize),iconWidth:i.width,square:Math.abs(i.width-i.height)<.1,noOverlap:i.right<=badge.left+.1&&i.bottom<=label.getBoundingClientRect().top,contents:[label,note,icon].map(el=>{const rect=el.getBoundingClientRect();return rect.left>=r.left&&rect.right<=r.right&&rect.top>=r.top&&rect.bottom<=r.bottom})}}))
  expect(boxes.every(b=>b.height>=156&&!b.overflow&&b.labelSize>=18&&b.noteSize>=13&&b.iconWidth===64&&b.square&&b.noOverlap&&b.contents.every(Boolean))).toBe(true)
  expect(Math.max(...boxes.map(b=>b.width))-Math.min(...boxes.map(b=>b.width))).toBeLessThan(1)
  expect(new Set(boxes.map(b=>Math.round(b.y))).size).toBe(width>=1000?1:2)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,1280].includes(width))await page.locator('.gallery-tools').screenshot({path:test.info().outputPath(`course-tools-${mode}-${appearance}-${width}.png`)})
 }
 expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})

test('高清资源异常时依次使用本地备用图和文字，搜索返回及禁用状态仍正常',async({page})=>{
 await page.route('**/static/icons/course-tools/hd-*.png',route=>route.abort());await page.setViewportSize({width:390,height:844});await go(page,'course');const before=await database(page)
 for(const icon of await page.locator('.course-tool-symbol img').all()){await expect(icon).toHaveJSProperty('naturalWidth',168);await expect(icon).toHaveAttribute('src',/light-normal-/)}
 await page.route('**/static/icons/course-tools/*.png',route=>route.abort());await page.reload();await expect(page.locator('.course-tool-symbol-fallback')).toHaveCount(4)
 const tools=page.getByRole('group',{name:'教材选择功能',exact:true});await expect(tools.getByRole('button',{name:'逐册卸载',exact:true})).toBeDisabled();await tools.getByRole('button',{name:'查找教材',exact:true}).click();await expect(page.getByRole('searchbox',{name:'搜索教材',exact:true})).toBeFocused();await tools.getByRole('button',{name:'已安装',exact:true}).click();await expect(tools.getByRole('button',{name:'已安装',exact:true})).toHaveAttribute('aria-pressed','true');await tools.getByRole('button',{name:'返回学习',exact:true}).click();await expect(page.locator('.current-course-card')).toBeVisible();expect(await database(page)).toEqual(before)
})
