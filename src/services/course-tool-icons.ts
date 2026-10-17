export type CourseToolIconName='return'|'installed'|'search'|'uninstall'
export interface CourseToolIconAppearance {dark?:boolean;highContrast?:boolean}
export const courseToolIconNames=['return','installed','search','uninstall'] as const

export function courseToolIconSource(name:CourseToolIconName,{dark=false,highContrast=false}:CourseToolIconAppearance={}){
 return `/static/icons/course-tools/${highContrast?(dark?'dark':'light')+'-contrast':'hd'}-${name}.png`
}
export function courseToolFallbackSource(name:CourseToolIconName,{dark=false,highContrast=false}:CourseToolIconAppearance={}){
 return `/static/icons/course-tools/${dark?'dark':'light'}-${highContrast?'contrast':'normal'}-${name}.png`
}

/** Original sculpted book icons. Private reference artwork is not embedded. */
export function courseToolIconSvg(name:CourseToolIconName,{dark=false,highContrast=false}:CourseToolIconAppearance={}):string{
 const fg=dark?'#F1EDE7':'#353B46',bg=dark?'#24272D':'#FFFDF9'
 const cream=highContrast?bg:dark?'#E0D5C2':'#FFF4DF',creamDeep=highContrast?fg:dark?'#B4A38C':'#E1CFAD'
 const tan=highContrast?fg:dark?'#C8A786':'#D3AF8C',tanDeep=highContrast?fg:dark?'#98775E':'#AA8064'
 const rose=highContrast?fg:dark?'#CFA19A':'#E2B0A1',roseDeep=highContrast?fg:dark?'#A97179':'#C18481'
 const green=highContrast?fg:dark?'#AEC698':'#BED49F',greenDeep=highContrast?fg:dark?'#759368':'#8CAB76'
 const blue=highContrast?bg:dark?'#A5C2D2':'#C5DEE7',blueDeep=highContrast?fg:dark?'#769BAC':'#94B7C8'
 const id='wp-course-tool-'+name
 const gradient=(key:string,light:string,shade:string)=>`<linearGradient id="${id}-${key}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${shade}"/></linearGradient>`
 const defs=highContrast?'':`<defs>${gradient('tile',dark?'#41464C':'#FFFCF3',dark?'#2D3239':'#E8E2D5')}${gradient('cream',cream,creamDeep)}${gradient('tan',tan,tanDeep)}${gradient('rose',rose,roseDeep)}${gradient('green',green,greenDeep)}${gradient('blue',blue,blueDeep)}</defs>`
 const fill=(key:string)=>highContrast?fg:`url(#${id}-${key})`
 const tile=highContrast?'':`<rect x="2" y="4" width="60" height="59" rx="17" fill="${dark?'#080D17':'#B8B0A4'}" opacity=".15"/><rect x="2" y="1" width="60" height="59" rx="17" fill="${fill('tile')}"/><path d="M8 21V17a10 10 0 0 1 10-10h22" stroke="${dark?'#7B8085':'#FFFFFF'}" stroke-width="2" opacity=".5"/>`
 const highlight=highContrast?'':`<path d="M15 21v25" stroke="${cream}" stroke-width="1.6" opacity=".45"/>`
 const arrow=(x:number,y:number,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M14 0 1 10l13 10v-6h5c9 0 12 7 7 14 14-6 10-23-6-23h-6Z" fill="${fill('tan')}" stroke="${tanDeep}" stroke-width=".8"/></g>`
 const bodies:Record<CourseToolIconName,string>={
  return:`<path d="M10 20q11-4 22 1 11-5 22-1v30q-11-3-22 2-11-5-22-2Z" fill="${fill('tan')}" stroke="${tanDeep}" stroke-width="1"/><path d="M14 17q9-3 18 2 9-5 18-2v29q-9-3-18 2-9-5-18-2Z" fill="${highContrast?bg:cream}" stroke="${creamDeep}" stroke-width="1"/><path d="M32 20v27" stroke="${creamDeep}" stroke-width="1.5"/>${arrow(29,10,.78)}${highlight}`,
  installed:`<rect x="13" y="15" width="39" height="38" rx="7" fill="${tanDeep}"/><rect x="13" y="12" width="39" height="37" rx="7" fill="${fill('cream')}" stroke="${creamDeep}" stroke-width="1"/><path d="M20 16v27" stroke="${creamDeep}" stroke-width="1.8"/>${arrow(21,16,.72)}<circle cx="49" cy="48" r="9" fill="${fill('green')}" stroke="${greenDeep}" stroke-width="1"/><path d="m45 48 3 3 5-6" stroke="${cream}" stroke-width="2.5"/>`,
  search:`<rect x="9" y="41" width="37" height="12" rx="3" fill="${fill('tan')}"/><path d="M16 43v8" stroke="${cream}" stroke-width="3"/><rect x="9" y="30" width="36" height="11" rx="3" fill="${fill('green')}"/><rect x="9" y="19" width="33" height="11" rx="3" fill="${fill('green')}"/><rect x="43" y="37" width="11" height="21" rx="4" transform="rotate(-44 43 37)" fill="${fill('tan')}" stroke="${tanDeep}" stroke-width="1"/><circle cx="33" cy="29" r="17" fill="${fill('cream')}" stroke="${tanDeep}" stroke-width="1"/><circle cx="33" cy="29" r="12" fill="${highContrast?bg:fill('blue')}" stroke="${blueDeep}" stroke-width="1"/>${highContrast?'':`<path d="M26 26a8 8 0 0 1 7-5" stroke="${cream}" stroke-width="3" opacity=".75"/>`}`,
  uninstall:`<rect x="10" y="12" width="15" height="40" rx="4" fill="${fill('tan')}" stroke="${tanDeep}" stroke-width="1"/><rect x="27" y="13" width="17" height="39" rx="4" fill="${fill('cream')}" stroke="${creamDeep}" stroke-width="1"/><path d="M14 22h7m10 1h9" stroke="${cream}" stroke-width="4"/><rect x="35" y="35" width="23" height="22" rx="7" fill="${fill('rose')}" stroke="${roseDeep}" stroke-width="1"/><path d="M41 46h11" stroke="${cream}" stroke-width="4"/>`
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${tile}${bodies[name]}</svg>`
}
