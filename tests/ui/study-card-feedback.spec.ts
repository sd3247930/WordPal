import {test,expect,type Page,type Locator} from '@playwright/test'
import {go,database,setAppearance,openCustomPractice} from './helpers'

async function press(page:Page,tile:Locator){
 await tile.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest'}));const rect=(await tile.boundingBox())!,point={x:rect.x+rect.width/2,y:rect.y+rect.height/2}
 expect(await tile.evaluate((node,point)=>node.contains(document.elementFromPoint(point.x,point.y)),point)).toBe(true)
 await page.mouse.move(point.x,point.y);await page.mouse.down()
}
async function cancelPress(page:Page){await page.mouse.move(1,1);await page.mouse.up()}
const appearance=(tile:Locator)=>tile.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,transform:s.transform,shadow:s.boxShadow}})

for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`学习卡片 ${theme}/${mode} 按下高亮、取消不执行，减少动效保留颜色反馈`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,mode,{reducedMotion:false});await go(page,'learn');const before=await database(page)
 for(const selector of ['.study-stat-action','.activity-tile:not([disabled])']){
  const tile=page.locator(selector).first(),idle=await appearance(tile);await press(page,tile)
  await expect.poll(async()=>(await appearance(tile)).background).not.toBe(idle.background);await expect.poll(async()=>(await appearance(tile)).transform).not.toBe('none')
  await cancelPress(page);await expect.poll(async()=>(await appearance(tile)).transform).toBe('none')
 }
 expect(await database(page)).toEqual(before);await expect(page.locator('.activity-workspace,.study-today-details')).toHaveCount(0)
 const today=page.locator('.study-stat-action').first();await today.click();await expect(page.locator('.study-today-details')).toBeVisible();await expect(page.locator('.study-stat-card').first()).toHaveClass(/is-highlighted/);expect(await database(page)).toEqual(before)
 await go(page,'settings');await page.getByRole('switch',{name:'减少动效',exact:true}).click();await expect(page.getByRole('switch',{name:'减少动效',exact:true})).toHaveAttribute('aria-checked','true');await go(page,'learn');const tile=page.locator('.study-stat-action').first(),idle=await appearance(tile);await press(page,tile);await expect.poll(async()=>(await appearance(tile)).background).not.toBe(idle.background);expect((await appearance(tile)).transform).toBe('none');await cancelPress(page)
})

test('题型和答案卡按压反馈不改变原有选择、取消及提交逻辑',async({page})=>{
 await setAppearance(page,'clay','light',{reducedMotion:false});await go(page,'learn');await openCustomPractice(page);const connect=page.locator('.study-mode-tile[data-mode="connect"]');await connect.click();const before=await database(page),answer=page.locator('.answer-choice').first(),idle=await appearance(answer)
 await press(page,answer);await expect.poll(async()=>(await appearance(answer)).background).not.toBe(idle.background);await cancelPress(page);expect(await database(page)).toEqual(before)
 await answer.click();await expect(answer).toHaveAttribute('aria-pressed','true');await answer.click();await expect(answer).toHaveAttribute('aria-pressed','false');const after=await database(page);for(const field of ['cards','history','gems','pets','rewardIds'])expect(after[field]).toEqual(before[field])
})
