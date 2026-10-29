import {test,expect,type Page} from '@playwright/test'
import {go,database,setAppearance} from './helpers'
import {goldenDatabase} from './fixtures'
import {elements} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'

async function fixture(page:Page){
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[];db.session=null
 db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.map(word=>[word.id,'2026-10-17T08:00:00Z']))}}
 for(const id of elements)db.pets[id]={...db.pets[id],level:8,exp:700,equippedCosmetics:[]}
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
}
async function action(page:Page,label:string){await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:label,exact:true}).click()}
function learningOnly(db:Awaited<ReturnType<typeof database>>){const copy=JSON.parse(JSON.stringify(db));delete copy.companion;for(const p of Object.values(copy.pets) as any[])delete p.equippedCosmetics;return copy}

test('48种穿戴匹配当前精灵及形态，精确对齐高清原图且主题独立，学习档案不变',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:950});await fixture(page);await go(page,'pet');const before=learningOnly(await database(page))

 for(const [element,name]of [['water','玄冥'],['fire','祝融'],['earth','后土'],['wind','飞廉']]){
  await page.locator('.lh-companion').filter({hasText:name}).click()
  for(let form=1;form<=4;form++){
   await action(page,'成长');await page.locator('.pet-growth-panel .pet-form-card').nth(form-1).click();await action(page,'装扮')
   const preview=page.locator('.lh-stage');await expect(preview).toHaveAttribute('data-element',element);await expect(preview.locator('.lh-scene-actor-art')).toHaveAttribute('data-form',String(form))
   for(const [i,item]of ['ribbon','scarf','star'].entries()){
    await page.locator('.cosmetic-button').nth(i).click();const front=preview.locator('.lh-q-front img'),back=preview.locator('.lh-q-back img')
    await expect(front).toHaveAttribute('src',new RegExp(element+'-'+form+'-'+item+'-front[.]png$'));await expect(front).toHaveJSProperty('naturalWidth',960);await expect(back).toHaveCount(item==='star'?0:1);if(item!=='star')await expect(back).toHaveJSProperty('naturalHeight',1280)
    const valid=await preview.locator('.lh-q-wear').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect(),t=getComputedStyle(n).transform;return r.width>0&&r.height>0&&t!=='none'&&!t.includes('NaN')}));expect(valid).toBe(true)
    await page.locator('.cosmetic-button').nth(i).click();await expect(preview.locator('.lh-q-front')).toHaveCount(0)
   }
  }
 }
 expect(learningOnly(await database(page))).toEqual(before)
})

test('装扮预览随所选主题、精灵跨刷新恢复，手机平板和夜间大字无变形溢出',async({page})=>{
 await fixture(page);await setAppearance(page,'swiss','dark',{largeText:true});await go(page,'pet');await page.locator('.lh-companion').filter({hasText:'祝融'}).click();await action(page,'装扮');await page.locator('.cosmetic-button').nth(1).click();await page.reload();await action(page,'装扮')
 const preview=page.locator('.lh-stage');await expect(preview).toHaveAttribute('data-element','fire')
 for(const width of [320,390,834,1194]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const bg=await preview.locator('.lh-scene-canvas').boundingBox();expect(bg!.width/bg!.height).toBeCloseTo(1.5,1)}
 await page.setViewportSize({width:390,height:1000});await page.locator('.pet-dress-panel').screenshot({path:'test-results/pet-wearables-dark.png'})
})
