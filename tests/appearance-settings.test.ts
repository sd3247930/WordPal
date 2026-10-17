import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeAppearance,APPEARANCE_KEY} from '../src/services/appearance-settings'
import {createPinia,setActivePinia} from 'pinia'
import {nextTick} from 'vue'
import {useThemeStore} from '../src/stores/theme'

test('旧主题迁移为瑞士专注，逐项保留明暗和辅助显示偏好，重复迁移不变',()=>{
 for(const themeId of ['bento','soft','oled','swiss','unknown'])for(const colorMode of ['system','light','dark']){
  const saved={themeId,colorMode,reducedMotion:true,largeText:true,highContrast:true,screenReaderLabels:false,dynamicColor:true}
  const actual=normalizeAppearance(saved)
  assert.deepEqual(actual,{...saved,themeId:'swiss'})
  assert.deepEqual(normalizeAppearance(actual),actual)
  assert.equal(saved.themeId,themeId)
 }
})
test('首次启动与损坏偏好采用有效默认值，不把字符串当成布尔开关',()=>{
 const defaults=normalizeAppearance(null)
 assert.equal(defaults.themeId,'swiss');assert.equal(defaults.colorMode,'system')
 for(const value of [undefined,{},'oled',[],42])assert.deepEqual(normalizeAppearance(value),defaults)
 assert.deepEqual(normalizeAppearance({themeId:'oled',colorMode:'invalid',largeText:'true',reducedMotion:null,highContrast:1,screenReaderLabels:false}),{...defaults,screenReaderLabels:false})
})
test('外观迁移立即写回，模式与辅助显示可保存，学习和宠物场景存储不变',async()=>{
 const storage=new Map<string,string>([[APPEARANCE_KEY,JSON.stringify({themeId:'oled',colorMode:'dark',largeText:true})],['wordpal.database.v2','unchanged-learning-snapshot'],['wordpal.pethouse.appearance.v1','unchanged-scene']])
 let themeChanged:(e:{theme:string})=>void=()=>{},fail=false
 ;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,data:string)=>{if(fail)throw new Error('Storage full');storage.set(key,data)},getSystemInfoSync:()=>({theme:'light'}),onThemeChange:(fn:typeof themeChanged)=>themeChanged=fn,$on:()=>{}}
 ;(globalThis as any).window={matchMedia:()=>({matches:false,addEventListener:()=>{}})}
 setActivePinia(createPinia());const theme=useThemeStore()
 assert.equal(JSON.parse(storage.get(APPEARANCE_KEY)!).themeId,'swiss');assert.equal(theme.mode,'dark');assert.equal(theme.settings.largeText,true)
 theme.settings.colorMode='system';themeChanged({theme:'dark'});await nextTick();assert.equal(theme.mode,'dark')
 theme.settings.colorMode='light';theme.settings.highContrast=true;theme.settings.reducedMotion=true;await nextTick()
 assert.equal(theme.mode,'light');assert.equal(theme.reduced,true);assert.match(theme.style,/--wp-border:#242a31/)
 assert.equal(JSON.parse(storage.get(APPEARANCE_KEY)!).colorMode,'light')
 assert.equal(storage.get('wordpal.database.v2'),'unchanged-learning-snapshot');assert.equal(storage.get('wordpal.pethouse.appearance.v1'),'unchanged-scene')
 fail=true;setActivePinia(createPinia());assert.doesNotThrow(()=>useThemeStore())
})
