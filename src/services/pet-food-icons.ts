export type PetFoodIconName='water'|'pearl'|'leaf'|'feather'
export interface PetFoodIconAppearance {dark?:boolean;highContrast?:boolean}

/** Original soft-palette illustrations; no reference images, web fonts or remote assets. */
export function petFoodIconSvg(name:PetFoodIconName,{dark=false,highContrast=false}:PetFoodIconAppearance={}):string{
 const fg=dark?'#F1EDE7':'#353B46',bg=dark?'#24272D':'#FFFDF9'
 const pink=dark?'#DAA7C0':'#F3BBD0',purple=dark?'#AB9BCB':'#BEADE2',blue=dark?'#9CC4D5':'#BCE2ED',mint=dark?'#A2C6B5':'#BBDDC7',gold=dark?'#D7BF8F':'#F6DDA8'
 const id='wp-pet-food-'+name
 const n=(value:number)=>Number(value.toFixed(3))
 const linear=(key:string,colors:string[])=>`<linearGradient id="${id}-${key}" x1="0" y1="0" x2=".8" y2="1">${colors.map((color,i)=>`<stop offset="${n(i/(colors.length-1))}" stop-color="${color}"/>`).join('')}</linearGradient>`
 const defs=highContrast?'':`<defs>${linear('fruit',[dark?'#DAB4A8':'#F9D1BA',pink,purple])}${linear('drop',[dark?'#D0E9ED':'#F3FCFC',blue,dark?'#77A8C2':'#8CBFDC'])}${linear('leaf',[mint,dark?'#89AE91':'#A2C798',purple])}${linear('gold',[dark?'#EEDABD':'#FFF0CC',gold,dark?'#B29B73':'#DDBB85'])}${linear('feather',[mint,blue,purple,pink,dark?'#D8AD91':'#F7C5A4'])}${linear('ring',[blue,purple,pink])}<radialGradient id="${id}-pearl" cx=".3" cy=".25" r=".8"><stop stop-color="${dark?'#F3E7ED':'#FFF8FD'}"/><stop offset=".38" stop-color="${pink}"/><stop offset=".75" stop-color="${blue}"/><stop offset="1" stop-color="${purple}"/></radialGradient></defs>`
 const fill=(key:string)=>highContrast?fg:`url(#${id}-${key})`
 const ink=highContrast?bg:dark?'#DCEBF0':'#FFFDF9'
 const edge=highContrast?fg:dark?'#9A8CAB':'#BBADCE'
 const spark=(x:number,y:number,r:number,color=purple)=>`<path d="m${x} ${n(y-r)} ${n(r*.35)} ${n(r*.65)} ${n(r*.65)} ${n(r*.35)}-${n(r*.65)} ${n(r*.35)}-${n(r*.35)} ${n(r*.65)}-${n(r*.35)}-${n(r*.65)}-${n(r*.65)}-${n(r*.35)} ${n(r*.65)}-${n(r*.35)}Z" fill="${highContrast?fg:color}"/>`
 const shine=highContrast?'':`<ellipse cx="23" cy="28" rx="5" ry="3" transform="rotate(-35 23 28)" fill="#FFFDF9" opacity=".6"/>`
 const shadow=highContrast?'':`<ellipse cx="32" cy="59" rx="21" ry="2.5" fill="${dark?'#080D17':'#ADA7C3'}" opacity=".15"/>`
 const bodies:Record<PetFoodIconName,string>={
  water:`<path d="M31 17C18 13 10 25 12 40c2 13 9 18 20 18 13 0 21-8 21-21 0-14-8-23-22-20Z" fill="${fill('fruit')}" stroke="${edge}" stroke-width=".7"/><path d="M31 18C28 8 35 6 46 7c-2 9-6 14-15 11Z" fill="${fill('leaf')}"/><path d="M31 18c-10 2-13-3-13-9 9 0 14 2 13 9Z" fill="${highContrast?bg:pink}"/><path d="M39 27c-1 4-8 11-8 17a8 8 0 0 0 16 0c0-6-7-13-8-17Z" fill="${highContrast?bg:fill('drop')}" stroke="${highContrast?bg:blue}" stroke-width="1"/>${shine}${highContrast?'':`<path d="M35 43q-1 5 4 6" stroke="${ink}" stroke-width="2" opacity=".75"/>`}${spark(8,17,2.8,pink)}${spark(56,49,2,purple)}`,
  pearl:`<path d="M15 9q14-9 29-1M52 14q10 13 5 28M47 53q-16 10-31 1M8 43Q2 30 9 17" stroke="${fill('ring')}" stroke-width="2.8"/><circle cx="32" cy="31" r="20" fill="${fill('pearl')}" stroke="${edge}" stroke-width=".7"/>${highContrast?'':`<ellipse cx="25" cy="22" rx="7" ry="4.5" transform="rotate(-30 25 22)" fill="#FFFFFF" opacity=".75"/><path d="M20 41q10 10 21 1" stroke="${blue}" stroke-width="2" opacity=".45"/>`}${spark(53,10,5,pink)}${spark(9,51,4,purple)}${spark(53,52,2.8,gold)}`,
  leaf:`<path d="M29 50C14 47 11 33 15 25c10 2 18 10 14 25Z" fill="${fill('ring')}" stroke="${edge}" stroke-width=".7"/><path d="M29 45C12 36 17 16 30 6c15 14 20 29-1 39Z" fill="${fill('leaf')}" stroke="${highContrast?fg:mint}" stroke-width=".7"/><path d="M30 22c-5 16-2 25 1 36" stroke="${highContrast?bg:purple}" stroke-width="2.5"/><path d="M35 54c-2-15 9-24 22-21 2 15-6 24-22 21Z" fill="${fill('leaf')}" stroke="${highContrast?fg:mint}" stroke-width=".7"/><path d="m35 57 13-15" stroke="${highContrast?bg:purple}" stroke-width="2.5"/><path d="M49 6c-8 3-10 14-3 19 6 5 13 1 15-4-10 2-16-4-12-15Z" fill="${fill('gold')}" stroke="${highContrast?fg:gold}" stroke-width=".7"/>${spark(10,14,2,purple)}${spark(57,55,2.8,purple)}`,
  feather:`<path d="M15 52C10 39 20 25 32 23c10-2 15-11 16-18 12 9 14 21 4 29l7-2c-3 11-9 15-19 16l8 2c-10 8-20 8-33 2Z" fill="${fill('feather')}" stroke="${edge}" stroke-width=".7"/><path d="M14 59c5-19 17-29 34-39" stroke="${highContrast?bg:dark?'#F1D4C6':'#FBE9D6'}" stroke-width="3.5"/><path d="M27 41q10 1 17-3M35 32q2-7 3-11" stroke="${ink}" stroke-width="1.4"/><path d="M9 16c5-8 15 2 17-5 3-8-8-10-8-3" stroke="${fill('ring')}" stroke-width="2.5"/>${spark(7,33,3,pink)}${spark(55,52,4,purple)}`
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${shadow}${bodies[name]}</svg>`
}
