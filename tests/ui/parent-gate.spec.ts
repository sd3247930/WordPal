import {test,expect} from '@playwright/test'
import {go,database,answerParentGate,setAppearance,waitForArtwork} from './helpers'
function key(text:string){const [a,b]=text.match(/\d+/g)!.map(Number);return `${Math.min(a,b)}x${Math.max(a,b)}`}
test('普通设置入口连续进入20次：新题、范围、无相邻重复、正确可开、返回重新锁定，档案不变',async({page})=>{
 test.setTimeout(90000);await go(page,'settings');const before=await database(page);let previous=''
 for(let i=0;i<20;i++){
  await page.getByRole('button',{name:'家长设置',exact:true}).click()
  const question=page.locator('.parent-math-question');await expect(question).toBeVisible();const text=await question.innerText(),numbers=text.match(/\d+/g)!.map(Number)
  expect(numbers.every(n=>n>=1&&n<=9)).toBe(true);expect(key(text)).not.toBe(previous);previous=key(text)
  await expect(page.getByRole('spinbutton',{name:'家长验证答案'})).toHaveValue('');await expect(page.getByRole('button',{name:'验证并打开',exact:true})).toBeDisabled();await expect(page.locator('.parent-learning-settings,.course-management,.learning-backup-panel')).toHaveCount(0)
  await answerParentGate(page);await expect(page.locator('.parent-gate-message')).toContainText('回答正确');await page.getByRole('button',{name:'教材与数据工具',exact:true}).click();await expect(page.getByRole('button',{name:'删除本设备学习数据',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'设置',exact:true}).click()
 }
 expect(await database(page)).toEqual(before)
})
test('错误保留题与答案，三次错误换题清空，数字最长两位、回车提交',async({page})=>{
 await go(page,'parent');const question=page.locator('.parent-math-question'),first=await question.innerText(),input=page.getByRole('spinbutton',{name:'家长验证答案'}),button=page.getByRole('button',{name:'验证并打开',exact:true})
 await input.fill('0');for(let i=0;i<2;i++){await button.click();await expect(page.locator('.parent-gate-message')).toContainText('答案不正确');await expect(question).toHaveText(first);await expect(input).toHaveValue('0');await expect(page.locator('.parent-learning-settings')).toHaveCount(0)}
 await button.click();await expect(page.locator('.parent-gate-message')).toContainText('已为你换一道题');expect(key(await question.innerText())).not.toBe(key(first));await expect(input).toHaveValue('');await expect(button).toBeDisabled()
 await input.evaluate((node:HTMLInputElement)=>{node.value='123';node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:'123'}))});await expect(input).toHaveValue('12');const numbers=(await question.innerText()).match(/\d+/g)!.map(Number);await input.fill(String(numbers[0]*numbers[1]));await input.press('Enter');await expect(page.locator('.parent-learning-settings')).toBeVisible()
})
test('直达、伪造存储解锁、重载、历史返回及缓存导航均重验；短暂后台同一访问保留',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.parent-gate.unlocked','true'));await go(page,'parent');await expect(page.locator('.parent-gate')).toBeVisible();await answerParentGate(page)
 await page.reload();await expect(page.locator('.parent-gate')).toBeVisible();await answerParentGate(page)
 await page.evaluate(()=>{(window as any).uni.$emit('onAppHide');(window as any).uni.$emit('onAppShow')});await expect(page.locator('.parent-learning-settings')).toBeVisible()
 await page.evaluate(()=>{(window as any).uni.navigateTo({url:'/pages/settings/index'})});await expect(page.getByRole('button',{name:'家长设置',exact:true})).toBeVisible();await expect(page.locator('.parent-gate')).toHaveCount(0)
 await page.evaluate(()=>{(window as any).uni.navigateBack({delta:1})});await expect(page.locator('.parent-gate')).toBeVisible();await expect(page.locator('.parent-learning-settings')).toHaveCount(0)
})
test('锁定和离开页面后直接调用设置Store均拒绝写入；没有持久化解锁/答案/次数',async({page})=>{
 await go(page,'parent');const before=await database(page)
 const save=()=>page.evaluate(async()=>{const path='/src/stores/parent-settings.ts';const {useParentSettingsStore}=await import(/* @vite-ignore */path);return useParentSettingsStore().save({dailyNewWordLimit:20})})
 expect(await save()).toBe(false);expect(await database(page)).toEqual(before)
 await answerParentGate(page);await page.evaluate(()=>{(window as any).uni.navigateTo({url:'/pages/settings/index'})});expect(await save()).toBe(false);expect(await database(page)).toEqual(before)
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('wordpal.parent-gate.')))).toEqual(['wordpal.parent-gate.last-question.v1'])
})
for(const theme of ['swiss'])test(`${theme}验证页窄屏、大字、深浅主题、高对比无溢出且触控不缩小`,async({page})=>{
 await setAppearance(page,theme,theme==='oled'?'dark':'light',{largeText:true,highContrast:true});await page.setViewportSize({width:320,height:720});await go(page,'parent')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('.parent-math-question')).toHaveAttribute('aria-label',/请回答：\d 乘以 \d 等于多少/)
 const height=await page.locator('.parent-answer').evaluate(e=>e.getBoundingClientRect().height);expect(height).toBeGreaterThanOrEqual(56)
 const buttons=await page.locator('.parent-gate [role=button]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));expect(Math.min(...buttons)).toBeGreaterThanOrEqual(48)
})
test('手动换题清空错误及输入，焦点与输入不换题，错误后仍可正常验证',async({page})=>{
 await go(page,'parent');const before=await database(page),input=page.getByRole('spinbutton',{name:'家长验证答案'}),submit=page.getByRole('button',{name:'验证并打开',exact:true}),question=page.locator('.parent-math-question')
 for(let i=0;i<8;i++){
  const previous=await question.innerText();await input.focus();await input.fill('0');await expect(question).toHaveText(previous);await submit.click();await expect(page.locator('.parent-gate-message')).toContainText('答案不正确')
  await page.getByRole('button',{name:'换一题',exact:true}).click();expect(key(await question.innerText())).not.toBe(key(previous));await expect(input).toHaveValue('');await expect(submit).toBeDisabled();await expect(page.locator('.parent-gate-message')).not.toContainText('答案不正确');await expect(page.locator('.parent-learning-settings')).toHaveCount(0)
 }
 await answerParentGate(page);expect(await database(page)).toEqual(before)
})
test('非法数字输入不能按删符号方式通过验证；缺图时仍可换题、验证和返回',async({page})=>{
 await page.route('**/static/icons/parent-gate/*.png',route=>route.abort());await go(page,'parent');const before=await database(page),input=page.getByRole('spinbutton',{name:'家长验证答案'}),submit=page.getByRole('button',{name:'验证并打开',exact:true})
 for(const value of ['-1','1.0','1e1']){
  await input.evaluate((node:HTMLInputElement,value)=>{node.value=value;node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:value}))},value)
  await expect(submit).toBeDisabled();await expect(page.locator('.parent-learning-settings')).toHaveCount(0)
 }
 await page.getByRole('button',{name:'换一题',exact:true}).click();await expect(page.locator('.parent-gate-artwork')).toHaveCount(0);await answerParentGate(page);await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.getByRole('button',{name:'家长设置',exact:true})).toBeVisible();expect(await database(page)).toEqual(before)
})
for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`紧凑验证页 ${theme}/${mode} 右侧护盾、响应式及200%字号`,async({page})=>{
 test.setTimeout(60000);await setAppearance(page,theme,mode,{reducedMotion:true});await go(page,'parent');const before=await database(page)
 await expect(page.locator('.parent-heading .page-title')).toHaveText('家长验证');await expect(page.locator('.parent-page')).not.toContainText('GROW AT');await expect(page.locator('.parent-page')).not.toContainText('没有广告');await expect(page.locator('.parent-grid,.parent-course-stack,.pet-companion-card')).toHaveCount(0)
 await page.getByRole('spinbutton',{name:'家长验证答案'}).fill('12');await page.getByRole('spinbutton',{name:'家长验证答案'}).blur()
 for(const width of [320,359,390,430,600,768,1024,1280]){
  await page.setViewportSize({width,height:width===1024?600:844});await waitForArtwork(page)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const geo=await page.locator('.parent-page').evaluate(root=>{const copy=root.querySelector('.parent-heading-copy')!.getBoundingClientRect(),art=root.querySelector('.parent-heading>.parent-gate-artwork')!.getBoundingClientRect(),input=root.querySelector('.parent-answer')!.getBoundingClientRect(),submit=root.querySelector('.parent-verify-submit')!.getBoundingClientRect(),nav=document.querySelector('.bottom-nav')!.getBoundingClientRect();return {gap:art.left-copy.right,center:Math.abs(copy.top+copy.height/2-art.top-art.height/2),inputHeight:input.height,submitBottom:submit.bottom,navTop:nav.top}})
  expect(geo.gap).toBeGreaterThanOrEqual(11);expect(geo.center).toBeLessThanOrEqual(1);expect(geo.inputHeight).toBeGreaterThanOrEqual(56);if(width<=430)expect(geo.submitBottom).toBeLessThanOrEqual(geo.navTop)
  const answer=await page.locator('.parent-answer input').evaluate(input=>{const field=input.getBoundingClientRect(),frame=input.closest('.parent-answer-wrap')!.getBoundingClientRect(),style=getComputedStyle(input),question=getComputedStyle(document.querySelector('.parent-math-question')!);return {align:style.textAlign,center:Math.abs(field.left+field.width/2-frame.left-frame.width/2),fontRatio:parseFloat(style.fontSize)/parseFloat(question.fontSize)}})
  expect(answer.align).toBe('center');expect(answer.center).toBeLessThanOrEqual(1);expect(answer.fontRatio).toBeCloseTo(28/34,2)
  for(const image of await page.locator('.parent-gate-artwork img').all()){const heading=(await image.locator('..').locator('..').getAttribute('data-parent-artwork'))==='heading';await expect(image).toHaveJSProperty('naturalWidth',heading?512:256)}
  if(width===390||width===1280)await page.screenshot({path:test.info().outputPath('parent-'+width+'.png'),fullPage:true})
 }
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await page.setViewportSize({width:320,height:720});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.getByRole('button',{name:'返回设置',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('parent-200-percent.png'),fullPage:true});expect(await database(page)).toEqual(before)
})
