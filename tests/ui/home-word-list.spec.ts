import {test,expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {go,setAppearance,database,waitForArtwork} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan} from '../../src/services/learning/DailyLearningPlan'
import {customCourse} from '../helpers/custom-course'
import {contrast} from '../../src/styles/themes'

const time=new Date('2026-10-03T08:00:00Z'),card=(page:Page)=>page.locator('.home-word-list-clay')
function pack(id='home-words-a',count=15){const data=customCourse(id,count);for(const [index,word]of data.vocabulary.entries()){word.audio=`/static/test-audio/${id}-${index}.wav`;word.image=`/static/test-images/${id}-${index}.svg`};data.vocabulary[0].lemma='police officer';data.vocabulary[0].meaning='警察，警官；负责维护公共安全、处理突发事件的工作人员';data.vocabulary[1].lemma='police station';data.vocabulary[1].meaning='警察（分）局，派出所';return data}
async function media(page:Page){
 await page.route('**/static/test-images/*.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" rx="16" fill="#eaf3f8"/><circle cx="80" cy="50" r="28" fill="#88bed5"/></svg>'}))
 await page.route('**/static/test-audio/*.wav',route=>route.fulfill({contentType:'audio/wav',body:readFileSync('src/static/audio/cat.wav')}))
 await page.addInitScript(()=>{let current:HTMLMediaElement|undefined;const paused=new WeakMap<HTMLMediaElement,boolean>(),plays:string[]=[];Object.defineProperties(HTMLMediaElement.prototype,{paused:{configurable:true,get(){return paused.get(this)!==false}},duration:{configurable:true,get(){return 1}}});HTMLMediaElement.prototype.play=function(){current=this;paused.set(this,false);plays.push(this.getAttribute('src')||this.src);this.dispatchEvent(new Event('play'));return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){paused.set(this,true);this.dispatchEvent(new Event('pause'))};(window as any).__homeAudio={plays,end(){if(current){paused.set(current,true);current.dispatchEvent(new Event('ended'))}},error(){current?.dispatchEvent(new Event('error'))},isPaused(){return !current||paused.get(current)!==false}}})
}
async function prepare(page:Page,mode='light',largeText=false,level='L1',data=pack(),db?:Database,otherPacks:ReturnType<typeof pack>[]=[]){
 await page.clock.install({time});await setAppearance(page,'clay',mode,{largeText,highContrast:largeText,reducedMotion:true});await media(page)
 const archive=db||{...freshDatabase(),version:2,currentCourseId:data.courseId,abilityLevel:level,courseProgress:{[data.courseId]:{...initialProgress(data.courseId),currentLessonId:data.units[0].lessons[0].id}},auxiliaryRecords:[]} as Database
 await page.addInitScript(({packs,archive})=>{localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(data=>{const key='wordpal.content.pack.'+data.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(data));return {key,courseId:data.courseId,archived:false,aliases:{}}})));if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(archive));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},{packs:[data,...otherPacks],archive});await go(page,'home')
}
async function layout(page:Page){
 const result=await card(page).evaluate(node=>{const bounds=node.getBoundingClientRect(),inside=(a:DOMRect,b:DOMRect)=>a.left>=b.left-.2&&a.right<=b.right+.2&&a.top>=b.top-.2&&a.bottom<=b.bottom+.2;return {overflow:node.scrollWidth>node.clientWidth+1,rows:Array.from(node.querySelectorAll('.home-word-tile')).map(tile=>{const box=tile.getBoundingClientRect(),picture=tile.querySelector('.home-word-picture')!.getBoundingClientRect(),english=tile.querySelector('.home-word-english')!.getBoundingClientRect(),meaning=tile.querySelector('.home-word-meaning')!.getBoundingClientRect(),action=tile.querySelector('.home-word-actions .wp-button')!.getBoundingClientRect();return {inside:inside(box,bounds)&&inside(picture,box)&&inside(english,box)&&inside(meaning,box)&&inside(action,box),vertical:picture.bottom<=english.top+.2&&english.bottom<=meaning.top+.2&&meaning.bottom<=action.top+.2,overflow:tile.scrollWidth>tile.clientWidth+1,buttonHeight:action.height,buttonWidth:action.width,ratio:picture.width/picture.height}})}})
 expect(result.overflow,JSON.stringify(result)).toBe(false);expect(result.rows.every(row=>row.inside&&row.vertical&&!row.overflow&&row.buttonHeight>=48&&row.buttonWidth>=48&&Math.abs(row.ratio-1.6)<.02),JSON.stringify(result)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
}

for(const mode of ['light','dark'])for(const large of [false,true])test(`${mode} 大字${large} 真实容器自适应词卡与长词长义`,async({page})=>{
 await prepare(page,mode,large);const before=await database(page);await expect(card(page).locator('.home-word-tile')).toHaveCount(5);await expect(card(page).locator('.home-word-source')).toContainText('不计入已学')
 for(const [width,height]of [[320,900],[359,900],[390,844],[507,1000],[600,1000],[768,1024],[834,1194],[1024,768],[1280,900],[1600,1000]]){await page.setViewportSize({width,height});await layout(page);if([390,1280].includes(width)){await waitForArtwork(page);await card(page).screenshot({path:test.info().outputPath(`words-${mode}-${large?'large':'normal'}-${width}.png`)})}}
 await expect(card(page).locator('.home-word-english').first()).toHaveText('police officer');await expect(card(page).locator('.home-word-meaning').first()).toContainText('处理突发事件');await page.setViewportSize({width:320,height:1100});await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await expect(card(page).locator('.home-word-grid')).toHaveCSS('grid-template-columns',/^[\d.]+px$/);await layout(page)
 const colors=await card(page).locator('.home-word-english,.home-word-meaning').evaluateAll(nodes=>nodes.map(node=>{const hex=(value:string)=>'#'+value.match(/\d+/g)!.slice(0,3).map(part=>Number(part).toString(16).padStart(2,'0')).join('');return {fg:hex(getComputedStyle(node).color),bg:hex(getComputedStyle(node.closest('.home-word-tile')!).backgroundColor)}}));expect(colors.every(color=>contrast(color.fg,color.bg)>=4.5)).toBe(true);expect(await database(page)).toEqual(before)
})

test('十五词来自正式日计划，保留实际教材顺序、跨单元来源和真实图音映射',async({page})=>{
 const data=pack();await prepare(page,'light',false,'L4',data);const before=await database(page);await expect(card(page).locator('.home-word-tile')).toHaveCount(15);await expect(card(page).locator('.home-word-unit')).toHaveText('多个单元')
 const expected=data.vocabulary.map(word=>word.id);expect(await card(page).locator('.home-word-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id')))).toEqual(expected)
 for(const id of expected){const entry=data.vocabulary.find(word=>word.id===id)!,tile=card(page).locator(`[data-word-id="${id}"]`),unit=data.units.find(unit=>unit.lessons.some(lesson=>lesson.wordIds.includes(id)))!;await expect(tile.locator('.home-word-english')).toHaveText(entry.lemma);await expect(tile.locator('.home-word-meaning')).toHaveText(entry.meaning);await expect(tile.locator('.home-word-position')).toHaveText(unit.title);await expect(tile.locator('img').first()).toHaveAttribute('src',entry.image!)}
 expect(await database(page)).toEqual(before)
})

