import type {ColorMode,ThemeId} from '../styles/themes'

export interface AccessibilityPreferences {reducedMotion:boolean;largeText:boolean;highContrast:boolean;screenReaderLabels:boolean}
export interface AppearanceSettings extends AccessibilityPreferences {themeId:ThemeId;colorMode:ColorMode;dynamicColor:boolean}
export const APPEARANCE_KEY='wordpal.appearance.v1'
const defaults:AppearanceSettings={themeId:'swiss',colorMode:'system',reducedMotion:false,largeText:false,highContrast:false,screenReaderLabels:true,dynamicColor:false}

/** Retire legacy themes while keeping each valid display preference independently. */
export function normalizeAppearance(saved:unknown):AppearanceSettings {
 const source=saved&&typeof saved==='object'?saved as Record<string,unknown>:{}
 const result={...defaults}
 if(source.colorMode==='system'||source.colorMode==='light'||source.colorMode==='dark')result.colorMode=source.colorMode
 for(const key of ['reducedMotion','largeText','highContrast','screenReaderLabels','dynamicColor'] as const){
  if(typeof source[key]==='boolean')result[key]=source[key]
 }
 return result
}
