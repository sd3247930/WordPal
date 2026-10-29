import {test,expect,type Page} from '@playwright/test'
import {goldenDatabase} from './fixtures'
import {go,database,setAppearance} from './helpers'
import {elements,petInfo} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'
import {lifeTab,expectNoOverflow} from './lifehouse-helpers'

const trio=['dress-cloud-clip-v1','dress-cloud-scarf-v1','dress-dream-moon-v1']
const card=(page:Page,id:string)=>page.locator('.cosmetic-button[data-item="'+id+'"]')
async function fixture(page:Page){const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[];db.session=null;db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.map(w=>[w.id,'2026-10-27T08:00:00Z']))}};for(const id of elements)db.pets[id]={...db.pets[id],level:8,exp:700,equippedCosmetics:[]};await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)}
const front=(page:Page)=>page.locator('.lh-stage .lh-scene-actor .lh-dress-front')
async function open(page:Page){await fixture(page);await setAppearance(page,'swiss','light');await go(page,'pet');await lifeTab(page,'装扮').click()}
async function wear(page:Page,id:string){await card(page,id).click();await expect(card(page,id)).toHaveAttribute('aria-pressed','true');await expect(page.locator('.lh-stage .lh-scene-actor .lh-dress-front[data-item="'+id+'"] img')).toHaveJSProperty('naturalWidth',768)}