test('独立发音连续重播四次并快速切词，单卡播放状态与词条归属一致且不写学习数据',async({page})=>{
 await prepare(page);const before=await database(page),tiles=card(page).locator('.home-word-tile'),audio=tiles.first().locator('.home-word-actions .wp-button'),url=await tiles.first().getAttribute('data-word-id')
 for(let index=0;index<4;index++){await audio.click();await expect.poll(()=>page.evaluate(()=>(window as any).__homeAudio.plays.length)).toBe(index+1);await expect(audio).toContainText('播放中');await page.evaluate(()=>(window as any).__homeAudio.end());await expect(audio).toHaveText('听发音')}
 await audio.click();await tiles.nth(1).locator('.home-word-actions .wp-button').click();await expect.poll(()=>page.evaluate(()=>(window as any).__homeAudio.plays.at(-1))).toContain(pack().vocabulary[1].audio)
 await expect(card(page).locator('.home-word-actions .playing')).toHaveCount(1);await expect(tiles.nth(1).locator('.home-word-actions .wp-button')).toContainText('播放中');await expect(tiles.first().locator('.home-word-body')).toHaveAttribute('aria-pressed','false');await expect(page.locator('.word-detail-panel')).toHaveCount(0);expect(url).toBeTruthy();expect(await database(page)).toEqual(before)
})

test('卡片主体高亮反选保留，独立音频不触发反选；离页和后台停止，返回仍可播放',async({page})=>{
 await prepare(page);const before=await database(page),body=card(page).locator('.home-word-body').first(),button=card(page).locator('.home-word-actions .wp-button').first();await body.locator('.home-word-english').click();await expect(body).toHaveAttribute('aria-pressed','true');await button.click();await expect(body).toHaveAttribute('aria-pressed','true');await body.click();await expect(body).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>(window as any).__homeAudio.isPaused())).toBe(true)
 await button.click();await go(page,'settings');expect(await page.evaluate(()=>(window as any).__homeAudio.isPaused())).toBe(true);await go(page,'home');await card(page).locator('.home-word-actions .wp-button').first().focus();await page.keyboard.press('Enter');await expect(card(page).locator('.home-word-actions .wp-button').first()).toContainText('播放中');await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))});expect(await page.evaluate(()=>(window as any).__homeAudio.isPaused())).toBe(true);expect(await database(page)).toEqual(before)
})

test('音频失败可重试，关闭声音有提示且不永久锁死按钮',async({page})=>{
 await prepare(page);const before=await database(page),button=card(page).locator('.home-word-actions .wp-button').first();await button.click();await expect(button).toContainText('播放中');await page.evaluate(()=>(window as any).__homeAudio.error());await expect(card(page).locator('.home-word-error')).toContainText('暂时无法播放');await expect(button).toContainText('重试');await button.click();await expect(button).toContainText('播放中');expect(await database(page)).toEqual(before)
 await page.evaluate(()=>{localStorage.setItem('wordpal.feedback.v1',JSON.stringify({sound:false,haptics:false}))});await page.reload();await card(page).locator('.home-word-actions .wp-button').first().click();await expect(card(page).locator('.home-word-error')).toContainText('发音已关闭');await expect(card(page).locator('.home-word-actions .wp-button').first()).toBeEnabled();expect(await database(page)).toEqual(before)
})

