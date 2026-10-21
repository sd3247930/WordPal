import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database,completeDaily} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {contrast} from '../../src/styles/themes'
import {customCourse} from '../helpers/custom-course'

const time=new Date('2026-10-03T08:00:00Z'),card=(page:Page)=>page.locator('.home-learning-data-clay'),values=(page:Page)=>card(page).locator('.learning-metric-value')
function fixture(correct:readonly boolean[]=[true,false,true,false]):Database{
 const db=freshDatabase();db.version=2;db.currentCourseId='starter';db.abilityLevel='L1';db.courseProgress={starter:{...initialProgress('starter'),curriculumSchema:1,fullLearnedWords:{cat:time.toISOString(),dog:'2026-10-02T08:00:00Z'}}};db.auxiliaryRecords=[]
 db.history=correct.map((value,index)=>({id:'data-answer-'+index,wordId:['cat','dog','dog','fish'][index%4],correct:value,source:index===1||index===2?'review_due':'new_word',courseId:'starter',at:time.toISOString(),rating:value?3:1,mode:'flash',input:''}))
 db.practiceAnswers=[{id:'custom-evidence',wordId:'bird',correct:false,source:'practice',courseId:'starter',at:time.toISOString(),rating:1,mode:'spell',input:'x'}]
 return db
}
async function prepare(page:Page,mode='light',largeText=false,db=fixture()){
 await page.clock.install({time});await setAppearance(page,'clay',mode,{largeText,highContrast:largeText,reducedMotion:true})
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db);await go(page,'home')
}
test('真实口径、静态说明与只读浏览，重复复习词按事件计数',async({page})=>{
 await prepare(page);const before=await database(page)
 await expect(values(page)).toHaveText(['1','2','4']);await expect(card(page).getByRole('progressbar',{name:'今日正确率',exact:true})).toHaveAttribute('aria-valuenow','50');await expect(card(page).locator('.learning-data-ring')).toHaveCSS('--learning-ring-angle','180deg')
 await expect(card(page).locator('.learning-metric-label')).toHaveText(['新学单词','复习次数','有效学习']);await expect(card(page).getByRole('group',{name:'有效学习，4 次，当日已保存答题',exact:true})).toBeVisible()
 await expect(card(page).locator('.learning-data-title')).toHaveText('学习数据');await expect(card(page).locator('.learning-data-source')).toHaveText('真实记录');await expect(card(page).locator('[role="button"],uni-button,button')).toHaveCount(0)
 await card(page).locator('.learning-data-source').click();for(const screen of ['settings','home','review','home'])await go(page,screen);await page.reload();await expect(values(page)).toHaveText(['1','2','4']);expect(await database(page)).toEqual(before)
})
for(const [name,answers,rate,angle]of [['无样本',[],null,'0deg'],['真实全错',[false,false],0,'0deg'],['一半正确',[true,false],50,'180deg'],['全部正确',[true,true],100,'360deg']] as const)test(`${name}：圆环和数字一致且不会伪造0%`,async({page})=>{
 await prepare(page,'light',false,fixture(answers));const before=await database(page)
 await expect(card(page).locator('.learning-rate-number')).toHaveText(rate===null?'—':String(rate));await expect(card(page).locator('.learning-data-ring')).toHaveCSS('--learning-ring-angle',angle)
 if(rate===null){await expect(card(page).getByRole('img',{name:'今日正确率，暂无答题记录',exact:true})).toBeVisible();await expect(card(page).locator('.learning-rate-empty')).toHaveText('今天还没有答题记录');await expect(card(page).locator('.learning-rate-percent')).toHaveCount(0)}else{await expect(card(page).getByRole('progressbar',{name:'今日正确率',exact:true})).toHaveAttribute('aria-valuenow',String(rate));await expect(card(page).locator('.learning-rate-percent')).toHaveText('%')}
 expect(await database(page)).toEqual(before)
})
for(const mode of ['light','dark'])for(const largeText of [false,true])test(`学习数据 ${mode} 大字${largeText} 手机、平板窗口、真实容器宽度与AA文字`,async({page})=>{
 await prepare(page,mode,largeText);const before=await database(page)
 for(const width of [320,359,390,507,600,768,834,1024,1194,1280,1600]){
  await page.setViewportSize({width,height:1000});await expect(card(page).locator('.learning-data-metric')).toHaveCount(3)
  await expect.poll(()=>card(page).evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true)
  const metrics=await card(page).locator('.learning-data-metric').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect(),art=node.querySelector('.learning-metric-art')!.getBoundingClientRect(),number=node.querySelector('.learning-metric-value')!.getBoundingClientRect(),label=node.querySelector('.learning-metric-label')!.getBoundingClientRect();return {overflow:node.scrollWidth>node.clientWidth+1,inside:art.left>=box.left&&label.right<=box.right+.2&&number.right<=box.right+.2,overlap:art.right>number.left+.2||number.right>label.left+.2&&number.bottom>label.top+.2}}))
  expect(metrics.every(item=>!item.overflow&&item.inside&&!item.overlap),JSON.stringify({width,metrics})).toBe(true)
  const contentWidth=await card(page).evaluate(node=>{const styles=getComputedStyle(node),inner=node.clientWidth-parseFloat(styles.paddingLeft)-parseFloat(styles.paddingRight);return {expected:Math.min(800,inner),actual:node.querySelector('.learning-data-content')!.getBoundingClientRect().width}});expect(Math.abs(contentWidth.actual-contentWidth.expected)).toBeLessThan(1)
  const ring=await card(page).locator('.learning-data-ring').boundingBox();expect(ring!.width).toBeGreaterThanOrEqual(176);expect(Math.abs(ring!.width-ring!.height)).toBeLessThan(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,768,1280].includes(width))await card(page).screenshot({path:test.info().outputPath(`learning-data-${mode}-${largeText}-${width}.png`)})
 }
 for(const image of await card(page).locator('img').all())await expect(image).toHaveJSProperty('naturalWidth',256)
 const colors=await card(page).locator('.learning-metric-value,.learning-metric-label').evaluateAll(nodes=>nodes.map(node=>{const hex=(rgb:string)=>'#'+rgb.match(/\d+/g)!.slice(0,3).map(value=>Number(value).toString(16).padStart(2,'0')).join(''),row=getComputedStyle(node.closest('.learning-data-metric')!);return {fg:hex(getComputedStyle(node).color),surface:row.getPropertyValue('--wp-surface').trim(),tint:row.getPropertyValue('--learning-metric-tint').trim()}}));for(const color of colors){expect(contrast(color.fg,color.surface)).toBeGreaterThanOrEqual(4.5);expect(contrast(color.fg,color.tint)).toBeGreaterThanOrEqual(4.5)}
 // A wider host verifies the same component's two-column layout without changing the app grid.
 await page.setViewportSize({width:1280,height:1000});await page.addStyleTag({content:'.home-grid{grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"pet" "tasks" "words" "insights"!important}.home-insights{display:flex!important}'})
 await expect(card(page).locator('.learning-data-content')).toHaveClass(/learning-data-wide/);const rate=await card(page).locator('.learning-data-rate').boundingBox(),rows=await card(page).locator('.learning-data-metrics').boundingBox();expect(rate!.x+rate!.width).toBeLessThan(rows!.x)
 await card(page).screenshot({path:test.info().outputPath(`learning-data-wide-${mode}-${largeText}.png`)});expect(await database(page)).toEqual(before)
})
test('200%实际字号和六位数字不裁切，装饰不覆盖圆环与数值',async({page})=>{
 await prepare(page,'dark');await page.setViewportSize({width:320,height:1000});const before=await database(page)
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string),{useProfileStore}=await import('/src/stores/profile.ts' as string);windowLayout.fontScale=2;const original=useProfileStore().db.history[0];useProfileStore().db.history=Array.from({length:123456},(_,index)=>({...original,id:'large-number-'+index}))})
 await expect(values(page).nth(2)).toHaveText('123456');await expect(card(page).locator('.learning-data-content')).toHaveClass(/learning-data-large/)
 expect(await card(page).locator('.learning-metric-label').first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(34)
 expect(await card(page).evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 const content=await card(page).locator('.learning-rate-reading').boundingBox(),ring=await card(page).locator('.learning-ring-face').boundingBox(),book=await card(page).locator('.learning-rate-book').boundingBox();expect(content!.x).toBeGreaterThanOrEqual(ring!.x);expect(content!.x+content!.width).toBeLessThanOrEqual(ring!.x+ring!.width+.2);expect(book!.y).toBeGreaterThanOrEqual(ring!.y+ring!.height)
 expect(await database(page)).toEqual(before)
})
test('损坏档案显示未知和恢复说明，保护原值且不冒充四个零',async({page})=>{
 await setAppearance(page,'clay','light');await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','home-data-unreadable')});await go(page,'home')
 await expect(values(page)).toHaveText(['—','—','—']);await expect(card(page).locator('.learning-rate-number')).toHaveText('—');await expect(card(page).locator('.learning-data-unavailable')).toContainText('统计暂不可用');await expect(card(page).locator('.learning-rate-empty')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('home-data-unreadable')
})
test('离线和五枚图标故障只降级图形，不影响数据或新增动作',async({page,context})=>{
 await page.route('**/static/icons/home-learning-data/*.png*',route=>route.request().resourceType()==='image'?route.abort():route.continue());await prepare(page);const before=await database(page);await context.setOffline(true)
 await expect(card(page).locator('.learning-icon-fallback')).toHaveText(['▥','词','复','学']);await expect(values(page)).toHaveText(['1','2','4']);await expect(card(page).locator('.learning-rate-number')).toHaveText('50');expect(await database(page)).toEqual(before)
})
test('跨午夜、后台恢复、时间回退与重启实时刷新，不改变答题或发奖',async({page})=>{
 const db=fixture(),old='2026-10-04T19:59:59Z',next='2026-10-04T20:00:01Z';db.history=[{...db.history[0],at:old},{...db.history[1],at:next}];db.courseProgress!.starter.fullLearnedWords={cat:old};await prepare(page,'light',false,db);await page.clock.setSystemTime(new Date('2026-10-04T19:59:50Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));const before=await database(page)
 await expect(values(page)).toHaveText(['1','0','1']);await expect(card(page).locator('.learning-rate-number')).toHaveText('100');await page.clock.runFor(40000);await expect(values(page)).toHaveText(['0','1','1']);await expect(card(page).locator('.learning-rate-number')).toHaveText('0')
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))});await page.clock.setSystemTime(new Date('2026-10-06T08:00:00Z'));await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))});await expect(values(page)).toHaveText(['0','0','0']);await expect(card(page).locator('.learning-rate-number')).toHaveText('—')
 await page.clock.setSystemTime(new Date('2026-10-04T08:00:00Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(values(page)).toHaveText(['1','0','1']);await page.reload();await expect(values(page)).toHaveText(['1','0','1']);expect(await database(page)).toEqual(before)
})
test('当前教材只改变新学数，全局答题和主题切换保持原统计',async({page})=>{
 const db=fixture(),pack=customCourse('home-data-course',2);db.courseProgress![pack.courseId]={...initialProgress(pack.courseId),currentLessonId:pack.units[0].lessons[0].id,curriculumSchema:1,fullLearnedWords:{[pack.vocabulary[0].id]:time.toISOString(),[pack.vocabulary[1].id]:time.toISOString()}}
 await page.addInitScript(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{key,courseId:pack.courseId,archived:false,aliases:{}}]))},pack);await prepare(page,'light',false,db);const before=await database(page)
 await page.evaluate(async()=>{const {useCourseStore}=await import('/src/stores/course.ts' as string);useCourseStore().choose('home-data-course')});await expect(values(page)).toHaveText(['2','2','4']);await expect(card(page).locator('.learning-rate-number')).toHaveText('50')
 await page.evaluate(async()=>{const {useThemeStore}=await import('/src/stores/theme.ts' as string);useThemeStore().settings.themeId='swiss'});await expect(card(page)).toHaveCount(0);await expect(page.locator('.home-data .progress-number')).toHaveText('50%');await page.evaluate(async()=>{const {useThemeStore}=await import('/src/stores/theme.ts' as string);useThemeStore().settings.themeId='clay'});await expect(values(page)).toHaveText(['2','2','4']);const after=await database(page);for(const key of ['history','cards','gems','rewardIds','pets','session','practiceAnswers'])expect(after[key]).toEqual(before[key])
})
test('正式六环节结算后自动刷新，真实自定义答题和听音浏览不会并入正式记录',async({page})=>{
 test.setTimeout(90000);const db=fixture([]);db.courseProgress!.starter=initialProgress('starter');db.practiceAnswers=[];await prepare(page,'light',false,db);await expect(values(page)).toHaveText(['0','0','0']);await page.locator('.home-today-clay .hero-cta').click();await completeDaily(page);await go(page,'home');await expect(values(page)).toHaveText(['5','0','5']);await expect(card(page).locator('.learning-rate-number')).toHaveText('100');const formal=await database(page)
 await go(page,'pet');await page.getByRole('button',{name:'试一试拼写或听写',exact:true}).click();await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click();await page.getByRole('button',{name:'开始练习',exact:true}).click();await page.locator('.spelling-input input').fill('cat');await page.getByRole('button',{name:'确认答案 →',exact:true}).click();const practiced=await database(page);expect(practiced.practiceAnswers.length).toBe(formal.practiceAnswers.length+1);expect(practiced.history).toEqual(formal.history)
 await go(page,'home');await expect(values(page)).toHaveText(['5','0','5']);await expect(card(page).locator('.learning-rate-number')).toHaveText('100');await page.locator('.home-word-actions .wp-button').first().click();await go(page,'settings');await go(page,'home');const after=await database(page);for(const key of ['history','cards','gems','rewardIds','pets','courseProgress'])expect(after[key]).toEqual(practiced[key])
})
