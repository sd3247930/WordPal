import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {unlockParent,database} from './helpers'
import {makeZip,readZip} from '../../src/services/course-import/ZipImporter'
import {sha256} from '../../src/services/content/digest'
import type {CoursePack} from '../../packages/content_schema/course'

test('本机媒体课程可通过按钮导出完整 ZIP，原用途与学习记录保持不变',async({page})=>{
 await page.setViewportSize({width:390,height:844});await unlockParent(page)
 const before=await database(page),files:Record<string,Uint8Array>={
  'audio/cat.wav':new Uint8Array(readFileSync('src/static/audio/cat.wav')),
  'audio/dog.wav':new Uint8Array(readFileSync('src/static/audio/dog.wav'))}
 const pack:CoursePack={schemaVersion:2,courseId:'local-export-probe',contentVersion:'1.0.0',title:'本机课程导出验证',route:'theme',abilityLevels:['L1'],
  sources:[{id:'local-source',type:'user-provided',rightsStatus:'private-use-declared',attribution:'合成本机导出验证',audioLicense:'随项目原始示例音频许可'}],
  vocabulary:['cat','dog'].map((word,i)=>({id:'export-probe-'+word,language:'en',lemma:word,meaning:i?'狗':'猫',pos:'n.',sourceId:'local-source',assetRefs:{audio:word+'-audio'}})),
  units:[{id:'unit-one',title:'合成单元',lessons:[{id:'lesson-one',title:'合成课节',wordIds:['export-probe-cat','export-probe-dog']}]}],
  assets:Object.entries(files).map(([path,bytes])=>({id:path.includes('cat')?'cat-audio':'dog-audio',path,mediaType:'audio/wav',bytes:bytes.length,sha256:sha256(bytes),sourceId:'local-source',license:'合成测试本机使用'}))}
 const chooser=page.waitForEvent('filechooser')
 await page.getByRole('button',{name:'选择 JSON / CSV / ZIP 文件',exact:true}).click()
 await(await chooser).setFiles({name:'local-export-probe.zip',mimeType:'application/zip',buffer:Buffer.from(makeZip(pack,files))})
 await page.locator('.course-import-form > .course-check').click()
 await page.getByRole('button',{name:'检查课程内容',exact:true}).click()
 const reuse=page.locator('.import-preview .course-check');if(await reuse.count())await reuse.click()
 await page.getByRole('button',{name:'确认导入课程',exact:true}).click()
 await expect(page.locator('.course-management')).toContainText('课程安装完成')
 const item=page.locator('.course-item').filter({hasText:pack.title}),download=page.waitForEvent('download')
 await item.getByRole('button',{name:'导出课程包',exact:true}).click()
 const file=await download;expect(file.suggestedFilename()).toBe('local-export-probe.zip')
 const parsed=readZip(new Uint8Array(readFileSync((await file.path())!)))
 expect(parsed.pack.courseId).toBe(pack.courseId)
 expect(parsed.pack.sources[0].rightsStatus).toBe('private-use-declared')
 expect(parsed.pack.vocabulary.map(w=>w.lemma)).toEqual(['cat','dog'])
 expect(parsed.pack.assets).toHaveLength(2)
 for(const [path,bytes] of Object.entries(files))expect(sha256(parsed.files[path])).toBe(sha256(bytes))
 expect('cards' in parsed.pack).toBe(false);expect('history' in parsed.pack).toBe(false)
 await expect(page.locator('.course-management > .notice')).toContainText('课程包已保存到本机')
 await expect(item.getByRole('button',{name:'导出课程包',exact:true})).toBeEnabled()
 const after=await database(page)
 for(const key of ['cards','history','pets','gems','rewardIds'] as const)expect(after[key]).toEqual(before[key])
})
