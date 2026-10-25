import {test,expect,type Page} from '@playwright/test'
import sharp from 'sharp'
import {go,database,setAppearance,selectWordbookScope} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {customCourse} from '../helpers/custom-course'
import {newCard} from '../../packages/srs_fsrs'

async function fixture(page:Page){
 const pack=customCourse('detail-fixture',9),other=customCourse('detail-other',2)
 pack.title='合成详情教材';other.title='合成来源教材'
 const names=['doctor','chocolate','police officer','Merry Christmas!',"can't",'well-known','pneumonoultramicroscopicsilicovolcanoconiosis','silent','missing']
 pack.vocabulary.forEach((word,index)=>Object.assign(word,{lemma:names[index],meaning:index===1?'巧克力；巧克力糖；一种用于烘焙和制作甜点的食品，完整的多条合成测试释义。':'合成释义 '+(index+1),ipa:'/test/',phoneticUS:'/test/',audio:'/static/audio/apple.wav',audioUS:'/static/audio/apple.wav',image:index===8?'':'/static/detail-fixture-'+index+'.png'}))
 Object.assign(pack.vocabulary[7],{audio:'',audioUS:'',ipa:'',phoneticUS:''})
 Object.assign(pack.vocabulary[2],{example:'A supplied sentence.',examples:[{en:'A supplied sentence.',zh:'合成例句译文。'}]})
 other.vocabulary[0]={...pack.vocabulary[0],order:1};other.units[0].lessons[0].wordIds[0]=pack.vocabulary[0].id
 const sizes=[[600,900],[1400,500],[600,600],[300,1000],[1400,300],[600,900],[600,600],[600,600]]
 for(const [i,[width,height]] of sizes.entries()){
  const body=await sharp({create:{width,height,channels:4,background:{r:85,g:145,b:205,alpha:i===3?.25:1}}}).png().toBuffer()
  await page.route('**/detail-fixture-'+i+'.png',route=>route.fulfill({contentType:'image/png',body}))
 }
 const db=freshDatabase();db.currentCourseId=pack.courseId;db.courseProgress={[pack.courseId]:{currentLessonId:'detail-fixture-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}}
 db.cards[pack.vocabulary[0].id]=newCard(pack.vocabulary[0].id,new Date(0))
 db.history=[{id:'detail-real-evidence',wordId:pack.vocabulary[0].id,courseId:pack.courseId,mode:'spell',source:'practice',rating:3,correct:true,at:'2026-01-01T08:00:00Z',input:'doctor'}]
 await page.addInitScript(({packs,db})=>{
  localStorage.setItem('wordpal.database.v2',JSON.stringify({...db,version:2,auxiliaryRecords:[]}));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))
  localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));return {key,courseId:pack.courseId,archived:false,aliases:{}}})))
 },{packs:[pack,other],db})
 return pack
}
async function all(page:Page){await page.getByRole('group',{name:'单词本筛选'}).getByRole('button',{name:'所有单词',exact:true}).click()}
async function open(page:Page,index=0){await page.locator('.wordbook-open').nth(index).click();await expect(page.locator('.detail-word')).toBeVisible()}
const panel=(page:Page)=>page.locator('.word-detail-panel')

test('详情层级、唯一发音与音标、空例句隐藏、真实日期明细和来源',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await go(page,'review');await all(page);const before=await database(page);await open(page)
 await expect(panel(page).locator('.ipa')).toHaveText(['/test/']);await expect(panel(page).locator('[data-audio-state]')).toHaveCount(1);await expect(panel(page).locator('.detail-example')).toHaveCount(0)
 await expect(panel(page).locator('.detail-familiarity')).toContainText('练习中');await expect(panel(page).locator('.detail-next-review')).toHaveText('今天复习');await expect(panel(page)).not.toContainText('复习日期')
 await panel(page).getByRole('button',{name:/为什么是这个状态/}).click();await expect(panel(page).locator('.detail-status-reason')).toContainText('独立答题')
 await panel(page).getByRole('button',{name:/更多记忆信息/}).click();await expect(panel(page).locator('.detail-facts')).toContainText('复习日期');await expect(panel(page).locator('.detail-facts')).toContainText('1970/1/1');await expect(panel(page).locator('.detail-facts')).toContainText('2026/1/1')
 await panel(page).getByRole('button',{name:/教材来源/}).click();await expect(panel(page).locator('.detail-source .wordbook-source')).toHaveCount(2);await expect(panel(page).locator('.detail-primary-source')).toHaveText('合成详情教材 · Unit 1 · 第1词')
 expect(await database(page)).toEqual(before)
 await page.keyboard.press('Escape');await open(page,2);await expect(panel(page).locator('.detail-example-row')).toContainText('A supplied sentence.');await expect(panel(page).locator('.detail-example-row')).toContainText('合成例句译文。')
 await page.keyboard.press('Escape');await open(page,7);await expect(panel(page).locator('.ipa')).toHaveCount(0);await expect(panel(page).locator('.detail-main-audio')).toHaveAttribute('aria-disabled','true');await expect(panel(page)).toContainText('暂无离线音频');await expect(panel(page)).toContainText('学习后安排复习');await expect(panel(page).locator('.detail-more-toggle')).toHaveCount(0)
})

