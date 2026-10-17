import {test,expect,type Page} from '@playwright/test'
import {unlockParent} from './helpers'

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

test('卸载 bundled 课程后安装按钮可点击，连续两轮「卸载 → 安装」均成功',async({page})=>{
 await seedBundledCourse(page)
 await unlockParent(page)
 await expect(row(page)).toContainText('已安装')
 for(let round=1;round<=2;round++){
  await uninstall(page)
  await expect(row(page)).toContainText('未安装')
  const install=row(page).getByRole('button',{name:'安装',exact:true})
  await expect(install).toBeVisible()
  // 安装按钮不得以任何禁用形态出现：这是 app-plus 缺陷的回归守卫。
  await expect(install).toBeEnabled()
  await expect(install).not.toHaveAttribute('aria-disabled','true')
  await expect(install).not.toHaveAttribute('tabindex','-1')
  await expect(install).not.toHaveAttribute('aria-busy','true')
  await install.click()
  await expect(row(page)).toContainText('已安装',{timeout:10000})
  await expect(row(page)).not.toContainText('未安装')
  await expect(row(page).getByRole('button',{name:'设为当前课程',exact:true})).toBeVisible()
 }
})

test('未安装行不渲染禁用的「未安装」占位按钮，安装后入口随之切换',async({page})=>{
 await seedBundledCourse(page)
 await unlockParent(page)
 await uninstall(page)
 await expect(row(page).getByRole('button',{name:'未安装',exact:true})).toHaveCount(0)
 await expect(row(page).getByRole('button',{name:'设为当前课程',exact:true})).toHaveCount(0)
 await row(page).getByRole('button',{name:'安装',exact:true}).click()
 await expect(row(page)).toContainText('已安装',{timeout:10000})
 await expect(row(page).getByRole('button',{name:'安装',exact:true})).toHaveCount(0)
 await expect(row(page).getByRole('button',{name:'未安装',exact:true})).toHaveCount(0)
})
