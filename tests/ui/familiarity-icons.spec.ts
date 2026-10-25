import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase,setAppearance} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {starterPack} from '../../src/services/content/ContentRegistry'
import type {Answer} from '../../packages/core_learning'
import {contrast} from '../../src/styles/themes'

const levels=['unseen','introduced','practicing','familiar','mastered','unrated']
const labels=['未学','初识','练习中','较熟悉','熟练掌握','待评估']
function fixture(){
 const db=freshDatabase()
 const answer=(wordId:string,day:number,mode:Answer['mode']='spell',source:Answer['source']='practice'):Answer=>({id:`familiarity-fixture:${wordId}:${day}`,wordId,rating:3,correct:true,at:`2026-10-${String(day).padStart(2,'0')}T07:00:00Z`,source,mode,input:''})
 db.practiceAnswers=[answer('dog',9,'flash'),answer('fish',9),answer('bird',8),answer('bird',9),answer('duck',7),answer('duck',8)]
 db.history=[answer('duck',9,'spell','review_due')]
 db.cards.egg=newCard('egg',new Date('2100-01-01'))
 return db
}
const occurrences=new Map<string,number>()
for(const unit of starterPack.units)for(const id of new Set(unit.lessons.flatMap(lesson=>lesson.wordIds)))occurrences.set(id,(occurrences.get(id)||0)+1)
const total=Array.from(occurrences.values()).reduce((a,b)=>a+b,0)
const expected={introduced:occurrences.get('dog')!,practicing:occurrences.get('fish')!,familiar:occurrences.get('bird')!,mastered:occurrences.get('duck')!,unrated:occurrences.get('egg')!}
const counts={unseen:total-Object.values(expected).reduce((a,b)=>a+b,0),...expected}
async function verifyCounts(page:Page,values:Record<string,number>){for(const level of levels)await expect(page.locator(`.familiarity-state[data-level="${level}"] .familiarity-state-count`)).toHaveText(String(values[level]))}

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字${largeText} 熟知度六图标两排三列且统计不变`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText,highContrast:largeText,reducedMotion:true});await seedDatabase(page,fixture());await go(page,'review');const before=await database(page);await page.getByRole('button',{name:/^查看教材全部单词 ·/}).click();await page.getByRole('button',{name:'查看范围熟知度',exact:true}).click()
 const summary=page.locator('.familiarity-summary'),grid=summary.locator('.familiarity-distribution');await verifyCounts(page,counts)
 for(const width of [320,390,600,768,1024,1280]){
  await page.setViewportSize({width,height:1100});await expect(grid.locator('.familiarity-state')).toHaveCount(6)
  expect(await grid.locator('.familiarity-state-label').allTextContents()).toEqual(labels)
  for(const image of await grid.locator('.familiarity-state-image img').all())await expect(image).toHaveJSProperty('naturalWidth',256)
  const metrics=await grid.evaluate(root=>({columns:getComputedStyle(root).gridTemplateColumns.split(' ').length,overflow:root.scrollWidth>root.clientWidth+1,items:Array.from(root.querySelectorAll('.familiarity-state')).map(item=>{const box=item.getBoundingClientRect(),art=item.querySelector('.familiarity-state-art')!.getBoundingClientRect(),text=item.querySelector('.familiarity-state-label')!.getBoundingClientRect();return {top:Math.round(box.top),inside:art.left>=box.left&&art.right<=box.right+1&&text.left>=box.left&&text.right<=box.right+1,overflow:item.scrollWidth>item.clientWidth+1,size:art.width}})}))
  expect(metrics.columns).toBe(3);expect(new Set(metrics.items.map(item=>item.top)).size).toBe(2);expect(metrics.overflow).toBe(false);expect(metrics.items.every(item=>item.inside&&!item.overflow&&item.size<=40)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const appearance=await grid.evaluate(root=>Array.from(root.children).map(item=>({width:item.getBoundingClientRect().width,expected:(root.getBoundingClientRect().width-parseFloat(getComputedStyle(root).columnGap)*2)/3,color:getComputedStyle(item.querySelector('.familiarity-state-label')!).color,background:getComputedStyle(item).backgroundColor})))
  const hex=(rgb:string)=>'#'+rgb.match(/\d+/g)!.slice(0,3).map(value=>Number(value).toString(16).padStart(2,'0')).join('')
  for(const item of appearance){expect(Math.abs(item.width-item.expected)).toBeLessThanOrEqual(1);expect(contrast(hex(item.color),hex(item.background))).toBeGreaterThanOrEqual(4.5)}
  if([390,768].includes(width))await summary.screenshot({path:test.info().outputPath(`summary-${width}.png`)})
 }
 expect(await grid.getByRole('button').count()).toBe(6)
 await summary.getByRole('button',{name:/^熟知度如何评估/}).click();await expect(summary.getByRole('status')).toContainText('浏览、收藏和听发音不会提高熟知度');await summary.getByRole('button',{name:/^熟知度如何评估/}).click();expect(await database(page)).toEqual(before)
})

test('教材范围统计与现有六状态筛选逐项对应，清除筛选后恢复整册数字',async({page})=>{
 await seedDatabase(page,fixture());await go(page,'review');const before=await database(page);await page.getByRole('button',{name:/^查看教材全部单词 ·/}).click();await page.getByRole('button',{name:'查看范围熟知度',exact:true}).click();await verifyCounts(page,counts)
 await page.getByRole('button',{name:/^筛选与排序/}).click()
 for(const [index,level]of levels.entries()){
  await page.locator('uni-picker[aria-label="教材词卡更多筛选"]').click();await page.locator('.uni-picker-select:visible .uni-picker-item').nth(index+1).click()
  await verifyCounts(page,Object.fromEntries(levels.map(key=>[key,key===level?counts[level as keyof typeof counts]:0])))
  const rows=page.locator('.course-word-row');expect(await rows.count()).toBe(Math.min(30,counts[level as keyof typeof counts]));for(const row of await rows.all())await expect(row).toHaveAttribute('data-familiarity',level)
 }
 await page.getByRole('button',{name:'清除筛选',exact:true}).click();await verifyCounts(page,counts);expect(await database(page)).toEqual(before)
})

test('图片加载失败保留六状态文字与真实统计，图标选择不改学习记录',async({page})=>{
 await page.route('**/static/icons/familiarity/*_256.png',route=>route.abort());await seedDatabase(page,fixture());await go(page,'review');const before=await database(page);await page.getByRole('button',{name:/^查看教材全部单词 ·/}).click();await page.getByRole('button',{name:'查看范围熟知度',exact:true}).click();await expect(page.locator('.familiarity-state-fallback')).toHaveCount(6);await verifyCounts(page,counts);await expect(page.locator('.familiarity-distribution').getByRole('button')).toHaveCount(6);expect(await database(page)).toEqual(before)
})
