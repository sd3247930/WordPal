import {test,expect,type Page} from '@playwright/test'
import {seedSpellingPractice} from '../helpers/spelling-practice'
import {go,database,setAppearance,openCustomPractice,waitForArtwork} from './helpers'
import {normalizeSpellingWord} from '../../packages/phonics/letter-blocks'

async function tile(page:Page,char:string){for(const candidate of await page.locator('.letter-tile').filter({hasText:new RegExp('^'+char+'$','i')}).all())if(await candidate.isEnabled())return candidate;throw Error('No unused tile: '+char)}
async function spell(page:Page,word:string){for(const unit of normalizeSpellingWord(word).slots)await(await tile(page,unit.char)).click()}
async function hear(page:Page){const button=page.getByRole('button',{name:'播放当前单词的标准发音',exact:true});await button.click();await expect(button).toHaveClass(/playing/);await expect(button).not.toHaveClass(/playing/)}
const confirm=(page:Page)=>page.getByRole('button',{name:'确认答案 →',exact:true})
const formal=(db:any)=>({history:db.history,cards:db.cards,courseProgress:db.courseProgress,gems:db.gems,pets:db.pets})

for(const [word,total,groups]of [['doctor',6,1],['food group',9,2],['a few',4,2],["that's enough",11,2],['Merry Christmas!',14,2],['be late for school',15,4],['well-known',9,2]] as const)test('积木拼写与原判题：'+word,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell',word,word==="that's enough"?'那就够了':'合成练习词义');await go(page,'learn');const before=formal(await database(page))
 await expect(page.locator('.letter-tile')).toHaveCount(normalizeSpellingWord(word).tiles.length);await expect(page.locator('.block-slot')).toHaveCount(total);await expect(page.locator('.block-word-group')).toHaveCount(groups);await expect(confirm(page)).toBeDisabled();await expect(page.locator('.word-core .word')).toHaveText('···')
 if(word.includes("'"))await expect(page.locator('.block-fixed')).toHaveText("'");if(word.endsWith('!'))await expect(page.locator('.block-fixed')).toHaveText('!')
 await spell(page,word);await expect(confirm(page)).toBeEnabled();await expect(page.locator('.answer-feedback')).toHaveCount(0);await confirm(page).evaluate(node=>{(node as HTMLElement).click();(node as HTMLElement).click()});await expect(page.locator('.answer-feedback')).toContainText('很棒');const after=await database(page);expect(after.practiceAnswers).toHaveLength(1);expect(after.practiceAnswers[0].inputAssistance).toBe('tiles');expect(after.practiceAnswers[0].hinted).toBe(true);expect(formal(after)).toEqual(before)
})

test('重复字母独立积木，点击任意槽退回、撤销与刷新原位恢复',async({page})=>{
 await setAppearance(page,'clay','dark');await seedSpellingPractice(page,'spell','letter');await go(page,'learn');const pool=await page.locator('.letter-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-tile-id'))),secondT=page.locator('.letter-tile[data-letter="t"]').nth(1),id=await secondT.getAttribute('data-tile-id');await secondT.click();await(await tile(page,'e')).click();await expect(page.locator('.block-slot.filled')).toHaveCount(2);await page.reload();await expect(page.locator('.block-slot.filled')).toHaveCount(2);expect(await page.locator('.letter-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-tile-id')))).toEqual(pool);await expect(page.locator(`[data-tile-id="${id}"]`)).toBeDisabled()
 await page.locator('.block-slot.filled').first().click();await expect(page.locator(`[data-tile-id="${id}"]`)).toBeEnabled();await expect(confirm(page)).toBeDisabled();await page.getByRole('button',{name:'退一格',exact:true}).click();await expect(page.locator('.block-slot.filled')).toHaveCount(0);expect((await database(page)).practiceAnswers||[]).toHaveLength(0)
})

