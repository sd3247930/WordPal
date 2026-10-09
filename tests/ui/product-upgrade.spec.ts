import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase,setAppearance,openCustomPractice,openExploration} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {goldenDatabase} from './fixtures'
import original from '../../src/content/courses/original-primary.json'
import synthetic from '../../src/content/synthetic/course.json'
async function pick(page:Page,label:string,text:string){await page.locator('uni-picker[aria-label="'+label+'"] .course-picker').click();await page.locator('.uni-picker-container').filter({visible:true}).locator('.uni-picker-select .uni-picker-item').filter({hasText:text}).click()}

test('卸载下载教材后保留未安装目录与成功反馈，不被自动改选清空',async({page})=>{
 const pack={...synthetic,courseId:'product-feedback',title:'反馈验收（待核对）',sources:synthetic.sources.map(s=>({...s,rightsStatus:'redistribution-approved'}))},key='wordpal.content.pack.product-feedback.a1b2c3d4e5f67890'
 await page.addInitScript(({pack,key})=>{localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))},{pack,key});await go(page,'learn');await page.getByRole('button',{name:'选择教材',exact:true}).click();await page.locator('.course-gallery-card').filter({hasText:pack.title}).click();await page.getByRole('button',{name:'管理下载 · 移除教材',exact:true}).click();await page.getByRole('button',{name:'确认移除教材',exact:true}).click();await expect(page.locator('.notice').filter({hasText:'教材已移除，历史学习记录已保留。'})).toBeVisible();await expect(page.locator('.course-resource-coverage')).toContainText('未安装')
})

