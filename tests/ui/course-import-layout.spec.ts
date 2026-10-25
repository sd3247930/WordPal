import {test,expect} from '@playwright/test'
import {unlockParent,setAppearance,database} from './helpers'
for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`精简导入与课程卡片 ${theme}/${mode} 保留检查和撤销确认`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,mode);await unlockParent(page)
 const form=page.locator('.course-import-form'),before=await database(page)
 for(const name of ['导入课程 ID','导入课程名称','导入内容版本','课程来源说明'])await expect(form.getByRole('textbox',{name,exact:true})).toHaveCount(0)
 for(const label of ['课程路线','起点能力'])await expect(form.getByRole('group',{name:label})).toHaveCount(0)
 await expect(page.locator('.course-item').first()).toContainText('已完整学完')
 await expect(form.locator('.course-mapping')).toHaveCount(0)
 await form.getByRole('textbox',{name:'课程 JSON 或 CSV 文本'}).fill('word,meaning\ncomet,彗星\norbit,轨道')
 await form.getByRole('button',{name:'检查课程内容',exact:true}).click()
 await expect(form.getByRole('button',{name:'确认导入课程',exact:true})).toBeDisabled()
 const consent=form.locator('.course-check').first();await consent.click();await expect(consent).toHaveAttribute('aria-pressed','true');await consent.click();await expect(consent).toHaveAttribute('aria-pressed','false');await consent.click()
 await form.getByRole('button',{name:'检查课程内容',exact:true}).click();await expect(form.getByRole('button',{name:'确认导入课程',exact:true})).toBeEnabled()
 for(const width of [320,390,844]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
 await page.setViewportSize({width:390,height:844});await form.scrollIntoViewIfNeeded();await page.screenshot({path:`.tmp/import-${theme}-${mode}.png`,fullPage:true})
 const after=await database(page);for(const key of ['cards','history','gems','pets','rewardIds'] as const)expect(after[key]).toEqual(before[key])
})
