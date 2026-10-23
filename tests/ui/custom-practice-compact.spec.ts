import {test,expect,type Page} from '@playwright/test'
import {selectCustomModes,go,database,setAppearance,waitForArtwork} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {customCourse} from '../helpers/custom-course'

async function seed(page:Page){const pack=customCourse();pack.title='合成三起点 五年级上册';const db={...freshDatabase(),version:2,abilityLevel:'L4',currentCourseId:pack.courseId,courseProgress:{[pack.courseId]:{currentLessonId:pack.courseId+'-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]};await page.addInitScript(({pack,db})=>{const key='wordpal.content.pack.custom-fixture.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]));if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},{pack,db})}
async function open(page:Page){await page.locator('.study-practice-entry-button').click();await expect(page.locator('[data-custom-screen=config]')).toBeVisible()}
const formal=(db:any)=>Object.fromEntries(Object.entries(db).filter(([key])=>!['customPractice','practiceAnswers','customPracticeCursors'].includes(key)))

for(const theme of ['clay','swiss'])for(const mode of ['light','dark'])test(`紧凑面板 ${theme} ${mode}：真实统计、图标、窄屏、安全区与大字体`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,mode);await seed(page);await go(page,'learn');await open(page)
 await expect(page.locator('.custom-count-input input')).toHaveValue('15');await expect(page.locator('.custom-book-copy')).toContainText('113 词 · 12 单元')
 await expect(page.locator('.custom-config.wp-card')).toHaveCount(1);await expect(page.locator('.custom-config .wp-card,.custom-config .avatar,.custom-companion-note,.custom-recovery-entry')).toHaveCount(0)
 await expect(page.getByText('额外练习 · 不计今日任务',{exact:true})).toHaveCount(1)
 // Narrow phones stack presets above the counter to preserve readable labels and 48px targets.
 await waitForArtwork(page);expect(await page.locator('.custom-config').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(page.viewportSize()!.height)
 expect(await page.locator('.custom-config img').evaluateAll(nodes=>nodes.every(n=>(n as HTMLImageElement).naturalWidth===256))).toBe(true)
 await page.screenshot({path:test.info().outputPath(`${theme}-${mode}-phone.png`),fullPage:true})
 for(const width of [320,359,390,768,1280]){
  await page.setViewportSize({width,height:width>1000?800:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  expect(await page.locator('.custom-config .study-mode-tile').evaluateAll(nodes=>nodes.every(n=>{const b=n.getBoundingClientRect();return b.width>=48&&b.height>=48}))).toBe(true)
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await expect.poll(async()=>{const status=await page.locator('.custom-mode-status').boundingBox(),footer=await page.locator('.custom-action-bar').boundingBox();return status!.y+status!.height<=footer!.y}).toBe(true)
  await expect(page.getByRole('button',{name:/^开始(?:连续训练|练习)$/})).toBeInViewport()
 }
 await page.screenshot({path:test.info().outputPath(`${theme}-${mode}-tablet.png`),fullPage:true})
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await page.setViewportSize({width:390,height:844});await waitForArtwork(page)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:test.info().outputPath(`${theme}-${mode}-large-text.png`),fullPage:true})
})

for(const value of [5,10,20,50,100,113])test(`预设 ${value} 词按教材顺序启动、全部不截断且重复点击不重建`,async({page})=>{
 await seed(page);await go(page,'learn');const before=formal(await database(page));await open(page)
 await page.getByRole('group',{name:'快捷练习词数'}).getByRole('button',{name:value===113?'全部 113 词':`${value} 词`,exact:true}).click();await expect(page.locator('.custom-count-input input')).toHaveValue(String(value))
 await page.getByRole('button',{name:/^开始(?:连续训练|练习)$/}).evaluate((el:HTMLElement)=>{el.click();el.click()});await expect(page.locator('[data-custom-screen=training]')).toBeVisible()
 const db=await database(page);expect(db.customPractice.wordIds).toEqual(Array.from({length:value},(_,i)=>'custom-fixture-w'+String(i+1).padStart(3,'0')));expect(db.customPractice.modes).toEqual(['flash']);expect(formal(db)).toEqual(before)
})

test('范围收敛、空单元阻断、教材选择与连续开关共用真实状态',async({page})=>{
 await seed(page);await go(page,'learn');const before=await database(page);await open(page)
 await page.getByRole('button',{name:'指定单元',exact:true}).click();await expect(page.locator('.custom-count-input input')).toHaveValue('10');await expect(page.getByRole('button',{name:'20 词，超出当前范围',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Unit 1',exact:true}).click();await expect(page.getByRole('button',{name:/^开始(?:连续训练|练习)$/})).toBeDisabled();await expect(page.locator('.custom-count-section .error')).toContainText('没有可练习')
 await page.getByRole('button',{name:'Unit 2',exact:true}).click();await page.getByRole('button',{name:'全部 10 词',exact:true}).click()
 await page.getByRole('button',{name:'全选五项',exact:true}).click();await expect(page.locator('.custom-config .study-mode-tile[aria-pressed=true]')).toHaveCount(5)
 await page.getByRole('button',{name:/^拼写，/}).click();await expect(page.getByRole('button',{name:'全选五项',exact:true})).toBeVisible();await expect(page.locator('.custom-config .study-mode-tile[aria-pressed=true]')).toHaveCount(4)
 await page.getByRole('button',{name:'更换教材',exact:true}).click();const books=page.getByRole('group',{name:'选择练习教材'});await expect(books.getByRole('button',{name:/合成三起点/})).toBeVisible();await books.getByRole('button',{name:/WordPal|原创启蒙/}).first().click();await expect(page.locator('.custom-book-copy')).not.toContainText('合成三起点');expect(await database(page)).toEqual(before)
})

test('新配置不覆盖断点，取消替换后可直接恢复原草稿',async({page})=>{
 await go(page,'learn');await open(page);await selectCustomModes(page,['spell']);await page.getByRole('button',{name:/^开始(?:连续训练|练习)$/}).click();await page.locator('.spelling-input input').fill('ca');const original=(await database(page)).customPractice
 await page.getByRole('button',{name:'暂停练习',exact:true}).click();await page.getByRole('button',{name:'返回学习或暂停自定义练习',exact:true}).click();await open(page)
 await expect(page.locator('.custom-recovery-entry')).toContainText('拼写 0/10');await page.getByRole('button',{name:'5 词',exact:true}).click();await page.getByRole('button',{name:/^开始(?:连续训练|练习)$/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'保留上次练习',exact:true}).click()
 expect((await database(page)).customPractice.id).toBe(original.id);await page.getByRole('button',{name:'继续上次自定义练习',exact:true}).click();await expect(page.locator('.spelling-input input')).toHaveValue('ca');const recovered=(await database(page)).customPractice;expect(recovered.wordIds).toEqual(original.wordIds);expect(recovered.index).toBe(original.index);expect(recovered.modes).toEqual(original.modes)
})
