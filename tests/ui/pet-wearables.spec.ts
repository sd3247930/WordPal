import {test,expect,type Page} from '@playwright/test'
import {go,database,setAppearance} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'

async function fixture(page:Page){
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[];db.session=null
 db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},introducedWords:Object.fromEntries(starterPack.vocabulary.map(word=>[word.id,'2026-10-17T08:00:00Z']))}}
 for(const id of elements)db.pets[id]={...db.pets[id],level:8,exp:700,equippedCosmetics:[]}
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
}
async function action(page:Page,label:string){await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:label,exact:true}).click()}
function learningOnly(db:Awaited<ReturnType<typeof database>>){const copy=JSON.parse(JSON.stringify(db));delete copy.companion;for(const p of Object.values(copy.pets) as any[])delete p.equippedCosmetics;return copy}

test('48种穿戴匹配当前精灵及形态，精确对齐高清原图且主题独立，学习档案不变',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:950});await fixture(page);await go(page,'pet');const before=learningOnly(await database(page))
 await page.getByRole('button',{name:'土之主题',exact:true}).click()
 for(const [element,name]of [['water','玄冥'],['fire','祝融'],['earth','后土'],['wind','飞廉']]){
  await page.locator('.pet-choice').filter({hasText:name}).click()
  for(let form=1;form<=4;form++){
   await action(page,'成长');await page.locator('.pet-growth-panel .pet-form-card').nth(form-1).click();await action(page,'装扮')
   const preview=page.locator('.dress-preview');await expect(preview).toHaveAttribute('data-element',element);await expect(preview).toHaveAttribute('data-form',String(form));await expect(preview).toHaveAttribute('data-scene','earth');await expect(preview.locator('.dress-scene img')).toHaveAttribute('src',/earth-scene[.]jpg$/)
   for(const [i,item]of ['ribbon','scarf','star'].entries()){
    await page.locator('.cosmetic-button').nth(i).click();const front=preview.locator('.pet-accessory img'),back=preview.locator('.pet-wearable-back img')
    await expect(front).toHaveAttribute('src',new RegExp(element+'-'+form+'-'+item+'-front[.]png$'));await expect(front).toHaveJSProperty('naturalWidth',960);await expect(back).toHaveJSProperty('naturalHeight',1280)
    const sizes=await preview.locator('.pet-cutout').evaluate(el=>{const base=el.querySelector('.pet-cutout-image')!.getBoundingClientRect();return Array.from(el.querySelectorAll('.pet-wearable-layer')).map(node=>{const r=node.getBoundingClientRect();return Math.max(Math.abs(r.x-base.x),Math.abs(r.y-base.y),Math.abs(r.width-base.width),Math.abs(r.height-base.height))})});expect(sizes.every(delta=>delta<.1)).toBe(true)
    const model=await preview.locator('.dress-model').boundingBox(),image=await preview.locator('.pet-cutout-image').boundingBox();expect(image!.x>=model!.x-1&&image!.y>=model!.y-1&&image!.x+image!.width<=model!.x+model!.width+1&&image!.y+image!.height<=model!.y+model!.height+1).toBe(true)
    await page.locator('.cosmetic-button').nth(i).click();await expect(preview.locator('.pet-accessory')).toHaveCount(0)
   }
  }
 }
 expect(learningOnly(await database(page))).toEqual(before)
})

test('装扮预览随所选主题、精灵跨刷新恢复，手机平板和夜间大字无变形溢出',async({page})=>{
 await fixture(page);await setAppearance(page,'swiss','dark',{largeText:true});await go(page,'pet');await page.getByRole('button',{name:'风之主题',exact:true}).click();await page.locator('.pet-choice').filter({hasText:'祝融'}).click();await action(page,'装扮');await page.locator('.cosmetic-button').nth(1).click();await page.reload();await action(page,'装扮')
 const preview=page.locator('.dress-preview');await expect(preview).toHaveAttribute('data-element','fire');await expect(preview).toHaveAttribute('data-scene','wind');await expect(preview.locator('.dress-wearing-state')).toContainText('暖暖围巾')
 for(const width of [320,390,834,1194]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const bg=await preview.locator('.dress-scene').boundingBox(),p=await preview.boundingBox();expect(bg!.width).toBeCloseTo(p!.width-2,0);expect(bg!.height).toBeCloseTo(p!.height-2,0)}
 await page.setViewportSize({width:390,height:1000});await page.locator('.pet-dress-panel').screenshot({path:'test-results/pet-wearables-dark.png'})
})
