import {test,expect,type Page} from '@playwright/test'
import {go,app,database,seedDatabase,setAppearance,answerParentGate} from './helpers'
import {goldenDatabase} from './fixtures'
import {freshDatabase} from '../../src/stores/profile'
import {customCourse} from '../helpers/custom-course'
import manifest from '../../src/manifest.json'

const setting=(page:Page,name:string)=>page.getByRole('switch',{name,exact:true})
async function fixture(page:Page){await setAppearance(page,'clay','light',{reducedMotion:false});await seedDatabase(page,goldenDatabase());await page.setViewportSize({width:390,height:844});await go(page,'settings')}
async function expectArtworkLayout(page:Page){
 for(const theme of ['swiss','clay']){
  const image=page.locator(`[data-preview="${theme}"] .theme-preview-artwork img`)
  await expect(image).toHaveAttribute('src',new RegExp('/settings/preview-'+theme+'\\.png$'));await expect(image).toHaveJSProperty('naturalWidth',768);await expect(image).toHaveJSProperty('naturalHeight',512)
 }
 await expect(page.locator('.settings-heading-illustration img')).toHaveJSProperty('naturalWidth',768)
 const geometry=await page.locator('.settings-page').evaluate(root=>{
  const rect=(selector:string)=>root.querySelector(selector)!.getBoundingClientRect(),copy=rect('.settings-heading-copy'),art=rect('.settings-heading-illustration')
  return {gap:art.left-copy.right,centerDelta:Math.abs(copy.top+copy.height/2-art.top-art.height/2),artRatio:art.width/art.height,cards:['swiss','clay'].map(id=>{const card=rect(`[data-theme-choice="${id}"]`),preview=rect(`[data-preview="${id}"]`);return {width:card.width,height:card.height,previewWidth:preview.width,previewHeight:preview.height}})}
 })
 expect(geometry.gap).toBeGreaterThanOrEqual(11);expect(geometry.centerDelta).toBeLessThanOrEqual(1);expect(geometry.artRatio).toBeCloseTo(768/464,2)
 for(const key of ['width','height','previewWidth','previewHeight'] as const)expect(Math.abs(geometry.cards[0][key]-geometry.cards[1][key]),key).toBeLessThanOrEqual(1)
}