test('五种原图比例全部 contain，加载失败可重试、快速切词不遗留旧图或展开状态',async({page})=>{
 await page.setViewportSize({width:1280,height:900});await fixture(page);let fail=true
 const recovered=await sharp({create:{width:600,height:900,channels:4,background:'#89aadd'}}).png().toBuffer()
 await page.route('**/detail-fixture-0.png',route=>fail?route.fulfill({status:404}):route.fulfill({contentType:'image/png',body:recovered}))
 await go(page,'review');await all(page);const before=await database(page);await open(page);await expect(panel(page).getByRole('img',{name:'配图暂时无法显示',exact:true})).toBeVisible();fail=false;await panel(page).getByRole('button',{name:'重试配图',exact:true}).click();await expect(panel(page).locator('.detail-picture img')).toHaveJSProperty('naturalWidth',600)
 for(const i of [1,2,3,4,0]){await open(page,i);await expect(panel(page).locator('.detail-picture img')).toHaveJSProperty('naturalWidth',[600,1400,600,300,1400][i]);const style=await panel(page).locator('.detail-picture').evaluate(node=>({fit:(node as HTMLElement).style.backgroundSize||getComputedStyle(node).objectFit,overflow:getComputedStyle(node.parentElement!).overflow}));expect(['contain','']).toContain(style.fit);expect(style.overflow).toBe('visible');await expect(panel(page).locator('.detail-image-loading')).toHaveCount(0)}
 await panel(page).getByRole('button',{name:/更多记忆信息/}).click();await open(page,8);await expect(panel(page).getByRole('img',{name:'暂无配图',exact:true})).toBeVisible();await expect(panel(page).locator('.detail-facts')).toHaveCount(0);expect(await database(page)).toEqual(before)
})

test('真实离线标准发音连续重播、错误重试、关闭停止，学习存档不变',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await go(page,'review');await all(page);const before=await database(page);await open(page)
 const audio=panel(page).locator('.detail-main-audio')
 for(let i=0;i<4;i++){await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing')}
 await expect(audio).toHaveAttribute('data-audio-state','idle');await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing')
 await page.evaluate(async()=>{const {audioPlayback}=await import('/src/services/audio/index.ts' as string);(audioPlayback as any).fail('合成播放失败，请重试。')});await expect(audio).toHaveAttribute('data-audio-state','error');await expect(audio).toContainText('重试播放');await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing')
 await page.keyboard.press('Escape');expect(await page.evaluate(async()=>{const {audioPlayback}=await import('/src/services/audio/index.ts' as string);return audioPlayback.isPlaying.value})).toBe(false);expect(await database(page)).toEqual(before)
 await open(page);await audio.click();await expect(audio).toHaveAttribute('data-audio-state','playing')
})

