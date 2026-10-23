import {expect,type Page} from '@playwright/test'
export const app=(page:Page)=>page.locator('.wp-app')
const pageSubtitles:Record<string,string>={home:'Home',learn:'Study',pet:'PetHouse',review:'Wordbook',settings:'Settings',parent:'Parents',achievements:'Achievements',course:'Textbooks'}
export const go=async(page:Page,screen:string)=>{
 await page.goto(`/#/pages/${screen}/index`,{waitUntil:'domcontentloaded'})
 await app(page).waitFor({state:'visible'})
 await expect(page.locator('.wp-brand-header .brand-subtitle')).toHaveText(pageSubtitles[screen])
 await expect(page.locator('.page-title').first()).toBeVisible()
}
export async function setAppearance(page:Page,themeId:string,colorMode:string,extra:Record<string,boolean>={}){
 await page.addInitScript(({themeId,colorMode,extra})=>{
   if(!localStorage.getItem('wordpal.appearance.v1'))localStorage.setItem('wordpal.appearance.v1',JSON.stringify({themeId,colorMode,reducedMotion:true,largeText:false,highContrast:false,screenReaderLabels:true,dynamicColor:false,...extra}))
 },{themeId,colorMode,extra})
}
export async function seedDatabase(page:Page,db:object){
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v1'))localStorage.setItem('wordpal.database.v1',JSON.stringify(db))},db)
}
export async function database(page:Page){return page.evaluate(()=>{const pointer=JSON.parse(localStorage.getItem('wordpal.database.active.v2')||'null'),key=pointer==='v2'?'wordpal.database.v2':pointer?.version===2?pointer.key:'wordpal.database.v1';return JSON.parse(localStorage.getItem(key)!)} )}
export async function selectCustomModes(page:Page,modes:readonly string[]){
 for(const mode of ['flash','connect','listen','spell','dictation']){const tile=page.locator(`.custom-config [data-mode="${mode}"]`);if((await tile.getAttribute('aria-pressed')==='true')!==modes.includes(mode))await tile.click()}
}
export async function selectWordbookScope(page:Page,scope:'当前教材'|'全部单词'|'只看已学'){
 const target=page.getByRole('group',{name:'单词本课程范围'}).getByRole('button',{name:scope==='当前教材'?'当前教材':'全部单词',exact:true});if(await target.getAttribute('aria-pressed')!=='true')await target.click()
 if(scope!=='当前教材'){const toggle=page.getByRole('button',{name:'只看已学',exact:true});if((await toggle.getAttribute('aria-pressed')==='true')!==(scope==='只看已学'))await toggle.click()}
}
/** Existing question-component regressions use the retained current-round tools. */
export async function openCustomPractice(page:Page){
 await page.locator('.study-modes,.study-ready').first().waitFor({state:'visible'})
 const current=page.locator('.study-round-tools'),toggle=page.locator('.study-practice-toggle')
 if(!await current.count()&&!await toggle.count()){const begin=page.getByRole('button',{name:'开始今日学习',exact:true});if(await begin.count())await begin.click()}
 if(await current.count()){await current.click();return}
 if(await toggle.count()){if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();return}
 await page.getByRole('button',{name:'自定义练习，不计今日任务',exact:true}).first().click()
}
export async function openExploration(page:Page){const button=page.getByRole('button',{name:'展开自然拼读与例句',exact:true});if(await button.count())await button.click()}
/** Required navigation actions may already be selected after returning to the pet page. */
export async function openPetAction(page:Page,name:string){const button=page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name,exact:true});if(await button.getAttribute('aria-pressed')!=='true')await button.click()}
/** Decode lazy artwork before a full-page screenshot, including below-fold icons. */
export async function waitForArtwork(page:Page){
 const original=await page.evaluate(()=>({x:scrollX,y:scrollY})),height=await page.evaluate(()=>document.documentElement.scrollHeight),step=await page.evaluate(()=>Math.max(200,innerHeight*.8))
 // uni-image may paint an off-screen background only after entering the viewport.
 for(let y=0;y<height;y+=step){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(60)}
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(async image=>{if(image instanceof HTMLImageElement){image.loading='eager';try{await image.decode()}catch{}}})))
 await expect.poll(()=>page.locator('img').evaluateAll(images=>images.filter(image=>image instanceof HTMLImageElement&&image.getAttribute('src')&&!image.naturalWidth).length),{message:'All screenshot artwork must load before accepting a baseline.'}).toBe(0)
 await page.evaluate(({x,y})=>scrollTo(x,y),original);await page.waitForTimeout(100)
}

export async function answerParentGate(page:Page){
 const question=await page.locator('.parent-math-question').innerText(),numbers=question.match(/\d+/g)!.map(Number)
 await page.getByRole('spinbutton',{name:'家长验证答案'}).fill(String(numbers[0]*numbers[1]))
 await page.getByRole('button',{name:'验证并打开',exact:true}).click()
 await expect(page.locator('.parent-learning-settings')).toBeVisible()
}
export async function unlockParent(page:Page){await go(page,'parent');await answerParentGate(page)}

/** Drive the visible six-step lesson with the fixture's expected answers. */
export async function completeDaily(page:Page){
 for(let guard=0;guard<121;guard++){
  const db=await database(page),plan=db.courseProgress[db.currentCourseId||'starter'].dailyPlan
  if(plan.completedAt)return
  const word=plan.wordSnapshot[plan.wordIds[plan.index]]
  if(!plan.answers[plan.index]){
   if(['connect','listen'].includes(plan.mode)){await page.locator('.answer-choice').filter({has:page.getByText(plan.mode==='connect'?word.meaning:word.word,{exact:true})}).first().click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click()}
   else if(['spell','dictation'].includes(plan.mode)){await page.locator('.spelling-input input').fill(word.word);await page.getByRole('button',{name:'确认答案 →',exact:true}).click()}
   else{if(!plan.revealed)await page.getByRole('button',{name:'开始自评',exact:true}).click();await page.locator('.rating-grid').getByRole('button').nth(2).click()}
  }
  if(plan.index<plan.wordIds.length-1)await page.locator('.answer-feedback').getByRole('button').click()
  else await expect.poll(async()=>{const next=(await database(page)).courseProgress[db.currentCourseId||'starter'].dailyPlan;return next.completedAt?'done':next.flow.step}).not.toBe(plan.flow.step)
 }
 throw Error('Daily UI flow exceeded six steps of 20 words')
}
