import {test,expect} from '@playwright/test'
import {createHash} from 'node:crypto'
import media from '../../src/content/starter-media.json'
import legacy from '../../src/content/starter.json'
import {freshDatabase} from '../../src/stores/profile'
import {convertV1} from '../../src/services/storage/MigrationV1toV2'
import {go,database,setAppearance,waitForArtwork} from './helpers'

test('内置启蒙 20 组图音随应用提供，网络响应哈希和图片解码完整',async({page})=>{
 await go(page,'home')
 for(const asset of media.assets){
  const response=await page.request.get('/static/'+asset.path);expect(response.ok(),asset.id).toBe(true)
  const bytes=await response.body();expect(bytes.length,asset.id).toBe(asset.bytes);expect(createHash('sha256').update(bytes).digest('hex'),asset.id).toBe(asset.sha256)
 }
 const decoded=await page.evaluate(async assets=>{
  const context=new AudioContext(),results=[]
  try{for(const asset of assets){if(asset.mediaType==='image/webp'){const image=new Image();image.src='/static/'+asset.path;await image.decode();results.push({id:asset.id,width:image.naturalWidth,height:image.naturalHeight})}else{const response=await fetch('/static/'+asset.path),audio=await context.decodeAudioData(await response.arrayBuffer());results.push({id:asset.id,duration:audio.duration})}}}finally{await context.close()}
  return results
 },media.assets)
 expect(decoded.filter(item=>'width'in item&&item.width===512&&item.height===512)).toHaveLength(20)
 expect(decoded.filter(item=>'duration'in item&&item.duration!>0)).toHaveLength(20)
})

for(const mode of ['light','dark'])test(`内置配图跨首页、学习、词本与详情 ${mode}，旧会话及学习记录不变`,async({page})=>{
 await page.clock.install({time:new Date('2026-10-03T08:00:00Z')});await page.setViewportSize({width:390,height:844});await setAppearance(page,'clay',mode)
 const db=convertV1(freshDatabase());db.session={id:'before-bundled-images',courseId:'starter',contentVersion:'1.0.0',date:'2026-10-03',startedAt:'2026-10-03T08:00:00Z',kind:'practice',wordIds:['cat'],wordSnapshot:{cat:legacy.words[0]},index:0,mode:'flash',input:'ca',selected:'',revealed:false,answers:[]}
 await page.addInitScript(db=>{localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db);await go(page,'home');await waitForArtwork(page);const before=await database(page)
 expect(before.session.wordSnapshot.cat.image).toBe('')
 await expect(page.locator('.home-word-image img')).toHaveCount(10)
 for(const image of await page.locator('.home-word-image img').all()){await expect(image).toHaveAttribute('src',/\/static\/starter-media\/images\//);await expect(image).toHaveJSProperty('naturalWidth',512)}
 await go(page,'learn');await expect(page.locator('.word-picture img')).toHaveJSProperty('naturalWidth',512);await expect(page.locator('.word-picture img')).toHaveAttribute('src',/\/cat\.webp$/)
 await go(page,'review');await page.getByRole('group',{name:'单词本筛选'}).getByRole('button',{name:'所有单词',exact:true}).click();await page.locator('.wordbook-search input').fill('cat');await page.locator('.wordbook-open').first().click()
 await expect(page.locator('.detail-picture img')).toHaveJSProperty('naturalWidth',512);await expect(page.locator('.detail-picture img')).toHaveAttribute('src',/\/cat\.webp$/)
 expect(await database(page)).toEqual(before);expect((await database(page)).session.wordSnapshot.cat.image).toBe('')
})
