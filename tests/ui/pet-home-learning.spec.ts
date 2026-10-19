import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,seedDatabase,database,openCustomPractice,completeDaily} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
const home=(page:Page)=>page.getByRole('group',{name:'家园学习任务',exact:true})
const practice=(page:Page)=>home(page).getByRole('button',{name:'试一试拼写或听写',exact:true})
const together=(page:Page)=>home(page).getByRole('button',{name:'一起去学习 →',exact:true})

test('两项统计读取正式记录，真实提交第5次后更新且每日奖励不重复',async({page})=>{
 test.setTimeout(90000);const db=freshDatabase(),at=new Date().toISOString();db.abilityLevel='L1';db.history=Array.from({length:4},(_,i)=>({id:'home-ui-'+i,wordId:'dog',rating:3,correct:true,at,source:'new_word',mode:'flash',input:''}));await seedDatabase(page,db);await go(page,'pet');const before=await database(page)
 await expect(home(page).locator('[data-task="practice"]')).toContainText('今日 3 / 3');await expect(home(page).locator('[data-task="complete"]')).toContainText('今日 4 / 5');await expect(home(page).getByRole('progressbar',{name:'完成学习今日进度',exact:true})).toHaveAttribute('aria-valuenow','80');expect(await database(page)).toEqual(before)
 await together(page).click();await page.getByRole('button',{name:'开始今日学习',exact:true}).click();await completeDaily(page);const after=await database(page);expect(after.history.length).toBe(8);expect(after.pets.water.exp).toBe(58)
 await page.getByRole('button',{name:'宠物屋',exact:true}).click();await expect(home(page).locator('[data-task="complete"]')).toContainText('今日 5 / 5');await expect(home(page).locator('[data-task="complete"]')).toContainText('已获 10 经验');await expect(practice(page)).toContainText('今日已尝试');await expect(home(page).getByRole('progressbar',{name:'完成学习今日进度',exact:true})).toHaveAttribute('aria-valuenow','100')
 await page.reload();await expect(home(page).locator('[data-task="complete"]')).toContainText('今日 5 / 5');expect(await database(page)).toEqual(after)
})

test('家园前台跨日自动清零今日展示，保留历史与学习档案',async({page})=>{
 await page.clock.install({time:new Date('2026-10-16T19:59:50Z')});const db=freshDatabase();db.history=Array.from({length:5},(_,i)=>({id:'home-day-'+i,wordId:'cat',rating:3,correct:true,at:'2026-10-16T19:55:00Z',source:'new_word',mode:i===4?'spell':'flash',input:''}));db.rewardIds=['daily-task:2026-10-16'];await seedDatabase(page,db);await go(page,'pet');const before=await database(page);await expect(home(page).locator('[data-task="complete"]')).toContainText('今日 5 / 5');await page.clock.fastForward(40000);await expect(home(page).locator('[data-task="practice"]')).toContainText('今日 0 / 3');await expect(home(page).locator('[data-task="complete"]')).toContainText('今日 0 / 5');await expect(practice(page)).not.toContainText('今日已尝试');expect(await database(page)).toEqual(before)
})

test('两个真实学习入口保留原教材、题目、草稿和排程，展开请求只消费一次',async({page})=>{
 await go(page,'home');await page.getByRole('button',{name:'去学习拼写练习',exact:true}).click();await openCustomPractice(page);await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click();await page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true}).fill('ca');const before=await database(page);await page.getByRole('button',{name:'宠物屋',exact:true}).click();await practice(page).click();await expect(page.getByRole('button',{name:/^自定义练习 ·/})).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toHaveValue('ca');await expect(page.locator('.study-practice-entry')).toBeVisible();expect(await database(page)).toEqual(before)
 await page.getByRole('button',{name:'宠物屋',exact:true}).click();await together(page).focus();await page.keyboard.press('Enter');await expect(page.locator('.study-practice-entry')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toHaveValue('ca');expect(await database(page)).toEqual(before)
})

test('无会话时进入学习后按教材开始，L4可使用拼写与听写且不改SRS或奖励',async({page})=>{
 const db=freshDatabase();db.abilityLevel='L4';await seedDatabase(page,db);await go(page,'pet');const before=await database(page);await practice(page).focus();await page.keyboard.press('Space');await expect(page.locator('.study-practice-entry')).toContainText('开始自定义练习');expect(await database(page)).toEqual(before);await page.getByRole('button',{name:'开始自定义练习',exact:true}).click();const selector=page.getByRole('group',{name:'选择学习方式'});await expect(selector).toBeVisible();await selector.getByRole('button',{name:/^拼写，/}).click();await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toBeVisible();await selector.getByRole('button',{name:/^听写，/}).click();await expect(page.getByRole('textbox',{name:'输入听到的英文单词',exact:true})).toBeVisible();const after=await database(page);expect(after.session.wordIds[0]).toBe('cat');expect(after.session.mode).toBe('dictation');for(const field of ['cards','history','gems','rewardIds'])expect(after[field]).toEqual(before[field])
})

