import type {Element} from '../../packages/pet_engine'
import type {PetForm} from './pet-growth'
import type {PetDressIconName} from './pet-dress-icons'

interface Fit {neck:[number,number];width:number;angle:number;pin:[number,number];pinSize:number}
/** Coordinates belong to the artwork's 360 × 480 plane, never the surrounding scene. */
export const petWearableFits:Record<Element,Record<PetForm,Fit>>={
 water:{
  1:{neck:[205,164],width:31,angle:16,pin:[217,219],pinSize:14},
  2:{neck:[203,163],width:32,angle:12,pin:[214,193],pinSize:15},
  3:{neck:[224,145],width:27,angle:22,pin:[235,179],pinSize:15},
  4:{neck:[234,156],width:25,angle:-9,pin:[234,186],pinSize:15}},
 fire:{
  1:{neck:[198,221],width:49,angle:9,pin:[193,252],pinSize:22},
  2:{neck:[198,200],width:46,angle:-8,pin:[195,232],pinSize:21},
  3:{neck:[212,190],width:42,angle:9,pin:[209,221],pinSize:20},
  4:{neck:[207,210],width:38,angle:-5,pin:[210,244],pinSize:19}},
 earth:{
  1:{neck:[157,282],width:57,angle:12,pin:[145,323],pinSize:24},
  2:{neck:[148,255],width:48,angle:13,pin:[139,296],pinSize:22},
  3:{neck:[154,239],width:39,angle:14,pin:[145,278],pinSize:19},
  4:{neck:[152,245],width:36,angle:11,pin:[147,283],pinSize:18}},
 wind:{
  1:{neck:[183,246],width:30,angle:6,pin:[190,274],pinSize:17},
  2:{neck:[194,249],width:29,angle:9,pin:[199,277],pinSize:17},
  3:{neck:[199,223],width:28,angle:11,pin:[206,249],pinSize:16},
  4:{neck:[195,239],width:27,angle:7,pin:[202,267],pinSize:16}}
}
export const petWearableSource=(element:Element,form:number,item:PetDressIconName,layer:'back'|'front')=>
 form>=1&&form<=4&&Number.isInteger(form)?`/static/pet-house/wearables/${element}-${form}-${item}-${layer}.png`:''

/** Tailored fabric, separate from the inventory illustration and its decorative props. */
export function petWearableSvg(element:Element,form:PetForm,item:PetDressIconName,layer:'back'|'front'){
 const fit=petWearableFits[element][form],s=Number((fit.width/60).toFixed(3)),[x,y]=fit.neck
 const defs=`<defs><linearGradient id="silk" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2b3"/><stop offset=".3" stop-color="#f6b7c3"/><stop offset=".6" stop-color="#b6a0ed"/><stop offset="1" stop-color="#8fdae0"/></linearGradient><linearGradient id="wool" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#ffe3cd"/><stop offset=".4" stop-color="#edb0ce"/><stop offset="1" stop-color="#a693d9"/></linearGradient><linearGradient id="gold" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff9cf"/><stop offset=".5" stop-color="#ffdc86"/><stop offset="1" stop-color="#eeae75"/></linearGradient><linearGradient id="gem"><stop stop-color="#b0e9dd"/><stop offset="1" stop-color="#b39cdd"/></linearGradient><filter id="shadow" x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="0" dy="1.4" stdDeviation="1" flood-color="#45345a" flood-opacity=".3"/></filter></defs>`
 const rear=item==='star'?'':`<ellipse cx="0" cy="-1" rx="30" ry="8" fill="none" stroke="${item==='scarf'?'#aa88ba':'#99bfd0'}" stroke-width="${item==='scarf'?8:4}"/>`
 const band=`<path d="M-29 0Q0 15 29 0" fill="none" stroke="url(#${item==='scarf'?'wool':'silk'})" stroke-width="${item==='scarf'?12:5}"/><path d="M-27-2Q0 11 27-2" fill="none" stroke="#fff4de" stroke-opacity=".7" stroke-width="1.4"/>`
 const bow=`<path d="M-17 7C-43-13-44 15-20 13C-8 7-3 28 4 17C9 6-5-1-17 7Z" fill="url(#silk)" stroke="#d0a3cc" stroke-width=".8"/><path d="M-19 12C-28 29-7 39-17 54L-6 48-4 55C9 29-18 29-11 13" fill="url(#silk)" stroke="#d0a3cc" stroke-width=".7"/><path d="M-15 14C-7 28 18 19 21 38L29 33C26 14 3 22-9 10" fill="url(#gem)" stroke="#a7bed2" stroke-width=".6"/><ellipse cx="-15" cy="10" rx="5" ry="6" fill="url(#gold)"/><path d="M-34 6Q-28 1-20 7M-17 23Q-14 37-13 42" fill="none" stroke="#fff9e8" stroke-width="1.5" opacity=".75"/>`
 const scarf=`<path d="M-20 7C-28 23-16 33-24 49L-9 55C3 30-8 25-6 9" fill="url(#wool)" stroke="#b98fae" stroke-width=".8"/><path d="M3 10C1 27 18 27 14 44L29 47C36 24 16 23 18 7" fill="url(#wool)" stroke="#b98fae" stroke-width=".8"/><path d="m-23 49-3 8m8-6-2 8m8-6-2 8m30-17-1 8m7-7v8m6-7 1 7" stroke="#b09ad4" stroke-width="3" stroke-linecap="round"/>${band}<path d="M-21 16q2 3 4 0m1 5q2 3 4 0m-8 4q2 3 4 0m1 5q2 3 4 0m-6 4q2 3 4 0m33-14q2 3 4 0m-2 6q2 3 4 0m-1 6q2 3 4 0" stroke="#fff1df" stroke-width=".8" opacity=".65" fill="none"/>`
 const star=`<path d="m-5 4-1 17 6-3 6 3-1-17" fill="url(#gem)" stroke="#9fadd5" stroke-width=".6"/><path d="M0-14Q2-14 5-6L13-5Q16-4 10 2L11 11Q11 14 0 8L-9 12Q-12 12-10 2L-16-4Q-17-6-5-6Z" fill="url(#gold)" stroke="#fff2c7" stroke-width="1"/><path d="m0-8 3 6 7 1-5 5 1 6-6-3-6 3 1-6-5-5 7-1Z" fill="url(#gem)"/><path d="m-11-4 7-1 3-6" stroke="#fffbe2" stroke-width="1" fill="none"/>`
 const transform=item==='star'?`translate(${fit.pin.join(' ')}) rotate(${fit.angle}) scale(${Number((fit.pinSize/32).toFixed(3))})`:`translate(${x} ${y}) rotate(${fit.angle}) scale(${s})`
 return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 360 480">${defs}<g transform="${transform}"${layer==='front'?' filter="url(#shadow)"':''}>${layer==='back'?rear:item==='star'?star:item==='scarf'?scarf:band+bow}</g></svg>`
}
