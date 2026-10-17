export const petActionIconNames=['home','feed','growth','dress','album'] as const
export type PetActionIconName=typeof petActionIconNames[number]
export interface PetActionIconAppearance {dark?:boolean;highContrast?:boolean}

export function petActionIconSource(name:PetActionIconName,{dark=false,highContrast=false}:PetActionIconAppearance={}){
 return `/static/icons/pet-actions/${highContrast?(dark?'dark':'light')+'-contrast':'hd'}-${name}.png`
}
export function petActionFallbackSource(name:PetActionIconName,{dark=false,highContrast=false}:PetActionIconAppearance={}){
 return `/static/icons/pet-actions/${dark?'dark':'light'}-${highContrast?'contrast':'normal'}-${name}.png`
}

/** Original clay-inspired vector silhouettes, independent of private reference images. */
export function petActionIconSvg(name:PetActionIconName,{dark=false,highContrast=false}:PetActionIconAppearance={}):string{
 const fg=dark?'#F1EDE7':'#353B46',bg=dark?'#24272D':'#FFFDF9'
 const paper=highContrast?bg:dark?'#D8D3C3':'#FFF4DD'
 const rose=highContrast?fg:dark?'#CFA19A':'#E5B0A1',roseDeep=highContrast?fg:dark?'#A97179':'#C78286'
 const gold=highContrast?fg:dark?'#CEAF7B':'#E6C79A',goldDeep=highContrast?fg:dark?'#9E805F':'#BC9471'
 const purple=highContrast?fg:dark?'#BAACD3':'#D1BCE4',purpleDeep=highContrast?fg:dark?'#8D7AAB':'#9E87C5'
 const green=highContrast?fg:dark?'#B1C894':'#C9DDA5',greenDeep=highContrast?fg:dark?'#76965E':'#8CAE6D'
 const blue=highContrast?fg:dark?'#ADC7D6':'#BDD8E6',blueDeep=highContrast?fg:dark?'#7799B0':'#8DAFC9'
 const id='wp-pet-action-'+name
 const gradient=(key:string,light:string,shade:string)=>`<linearGradient id="${id}-${key}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${shade}"/></linearGradient>`
 const defs=highContrast?'':`<defs>${gradient('rose',rose,roseDeep)}${gradient('gold',gold,goldDeep)}${gradient('purple',purple,purpleDeep)}${gradient('green',green,greenDeep)}${gradient('blue',blue,blueDeep)}${gradient('cream',paper,gold)}</defs>`
 const fill=(key:string)=>highContrast?fg:`url(#${id}-${key})`
 const shadow=highContrast?'':`<ellipse cx="32" cy="60" rx="24" ry="2.5" fill="${dark?'#080D17':'#B8B2BC'}" opacity=".15"/>`
 const paw=(x:number,y:number,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})" fill="${paper}"><path d="M-7 3c-3 5 1 8 7 5 6 3 10 0 7-5L3-2c-2-2-4-2-6 0Z"/><ellipse cx="-8" cy="-3" rx="2.5" ry="3.2" transform="rotate(-22 -8 -3)"/><ellipse cx="-3" cy="-8" rx="2.4" ry="3.2"/><ellipse cx="3" cy="-8" rx="2.4" ry="3.2"/><ellipse cx="8" cy="-3" rx="2.5" ry="3.2" transform="rotate(22 8 -3)"/></g>`
 const bodies:Record<PetActionIconName,string>={
  home:`<rect x="46" y="12" width="7" height="19" rx="3" fill="${fill('gold')}"/><rect x="12" y="24" width="40" height="33" rx="6" fill="${fill('cream')}" stroke="${goldDeep}" stroke-width="1"/><path d="m7 30 25-20 25 20" transform="translate(0 1.5)" stroke="${roseDeep}" stroke-width="10"/><path d="m7 28 25-20 25 20" stroke="${fill('rose')}" stroke-width="8"/><path d="M26 57V42a6 6 0 0 1 12 0v15Z" fill="${highContrast?bg:goldDeep}"/>${highContrast?'':`<path d="M17 32v15" stroke="${paper}" stroke-width="3" stroke-opacity=".65"/>`}`,
  feed:`<path d="m12 32-5 22q25 7 50 0l-5-22Z" transform="translate(0 1)" fill="${roseDeep}"/><path d="m12 31-5 22q25 7 50 0l-5-22Z" fill="${fill('rose')}"/><ellipse cx="32" cy="32" rx="21" ry="7.5" fill="${paper}" stroke="${goldDeep}" stroke-width="1"/><ellipse cx="32" cy="32" rx="17" ry="5" fill="${fill('gold')}"/><path d="M19 23q5-4 1-8t1-7M29 23q5-4 1-8t1-7" stroke="${fill('purple')}" stroke-width="3.5"/><path d="M45 6h9a8 8 0 0 1 8 8v1a8 8 0 0 1-8 8h-6l-7 5 1-5a8 8 0 0 1-5-8v-1a8 8 0 0 1 8-8Z" fill="${fill('blue')}"/><g fill="${paper}"><circle cx="44" cy="14.5" r="1.6"/><circle cx="50" cy="14.5" r="1.6"/><circle cx="56" cy="14.5" r="1.6"/></g>`,
  growth:`<path d="M32 35V18" stroke="${greenDeep}" stroke-width="4"/><path d="M30 26C13 27 9 17 10 10c14-1 23 5 20 16Z" fill="${fill('green')}" stroke="${greenDeep}" stroke-width=".8"/><path d="M33 24C31 10 40 5 53 5c2 11-6 21-20 19Z" fill="${fill('green')}" stroke="${greenDeep}" stroke-width=".8"/><path d="m18 17 12 9m3-3 12-11" stroke="${highContrast?bg:greenDeep}" stroke-width="2"/><path d="m15 38 4 18q13 5 26 0l4-18Z" fill="${fill('gold')}" stroke="${goldDeep}" stroke-width="1"/><rect x="12" y="32" width="40" height="9" rx="4.5" fill="${fill('gold')}" stroke="${goldDeep}" stroke-width="1"/><rect x="42" y="34" width="12" height="12" rx="2.5" fill="${fill('blue')}" stroke="${highContrast?bg:blueDeep}"/><path d="m45 43 3-6 3 6m-4.5-2h3" stroke="${paper}" stroke-width="1.4"/><rect x="36" y="48" width="12" height="12" rx="2.5" fill="${fill('gold')}" stroke="${highContrast?bg:goldDeep}"/><path d="M40 51v6h3a1.5 1.5 0 0 0 0-3h-3m3 0a1.5 1.5 0 0 0 0-3h-3" stroke="${paper}" stroke-width="1.2"/><rect x="50" y="48" width="12" height="12" rx="2.5" fill="${fill('green')}" stroke="${highContrast?bg:greenDeep}"/><path d="M59 52c-6-4-7 8 0 4" stroke="${paper}" stroke-width="1.5"/>`,
  dress:`<path d="M8 25c0-19 21-20 22 0Z" fill="${fill('rose')}" stroke="${roseDeep}" stroke-width="1"/><circle cx="19" cy="8" r="4" fill="${fill('gold')}"/><rect x="5" y="23" width="27" height="7" rx="3.5" fill="${fill('gold')}" stroke="${goldDeep}" stroke-width=".8"/><path d="m41 10 18 5-6 9-11-4 3 10-10-3 4-12Z" fill="${fill('rose')}" stroke="${roseDeep}" stroke-width="1"/><ellipse cx="32" cy="47" rx="24" ry="10" fill="${fill('purple')}" stroke="${purpleDeep}" stroke-width="1"/><ellipse cx="32" cy="44.5" rx="18" ry="5.5" fill="${paper}" stroke="${purpleDeep}" stroke-width="1"/><rect x="45" y="44" width="6" height="7" rx="1.5" fill="${fill('gold')}"/><path d="M32 49v7" stroke="${goldDeep}" stroke-width="3"/><circle cx="32" cy="57" r="4.7" fill="${fill('gold')}" stroke="${goldDeep}" stroke-width=".8"/><path d="M32 56v3" stroke="${highContrast?bg:goldDeep}" stroke-width="1.2"/>`,
  album:`<rect x="28" y="16" width="29" height="42" rx="5" fill="${goldDeep}"/><rect x="27" y="13" width="29" height="41" rx="5" fill="${fill('gold')}" stroke="${goldDeep}" stroke-width="1"/>${paw(45,32,.65)}<path d="M33 49h18" stroke="${paper}" stroke-width="2"/><rect x="9" y="10" width="34" height="49" rx="6" fill="${purpleDeep}"/><rect x="9" y="7" width="34" height="48" rx="6" fill="${fill('purple')}" stroke="${purpleDeep}" stroke-width="1"/>${highContrast?'':`<path d="M15 12v34" stroke="${paper}" stroke-opacity=".3" stroke-width="2"/>`}${paw(26,32,.95)}`
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${shadow}${bodies[name]}</svg>`
}
