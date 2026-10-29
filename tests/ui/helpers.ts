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
/** Persist through the same public blur boundary used before navigation; no store hooks. */
export async function flushStudyInput(page:Page){const input=page.locator('.spelling-input input');if(await input.count())await input.evaluate((node:HTMLInputElement)=>node.blur());else if(await page.locator('[data-block-mode="tiles"]').count())await expect.poll(async()=>{const db=await database(page),progress=db.courseProgress?.[db.currentCourseId||'starter'];return(progress?.studyActivity==='daily'?progress.dailyPlan:db.session)?.letterDraft?.inputMode}).toBe('tiles')}
export async function previewSnack(page:Page,index=0){const designs=page.locator('.pet-feed-panel .lh-design-card');if(await designs.count()){await designs.nth(index).click();await page.getByRole('button',{name:'选这份点心 · 5 灵石',exact:true}).click()}else await page.locator('.food-choice').nth(index).click();await expect(page.locator('.feed-preview')).toBeVisible()}
export async function selectCustomModes(page:Page,modes:readonly string[]){
 for(const mode of ['flash','connect','listen','spell','dictation']){const tile=page.locator(`.custom-config [data-mode="${mode}"]`);if((await tile.getAttribute('aria-pressed')==='true')!==modes.includes(mode))await tile.click()}
}
export async function selectWordbookScope(page:Page,scope:'当前教材'|'全部单词'|'只看已学'){
 const target=page.getByRole('group',{name:'单词本课程范围'}).getByRole('button',{name:scope==='当前教材'?'当前教材':'全部单词',exact:true});if(await target.getAttribute('aria-pressed')!=='true')await target.click()
 if(scope!=='当前教材'){const toggle=page.getByRole('button',{name:'只看已学',exact:true});if((await toggle.getAttribute('aria-pressed')==='true')!==(scope==='只看已学'))await toggle.click()}
}
/** Set up an allowed independent session for legacy question-component regressions. */
export async function startIndependentStudy(page:Page,flashRevealed=false){
 await page.evaluate(async(flashRevealed)=>{
  const {useLearningStore}=await import('/src/stores/learning.ts' as string)
  const learning=useLearningStore()
  if(learning.isSessionLocked)throw new Error('A formal six-step session must finish before independent practice.')
  if(!learning.startPractice())throw new Error('Independent practice setup failed.')
  if(flashRevealed){learning.setMode('flash');learning.reveal()}
  await new Promise<void>((resolve,reject)=>uni.redirectTo({url:'/pages/learn/index',success:()=>resolve(),fail:reject}))
 },flashRevealed)
 await expect(page.locator('.wp-brand-header .brand-subtitle')).toHaveText('Study')
}
/** Existing question-component regressions use the retained independent-session tools. */
export async function openCustomPractice(page:Page){
 await page.locator('.study-modes,.study-ready').first().waitFor({state:'visible'})
 const current=page.locator('.study-round-tools'),toggle=page.locator('.study-practice-toggle')
 if(!await current.count()&&!await toggle.count())await startIndependentStudy(page)
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
 // uni-image appends its transparent img only after loading its painted background.
 // Waiting for existing img nodes alone can accept an empty, not-yet-loaded icon.
 await expect.poll(()=>page.locator('uni-image').evaluateAll(nodes=>nodes.filter(node=>{const rect=node.getBoundingClientRect();return rect.width>0&&rect.height>0&&getComputedStyle(node).visibility!=='hidden'&&(!node.querySelector('img')?.naturalWidth||!node.firstElementChild||getComputedStyle(node.firstElementChild).backgroundImage==='none')}).length),{message:'Every rendered uni-image must finish loading its painted artwork.'}).toBe(0)
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
export async function unlockParent(page:Page,tools=true){await go(page,'parent');await answerParentGate(page);if(tools){await page.getByRole('button',{name:'教材与数据工具',exact:true}).click();await page.getByRole('button',{name:'导入教材',exact:true}).first().click();await page.getByRole('button',{name:'展开备份与恢复',exact:true}).click();const available=page.getByRole('button',{name:/^其他可安装教材/});if(await available.count())await available.click()}}

/** Drive the visible six-step lesson with the fixture's expected answers. */
export async function completeDaily(page:Page){
 for(let guard=0;guard<121;guard++){
  const db=await database(page),plan=db.courseProgress[db.currentCourseId||'starter'].dailyPlan
  if(plan.completedAt)return
  const word=plan.wordSnapshot[plan.wordIds[plan.index]]
  if(!plan.answers[plan.index]){
   if(['listen','dictation'].includes(plan.mode)){const audio=page.getByRole('button',{name:'播放当前单词的标准发音',exact:true});await audio.click();await expect(audio).toHaveClass(/playing/);await expect(audio).not.toHaveClass(/playing/)}
   if(['connect','listen'].includes(plan.mode)){await page.locator('.answer-choice').filter({has:page.getByText(plan.mode==='connect'?word.meaning:word.word,{exact:true})}).first().click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click()}
   else if(['spell','dictation'].includes(plan.mode)){await page.locator('.spelling-input input').fill(word.word);await page.getByRole('button',{name:'确认答案 →',exact:true}).click()}
   else{if(!plan.revealed)await page.getByRole('button',{name:'开始自评',exact:true}).click();await page.locator('.rating-grid').getByRole('button').nth(2).click()}
  }
  if(plan.index<plan.wordIds.length-1)await page.locator('.answer-feedback').getByRole('button').click()
  else await expect.poll(async()=>{const next=(await database(page)).courseProgress[db.currentCourseId||'starter'].dailyPlan;return next.completedAt?'done':next.flow.step}).not.toBe(plan.flow.step)
 }
 throw Error('Daily UI flow exceeded six steps of 20 words')
}

/** Focused practice keeps contextual cards behind the explicit overview action. */
export async function openStudyOverview(page:Page){const button=page.getByRole('button',{name:'查看学习概览',exact:true});if(await button.count())await button.click()}
export async function openCourseGallery(page:Page){
 await openStudyOverview(page)
 const db=await database(page),plan=db.courseProgress?.[db.currentCourseId||'starter']?.dailyPlan
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 if(plan?.flow?.begunAt&&!plan.completedAt){await expect(page.locator('.uni-modal')).toContainText('本轮进度会保存');await page.locator('.uni-modal').getByText('保存并离开',{exact:true}).click()}
}