test('九款新增分类、三槽同穿、同槽替换、取下、三连点与重启恢复',async({page})=>{
 await page.setViewportSize({width:390,height:950});await open(page);await expect(page.locator('.cosmetic-button')).toHaveCount(18)
 for(const [label,count]of [['头饰',4],['围巾',9],['徽章',5]] as const){await page.getByRole('group',{name:'装扮分类'}).getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.cosmetic-button')).toHaveCount(count)}
 await page.getByRole('group',{name:'装扮分类'}).getByRole('button',{name:'全部',exact:true}).click()
 for(const id of trio)await wear(page,id)
 await expect(front(page)).toHaveCount(3);await expect(page.locator('.dress-count')).toHaveText('已穿戴 3/3')
 await wear(page,'dress-moon-crown-v1');await expect(front(page)).toHaveCount(3);await expect(card(page,trio[0])).toHaveAttribute('aria-pressed','false')
 await card(page,trio[1]).click();await expect(front(page)).toHaveCount(2)
 for(let i=0;i<3;i++)await card(page,trio[1]).dispatchEvent('click')
 await expect.poll(async()=>(await database(page)).pets.water.equippedCosmetics.includes(trio[1])).toBe(true);await expect(front(page)).toHaveCount(3)
 const before=await database(page);await page.reload();await lifeTab(page,'装扮').click();await expect(front(page)).toHaveCount(3);expect(await database(page)).toEqual(before)
})
test('四象四阶段真实穿戴、原图对比、主体边界、跟随父节点与存档隔离',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:900,height:1400});await open(page)
 for(const element of elements){
  await page.getByRole('button',{name:'选择'+petInfo[element].name,exact:true}).click();await expect(front(page)).toHaveCount(0)
  await expect(page.locator('.lh-stage .lh-scene-actor-art')).toHaveAttribute('data-appearance','chibi')
  await page.locator('.lh-stage').screenshot({path:'test-results/dress-v1-'+element+'-before.png'})
  for(const id of trio)await wear(page,id)
  for(let form=1;form<=4;form++){
   await lifeTab(page,'成长').click();await page.locator('.pet-growth-panel .pet-form-card').nth(form-1).click();await lifeTab(page,'装扮').click()
   await expect(page.locator('.lh-stage .lh-scene-actor-art')).toHaveAttribute('data-form',String(form));await expect(front(page)).toHaveCount(3)
   const geometry=await front(page).evaluateAll(nodes=>nodes.every(node=>{const actor=node.closest('.lh-scene-actor-art')!.getBoundingClientRect(),r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=actor.left-1&&r.right<=actor.right+1&&r.top>=actor.top-1&&r.bottom<=actor.bottom+1}));expect(geometry).toBe(true)
   await lifeTab(page,'家园').click();await page.locator('.lh-stage').screenshot({path:'test-results/dress-v1-'+element+'-f'+form+'-three-slots.png'});await lifeTab(page,'装扮').click()
  }
  await lifeTab(page,'家园').click();await expect(front(page)).toHaveCount(3);await expect(page.locator('.lh-stage .lh-scene-actor .lh-scene-actor-art')).toHaveCount(1);await lifeTab(page,'装扮').click()
 }
 await page.getByRole('button',{name:'选择玄冥',exact:true}).click();await expect(front(page)).toHaveCount(3)
 for(const element of elements)expect((await database(page)).pets[element].equippedCosmetics).toEqual(trio)
})
test('缺失覆层与存储写失败保留原来的装备',async({page})=>{
 await open(page);await wear(page,trio[0]);const before=await database(page)
 await page.route('**/dress-v1/dream-moon-front.png',route=>route.abort())
 await card(page,trio[2]).click();await expect(page.locator('.lh-feedback')).toContainText('图片暂不可用',{timeout:12000});expect(await database(page)).toEqual(before);await expect(front(page)).toHaveCount(1)
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wordpal.database.v2')throw new DOMException('full','QuotaExceededError');return original.call(this,key,value)}})
 await card(page,'dress-moon-crown-v1').click();await expect(page.locator('.lh-feedback')).toContainText('装扮暂未保存');expect(await database(page)).toEqual(before);await expect(card(page,trio[0])).toHaveAttribute('aria-pressed','true')
})
test('资源请求进行中切换精灵，旧回调不能装备到新精灵',async({page})=>{
 await open(page);let release!:()=>void;const pending=new Promise<void>(resolve=>release=resolve)
 await page.route('**/dress-v1/moon-crown-front.png',async route=>{await pending;await route.continue()})
 await card(page,'dress-moon-crown-v1').click();await expect(page.locator('.lh-feedback')).toContainText('正在准备');await page.getByRole('button',{name:'选择祝融',exact:true}).click();release()
 await page.waitForLoadState('networkidle');await expect(front(page)).toHaveCount(0);const db=await database(page);expect(db.pets.water.equippedCosmetics).toEqual([]);expect(db.pets.fire.equippedCosmetics).toEqual([])
})
test('换装后五项底部导航仍可往返，学习和灵石记录保留',async({page})=>{
 await page.setViewportSize({width:390,height:950});await open(page);for(const id of trio)await wear(page,id)
 const before=await database(page),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 for(const [label,subtitle]of [['首页','Home'],['学习','Study'],['单词本','Wordbook'],['设置','Settings'],['宠物屋','PetHouse']]){await page.getByRole('navigation',{name:'底部导航'}).getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.wp-brand-header .brand-subtitle')).toHaveText(subtitle)}
 await lifeTab(page,'装扮').click();await expect(front(page)).toHaveCount(3);const after=await database(page);expect(after.gems).toBe(before.gems);expect(after.cards).toEqual(before.cards);expect(after.history).toEqual(before.history);expect(after.pets).toEqual(before.pets);expect(errors).toEqual([])
})
test('三组新增饰品在四象主场景中全部展示，走动时整组跟随',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:900,height:1200});await open(page)
 const sets=[['dress-dew-wreath-v1','dress-cloud-scarf-v1','dress-courage-sun-v1'],['dress-moon-crown-v1','dress-rainbow-cowl-v1','dress-growth-sprout-v1'],['dress-cloud-clip-v1','dress-wish-bow-v1','dress-dream-moon-v1']]
 for(const element of elements){await page.getByRole('button',{name:'选择'+petInfo[element].name,exact:true}).click();for(let i=0;i<sets.length;i++){for(const id of sets[i])await wear(page,id);await lifeTab(page,'家园').click();await expect(front(page)).toHaveCount(3);await page.locator('.lh-stage').screenshot({path:'test-results/dress-v1-'+element+'-set'+(i+1)+'.png'});await lifeTab(page,'装扮').click()}}
 await lifeTab(page,'家园').click();const actor=page.locator('.lh-stage .lh-scene-actor'),before=await actor.boundingBox();await page.locator('.lh-stage .lh-scene-canvas').click({position:{x:440,y:320}});await expect.poll(async()=>Math.abs((await actor.boundingBox())!.x-before!.x)).toBeGreaterThan(1)
 expect(await front(page).evaluateAll(nodes=>nodes.every(node=>node.closest('.lh-scene-actor')!==null))).toBe(true)
})
for(const [mode,large]of [['light',false],['dark',false],['dark',true]] as const)test(mode+' 大字='+large+' 手机平板边界、按钮触摸面积与底栏安全区',async({page})=>{
 await fixture(page);await setAppearance(page,'swiss',mode,{largeText:large,highContrast:large});await go(page,'pet');await lifeTab(page,'装扮').click()
 for(const width of [320,390,834,1194]){await page.setViewportSize({width,height:1000});await expectNoOverflow(page);const cards=await page.locator('.cosmetic-button').evaluateAll(nodes=>nodes.map(node=>({width:node.clientWidth,overflow:node.scrollWidth>node.clientWidth+1,cta:node.querySelector('.cosmetic-cta')!.getBoundingClientRect().height})));expect(cards.every(c=>!c.overflow&&c.cta>=44)).toBe(true)}
 await page.setViewportSize({width:390,height:1000});await page.locator('.dress-closet').screenshot({path:'test-results/dress-v1-'+mode+(large?'-large':'')+'.png'})
})
