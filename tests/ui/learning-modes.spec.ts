import {openCustomPractice} from './helpers'
import {test,expect} from '@playwright/test'
import {go,database,seedDatabase} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
// Dictation and the five-mode row are level-gated; these specs verify mode mechanics.
const advanced=()=>({...freshDatabase(),abilityLevel:'L5'})
test('闪现显示中英，连接隐藏词义，听音与听写隐藏词形',async({page})=>{
 await seedDatabase(page,advanced())
 await go(page,'home');await page.locator('.hero-cta').click()
 // L5 starts on dictation, so switch to flash to assert the visible-word baseline first.
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'闪现'}).click();await expect(page.locator('.word')).toHaveText('cat');await expect(page.locator('.meaning')).toHaveText('猫')
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'连接'}).click();await expect(page.locator('.meaning')).toHaveCount(0)
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'听音'}).click();await expect(page.locator('.word')).toHaveText('···');await expect(page.locator('.meaning')).toHaveCount(0)
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'听写'}).click();await expect(page.locator('.word')).toHaveCount(0);await expect(page.locator('.meaning')).toHaveCount(0)
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'拼写'}).click();await expect(page.locator('.meaning')).toHaveText('猫');await expect(page.locator('.word')).toHaveText('···')
})
test('独立连接练习保留证据而不改正式SRS，音频资源可离线加载',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click();await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'连接'}).click()
 await page.locator('.answer-choice').filter({hasText:'猫'}).click();await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await expect(page.locator('.answer-feedback')).toContainText('很棒，记住啦')
 const db=await database(page);expect(db.practiceAnswers[0].mode).toBe('connect');expect(db.practiceAnswers[0].correct).toBe(true);expect(db.history).toHaveLength(0);expect(Object.keys(db.cards)).toHaveLength(0)
 const response=await page.request.get('/static/audio/cat.wav');expect(response.ok()).toBe(true);const audio=await response.body();expect(audio.subarray(0,4).toString()).toBe('RIFF');expect(audio.length).toBeGreaterThan(1000)
})
