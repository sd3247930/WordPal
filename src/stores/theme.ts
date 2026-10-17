import {defineStore} from 'pinia'
import {computed,ref,watch} from 'vue'
import {themePacks,tokenStyle,contrast} from '../styles/themes'
import {readStorage,writeStorage} from '../services/storage'
import {accessibleAccent,getAndroidWallpaperAccent} from '../services/appearance'
import {APPEARANCE_KEY,normalizeAppearance} from '../services/appearance-settings'
export type {AccessibilityPreferences,AppearanceSettings} from '../services/appearance-settings'
export const useThemeStore=defineStore('theme',()=>{
 const settings=ref(normalizeAppearance(readStorage<unknown>(APPEARANCE_KEY,null)))
 const systemDark=ref(uni.getSystemInfoSync().theme==='dark');const systemReduced=ref(false);const systemAccent=ref(getAndroidWallpaperAccent())
 const mode=computed(()=>(settings.value.colorMode==='system'?(systemDark.value?'dark':'light'):settings.value.colorMode) as 'light'|'dark')
 const style=computed(()=>{
   const tokens={...themePacks[settings.value.themeId][mode.value==='dark'?'buildDark':'buildLight']().tokens}
   if(settings.value.dynamicColor&&systemAccent.value){tokens.primary=accessibleAccent(systemAccent.value,tokens.surface);tokens['focus-ring']=tokens.primary;tokens['on-primary']=contrast(tokens.primary,'#ffffff')>=4.5?'#ffffff':'#080a10'}
   if(settings.value.highContrast){tokens['muted-foreground']=tokens.foreground;tokens.border=tokens.foreground}
   return tokenStyle(tokens)
 })
 const reduced=computed(()=>settings.value.reducedMotion || systemReduced.value)
 // Persist the migration immediately. A full disk must not prevent the app from opening.
 watch(settings,s=>{try{writeStorage(APPEARANCE_KEY,s)}catch{}},{deep:true,immediate:true})
 if(uni.onThemeChange)uni.onThemeChange(e=>systemDark.value=e.theme==='dark')
 // #ifdef H5
 const darkMedia=window.matchMedia('(prefers-color-scheme: dark)'),motionMedia=window.matchMedia('(prefers-reduced-motion: reduce)')
 systemDark.value=darkMedia.matches;systemReduced.value=motionMedia.matches
 darkMedia.addEventListener('change',e=>systemDark.value=e.matches);motionMedia.addEventListener('change',e=>systemReduced.value=e.matches)
 // #endif
 uni.$on('wp-system-motion',(value:boolean)=>systemReduced.value=value)
 const dynamicSupported=computed(()=>!!systemAccent.value)
 function applyNativeAppearance(){
 // #ifdef APP-PLUS
 try{const tokens=themePacks[settings.value.themeId][mode.value==='dark'?'buildDark':'buildLight']().tokens;const lightText=contrast(tokens.foreground,'#ffffff')<2;plus.navigator.setStatusBarStyle(lightText?'light':'dark');plus.navigator.setStatusBarBackground(tokens.background);uni.setNavigationBarColor({frontColor:lightText?'#ffffff':'#000000',backgroundColor:tokens.background,fail:()=>{}})}catch{}
 // #endif
 }
 watch([mode,()=>settings.value.themeId],applyNativeAppearance,{immediate:true})
 return {settings,mode,style,reduced,dynamicSupported,systemAccent,systemReduced,applyNativeAppearance}
})
