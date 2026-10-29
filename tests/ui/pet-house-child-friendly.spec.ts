import {test,expect,type Page} from '@playwright/test'
import {openLife,lifeFixture,lifeTab,selectCompanion,expectNoOverflow} from './lifehouse-helpers'
import {database,go,seedDatabase,setAppearance,waitForArtwork} from './helpers'
import {elements} from '../../packages/pet_engine'
const section=(p:Page,name:string)=>p.getByRole('group',{name:'家园布置工具',exact:true}).getByRole('button',{name,exact:true})
const filter=(p:Page,name:string)=>p.getByRole('group',{name:'家具分类',exact:true}).getByRole('button',{name,exact:true})
async function equalSegments(p:Page,selector:string,count:number){const rects=await p.locator(selector).evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height}}));expect(rects).toHaveLength(count);expect(Math.max(...rects.map(r=>r.width))-Math.min(...rects.map(r=>r.width))).toBeLessThan(1);expect(Math.min(...rects.map(r=>r.height))).toBeGreaterThanOrEqual(44)}

test('三层导航分区准确、五种商品筛选不重复、房屋与庭院使用真实数据',async({page})=>{
 await openLife(page,{level:3});const before=await database(page)
 await equalSegments(page,'.lh-companion',4);await equalSegments(page,'.lh-tabs .lh-tab',5);await equalSegments(page,'.lh-build-tools .wp-action-tile',5);await equalSegments(page,'.lh-furniture-filters .wp-action-tile',5)
 for(const [name,category]of [['休息','rest'],['功能','function'],['活动','activity'],['装饰','decor']]){await filter(page,name).click();expect(await page.locator('.lh-product').evaluateAll(es=>es.map(e=>e.getAttribute('data-category')))).toEqual(expect.arrayContaining([category]));expect(await page.locator('.lh-product').evaluateAll((es,category)=>es.every(e=>e.getAttribute('data-category')===category),category)).toBe(true)}
 await section(page,'房屋').click();await expect(page.locator('.lh-builder')).toHaveAttribute('data-section','room');await expect(page.locator('.lh-room-level')).toContainText('Lv.3');await expect(page.locator('.lh-catalog,.lh-furniture-filters')).toHaveCount(0);await page.getByRole('button',{name:'查看家园区域泡泡花园',exact:true}).click();await expect(page.locator('.lh-stage .lh-scene-canvas')).toHaveAttribute('data-zone','garden');await expect(page.locator('.lh-builder-title')).toContainText('从一间小屋开始')
 await section(page,'装饰').click();await expect(page.locator('.lh-furniture-filters')).toHaveCount(0);expect(await page.locator('.lh-product').evaluateAll(es=>es.every(e=>e.getAttribute('data-category')==='decor'))).toBe(true)
 await section(page,'庭院').click();await expect(page.locator('.lh-product')).toHaveCount(1);await page.locator('.lh-product').click();await expect(page.locator('.lh-slot-options .wp-action-tile')).toHaveCount(1);await expect(page.locator('.lh-slot-options')).toHaveText('小花园');await page.getByRole('button',{name:'取消摆放预览',exact:true}).click()
 for(const name of ['喂食','成长','装扮','相册']){await lifeTab(page,name).click();await expect(page.locator('.lh-builder,.lh-furniture-filters')).toHaveCount(0)}expect(await database(page)).toEqual(before)
})

test('庭院未解锁不出现误购入口，收纳箱保留已摆放赠品并能免费取出',async({page})=>{
 await openLife(page,{level:1});const before=await database(page);await section(page,'庭院').click();await expect(page.locator('.lh-builder-empty')).toContainText('Lv.3');await expect(page.locator('.lh-catalog,.lh-placement-panel')).toHaveCount(0);await section(page,'收纳箱').click();await expect(page.locator('.lh-product')).toHaveCount(1);await expect(page.locator('.lh-product')).toContainText('已放置');await page.locator('.lh-product').click();await expect(page.getByRole('dialog')).toContainText('升级赠礼');await page.getByRole('button',{name:'收纳 · 不返灵石',exact:true}).click();await expect(page.locator('.lh-product')).toContainText('已拥有');await page.locator('.lh-product').click();await page.getByRole('button',{name:'确认放置 · 免费',exact:true}).click();await expect(page.locator('.lh-product')).toContainText('已放置');expect((await database(page)).gems).toBe(before.gems);expect((await database(page)).lifeHouse.housesByElement.water.owned).toEqual(before.lifeHouse.housesByElement.water.owned)
})

test('图片失败不给购买，重试后能取消预览而不扣费',async({page})=>{
 const image='**/lifehouse/v2/items/water/furniture/l1/water-furniture-l1-v1-512.png';await page.route(image,r=>r.abort());await openLife(page,{level:1});const before=await database(page);await page.locator('.lh-product').filter({hasText:'贝壳小床'}).click();await expect(page.locator('.lh-placement-panel')).toContainText('图片暂不可用');await expect(page.getByRole('button',{name:'确认购买并放置',exact:true})).toBeDisabled();expect(await database(page)).toEqual(before);await page.unroute(image);await page.getByRole('button',{name:'重试家具预览图片',exact:true}).click();await expect(page.getByRole('button',{name:'确认购买并放置',exact:true})).toBeEnabled();await page.getByRole('button',{name:'取消摆放预览',exact:true}).click();expect(await database(page)).toEqual(before)
})

