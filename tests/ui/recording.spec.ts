import {test,expect} from '@playwright/test'
import {go,database,openExploration} from './helpers'

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const control={resolve:()=>{},stops:0,starts:0}
  Object.defineProperty(window,'recordingFixture',{value:control})
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:()=>new Promise(resolve=>{
   control.resolve=()=>resolve({getTracks:()=>[{stop(){control.stops++}}]})
  })}})
  class Recorder{
   state='inactive';mimeType='audio/webm';ondataavailable?: (event:{data:Blob})=>void;onstop?:()=>void
   start(){this.state='recording';control.starts++}
   stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['test audio'])});this.onstop?.()})}
  }
  Object.defineProperty(window,'MediaRecorder',{value:Recorder})
 })
 await go(page,'home');await page.locator('.hero-cta').click()
 await page.locator('.answer-actions .wp-button').filter({hasText:'查看答案'}).click()
 await openExploration(page)
})

test('麦克风授权晚于切词返回时释放流，不启动旧单词录音',async({page})=>{
 await page.locator('.pronunciation-practice .wp-button').filter({hasText:'录一遍'}).click()
 await page.locator('.rating-grid .wp-button').filter({hasText:'记住了'}).click()
 await page.locator('.answer-feedback .wp-button').click()
 const before=await database(page)
 await page.evaluate(()=>{(window as unknown as {recordingFixture:{resolve:()=>void}}).recordingFixture.resolve()})
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {recordingFixture:{stops:number}}).recordingFixture.stops)).toBe(1)
 expect(await page.evaluate(()=>(window as unknown as {recordingFixture:{starts:number}}).recordingFixture.starts)).toBe(0)
 await expect(page.locator('.pronunciation-practice')).toHaveCount(0)
 expect(await database(page)).toEqual(before)
})

test('跟读结束可临时回放，切词清理录音且不写评分或学习记录',async({page})=>{
 const before=await database(page)
 await page.locator('.pronunciation-practice .wp-button').filter({hasText:'录一遍'}).click()
 await page.evaluate(()=>{(window as unknown as {recordingFixture:{resolve:()=>void}}).recordingFixture.resolve()})
 await page.locator('.pronunciation-practice .wp-button').filter({hasText:'结束录音'}).click()
 await expect(page.locator('.pronunciation-practice .wp-button').filter({hasText:'听我的录音'})).toBeVisible()
 expect(await database(page)).toEqual(before)
 await page.locator('.rating-grid .wp-button').filter({hasText:'记住了'}).click()
 await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.pronunciation-practice .wp-button').filter({hasText:'听我的录音'})).toHaveCount(0)
})

