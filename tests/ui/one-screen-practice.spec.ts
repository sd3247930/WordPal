import {test,expect,type Page} from '@playwright/test'
import {seedSpellingPractice} from '../helpers/spelling-practice'
import {go,setAppearance,database,waitForArtwork,openCustomPractice} from './helpers'
import type {LearningMode} from '../../packages/core_learning'
const modes=['flash','connect','listen','spell','dictation'] as LearningMode[]
const confirm=(page:Page)=>page.getByRole('button',{name:'确认答案 →',exact:true})
async function firstScreen(page:Page,mode:LearningMode){
 const target=mode==='flash'?page.getByRole('button',{name:'开始自评',exact:true}):confirm(page)
 const bounds=await target.boundingBox(),nav=await page.locator('.bottom-nav').boundingBox()
 expect(bounds!.y).toBeGreaterThan(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual((nav?.y??page.viewportSize()!.height)+1)
 expect(await page.evaluate(()=>scrollY)).toBe(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 const entry=page.locator('.study-session-heading .study-practice-entry-button'),meta=page.locator('.study-session-meta')
 const entryBox=await entry.boundingBox(),metaBox=await meta.boundingBox();expect(entryBox!.height).toBeGreaterThanOrEqual(48);expect(metaBox!.y-entryBox!.y-entryBox!.height).toBeGreaterThanOrEqual(5)
 const padding=await entry.evaluate(node=>{const style=getComputedStyle(node);return {inline:parseFloat(style.paddingLeft),block:parseFloat(style.paddingTop)}});expect(padding.inline).toBeLessThanOrEqual(8);expect(padding.block).toBeLessThanOrEqual(4)
 const icon=entry.locator('.custom-practice-entry-icon'),label=entry.locator('.custom-practice-entry-label');await expect(icon.locator('img')).toHaveJSProperty('naturalWidth',256);const iconBox=await icon.boundingBox(),labelBox=await label.boundingBox();expect(iconBox!.x+iconBox!.width).toBeLessThanOrEqual(labelBox!.x);expect(labelBox!.x+labelBox!.width).toBeLessThanOrEqual(entryBox!.x+entryBox!.width)
}
for(const width of [360,375,414,430])for(const mode of ['flash','listen','spell','dictation'] as LearningMode[])test(`常见手机五模式首屏 ${width} ${mode}`,async({page})=>{
 await page.setViewportSize({width,height:844});await setAppearance(page,'clay','light');await seedSpellingPractice(page,mode);await go(page,'learn');await firstScreen(page,mode)
})
for(const theme of ['swiss','clay'])for(const mode of modes)test(`顶部唯一入口和标准手机首屏 ${theme} ${mode}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,'light');await seedSpellingPractice(page,mode);await go(page,'learn')
 await expect(page.locator('.study-practice-entry-button:visible')).toHaveCount(1)
 const header=await page.locator('.study-session-heading').boundingBox(),card=await page.locator('.word-info-card').boundingBox();expect(header!.y+header!.height).toBeLessThan(card!.y)
 await firstScreen(page,mode)
 if(['connect','listen'].includes(mode)){const choices=await page.locator('.answer-choice').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,h:r.height,w:r.width}}));expect(choices).toHaveLength(4);expect(choices[0].y).toBe(choices[1].y);expect(choices[2].y).toBeGreaterThan(choices[0].y);expect(choices.every(r=>r.h>=48)).toBe(true)}
 await waitForArtwork(page);await page.screenshot({path:test.info().outputPath(`${theme}-${mode}-after.png`),fullPage:true})
 const before=await database(page);await page.locator('.study-practice-entry-button').click();await expect(page.locator('[data-custom-screen="config"]')).toBeVisible();await page.getByRole('button',{name:'返回学习或暂停自定义练习',exact:true}).click();await expect(page.locator('.study-session-heading')).toBeVisible();const after=await database(page);for(const field of ['session','cards','history','pets','gems'])expect(after[field]).toEqual(before[field])
})
for(const width of [320,360,375,414,430,768,1024,1280])test(`安全区及图像完整显示 ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width>=1024?800:844});await setAppearance(page,'clay','light');await seedSpellingPractice(page,'connect','doctor','医生，大夫',.35);await go(page,'learn')
 const picture=page.locator('.word-picture');await expect(picture.locator('div').first()).toHaveCSS('background-size','contain');await expect(page.locator('.word-picture-extension')).toHaveCount(0)
 const stage=await page.locator('.word-picture-stage').boundingBox(),bounds=await picture.boundingBox();expect(bounds).toEqual(stage);expect(stage!.height).toBeGreaterThanOrEqual(160)
 await firstScreen(page,'connect');await page.screenshot({path:test.info().outputPath(`screen-${width}.png`),fullPage:true})
})
test('长选项与大字自然展开，不隐藏词义或遮挡可达提交',async({page})=>{
 await page.setViewportSize({width:320,height:700});await setAppearance(page,'clay','light');await seedSpellingPractice(page,'connect','doctor','医生，大夫；负责诊疗、照顾患者并提供健康指导的专业人员');await go(page,'learn');await expect(page.locator('.study-choice-options')).toHaveClass(/long-choices/);await expect(page.locator('.meaning')).toHaveCount(0)
 const boxes=await page.locator('.answer-choice').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().x));expect(new Set(boxes).size).toBe(1)
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await confirm(page).scrollIntoViewIfNeeded();const box=await confirm(page).boundingBox(),nav=await page.locator('.bottom-nav').boundingBox();expect(box!.y+box!.height).toBeLessThan(nav!.y+1)
})
test('切换与恢复自动编排清除输入，保留当前词序、成绩及奖励',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell');await go(page,'learn');await page.locator('.letter-tile').first().click();await openCustomPractice(page);const before=await database(page);await page.locator('[data-mode="dictation"]').click();await expect(page.locator('.block-slot.filled')).toHaveCount(0);await expect(page.locator('.meaning,.ipa,.word-picture-stage')).toHaveCount(0);await page.getByRole('button',{name:'恢复自动编排',exact:true}).click();const after=await database(page);expect(after.session.index).toBe(before.session.index);for(const key of ['history','cards','pets','gems'])expect(after[key]).toEqual(before[key])
})
test('旧题播放失败回调不会覆盖新模式，连续重播仍然有效',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'flash');await go(page,'learn')
 await page.evaluate(async()=>{const {PhonicsPlaybackController}=await import('/src/services/audio/PhonicsPlaybackController.ts' as string);const original=PhonicsPlaybackController.prototype.play;let first=true;PhonicsPlaybackController.prototype.play=function(...args:any[]){if(first){first=false;return new Promise((_,reject)=>{(window as any).oldAudioReject=reject})}return original.apply(this,args)}})
 await page.locator('.practice-audio').click();await openCustomPractice(page);await page.locator('[data-mode="listen"]').click();await page.evaluate(()=>(window as any).oldAudioReject(new Error('过期题目播放错误')));await expect(page.getByRole('alert')).toHaveCount(0)
 for(const count of [1,2,5]){for(let i=0;i<count;i++)await page.locator('.practice-audio').evaluate(n=>(n as HTMLElement).click());await expect(page.locator('.practice-audio')).toHaveAttribute('data-audio-state','playing')}
 expect((await database(page)).practiceAnswers||[]).toHaveLength(0)
})
test('图片失败后可重试，恢复原图且不改变学习或答题记录',async({page})=>{
 await page.setViewportSize({width:320,height:700});await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell');await go(page,'learn');const before=await database(page)
 await page.locator('.word-picture').dispatchEvent('error');const retry=page.getByRole('button',{name:'重新加载词条图片',exact:true});await expect(retry).toBeVisible();expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(48);await retry.click();await expect(page.locator('.word-picture img')).toHaveJSProperty('naturalHeight',600);await expect(page.locator('.word-picture-fallback')).toHaveCount(0);expect(await database(page)).toEqual(before)
})