test('五个紧凑区块、真实版本、完整图标与五项导航，设置页无宠物且档案保留',async({page})=>{
 await fixture(page);const before=await database(page)
 await expect(page.locator('.settings-card')).toHaveCount(5);await expect(page.locator('.settings-page .pet-companion-card,.settings-pet,.settings-summary')).toHaveCount(0);await expect(page.locator('.settings-version')).toHaveText('单词小搭子 · v'+manifest.versionName)
 await expect(page.locator('.settings-appearance .settings-toggle-row')).toHaveCount(3);await expect(setting(page,'高对比度')).toHaveCount(0);await expect(setting(page,'动态色')).toHaveCount(0);await expect(page.locator('[data-setting="highContrast"],[data-setting="dynamicColor"]')).toHaveCount(0)
 await expect(page.locator('.settings-page')).not.toContainText('录音不上传');await expect(page.locator('.settings-page')).not.toContainText('不使用广告');await expect(page.locator('.settings-page')).not.toContainText('当前使用中');await expect(page.locator('.settings-page')).not.toContainText('点击切换')
 for(const image of await page.locator('.settings-artwork img').all())await expect(image).toHaveJSProperty('naturalWidth',256)
 const nav=page.getByRole('navigation',{name:'底部导航'});expect(await nav.getByRole('button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).toEqual(['首页','学习','宠物屋','单词本','设置']);await expect(nav.getByRole('button',{name:'设置',exact:true})).toHaveAttribute('aria-current','page')
 await nav.getByRole('button',{name:'宠物屋',exact:true}).click();await expect(page.locator('.lh-stage')).toBeVisible();await nav.getByRole('button',{name:'设置',exact:true}).click();expect(await database(page)).toEqual(before)
})

test('整行开关一次触发并持久化，视觉辅助和声音触感相互独立',async({page})=>{
 await fixture(page);const before=await database(page)
 for(const [label,key,expected]of [['减少动效','reducedMotion',true],['大字体','largeText',true],['屏幕阅读器提示','screenReaderLabels',false]] as const){
  await page.locator('.settings-toggle-row').filter({has:setting(page,label)}).locator('.strong').click();await expect(setting(page,label)).toHaveAttribute('aria-checked',String(expected));expect(await page.evaluate(({key})=>JSON.parse(localStorage.getItem('wordpal.appearance.v1')!)[key],{key})).toBe(expected)
 }
 await expect(app(page)).toHaveClass(/large-text/);await expect(app(page)).toHaveClass(/reduce-motion/)
 expect(await page.evaluate(()=>localStorage.getItem('wordpal.feedback.v1'))).toBeNull();await setting(page,'正确回答轻震动').click();await expect(setting(page,'正确回答轻震动')).toHaveAttribute('aria-checked','false');await setting(page,'学习发音').click();await expect(page.locator('.settings-preview-audio')).toHaveAttribute('aria-disabled','true')
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.feedback.v1')!))).toEqual({sound:false,haptics:false})
 const saved=await page.evaluate(()=>localStorage.getItem('wordpal.appearance.v1'));await page.reload();expect(await page.evaluate(()=>localStorage.getItem('wordpal.appearance.v1'))).toBe(saved);await expect(setting(page,'大字体')).toHaveAttribute('aria-checked','true');expect(await database(page)).toEqual(before)
})

test('主题及明暗重复点击保持选中，移除的配置不随平台能力重新出现',async({page})=>{
 await fixture(page);const before=await database(page),clay=page.locator('[data-theme-choice="clay"]'),modes=page.getByRole('group',{name:'明暗模式',exact:true})
 for(let i=0;i<5;i++){await clay.click();await expect(clay).toHaveAttribute('aria-pressed','true');await expect(clay).toHaveAttribute('aria-current','true')}
 const dark=modes.getByRole('button',{name:'深色',exact:true});for(let i=0;i<4;i++){await dark.click();await expect(dark).toHaveAttribute('aria-pressed','true')};await page.emulateMedia({colorScheme:'light'});await expect(app(page)).toHaveAttribute('data-mode','dark')
 await modes.getByRole('button',{name:'跟随系统',exact:true}).click();await page.emulateMedia({colorScheme:'light'});await expect(app(page)).toHaveAttribute('data-mode','light');await page.emulateMedia({colorScheme:'dark'});await expect(app(page)).toHaveAttribute('data-mode','dark')
 await expect(setting(page,'动态色')).toHaveCount(0);await expect(setting(page,'高对比度')).toHaveCount(0);await expect(page.locator('.settings-page')).not.toContainText('当前平台不提供壁纸配色')
 await page.evaluate(async()=>{const {useThemeStore}=await import('/src/stores/theme.ts' as string);useThemeStore().systemAccent='#346dcc'});await expect(setting(page,'动态色')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.appearance.v1')!).dynamicColor)).toBe(false)
 expect(await database(page)).toEqual(before)
})

test('试听真实离线发音可重复、错误重试，关闭声音及离开设置即停止',async({page})=>{
 await fixture(page);const before=await database(page),audio=page.locator('.settings-preview-audio')
 for(let i=0;i<5;i++){await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing')}
 await expect(audio).toHaveAttribute('data-audio-state','idle');await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing')
 await page.evaluate(async()=>{const {audioPlayback}=await import('/src/services/audio/index.ts' as string);(audioPlayback as any).fail('合成播放失败，请重试。')});await expect(audio).toHaveAttribute('data-audio-state','error');await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing');await setting(page,'学习发音').click();await expect(audio).toHaveAttribute('data-audio-state','missing')
 expect(await page.evaluate(async()=>{const {audioPlayback}=await import('/src/services/audio/index.ts' as string);return audioPlayback.isPlaying.value})).toBe(false);await setting(page,'学习发音').click();await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing');await page.getByRole('navigation',{name:'底部导航'}).getByRole('button',{name:'首页',exact:true}).click();expect(await page.evaluate(async()=>{const {audioPlayback}=await import('/src/services/audio/index.ts' as string);return audioPlayback.isPlaying.value})).toBe(false);expect(await database(page)).toEqual(before)
})

test('声音触感保存失败显示错误，重试成功才持久化且不损坏学习档案',async({page})=>{
 await fixture(page);const before=await database(page),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).failFeedback=true;Storage.prototype.setItem=function(key,value){if(key==='wordpal.feedback.v1'&&(window as any).failFeedback)throw Error('Synthetic storage full');return original.call(this,key,value)}})
 await setting(page,'正确回答轻震动').click();await expect(page.locator('.settings-feedback [role="status"]')).toContainText('暂时无法保存');expect(await page.evaluate(()=>localStorage.getItem('wordpal.feedback.v1'))).toBeNull();expect(errors).toEqual([])
 await page.evaluate(()=>(window as any).failFeedback=false);await setting(page,'正确回答轻震动').click();await expect(page.locator('.settings-feedback .notice.error')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.feedback.v1')!).haptics)).toBe(true);expect(await database(page)).toEqual(before)
})

test('家长验证后修改五种等级，设置概览与实际词数同步，不重写已保存学习记录',async({page})=>{
 await setAppearance(page,'clay','light');await seedDatabase(page,freshDatabase());await page.setViewportSize({width:390,height:844});await go(page,'settings');const before=await database(page)
 for(const [level,count]of [[1,5],[2,5],[3,10],[4,15],[5,20]]){
  await page.getByRole('button',{name:'家长设置',exact:true}).click();await expect(page.locator('.parent-gate')).toBeVisible();await expect(page.locator('.parent-learning-settings')).toHaveCount(0);await answerParentGate(page);await page.getByRole('radio',{name:new RegExp('L'+level)}).click();await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.locator('.settings-learning-value')).toHaveText(`学习等级 L${level} · 每批${count}词`)
 }
 const after=await database(page);for(const key of ['cards','history','pets','gems','currentCourseId'])expect(after[key]).toEqual(before[key])
})

test('数据管理沿用家长验证和确认文字，受控数据删除不清除外观及声音偏好',async({page})=>{
 await fixture(page);await setting(page,'正确回答轻震动').click();const preferences=await page.evaluate(()=>({appearance:localStorage.getItem('wordpal.appearance.v1'),feedback:localStorage.getItem('wordpal.feedback.v1')}))
 await page.getByRole('button',{name:'家长验证与数据管理',exact:true}).click();await expect(page.locator('.parent-gate')).toBeVisible();await expect(page.getByRole('button',{name:'删除本设备学习数据',exact:true})).toHaveCount(0);await answerParentGate(page)
 await page.getByRole('button',{name:'教材与数据工具',exact:true}).click();const erase=page.getByRole('button',{name:'删除本设备学习数据',exact:true});await expect(erase).toBeDisabled();await page.getByRole('textbox',{name:'输入删除确认文字',exact:true}).fill('删除');await expect(erase).toBeDisabled();await page.getByRole('textbox',{name:'输入删除确认文字',exact:true}).fill('删除学习数据');await expect(erase).toBeEnabled();await erase.click();await page.getByRole('button',{name:'确认清理学习数据',exact:true}).click();expect((await database(page)).cards).toEqual({});expect((await database(page)).gems).toBe(goldenDatabase().gems)
 expect(await page.evaluate(()=>({appearance:localStorage.getItem('wordpal.appearance.v1'),feedback:localStorage.getItem('wordpal.feedback.v1')}))).toEqual(preferences)
})

test('教材没有音频时禁用试听并解释，不创建假播放状态',async({page})=>{
 const pack=customCourse('settings-no-audio',3);for(const word of pack.vocabulary)word.audio=''
 const db={...freshDatabase(),version:2,currentCourseId:pack.courseId,courseProgress:{[pack.courseId]:{currentLessonId:'settings-no-audio-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]}
 await page.addInitScript(({pack,db})=>{const key='wordpal.content.pack.settings-no-audio.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{key,courseId:pack.courseId,archived:false,aliases:{}}]));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},{pack,db});await go(page,'settings');await expect(page.locator('.settings-preview-audio')).toHaveAttribute('aria-disabled','true');await expect(page.locator('.settings-feedback')).toContainText('当前教材暂无可试听的发音')
})

for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`设置紧凑布局 ${theme}/${mode} 手机平板、横屏及200%字体`,async({page})=>{
 test.setTimeout(60000);await setAppearance(page,theme,mode,{reducedMotion:true});await seedDatabase(page,goldenDatabase());await go(page,'settings');const before=await database(page)
 for(const width of [320,360,390,430,600,768,1024,1280]){
  await page.setViewportSize({width,height:width===1024?600:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('.settings-card')).toHaveCount(5)
  await expectArtworkLayout(page)
  const rows=await page.locator('.settings-toggle-row').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),c=n.querySelector('.settings-row-copy')!.getBoundingClientRect(),s=n.querySelector('.settings-switch-target')!.getBoundingClientRect();return {height:r.height,inside:s.right<=r.right+1&&c.right<=s.left+1,overflow:n.scrollWidth>n.clientWidth+1,target:s.height}}));expect(rows.every(r=>r.height>=52&&r.target>=48&&r.inside&&!r.overflow),JSON.stringify(rows)).toBe(true)
  if(width===390||width===1280)await page.screenshot({path:test.info().outputPath('settings-'+width+'.png'),fullPage:true})
 }
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expectArtworkLayout(page);await page.locator('.settings-about').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('settings-200-percent.png'),fullPage:true});const aboutBox=(await page.locator('.settings-about').boundingBox())!,navBox=(await page.locator('.bottom-nav').boundingBox())!;expect(aboutBox.y+aboutBox.height).toBeLessThanOrEqual(navBox.y+1);expect(await database(page)).toEqual(before)
})
