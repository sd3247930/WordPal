import {test,expect,type Page} from '@playwright/test'
import {go,database,setAppearance,openCustomPractice,waitForArtwork} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {wordById} from '../../packages/content_schema'
import type {LearningMode,Word} from '../../packages/core_learning'
import {normalizeSpellingWord,makeBlockDraft} from '../../packages/phonics/letter-blocks'

async function seed(page:Page,mode:LearningMode='spell',lemma='doctor',meaning='医生，大夫',ratio=.75){
 const word:Word={...wordById.cat,id:'easy-word',word:lemma,meaning,audio:'/static/audio/cat.wav',image:'/static/easy-picture.svg',phonics:[],phonemes:[],syllables:[],phonicsData:undefined,ipa:''}
 const words=[word,wordById.dog,wordById.fish,wordById.cat];word.distractors=words.slice(1).map(w=>w.id)
 const db={...freshDatabase(),version:2,abilityLevel:'L5',gems:10,currentCourseId:'easy-fixture',courseProgress:{'easy-fixture':{currentLessonId:'l01',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[],session:{id:'easy-session',date:'2026-10-21',startedAt:'2026-10-21T08:00:00Z',kind:'practice',wordIds:[word.id,'dog'],index:0,mode,input:'',selected:'',revealed:false,answers:[],courseId:'easy-fixture',contentVersion:'1.0.0',wordSnapshot:Object.fromEntries(words.map(w=>[w.id,w]))}}
 // These cases specifically exercise the retained independent keyboard path.
 const key=['easy-session',word.id,mode,0].join(':');Object.assign(db.session,{letterDraft:makeBlockDraft(normalizeSpellingWord(lemma,key),word.id,key,'','keyboard')})
 const pack={schemaVersion:2,courseId:'easy-fixture',contentVersion:'1.0.0',title:'合成输入练习',route:'theme',abilityLevels:['L5'],sources:[{id:'easy-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'合成测试',revision:'r1'}],assets:[],units:[{id:'unit-1',title:'Unit 1',lessons:[{id:'l01',title:'合成词',wordIds:words.map(w=>w.id)}]}],vocabulary:words.map(w=>({id:w.id,language:'en',lemma:w.word,meaning:w.meaning,pos:w.pos,sourceId:'easy-source',audio:w.audio,image:w.image}))}
 await page.route('**/static/easy-picture.svg',route=>route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${600*ratio}" height="600"><rect width="100%" height="100%" fill="#c4dcbd"/><circle cx="50%" cy="60" r="30" fill="#f2ac91"/></svg>`}))
 await page.addInitScript(({db,pack})=>{const key='wordpal.content.pack.easy-fixture.0123456789abcdef';localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))},{db,pack})
}
const input=(page:Page)=>page.locator('.slot-native input')
const submit=(page:Page)=>page.getByRole('button',{name:'确认答案 →',exact:true})
const protectedState=(db:any)=>({history:db.history,cards:db.cards,gems:db.gems,courseProgress:db.courseProgress,pets:db.pets})

for(const mode of ['light','dark'])test(`医生图片满框、中文放大与原生输入编辑、清空和重复提交 ${mode}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,'clay',mode);await seed(page);await go(page,'learn');const before=protectedState(await database(page))
 await expect(page.locator('.word-core .word')).toHaveText('···');await expect(page.locator('.meaning')).toHaveText('医生，大夫');await expect(submit(page)).toBeDisabled()
 await expect.poll(()=>page.locator('.word-picture-stage').evaluate(node=>node.getBoundingClientRect().width/node.getBoundingClientRect().height)).toBeCloseTo(1,1)
 expect(await page.locator('.word-picture-stage').evaluate(node=>node.getBoundingClientRect().width/node.closest('.word-meaning-card')!.getBoundingClientRect().width)).toBeGreaterThan(.35)
 expect(await page.locator('.meaning').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(20)
 await input(page).fill('doctr');await input(page).press('ArrowLeft');await input(page).press('o');await expect(input(page)).toHaveValue('doctor')
 await input(page).selectText();await input(page).press('Backspace');await expect(input(page)).toHaveValue('');await expect(submit(page)).toBeDisabled()
 await input(page).fill('doctor');await expect(input(page)).toHaveAttribute('autocorrect','off');await expect(input(page)).toHaveAttribute('spellcheck','false');await expect(page.locator('.word-slot-input')).toHaveAttribute('data-input-layout','slots');await input(page).press('Tab');await page.locator('.word-slot-input').evaluate(node=>node.scrollIntoView({block:'center'}));await waitForArtwork(page);await page.screenshot({path:test.info().outputPath(`spell-${mode}-390.png`),fullPage:true})
 await submit(page).evaluate(node=>{(node as HTMLElement).click();(node as HTMLElement).click()});await expect(page.locator('.answer-feedback')).toContainText('很棒');const after=await database(page);expect(after.practiceAnswers).toHaveLength(1);expect(after.session.index).toBe(0);expect(protectedState(after)).toEqual(before)
})

test('系统剪贴板粘贴词组保留空格，取消选择后可清空重输',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setAppearance(page,'clay','light');await seed(page,'spell','police officer');await go(page,'learn');await page.evaluate(()=>navigator.clipboard.writeText('police officer'));await input(page).focus();await input(page).press('Control+V');await expect(input(page)).toHaveValue('police officer');await expect(page.locator('.word-slot-input')).toHaveAttribute('data-input-layout','line');await input(page).press('Control+A');await input(page).press('Backspace');await expect(submit(page)).toBeDisabled();await input(page).fill('police officer');await submit(page).click();await expect(page.locator('.answer-feedback')).toContainText('很棒')
})

test('图片加载失败有回退，极宽图片完整显示，音频错误可重试且不写答题',async({page})=>{
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;(window as any).realPracticeAudio=new Set<HTMLMediaElement>();HTMLMediaElement.prototype.play=function(){(window as any).realPracticeAudio.add(this);return play.call(this)}})
 await setAppearance(page,'clay','light');await seed(page,'spell','station','车站',3);await go(page,'learn');await expect(page.locator('.word-picture')).toHaveClass(/image-complete/);await expect(page.locator('.word-picture')).toHaveCSS('object-fit','contain');await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'听写'}).click();const before=await database(page),button=page.getByRole('button',{name:'播放当前单词的标准发音',exact:true});await button.click();await expect(button).toHaveAttribute('data-audio-state','playing');await page.evaluate(()=>Array.from((window as any).realPracticeAudio as Set<HTMLMediaElement>).filter(audio=>!audio.paused).forEach(audio=>audio.dispatchEvent(new Event('error'))));await expect(button).toHaveAttribute('data-audio-state','error');await expect(button).toContainText('重试播放');await button.click();await expect(button).toHaveAttribute('data-audio-state','playing');expect((await database(page)).practiceAnswers).toEqual(before.practiceAnswers);expect(protectedState(await database(page))).toEqual(protectedState(before))
 await page.locator('.mode-button').filter({hasText:'拼写'}).click();await page.locator('.word-picture').dispatchEvent('error');await expect(page.locator('.word-picture-fallback')).toContainText('图片暂缺');await expect(page.locator('.meaning')).toHaveText('车站')
})

for(const lemma of ['police officer',"it's",'ice-cream','Good morning!','pneumonoultramicroscopicsilicovolcanoconiosis'])test(`长词和标点保持原输入与判分：${lemma}`,async({page})=>{
 await page.setViewportSize({width:360,height:800});await setAppearance(page,'clay','light');await seed(page,'spell',lemma,'农民；农场主；养殖场主');await go(page,'learn');await input(page).fill(lemma);await expect(page.locator('.word-slot-input')).toHaveAttribute('data-input-layout','line');await expect(submit(page)).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await submit(page).click();await expect(page.locator('.answer-feedback')).toContainText('很棒');expect((await database(page)).practiceAnswers).toHaveLength(1)
})

test('听写默认不泄露答案长度、中文或图片，IME不提前提交且换模式清理焦点',async({page})=>{
 await setAppearance(page,'clay','light');await seed(page,'dictation','police officer');await go(page,'learn');await expect(page.locator('.listening-wave')).toBeVisible();await expect(page.locator('.word-picture,.meaning,.word-placeholder')).toHaveCount(0);await expect(page.locator('.letter-slot')).toHaveCount(6)
 await input(page).focus();await input(page).dispatchEvent('compositionstart');await input(page).fill('警察');await input(page).press('Enter');await expect(page.locator('.answer-feedback')).toHaveCount(0);await input(page).dispatchEvent('compositionend');await input(page).fill('police officer');await input(page).press('Backspace');await expect(input(page)).toHaveValue('police office');await input(page).press('r');await expect(input(page)).toHaveValue('police officer')
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'闪现'}).click();await expect(page.locator('.slot-native')).toHaveCount(0);expect(await page.evaluate(async()=>{const {studyInput}=await import('/src/services/study-input.ts' as string);return studyInput.keyboardRaised})).toBe(false)
})

for(const width of [360,430,768,1280])test(`词义、图片及输入响应式，无横溢出 ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:932});await setAppearance(page,'clay','dark');await seed(page,'spell','farmer','农民；农场主；养殖场主',1.8);await go(page,'learn');await input(page).fill('farmer');await input(page).press('Tab');await expect(page.locator('.meaning')).toHaveText('农民；农场主；养殖场主');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.locator('.word-meaning-card').evaluate(node=>node.scrollIntoView({block:'center'}));await waitForArtwork(page);await page.screenshot({path:test.info().outputPath(`meaning-${width}.png`),fullPage:true})
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await expect(page.locator('.word-slot-input')).toHaveAttribute('data-input-layout','line');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})

test('原生键盘高度事件收起导航，确认可滚动触及，失焦恢复',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,'clay','light');await seed(page);await go(page,'learn');await input(page).fill('doctor');await input(page).focus();await page.evaluate(()=>uni.$emit('test-noop'))
 // Synthetic viewport resize exercises H5 keyboard avoidance without claiming an OS keyboard test.
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:500});window.visualViewport!.dispatchEvent(new Event('resize'))});await expect(page.locator('.bottom-nav')).toBeHidden();await expect(submit(page)).toBeEnabled();await submit(page).click();await expect(page.locator('.answer-feedback')).toContainText('很棒');await expect(page.locator('.bottom-nav')).toBeVisible()
})

