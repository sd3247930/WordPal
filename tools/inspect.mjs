import {chromium} from '@playwright/test'
import {mkdirSync} from 'node:fs'
mkdirSync('private/screenshots',{recursive:true})
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'})
const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='warning'||msg.type()==='error')errors.push(msg.text())})
await page.goto(process.argv[2]||'http://localhost:5173');await page.waitForLoadState('networkidle');await page.screenshot({path:'private/screenshots/initial-desktop.png',fullPage:true})
console.log(JSON.stringify({title:await page.title(),text:(await page.locator('body').innerText()).slice(0,500),errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)},null,2))
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'private/screenshots/initial-mobile.png',fullPage:true});await browser.close()
