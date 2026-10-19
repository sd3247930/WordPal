import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase,openCustomPractice} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import synthetic from '../../src/content/synthetic/course.json'

const pack={...synthetic,courseId:'gallery-tool-demo',title:'卡片功能验收教材',publisher:'WordPal Tests',edition:'Card Edition'}
async function seedCourse(page:Page){await page.addInitScript(pack=>{const key='wordpal.content.pack.gallery-tool-demo.0123456789abcdef';if(!localStorage.getItem('wordpal.content.catalog.v2')){localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))}},pack)}
async function open(page:Page){await go(page,'learn');await page.getByRole('button',{name:'选择教材',exact:true}).click();await expect(page.locator('.gallery-tools')).toBeVisible()}
const tool=(page:Page,name:string)=>page.getByRole('group',{name:'教材选择功能'}).getByRole('button',{name,exact:true})

test('四卡片操作真实有效：卸载清理专属记录并保留其他教材学习档案',async({page})=>{
 await seedCourse(page);await page.addInitScript(()=>localStorage.setItem('wordpal.batch-uninstall.v1',JSON.stringify({targets:['old-finished'],done:['old-finished'],errors:[],currentId:null,total:1,completed:1,retainedWordCount:39})));const learned=pack.vocabulary[0].id;await seedDatabase(page,{...freshDatabase(),cards:{[learned]:newCard(learned,new Date('2100-01-01')),cat:newCard('cat',new Date('2100-01-01'))}});await open(page);const before=await database(page)
 await expect(page.locator('.gallery-tool')).toHaveCount(4);await expect(tool(page,'已安装')).toHaveAttribute('aria-pressed','true');await expect(tool(page,'已安装')).toContainText('2 本');await expect(tool(page,'逐册卸载')).toContainText('1 本')
 await tool(page,'查找教材').click();await expect(tool(page,'查找教材')).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('searchbox',{name:'搜索教材',exact:true})).toBeFocused()
 for(const keyword of ['卡片功能','WORDPAL TESTS','card edition']){await page.getByRole('searchbox',{name:'搜索教材',exact:true}).fill(keyword);await expect(page.locator('.course-gallery-card')).toHaveCount(1);await expect(page.locator('.course-gallery-card')).toContainText(pack.title)}
 await page.getByRole('searchbox',{name:'搜索教材',exact:true}).fill('不存在的教材');await expect(page.locator('.course-gallery-card')).toHaveCount(0);await expect(page.locator('.empty-small')).toBeVisible();await page.getByRole('button',{name:'清空教材搜索',exact:true}).click();await tool(page,'已安装').click();await expect(page.locator('.course-gallery-card')).toHaveCount(2)
 await tool(page,'逐册卸载').click();await expect(tool(page,'逐册卸载')).toHaveAttribute('aria-expanded','true');await expect(page.locator('.batch-uninstall')).toContainText(pack.title);expect(await database(page)).toEqual(before)
 await page.getByRole('button',{name:'卸载当前册',exact:true}).click();await expect(page.locator('.batch-uninstall')).toContainText('已卸载');await expect(tool(page,'已安装')).toContainText('1 本');const removed=await database(page);expect(removed.cards[learned]).toBeUndefined();expect(removed.cards.cat).toEqual(before.cards.cat);for(const field of ['history','pets','gems','rewardIds'])expect(removed[field]).toEqual(before[field]);await tool(page,'逐册卸载').click();await expect(page.locator('.batch-uninstall')).toHaveCount(0);await expect(tool(page,'逐册卸载')).toBeDisabled();await expect(tool(page,'逐册卸载')).toContainText('暂无可卸载教材')
 await tool(page,'查找教材').click();await page.getByRole('searchbox',{name:'搜索教材',exact:true}).fill(pack.title);await expect(page.locator('.course-gallery-card')).toHaveCount(0);await tool(page,'已安装').click();await expect(page.locator('.course-gallery-card')).toHaveCount(0);await page.getByRole('button',{name:'清空教材搜索',exact:true}).click();await expect(page.locator('.course-gallery-card')).toHaveCount(1);await tool(page,'返回学习').click();await expect(page.locator('.current-course-card')).toContainText('原创启蒙课程');expect(await database(page)).toEqual(removed)
})

test('返回学习保留当前草稿，独立打开的教材页也可返回学习',async({page})=>{
 await go(page,'learn');await page.getByRole('button',{name:'开始今日学习',exact:true}).click();await openCustomPractice(page);await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click();await page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true}).fill('ca');const before=await database(page);await page.getByRole('button',{name:'选择教材',exact:true}).click();await tool(page,'返回学习').click();await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toHaveValue('ca');expect(await database(page)).toEqual(before)
 await go(page,'course');await tool(page,'返回学习').click();await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toHaveValue('ca');expect(await database(page)).toEqual(before)
})

for(const theme of ['swiss'])test(`${theme} 四张功能卡适配手机平板和大字体，焦点及状态清晰`,async({page})=>{
 await seedCourse(page);await page.addInitScript(theme=>localStorage.setItem('wordpal.appearance.v1',JSON.stringify({themeId:theme,colorMode:theme==='oled'?'dark':'light',reducedMotion:true,largeText:true})),theme);await open(page)
 for(const width of [320,390,768,1024]){await page.setViewportSize({width,height:900});await expect(page.locator('.gallery-tool')).toHaveCount(4);const boxes=await page.locator('.gallery-tool').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:el.scrollWidth>el.clientWidth+1}}));expect(boxes.every(box=>box.height>=120&&!box.overflow)).toBe(true);expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(2);expect(width>=1000?Math.abs(boxes[0].y-boxes[3].y)<2:boxes[2].y>boxes[0].y).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);if([390,1024].includes(width))await page.screenshot({path:test.info().outputPath(`${theme}-${width}.png`)})}
 await tool(page,'查找教材').focus();await page.keyboard.press('Enter');await expect(tool(page,'查找教材')).toHaveAttribute('aria-pressed','true');await tool(page,'已安装').focus();await page.keyboard.press('Enter');await expect(tool(page,'已安装')).toHaveAttribute('aria-pressed','true')
})