test('五模式各实际重播五次，快速重播及切换停止旧音频，不写答题和奖励',async({page})=>{
 test.setTimeout(60000);await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;(window as any).realPracticeAudio=new Set<HTMLMediaElement>();HTMLMediaElement.prototype.play=function(){(window as any).realPracticeAudio.add(this);return play.call(this)}});await setAppearance(page,'clay','light');await seed(page,'flash','doctor');await go(page,'learn');const before=await database(page)
 for(const mode of ['闪现','连接','听音','拼写','听写']){
  await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:mode}).click();const button=page.getByRole('button',{name:'播放当前单词的标准发音',exact:true})
  for(let i=0;i<5;i++){await button.click();await expect(button).toHaveAttribute('data-audio-state','playing');await expect.poll(()=>page.evaluate(()=>Array.from((window as any).realPracticeAudio as Set<HTMLMediaElement>).some(audio=>!audio.paused&&audio.currentTime>.02))).toBe(true);await expect.poll(()=>page.evaluate(()=>Array.from((window as any).realPracticeAudio as Set<HTMLMediaElement>).filter(audio=>!audio.paused).length)).toBeLessThanOrEqual(1)}
  await button.evaluate(node=>{for(let i=0;i<6;i++)(node as HTMLElement).click()});await expect(button).toHaveAttribute('data-audio-state','playing')
 }
 const after=await database(page);expect(protectedState(after)).toEqual(protectedState(before));expect(after.practiceAnswers).toEqual(before.practiceAnswers)
 await go(page,'home');expect(await page.evaluate(()=>Array.from((window as any).realPracticeAudio as Set<HTMLMediaElement>).every(audio=>audio.paused))).toBe(true)
})



