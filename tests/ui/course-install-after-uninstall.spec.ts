import {test,expect,type Page} from '@playwright/test'
import {unlockParent,answerParentGate} from './helpers'

const TITLE='合成测试教材 · 3 词'
const row=(page:Page)=>page.locator('.course-item').filter({hasText:TITLE}).first()
/** 原内置教材已裁剪：用「随包提供」的合成课程保持同一路径（安装/卸载守卫与生产一致）。 */
async function seedBundledCourse(page:Page){
 await page.addInitScript(()=>{if(!localStorage.getItem('wordpal.test.synthetic-course'))localStorage.setItem('wordpal.test.synthetic-course','1')})
}

async function uninstall(page:Page){
 await row(page).getByRole('button',{name:'卸载',exact:true}).click()
 const sheet=page.locator('.sheet-panel')
 await expect(sheet).toContainText(`卸载《${TITLE}`)
 await sheet.getByRole('textbox',{name:'卸载确认文字'}).fill('卸载')
 await sheet.getByRole('button',{name:'确认卸载',exact:true}).click()
 await expect(page.locator('.sheet-panel')).toHaveCount(0)
}

test('明确卸载后立即隐藏且重启不复活，主动重新安装成功才恢复',async({page})=>{
 await seedBundledCourse(page);await unlockParent(page);await expect(row(page)).toContainText('已安装')
 for(let round=0;round<2;round++){
  await uninstall(page);await expect(row(page)).toHaveCount(0);await page.reload();await answerParentGate(page);await page.getByRole('button',{name:'教材与数据工具',exact:true}).click();await expect(row(page)).toHaveCount(0)
  await page.evaluate(async()=>{const service=await import('/src/services/content/StorageRepository.ts' as string);service.enableBundledCourse('synthetic-classroom')})
  await expect(row(page)).toContainText('已安装')
 }
})

test('从未安装的正常发现教材仍提供可用安装按钮',async({page})=>{
 await seedBundledCourse(page)
 await page.addInitScript(()=>{if(!localStorage.getItem('wordpal.content.installation.v1'))localStorage.setItem('wordpal.content.installation.v1',JSON.stringify({'synthetic-classroom':'notInstalled'}))})
 await unlockParent(page);await expect(row(page)).toContainText('未安装');const install=row(page).getByRole('button',{name:'安装',exact:true});await expect(install).toBeEnabled();await install.click();await expect(row(page)).toContainText('已安装');await expect(row(page).getByRole('button',{name:'设为当前课程',exact:true})).toBeVisible()
})