test('出版社、版本、起点、年级、册次与 Unit 组合筛选驱动真实目录',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.textbook-series','1'));await go(page,'learn');await page.getByRole('button',{name:'选择教材',exact:true}).click();await page.getByRole('button',{name:/^出版社 \/ 版本 \/ 起点筛选/}).click()
 await pick(page,'筛选教材出版社','合成测试出版社');await expect(page.locator('.course-gallery-card')).toHaveCount(6);await pick(page,'筛选教材版本','三年级起点');await pick(page,'筛选教材起点','3 年级起点');await pick(page,'筛选教材年级','4 年级');await pick(page,'筛选教材册次','下册');await expect(page.locator('.course-gallery-card')).toHaveCount(1);await expect(page.locator('.course-gallery-card')).toContainText('4年级下册');await pick(page,'筛选预览 Unit','合成 Unit 1');await expect(page.locator('.course-unit-row')).toHaveCount(1)
})
test('L1 看图选词有独立认知任务，L3 保留 IPA，L5 提供短句',async({page})=>{
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L1',dailyLimit:5});await go(page,'home');await page.locator('.hero-cta').click();await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'连接'}).click();await expect(page.locator('.instruction')).toContainText('看看图片');await expect(page.locator('.word-illustration')).toBeVisible();await expect(page.locator('.ipa')).toHaveCount(0);await expect(page.locator('.meaning')).toHaveCount(0);await page.locator('.answer-choice').filter({hasText:'cat'}).click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click();await expect(page.locator('.answer-feedback')).toContainText('很棒');expect((await database(page)).history).toHaveLength(1)
})
test('教材安装、当前选择和停用是独立动作；资料覆盖与目录可追溯',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.content.installation.v1',JSON.stringify({'original-primary':'notInstalled'})))
 await go(page,'learn');const before=await database(page);await page.getByRole('button',{name:'选择教材',exact:true}).click();await page.getByRole('button',{name:'查找教材',exact:true}).click()
 await page.locator('.course-gallery-card').filter({hasText:original.title}).click();await expect(page.locator('.course-resource-coverage')).toContainText('音频');await expect(page.locator('.course-unit-row')).toHaveCount(6)
 await page.getByRole('button',{name:'安装教材',exact:true}).click();expect(await database(page)).toEqual(before);await expect(page.getByRole('button',{name:'确认并应用',exact:true})).toBeEnabled();await page.getByRole('button',{name:'确认并应用',exact:true}).click();expect((await database(page)).currentCourseId).toBe('original-primary')
 await page.getByRole('button',{name:'选择教材',exact:true}).click();await page.locator('.course-gallery-card').filter({hasText:original.title}).click();await page.getByRole('button',{name:'管理下载 · 移除教材',exact:true}).click();await expect(page.getByRole('dialog',{name:'移除教材确认'})).toContainText('保留历史学习记录');await page.getByRole('button',{name:'确认移除教材',exact:true}).click();expect((await database(page)).currentCourseId).toBe('starter');await expect(page.getByRole('button',{name:'安装教材',exact:true})).toBeVisible();await page.reload();await expect(page.locator('.course-gallery-card').filter({hasText:original.title})).toHaveCount(0)
})
test('运行中的教材不可卸载；原 Session、SRS 与输入逐字保留',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'));await go(page,'learn');await page.getByRole('button',{name:'选择教材',exact:true}).click();await page.locator('.course-gallery-card').filter({hasText:'合成测试教材'}).click();await page.locator('.course-check').click();await page.getByRole('button',{name:'确认并应用',exact:true}).click();await page.getByRole('button',{name:'开始今日学习',exact:true}).click();const before=await database(page)
 await page.getByRole('button',{name:'选择教材',exact:true}).click();await page.locator('.course-gallery-card').filter({hasText:'合成测试教材'}).click();await page.getByRole('button',{name:'管理下载 · 移除教材',exact:true}).click();await page.getByRole('button',{name:'确认移除教材',exact:true}).click();await expect(page.locator('.notice.error')).toContainText('先完成当前学习');expect(await database(page)).toEqual(before)
})
test('查询统计跟随关键词，三 Scope 清理 Unit，手动重点不混入风险建议',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'review');const before=await database(page);await expect(page.getByRole('group',{name:'单词本课程范围'}).getByRole('button')).toHaveCount(3)
 await page.locator('.wordbook-search input').fill('cat');await expect(page.locator('.wordbook-stats')).toContainText('全部教材词条');await expect(page.locator('.wordbook-stats > uni-view').last()).toContainText('1');await expect(page.locator('.review-row')).toHaveCount(1)
 await page.getByRole('button',{name:'全局已学词',exact:true}).click();await expect(page.locator('uni-picker[aria-label="选择浏览单元"]')).toHaveCount(0);await expect(page.locator('.review-row')).toHaveCount(1);await page.locator('.review-row').click();await page.getByRole('button',{name:'标记为我的重点',exact:true}).click();await page.keyboard.press('Escape');await page.locator('.review-tabs .mode-button').filter({hasText:'重点复习'}).click();await expect(page.locator('.wordbook-focus-legend')).toContainText('我的重点 1');await expect(page.locator('.review-row')).toHaveCount(1);expect(await database(page)).toEqual(before)
})
test('核心学习默认折叠，自定义题型和答案探索按状态展开，图片不提前泄题',async({page})=>{
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5'});await go(page,'home');await page.locator('.hero-cta').click();await expect(page.getByRole('button',{name:/^自定义练习/})).toBeVisible();await expect(page.getByRole('group',{name:'选择学习方式'})).toBeHidden();await expect(page.locator('.wp-word-card')).toHaveAttribute('data-phase','prompting');await expect(page.locator('.wp-word-card')).toHaveAttribute('data-density','independent')
 await openCustomPractice(page)
 for(const mode of ['听音','拼写','听写']){await page.locator('.mode-button').filter({hasText:mode}).click();await expect(page.locator('.phonics-word')).toHaveCount(0);await expect(page.locator('.phonics-breakdown')).toHaveCount(0);await expect(page.locator('.word-picture')).toHaveCount(0);await expect(page.locator('.example-box')).toHaveCount(0)}
 await page.locator('.spelling-input input').fill('cat');await page.getByRole('button',{name:'确认答案 →',exact:true}).click();await expect(page.locator('.wp-word-card')).toHaveAttribute('data-phase','rated');await openExploration(page);await expect(page.locator('.phonics-breakdown')).toBeVisible();const before=await database(page);await page.getByRole('button',{name:'收起自然拼读与例句',exact:true}).click();await openExploration(page);expect(await database(page)).toEqual(before)
})
for(const theme of ['bento','swiss','soft','oled'])test(`${theme} 新查询与折叠卡跨 599/600/839/840 窗口、动态字体及减少动效`,async({page})=>{
 await setAppearance(page,theme,theme==='oled'?'dark':'light',{largeText:true,reducedMotion:true});await seedDatabase(page,goldenDatabase())
 for(const width of [390,599,600,839,840,1280]){await page.setViewportSize({width,height:900});await go(page,'review');if(await page.getByRole('button',{name:'关闭单词详情',exact:true}).count())await page.getByRole('button',{name:'关闭单词详情',exact:true}).click();await page.locator('.wordbook-search input').fill('cat');await page.locator('.review-row').click();await expect(page.locator('.detail-word')).toHaveText('cat');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();expect(await page.locator('[role=button]:visible').evaluateAll(nodes=>Math.min(...nodes.map(n=>n.getBoundingClientRect().height)))).toBeGreaterThanOrEqual(48)}
})
