import {chromium} from '@playwright/test'
import {writeFileSync,mkdirSync} from 'node:fs'
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN',timezoneId:'Asia/Dubai'})
const start=performance.now();await page.goto('http://localhost:4173');await page.locator('.hero-cta').waitFor();const home=performance.now()-start
await page.locator('.hero-cta').click();await page.locator('.mode-button').first().waitFor();await page.locator('.answer-actions .wp-button').click();await page.locator('.rating-grid .wp-button').nth(2).click();await page.locator('.answer-feedback').waitFor()
const switching=performance.now();await page.locator('.answer-feedback .wp-button').click();await page.locator('.word').filter({hasText:'dog'}).waitFor();const word=performance.now()-switching
await page.goto('http://localhost:4173/#/pages/settings/index');await page.locator('.appearance-theme').waitFor();const themeStart=performance.now();await page.getByRole('group',{name:'明暗模式',exact:true}).getByRole('button',{name:'深色',exact:true}).click();await page.locator('.wp-app[data-mode="dark"]').waitFor();const theme=performance.now()-themeStart
mkdirSync('private/verification',{recursive:true});const measurements={environment:'Desktop Chromium headless, production Web build; not device certification',homeInteractiveMs:Math.round(home),wordSwitchWithAutomationMs:Math.round(word),themeSwitchWithAutomationMs:Math.round(theme)}
writeFileSync('private/verification/web-performance.json',JSON.stringify(measurements,null,2)+'\n');console.log(measurements);await browser.close()
