import {expect,type Page} from '@playwright/test'
import {goldenDatabase} from './fixtures'
import {go,seedDatabase,setAppearance} from './helpers'
import {executeHouseCommand} from '../../src/services/pet-lifehouse/HouseCommands'
import {petInfo,type Element} from '../../packages/pet_engine'
export const lifeTab=(page:Page,name:string)=>page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name,exact:true})
export const selectCompanion=(page:Page,id:Element)=>page.getByRole('button',{name:'选择'+petInfo[id].name,exact:true}).click()
export function lifeFixture(level=0,gems=10000){const db=goldenDatabase();db.gems=gems+9100;for(let i=1;i<=level;i++){const result=executeHouseCommand(db,{requestId:'fixture:'+i,element:'water',expectedRevision:i-1,catalogVersion:1,kind:'upgrade',targetLevel:i},{at:'2026-10-26T07:00:00Z'});if(!result.ok)throw Error(result.error);db.gems=result.gems;db.lifeHouse=result.domain}db.gems=gems;return db}
export async function openLife(page:Page,{level=0,gems=10000,mode='light',large=false,contrast=false}={}){await seedDatabase(page,lifeFixture(level,gems));await setAppearance(page,'swiss',mode,{largeText:large,highContrast:contrast,reducedMotion:true});await go(page,'pet')}
export async function growthDetails(page:Page){await lifeTab(page,'成长').click();const toggle=page.getByRole('button',{name:'查看经验、亲密与本机学习记录',exact:true});if(await toggle.count())await toggle.click();await expect(page.locator('.pet-growth-dashboard')).toBeVisible()}
export async function openTasks(page:Page){await lifeTab(page,'家园').click();const toggle=page.locator('[aria-controls="lh-learning-details"]');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click()}
export async function openCatalog(page:Page){const toggle=page.getByRole('button',{name:/^打开物品目录/});if(await toggle.count())await toggle.click()}
export async function manageFurniture(page:Page,name:string){await page.getByRole('button',{name:name+'，点击互动或管理',exact:true}).click();await page.getByRole('button',{name:'调整或收纳',exact:true}).click()}
// Transformed transparent actor canvases have separate visible-bound and contact tests.
export async function expectNoOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const overflowing=await page.locator('.lh-workspace .wp-action-tile:visible').evaluateAll(nodes=>nodes.filter(e=>!e.classList.contains('lh-scene-actor-button')&&e.scrollWidth>e.clientWidth+1).map(e=>e.className));expect(overflowing).toEqual([])}
