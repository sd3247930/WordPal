import { reactive } from 'vue'
export type WindowClass='compact'|'medium'|'expanded'|'large'|'extraLarge'
export function classifyWindow(width:number):WindowClass {return width<600?'compact':width<840?'medium':width<1200?'expanded':width<1600?'large':'extraLarge'}
export function businessLayout(width:number){return width<600?'compact':width<840?'tablet':width<1600?'wide':'widePlus'}
export const windowLayout=reactive({width:375,height:800,sizeClass:'compact' as WindowClass,layout:'compact',fontScale:1,safeTop:0})
let started=false
export function updateWindow(width:number,height:number){windowLayout.width=width;windowLayout.height=height;windowLayout.sizeClass=classifyWindow(width);windowLayout.layout=businessLayout(width)}
export function startWindowService(){
 if(started)return;started=true
 const info=uni.getSystemInfoSync();updateWindow(info.windowWidth,info.windowHeight);windowLayout.fontScale=(info as any).fontSizeSetting ? Math.max(1,Math.min(1.6,(info as any).fontSizeSetting/16)):1
 const refreshSafeTop=()=>{
  // #ifdef APP-PLUS
  try{windowLayout.safeTop=plus.navigator.isImmersedStatusbar()?uni.getSystemInfoSync().statusBarHeight||0:0}catch{windowLayout.safeTop=0}
  // #endif
 }
 refreshSafeTop()
 uni.onWindowResize(e=>{updateWindow(e.size.windowWidth,e.size.windowHeight);refreshSafeTop()})
 // #ifdef H5
 window.addEventListener('resize',()=>updateWindow(window.innerWidth,window.innerHeight))
 // #endif
}
