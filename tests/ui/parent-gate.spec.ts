import {test,expect} from '@playwright/test'
import {go,database,answerParentGate,setAppearance} from './helpers'
function key(text:string){const [a,b]=text.match(/\d+/g)!.map(Number);return `${Math.min(a,b)}x${Math.max(a,b)}`}
test('普通设置入口连续进入20次：新题、范围、无相邻重复、正确可开、返回重新锁定，档案不变',async({page})=>{
 test.setTimeout(90000);await go(page,'settings');const before=await database(page);let previous=''
 for(let i=0;i<20;i++){
  await page.getByRole('button',{name:'家长设置',exact:true}).click()
  const question=page.locator('.parent-math-question');await expect(question).toBeVisible();const text=await question.innerText(),numbers=text.match(/\d+/g)!.map(Number)
  expect(numbers.every(n=>n>=1&&n<=9)).toBe(true);expect(key(text)).not.toBe(previous);previous=key(text)
  await expect(page.getByRole('spinbutton',{name:'家长验证答案'})).toHaveValue('');await expect(page.getByRole('button',{name:'验证并打开',exact:true})).toBeDisabled();await expect(page.locator('.parent-learning-settings,.course-management,.learning-backup-panel')).toHaveCount(0)
  await answerParentGate(page);await expect(page.locator('.parent-gate-message')).toContainText('回答正确');await expect(page.getByRole('button',{name:'删除本设备学习数据',exact:true})).toBeDisabled()
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
 await page.evaluate(()=>{(window as any).uni.navigateTo({url:'/pages/settings/index'})});await expect(page.locator('.parent-gate')).toHaveCount(0)
 await page.evaluate(()=>{(window as any).uni.navigateBack({delta:1})});await expect(page.locator('.parent-gate')).toBeVisible();await expect(page.locator('.parent-learning-settings')).toHaveCount(0)
})
test('锁定和离开页面后直接调用设置Store均拒绝写入；没有持久化解锁/答案/次数',async({page})=>{
 await go(page,'parent');const before=await database(page)
 const save=()=>page.evaluate(async()=>{const path='/src/stores/parent-settings.ts';const {useParentSettingsStore}=await import(/* @vite-ignore */path);return useParentSettingsStore().save({dailyNewWordLimit:20})})
 expect(await save()).toBe(false);expect(await database(page)).toEqual(before)
 await answerParentGate(page);await page.evaluate(()=>{(window as any).uni.navigateTo({url:'/pages/settings/index'})});expect(await save()).toBe(false);expect(await database(page)).toEqual(before)
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('wordpal.parent-gate.')))).toEqual(['wordpal.parent-gate.last-question.v1'])
})
for(const theme of ['bento','swiss','soft','oled'])test(`${theme}验证页窄屏、大字、深浅主题、高对比无溢出且触控不缩小`,async({page})=>{
 await setAppearance(page,theme,theme==='oled'?'dark':'light',{largeText:true,highContrast:true});await page.setViewportSize({width:320,height:720});await go(page,'parent')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('.parent-math-question')).toHaveAttribute('aria-label',/请回答：\d 乘以 \d 等于多少/)
 const height=await page.locator('.parent-answer').evaluate(e=>e.getBoundingClientRect().height);expect(height).toBeGreaterThanOrEqual(56)
 const buttons=await page.locator('.parent-gate [role=button]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));expect(Math.min(...buttons)).toBeGreaterThanOrEqual(48)
})