test('缺图、坏图、缺音频有占位，卡片尺寸保持且其它单词仍能发音',async({page})=>{
 const data=pack();data.vocabulary[0].image='';data.vocabulary[0].audio='';data.vocabulary[1].image='/static/test-broken/word.svg';await page.route('**/static/test-broken/word.svg',route=>route.abort());await prepare(page,'light',false,'L1',data);const before=await database(page);await expect(card(page).locator('.home-word-picture-fallback')).toHaveCount(2);await expect(card(page).locator('.home-word-actions .wp-button').first()).toBeDisabled();await expect(card(page).locator('.home-word-actions .wp-button').first()).toContainText('暂无音频');await card(page).locator('.home-word-actions .wp-button').nth(2).click();await expect(card(page).locator('.home-word-actions .wp-button').nth(2)).toContainText('播放中');await layout(page);expect(await database(page)).toEqual(before)
})

test('完成教材无任务不回填旧课，坏档案显示不可用而不冒充今日词单',async({page})=>{
 const data=pack(),db={...freshDatabase(),version:2,currentCourseId:data.courseId,abilityLevel:'L1',courseProgress:{[data.courseId]:{...initialProgress(data.courseId),fullLearnedWords:Object.fromEntries(data.vocabulary.map(word=>[word.id,time.toISOString()]))}},auxiliaryRecords:[]} as Database;await prepare(page,'light',false,'L1',data,db);const before=await database(page);await expect(card(page).locator('.home-word-tile')).toHaveCount(0);await expect(card(page).locator('.home-word-empty')).toContainText('暂无今日任务词单');expect(await database(page)).toEqual(before)
 await page.evaluate(()=>{localStorage.setItem('wordpal.database.v2','unreadable-home-word-fixture')});await page.reload();await expect(card(page).locator('.home-word-tile')).toHaveCount(0);await expect(card(page).locator('.home-word-empty')).toContainText('词单暂不可用');expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('unreadable-home-word-fixture')
})

test('跨日未完成仍为固定词单，标题明确待续学且不伪造今日已学',async({page})=>{
 const data=pack(),db={...freshDatabase(),version:2,currentCourseId:data.courseId,abilityLevel:'L1',courseProgress:{[data.courseId]:initialProgress(data.courseId)},auxiliaryRecords:[]} as Database,plan=selectDailyPlan(db,data,time)!;plan.flow!.begunAt=time.toISOString();db.courseProgress![data.courseId].dailyPlan=plan;db.courseProgress![data.courseId].studyActivity='daily';await prepare(page,'light',false,'L1',data,db);const before=await database(page),ids=await card(page).locator('.home-word-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id')));await page.clock.setSystemTime(new Date('2026-10-04T08:00:00Z'));await page.clock.runFor(31000);await expect(card(page).locator('.home-word-heading')).toContainText('待续学的单词');await expect(card(page).locator('.home-word-source')).toContainText(plan.date);expect(await card(page).locator('.home-word-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id')))).toEqual(ids);expect(await database(page)).toEqual(before)
})

test('同音源只标记正在操作的词卡，切教材后同英文使用本册词义配图并停止旧音频',async({page})=>{
 const a=pack(),b=pack('home-words-b',4);a.vocabulary[1].audio=a.vocabulary[0].audio;b.vocabulary[0].meaning='第二教材中的警官释义'
 await prepare(page,'light',false,'L1',a,undefined,[b]);await card(page).locator('.home-word-actions .wp-button').first().click();await expect(card(page).locator('.home-word-actions .playing')).toHaveCount(1);await card(page).locator('.home-word-actions .wp-button').nth(1).click();await expect(card(page).locator('.home-word-actions .playing')).toHaveCount(1);await expect(card(page).locator('.home-word-actions .wp-button').nth(1)).toContainText('播放中')
 expect(await page.evaluate(async()=>{const {useCourseStore}=await import('/src/stores/course.ts' as string);return useCourseStore().choose('home-words-b').ok})).toBe(true)
 await expect(card(page).locator('.home-word-tile')).toHaveCount(4);await expect(card(page).locator('.home-word-english').first()).toHaveText('police officer');await expect(card(page).locator('.home-word-meaning').first()).toHaveText(b.vocabulary[0].meaning);await expect(card(page).locator('.home-word-tile img').first()).toHaveAttribute('src',b.vocabulary[0].image!);expect(await page.evaluate(()=>(window as any).__homeAudio.isPaused())).toBe(true)
 const before=await database(page);await card(page).locator('.home-word-actions .wp-button').first().click();await expect.poll(()=>page.evaluate(()=>(window as any).__homeAudio.plays.at(-1))).toContain(b.vocabulary[0].audio);expect(await database(page)).toEqual(before)
})
