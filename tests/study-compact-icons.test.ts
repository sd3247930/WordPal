import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {compactStudyIcons,activityMenuIcons} from '../src/services/study-compact-icons'

test('三个模块与十一活动的离线位图均存在、透明且没有私有元数据',async()=>{
 const paths=[...Object.values(compactStudyIcons),...Object.values(activityMenuIcons).flatMap(icon=>[icon.src,...(icon.locked?[icon.locked]:[])])]
 assert.equal(new Set(Object.values(activityMenuIcons).map(icon=>icon.src)).size,11)
 for(const path of paths){assert(path.startsWith('/static/icons/study-compact/'));const data=readFileSync('src'+path),meta=await sharp(data).metadata();assert(meta.width!>=128&&meta.height!>=128);assert(meta.hasAlpha);assert.equal(meta.format,'png');assert(!meta.exif&&!meta.xmp&&!meta.icc);assert(!data.includes(Buffer.from('caBX')))}
})