test('听写字母池为空槽、固定符号可见，不提前显示完整答案和中文',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'dictation','Merry Christmas!','圣诞快乐');await go(page,'learn');await expect(page.locator('.block-slot')).toHaveCount(14);await expect(page.locator('.block-slot.filled')).toHaveCount(0);await expect(page.locator('.word-picture,.meaning,.ipa,.phonics-word,.word-placeholder')).toHaveCount(0);await expect(page.locator('.block-fixed')).toHaveText('!');await expect(page.locator('.letter-block-input')).not.toContainText('Merry Christmas');await expect(page.locator('.letter-block-input')).toContainText('字母积木辅助');await expect(page.locator('.listening-wave')).toBeVisible();await spell(page,'Merry Christmas!');await hear(page);await confirm(page).click();await expect(page.locator('.answer-feedback')).toContainText('很棒')
})

test('辅助后切键盘仍保留辅助证据，模式切换不带入字母或完整答案',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell','doctor');await go(page,'learn');await page.getByRole('button',{name:'键盘输入',exact:true}).click();await page.locator('.slot-native input').fill('doctor');await confirm(page).click();expect((await database(page)).practiceAnswers[0].inputAssistance).toBe('tiles')
})

test('长短语分组字母池完整拼装',async({page})=>{
 await page.setViewportSize({width:320,height:844});await setAppearance(page,'clay','light');const phrase='please remember the beautiful green garden';await seedSpellingPractice(page,'spell',phrase);await go(page,'learn');await expect(page.locator('.letter-block-input')).toContainText('长短语分组拼装');await expect(page.locator('.letter-tile')).toHaveCount(11);await spell(page,phrase);await expect(confirm(page)).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await confirm(page).click();await expect(page.locator('.answer-feedback')).toContainText('很棒')
})

test('特殊字符键盘回退不丢字符',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell','B2B');await go(page,'learn');await expect(page.locator('.slot-native input')).toBeVisible();await expect(page.locator('.letter-block-input')).toContainText('特殊字符');await expect(page.locator('.letter-tile')).toHaveCount(0);await page.locator('.slot-native input').fill('B2B');await confirm(page).click();await expect(page.locator('.answer-feedback')).toContainText('很棒')
})

test('奶油主题自定义五模式连续训练完成，积木草稿暂停刷新恢复且正式档案不变',async({page})=>{
 await setAppearance(page,'clay','light');await go(page,'learn');const before=formal(await database(page));await page.getByRole('button',{name:'自定义练习，不计今日任务',exact:true}).first().click();await page.locator('.custom-count-input input').fill('1');await page.getByRole('button',{name:'全选五项',exact:true}).click();await page.getByRole('button',{name:'开始连续训练',exact:true}).click();await page.getByRole('button',{name:'开始连续训练',exact:true}).click();const initial=(await database(page)).customPractice,word=initial.wordSnapshot[initial.wordIds[0]].word
 for(const mode of ['flash','connect','listen','spell','dictation']){
  await expect.poll(async()=>{const session=(await database(page)).customPractice;return session.modes[session.modeIndex]}).toBe(mode)
  if(mode==='flash'){await page.getByRole('button',{name:'开始自评',exact:true}).click();await page.locator('.rating-grid').getByRole('button').nth(2).click()}
  else if(mode==='connect'||mode==='listen'){await page.locator(`.answer-choice[data-word-id="${initial.wordIds[0]}"]`).click();await confirm(page).click()}
  else{
   const chars=normalizeSpellingWord(word).slots.map(s=>s.char.toLowerCase());await(await tile(page,chars[0])).click()
   if(mode==='spell'){const draft=(await database(page)).customPractice.letterDraft;await page.getByRole('button',{name:'暂停练习',exact:true}).click();await page.reload();await expect(page.locator('.study-custom-resume')).toHaveCount(0);if(await page.locator('.study-overview-toggle').count())await page.locator('.study-overview-toggle').click();await expect(page.getByText('上次自定义练习已保存',{exact:true})).toHaveCount(0);await expect(page.locator('.study-custom-resume')).toHaveCount(0);await page.locator('.study-practice-entry-button').click();await page.getByRole('button',{name:'继续上次自定义练习',exact:true}).click();expect((await database(page)).customPractice.letterDraft).toEqual(draft);await expect(page.locator('.block-slot.filled')).toHaveCount(1)}
   for(const char of chars.slice(1))await(await tile(page,char)).click();await confirm(page).click()
  }
 }
 await expect(page.locator('[data-custom-screen="summary"]')).toBeVisible();const after=await database(page);expect(formal(after)).toEqual(before);expect(after.practiceAnswers).toHaveLength(5);for(const mode of ['spell','dictation'])expect(after.practiceAnswers.find((a:any)=>a.mode===mode).inputAssistance).toBe('tiles')
})