test('拼写听写入口尊重L1能力限制，不强改家长设置或当前学习方式',async({page})=>{
 const db=freshDatabase();db.abilityLevel='L1';await seedDatabase(page,db);await go(page,'pet');await practice(page).click();await page.getByRole('button',{name:'开始自定义练习',exact:true}).click();const selector=page.getByRole('group',{name:'选择学习方式'});await expect(selector.getByRole('button',{name:/^拼写，/})).toBeDisabled();await expect(selector.getByRole('button',{name:/^听写，/})).toBeDisabled();await expect(page.locator('.study-practice-entry')).toContainText('当前能力起点尚未开放');const result=await database(page);expect(result.session.mode).toBe('flash');expect(result.abilityLevel).toBe('L1');expect(result.history).toEqual([])
})

for(const sound of [true,false])test(`练习入口声音=${sound} 准确区分L3能力限制和L4声音限制`,async({page})=>{
 const db=freshDatabase();db.abilityLevel=sound?'L3':'L4';await seedDatabase(page,db);await page.addInitScript(sound=>localStorage.setItem('wordpal.feedback.v1',JSON.stringify({sound,haptics:false})),sound);await go(page,'pet');await practice(page).click();await page.getByRole('button',{name:'开始自定义练习',exact:true}).click();const selector=page.getByRole('group',{name:'选择学习方式'});await expect(selector.getByRole('button',{name:/^拼写，/})).toBeEnabled();await expect(selector.getByRole('button',{name:/^听写，/})).toBeDisabled();await expect(page.locator('.study-practice-entry')).toContainText(sound?'听写会随能力起点开放':'听写需要可用发音并开启声音');expect((await database(page)).history).toEqual([])
})

for(const mode of ['light','dark'])for(const preference of ['normal','large','contrast'])test(`${mode} ${preference} 家园四图标与任务卡在手机平板完整展示`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText:preference!=='normal',highContrast:preference==='contrast',reducedMotion:true});await go(page,'pet');const before=await database(page),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const widths=[320,390,768,840,1200,1280],scenes=['水之主题','火之主题','土之主题','风之主题']
 for(let i=0;i<widths.length;i++){
  const width=widths[i];await page.setViewportSize({width,height:1000});await page.getByRole('button',{name:scenes[i%4],exact:true}).click();await expect(home(page).locator('.pet-home-learning-card')).toHaveCount(4)
  const images=home(page).locator('.pet-home-learning-symbol img');await expect(images).toHaveCount(4);const sources:string[]=[];for(const image of await images.all()){await expect(image).toHaveJSProperty('complete',true);expect(await image.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBe(preference==='contrast'?288:512);const src=(await image.getAttribute('src'))!;sources.push(src);expect(src).toContain(preference==='contrast'?mode+'-contrast-':'hd-')};expect(new Set(sources).size).toBe(4)
  const boxes=await home(page).locator('.pet-home-learning-card').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect(),label=item.querySelector('.pet-home-learning-title')!,icon=item.querySelector('.pet-home-learning-symbol')!;return {y:r.y,width:r.width,height:r.height,overflow:item.scrollWidth>item.clientWidth+1,titleSize:parseFloat(getComputedStyle(label).fontSize),iconWidth:icon.getBoundingClientRect().width,iconHeight:icon.getBoundingClientRect().height,inside:Array.from(item.children).every(child=>{const c=child.getBoundingClientRect();return c.left>=r.left-.1&&c.right<=r.right+.1&&c.top>=r.top-.1&&c.bottom<=r.bottom+.1})}}))
  expect(boxes.every(b=>b.height>=232&&!b.overflow&&b.titleSize>=16&&b.iconWidth===72&&b.iconHeight===72&&b.inside),JSON.stringify({width,boxes})).toBe(true);expect(new Set(boxes.map(b=>Math.round(b.y))).size).toBe(width>=1200?1:2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,1280].includes(width))await home(page).screenshot({path:test.info().outputPath(`pet-home-learning-${mode}-${preference}-${width}.png`)})
 }
 expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})
