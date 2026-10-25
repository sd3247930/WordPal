import {test,expect} from '@playwright/test'
import {database,unlockParent} from './helpers'

test('五档高清图标完整加载，整行选择保存且重新进入恢复',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await unlockParent(page,false)
 const group=page.getByRole('radiogroup',{name:'学习等级'})
 await expect(group.getByRole('radio')).toHaveCount(5)
 await expect.poll(()=>group.locator('.learning-level-image img').evaluateAll(nodes=>nodes.every(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth===256&&node.naturalHeight===256))).toBe(true)
 const before=await database(page)
 for(const [level,count] of [[1,5],[2,5],[3,10],[4,15],[5,20]]){
  const row=group.getByRole('radio',{name:new RegExp(`L${level}`)})
  await row.click({position:{x:42,y:40}})
  await expect(row).toHaveAttribute('aria-checked','true')
  await expect(page.locator('.level-effective')).toContainText(`每批${count}词`)
  expect((await database(page)).abilityLevel).toBe(`L${level}`)
 }
 await page.reload();await unlockParent(page,false)
 await expect(page.getByRole('radio',{name:/L5/})).toHaveAttribute('aria-checked','true')
 const after=await database(page)
 expect(after.cards).toEqual(before.cards);expect(after.history).toEqual(before.history);expect(after.pets).toEqual(before.pets)
})

test('图标加载失败时保留等级占位与选择功能',async({page})=>{
 await page.route('**/parent-settings/level2.png',route=>route.abort())
 await unlockParent(page,false)
 const row=page.getByRole('radio',{name:/L2/})
 await expect(row.locator('.learning-level-fallback')).toHaveText('L2')
 await row.click();await expect(row).toHaveAttribute('aria-checked','true')
 expect((await database(page)).abilityLevel).toBe('L2')
})
