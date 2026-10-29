import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {imageMetadata} from '../tools/preflight-scan.mjs'
import {elements} from '../packages/pet_engine'
import {catalogForElement,furnitureAsset,roomAsset,themeAsset} from '../src/services/pet-lifehouse/HouseRegistry'
import {lifeHouseIcon} from '../src/services/pet-lifehouse/LifeHouseAssets'
const root='src/static/pet-house/lifehouse',manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'))
test('家园48份高清母版、16份原精灵缩略源与93份运行图完整，摘要和元数据一致',async()=>{
 assert.equal(manifest.sources.length,48);assert.equal(manifest.companionSources.length,16);assert.equal(manifest.files.length,93)
 assert.ok(manifest.sources.every((s:any)=>s.width>=1024&&s.height>=1024))
 for(const file of manifest.files){const bytes=fs.readFileSync(path.join(root,file.path)),meta=await sharp(bytes).metadata();assert.equal(meta.width,file.width);assert.equal(meta.height,file.height);assert.equal(createHash('sha256').update(bytes).digest('base64'),file.sha256Base64);assert.deepEqual(imageMetadata(bytes,path.extname(file.path)),[]);if(file.path.endsWith('.png')){assert.equal(meta.hasAlpha,true);const stats=await sharp(bytes).stats();assert.equal(stats.isOpaque,false)}}
 for(const source of manifest.companionSources){const form=['juvenile','growing','evolved','unknown'][source.form-1],bytes=fs.readFileSync('src/static/pet-house/growth/'+source.element+'-'+form+'.png');assert.equal(createHash('sha256').update(bytes).digest('base64'),source.sha256Base64)}
 assert.ok(manifest.files.reduce((n:number,f:any)=>n+f.bytes,0)<5*1024*1024)
})
test('目录、已放置家具与相册使用同一物品，四象六状态路径全部存在且房间图互异',()=>{
 const present=(src:string)=>assert.equal(fs.existsSync('src'+src),true,src)
 for(const e of elements){assert.equal(catalogForElement(e).length,8);present(themeAsset(e));for(const item of catalogForElement(e)){present(furnitureAsset(item.id));present(furnitureAsset(item.id,'stage'))}}
 for(let level=0;level<=5;level++)present(roomAsset(level))
 assert.equal(new Set(manifest.files.filter((f:any)=>/^rooms\/room-\d.jpg$/.test(f.path)).map((f:any)=>f.sha256Base64)).size,6)
 for(const icon of ['home','feed','growth','dress','album','food-water','food-pearl','food-leaf','food-feather','dress-ribbon','dress-scarf','dress-star','experience','affection','book'] as const)present(lifeHouseIcon(icon))
})