test('二十次快速切换无旧预览、串图与扣费，快捷相册和帮助继续可用',async({page})=>{
 test.setTimeout(60000);await openLife(page,{level:3});const before=await database(page),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('.lh-product').filter({hasText:'贝壳小床'}).click()
 for(let i=0;i<20;i++){const id=elements[(i+1)%4];await selectCompanion(page,id);await expect(page.locator('.lh-stage .lh-scene-canvas')).toHaveAttribute('data-scene-element',id);await expect(page.locator('.lh-stage .lh-scene-actor-art')).toHaveAttribute('data-variant',new RegExp('chibi-'+id));await expect(page.locator('.lh-placement-panel,.lh-scene-ghost')).toHaveCount(0)}
 await page.getByRole('button',{name:'精灵屋帮助',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('四象各有一间家');await page.keyboard.press('Escape');await page.getByRole('button',{name:'打开家园相册',exact:true}).click();await expect(page.locator('.pet-album-panel')).toBeVisible();await lifeTab(page,'家园').click();await expect(page.getByRole('button',{name:'一起玩 · 4',exact:true})).toBeVisible();expect((await database(page)).lifeHouse).toEqual(before.lifeHouse);expect((await database(page)).gems).toBe(before.gems);expect(errors).toEqual([])
})

for(const [width,height]of [[360,740],[390,844],[412,915]])for(const large of [false,true])test(`小屏 ${width}×${height} ${large?'深色大字高对比':'浅色'} 的对齐、点击与滚动`,async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width,height});const db=lifeFixture(3,123456789);await seedDatabase(page,db);await setAppearance(page,'clay',large?'dark':'light',{largeText:large,highContrast:large,reducedMotion:true});await go(page,'pet');await expectNoOverflow(page)
 for(const selector of ['.lh-companion','.lh-tabs .lh-tab','.lh-build-tools .wp-action-tile','.lh-furniture-filters .wp-action-tile'])await equalSegments(page,selector,selector==='.lh-companion'?4:5)
 const clips=await page.locator('.lh-companion').evaluateAll(es=>es.filter(e=>{const outer=e.getBoundingClientRect();return Array.from(e.querySelectorAll('.lh-companion-name,.lh-companion-level,.lh-companion-art')).some(n=>{const r=n.getBoundingClientRect();return r.top<outer.top-1||r.bottom>outer.bottom+1})}).length);expect(clips).toBe(0)
 expect(await page.locator('.lh-catalog').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(large?2:3)
 if(!large){const title=await page.locator('.lh-builder-title').boundingBox(),nav=await page.locator('.bottom-nav').boundingBox();expect(title!.y+title!.height).toBeLessThanOrEqual(nav!.y)}
 await page.locator('.lh-furniture-filters').scrollIntoViewIfNeeded();const titles=await page.locator('.lh-builder-title').evaluate(e=>Array.from(e.children).map(n=>{const r=n.getBoundingClientRect();return{x:r.x,right:r.right}}));expect(titles[0].right).toBeLessThanOrEqual(titles[1].x+1)
 await filter(page,'休息').click();await expect(page.locator('.lh-product')).toHaveCount(1);await page.locator('.lh-product').click();const confirm=page.getByRole('button',{name:'确认购买并放置',exact:true});await confirm.scrollIntoViewIfNeeded();await expect(confirm).toBeInViewport();await page.getByRole('button',{name:'取消摆放预览',exact:true}).click();await filter(page,'全部').click();await waitForArtwork(page);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:test.info().outputPath(`child-${width}-${large?'dark-large':'light'}.png`),fullPage:true});await expectNoOverflow(page)
})

test('反复离开和进入宠物屋，活动计时器与窗口监听数量稳定',async({page})=>{
 await page.addInitScript(()=>{const active=new Set<number>(),set=window.setInterval.bind(window),clear=window.clearInterval.bind(window),listeners=new Map<string,Set<any>>(),add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);window.setInterval=((fn:any,ms?:number,...args:any[])=>{const id=set(fn,ms,...args);active.add(id);return id}) as any;window.clearInterval=((id?:number)=>{active.delete(id!);clear(id)}) as typeof window.clearInterval;window.addEventListener=((type:string,listener:any,options:any)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type)!.add(listener);add(type,listener,options)}) as any;window.removeEventListener=((type:string,listener:any,options:any)=>{listeners.get(type)?.delete(listener);remove(type,listener,options)}) as any;(window as any).__lifeResources=()=>({intervals:active.size,resize:listeners.get('resize')?.size??0})})
 await page.setViewportSize({width:390,height:844});await openLife(page,{level:3});const before=await page.evaluate(()=>(window as any).__lifeResources())
 for(let i=0;i<8;i++){await page.getByRole('navigation',{name:'底部导航'}).getByRole('button',{name:'首页',exact:true}).click();await expect(page.locator('.wp-brand-header .brand-subtitle')).toHaveText('Home');await page.getByRole('navigation',{name:'底部导航'}).getByRole('button',{name:'宠物屋',exact:true}).click();await expect(page.locator('.lh-stage')).toBeVisible()}
 const after=await page.evaluate(()=>(window as any).__lifeResources());expect(after.intervals).toBeLessThanOrEqual(before.intervals);expect(after.resize).toBeLessThanOrEqual(before.resize)
})


test('精灵走动后快捷入口让出主体范围',async({page})=>{
 await page.setViewportSize({width:360,height:740});await openLife(page,{level:1});const canvas=page.locator('.lh-stage .lh-scene-canvas');await canvas.click({position:{x:96,y:153}});await expect(page.locator('.lh-scene-quick-actions')).toHaveClass(/lh-quick-dock/)
 const overlap=await page.locator('.lh-stage').evaluate(stage=>{const actor=stage.querySelector('.lh-scene-actor')!.getBoundingClientRect();return Array.from(stage.querySelectorAll('.lh-quick-action')).some(e=>{const r=e.getBoundingClientRect();return r.left<actor.right&&r.right>actor.left&&r.top<actor.bottom&&r.bottom>actor.top})});expect(overlap).toBe(false)
})