test('重点快速切换与列表实时一致，拼读与稍后可用，原会话/每日计划/记忆不被浏览更改',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await go(page,'review');await all(page);const before=await database(page);await open(page)
 for(let i=0;i<4;i++){await panel(page).locator('.detail-action-favorite').click();await expect(panel(page).locator('.detail-action-favorite')).toHaveAttribute('aria-pressed',String(i%2===0))}
 await panel(page).locator('.detail-action-favorite').click();await panel(page).getByRole('button',{name:/拼读帮助/}).click();await expect(panel(page).locator('.phonics-breakdown')).toBeVisible()
 await panel(page).getByRole('button',{name:/更多记忆信息/}).click();await panel(page).getByRole('button',{name:'稍后再看',exact:true}).click();await expect(panel(page)).toContainText('已收至稍后');await panel(page).getByRole('button',{name:'已收至稍后 · 取消',exact:true}).click()
 await page.keyboard.press('Escape');await expect(page.locator('.wordbook-row').first().locator('.wordbook-star')).toBeVisible();expect(await database(page)).toEqual(before)
 await open(page);await panel(page).locator('.detail-action-practice').click();await expect(page.locator('.brand-subtitle')).toHaveText('Study');const after=await database(page);for(const field of ['cards','history','gems','rewardIds'])expect(after[field]).toEqual(before[field]);expect(after.courseProgress['detail-fixture'].dailyPlan).toEqual(before.courseProgress['detail-fixture'].dailyPlan);expect(after.session.wordIds).toContain('detail-fixture-w001')
})

test('真实存档变更后详情与列表六种熟知度同步，定时刷新不会伪造复习时间',async({page})=>{
 await fixture(page);await go(page,'review');await all(page);await open(page)
 for(const [level,label]of [['unseen','未学'],['introduced','初识'],['practicing','练习中'],['familiar','较熟悉'],['mastered','熟练掌握'],['unrated','待评估']]){
  await page.evaluate(async level=>{
   const {useProfileStore}=await import('/src/stores/profile.ts' as string),profile=useProfileStore(),id='detail-fixture-w001'
   profile.transact((db:any)=>{
    db.history=[];db.practiceAnswers=[];delete db.cards[id]
    const answer=(day:number,mode='spell',source='practice',correct=true)=>({id:'detail-state-'+day,wordId:id,courseId:'detail-fixture',mode,source,correct,rating:correct?3:1,at:`2026-01-${String(day).padStart(2,'0')}T08:00:00Z`,input:''})
    if(level==='introduced')db.history=[answer(1,'flash')]
    if(level==='practicing')db.history=[answer(1,'spell','practice',false)]
    if(level==='familiar')db.history=[answer(1),answer(2)]
    if(level==='mastered')db.history=[answer(1),answer(2),answer(3,'spell','review_due')]
    if(level==='unrated')db.cards[id]={wordId:id,due:'2100-01-01T00:00:00Z',stability:1,difficulty:1,elapsed_days:0,scheduled_days:1,reps:1,lapses:0,learning_steps:0,state:1,strategy:'fsrs'}
   })
  },level)
  await expect(panel(page).locator('.detail-familiarity [data-level]')).toHaveAttribute('data-level',level);await expect(panel(page).locator('.detail-familiarity')).toContainText(label);await expect(page.locator('.wordbook-row').first().locator('.familiarity-label')).toHaveAttribute('data-level',level)
 }
 const before=await database(page);await page.clock.install();await page.clock.fastForward(31000);await expect(panel(page).locator('.detail-next-review')).not.toHaveText('今天复习');expect(await database(page)).toEqual(before)
})

for(const theme of ['clay','swiss'])for(const mode of ['light','dark'])test(`详情完整阅读与功能热区 ${theme}/${mode} 320–1280、200%字体`,async({page})=>{
 test.setTimeout(60000);await setAppearance(page,theme,mode);await fixture(page);await go(page,'review');await all(page);const before=await database(page)
 for(const width of [320,360,390,430,768,1280]){
  await page.setViewportSize({width,height:width>=768?900:844});await open(page);await expect(panel(page).locator('.detail-picture img')).toHaveJSProperty('naturalWidth',600)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const sizes=await panel(page).locator('.wp-button').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {width:b.width,height:b.height}}));expect(sizes.every(b=>b.width>=44&&b.height>=44)).toBe(true)
  await page.screenshot({path:test.info().outputPath(`detail-${width}.png`)});if(width<600)await page.keyboard.press('Escape');else await page.locator('.wordbook-open').first().click()
 }
 for(const index of [1,2,3,4,5,6]){await open(page,index);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(panel(page).locator('.detail-meaning')).toContainText(index===1?'一种用于烘焙':'合成释义')}
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(panel(page)).toHaveClass(/detail-stack/);await panel(page).locator('.detail-action-practice').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('detail-large-text.png')});await page.keyboard.press('Escape');expect(await database(page)).toEqual(before)
})