test('答错后就地重试保留第一次结果，零灵石不扣费也不提供付费提示',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell','doctor');await go(page,'learn');await page.evaluate(async()=>{const {useProfileStore}=await import('/src/stores/profile.ts' as string);useProfileStore().transact((db:any)=>{db.gems=0})});await page.getByRole('button',{name:'提示 · 1 灵石',exact:true}).click();await expect(page.locator('.notice.error')).toContainText('灵石不足');expect((await database(page)).session.hinted).not.toBe(true)
 await spell(page,'rotcod');await confirm(page).click();await expect(page.locator('.answer-feedback')).toContainText('一起再认识');const before=await database(page);expect(before.practiceAnswers[0].correct).toBe(false);await page.getByRole('button',{name:'再拼一次',exact:true}).click();await expect(page.locator('.block-slot.filled')).toHaveCount(0);await spell(page,'doctor');await confirm(page).click();await expect(page.locator('.answer-feedback')).toContainText('很棒');const after=await database(page);expect(after.practiceAnswers).toEqual(before.practiceAnswers);expect(formal(after)).toEqual(formal(before));await expect(page.locator('.answer-feedback')).toContainText('重试不改变首次作答结果')
})

test('填字不触发自动重播，显式重听连续五次播放，切模式后草稿清理',async({page})=>{
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;(window as any).blockAudioPlays=0;HTMLMediaElement.prototype.play=function(){(window as any).blockAudioPlays++;return play.call(this)}});await setAppearance(page,'clay','light');await seedSpellingPractice(page,'dictation','doctor');await go(page,'learn');const audio=page.getByRole('button',{name:'播放当前单词的标准发音',exact:true});await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing');const plays=await page.evaluate(()=>(window as any).blockAudioPlays);await(await tile(page,'d')).click();await page.waitForTimeout(200);expect(await page.evaluate(()=>(window as any).blockAudioPlays)).toBe(plays)
 for(let i=0;i<5;i++){const count=await page.evaluate(()=>(window as any).blockAudioPlays);await audio.click();await expect.poll(()=>page.evaluate(()=>(window as any).blockAudioPlays)).toBe(count+1)}
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'闪现'}).click();await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'拼写'}).click();await expect(page.locator('.block-slot.filled')).toHaveCount(0);expect((await database(page)).practiceAnswers||[]).toHaveLength(0)
})

for(const width of [320,360,375,390,428,768,1280])test('方案C 小屏与平板短语无溢出 '+width,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:844});await setAppearance(page,'clay',width===360?'dark':'light');await seedSpellingPractice(page,'spell',"that's enough",'那就够了');await go(page,'learn');await expect(page.locator('.letter-tile')).toHaveCount(16);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await spell(page,"that's enough");await expect(confirm(page)).toBeEnabled();await confirm(page).evaluate(node=>node.scrollIntoView({block:'center'}));expect(await confirm(page).evaluate(node=>{const rect=node.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);return !!hit&&node.contains(hit)})).toBe(true);await page.locator('.letter-block-input').evaluate(node=>node.scrollIntoView({block:'center'}));await waitForArtwork(page);await page.screenshot({path:test.info().outputPath(`blocks-${width}.png`),fullPage:true})
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
