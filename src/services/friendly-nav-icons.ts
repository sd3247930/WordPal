import type {NavIconName} from './nav-icons'

export interface FriendlyNavAppearance {dark?:boolean;highContrast?:boolean;active?:boolean}
export const friendlyNavNames=['home','learn','pet','review','settings'] as const

/** Transparent HD artwork is shared across selection states; the frame carries selection. */
export function friendlyNavIconSource(name:NavIconName,{dark=false,highContrast=false}:FriendlyNavAppearance={}){
 return `/static/icons/nav/${highContrast?`friendly-${dark?'dark':'light'}-contrast`:'hd'}-${name}.png`
}

export function friendlyNavFallbackSource(name:NavIconName,{dark=false,highContrast=false,active=false}:FriendlyNavAppearance={}){
 return `/static/icons/nav/friendly-${dark?'dark':'light'}-${highContrast?'contrast':active?'active':'default'}-${name}.png`
}
const colors:Record<NavIconName,{light:string[];dark:string[]}>= {
 home:{light:['#EBA6A0','#D47F7F','#FFF2EE','#F9E4DF'],dark:['#D2938E','#AE7076','#3A3035','#30292F']},
 learn:{light:['#F4DB9C','#E7BD70','#FFF9E9','#F5EBCF'],dark:['#DCC38D','#B59661','#39352C','#302D28']},
 pet:{light:['#CDE6EE','#96BCCF','#F0F8FC','#DFEEF5'],dark:['#ACCBD8','#799CAF','#2C3642','#26303B']},
 review:{light:['#A4D2B3','#70AF94','#EFF8F1','#DDEFE3'],dark:['#A1C6B0','#719F8D','#2E3934','#27312D']},
 settings:{light:['#CABAE2','#A891C2','#F7F2FC','#EAE1F4'],dark:['#BAA9CF','#9580AD','#38313F','#2E2936']}
}

export function friendlyNavPalette(name:NavIconName,{dark=false,highContrast=false}:FriendlyNavAppearance={}){
 const [top,bottom,tint,tintEnd]=colors[name][dark?'dark':'light']
 const paper=dark?'#CFDCE0':'#FFFDF6',ink=dark?'#DCE7EC':'#577482'
 if(highContrast){const fg=dark?'#ECEEF5':'#242A31',bg=dark?'#232A37':'#FFFFFF';return {top:fg,bottom:fg,tint:bg,tintEnd:bg,paper:bg,ink:fg,coral:fg,green:fg,gold:fg,door:bg,mark:bg}}
 return {top,bottom,tint,tintEnd,paper,ink,coral:dark?'#CF9390':'#DD8E8A',green:dark?'#99BEA3':'#8ABD9B',gold:dark?'#D8BF87':'#EAC77C',door:dark?'#476D78':'#64939E',mark:dark?'#476956':'#609A7D'}
}

export function friendlyNavStyle(name:NavIconName,appearance:FriendlyNavAppearance={}){
 const p=friendlyNavPalette(name,appearance)
 return `--wp-nav-tint:${p.tint};--wp-nav-tint-end:${p.tintEnd}`
}

function gear(cx:number,cy:number,radius:number){
 const points=[]
 for(let tooth=0;tooth<8;tooth++)for(const [offset,scale]of [[-22.5,.77],[-12,1],[12,1],[22.5,.77]]){
  const angle=(tooth*45+offset)*Math.PI/180
  points.push(`${(cx+Math.cos(angle)*radius*scale).toFixed(2)},${(cy+Math.sin(angle)*radius*scale).toFixed(2)}`)
 }
 return points.join(' ')
}

/** Original local vector artwork: friendly silhouettes remain legible at navigation size. */
export function friendlyNavIconSvg(name:NavIconName,appearance:FriendlyNavAppearance={}):string {
 const p=friendlyNavPalette(name,appearance),prefix='wp-nav-'+name
 const body=appearance.highContrast?p.top:`url(#${prefix}-body)`
 const warm=appearance.highContrast?p.top:`url(#${prefix}-warm)`
 const edge=appearance.highContrast?p.ink:p.bottom,stroke=appearance.active?1.4:1
 const definitions=appearance.highContrast?'':`<defs><linearGradient id="${prefix}-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.top}"/><stop offset="1" stop-color="${p.bottom}"/></linearGradient><linearGradient id="${prefix}-warm" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p.coral}"/><stop offset="1" stop-color="${appearance.dark?'#AE7076':'#C97076'}"/></linearGradient></defs>`
 const bodies:Record<NavIconName,string>={
  home:`<path d="M34 12h5v13h-5Z" fill="${warm}"/><rect x="9" y="22" width="30" height="20" rx="3" fill="${appearance.highContrast?p.top:p.paper}" stroke="${edge}" stroke-width="${stroke}"/><path d="m6 25 18-16 18 16" stroke="${appearance.highContrast?p.top:p.coral}" stroke-width="6"/><path d="M19 42v-8a5 5 0 0 1 10 0v8" fill="${appearance.highContrast?p.paper:p.coral}"/><circle cx="24" cy="24" r="3" fill="${appearance.highContrast?p.paper:p.gold}"/><path d="M6 7v5M3.5 9.5h5" stroke="${p.green}" stroke-width="2"/><path d="M4 42h40" stroke="${edge}" stroke-width="2"/>`,
  learn:`<path d="M37 11h4v5h-4M37 21h4v5h-4M37 31h4v5h-4" fill="${p.green}"/><rect x="8" y="6" width="30" height="37" rx="5" fill="${warm}"/><path d="M14 6h22a2 2 0 0 1 2 2v29H14a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5Z" fill="${body}" stroke="${edge}" stroke-width="${stroke}"/><path d="M14 37h24v5H14a2.5 2.5 0 0 1 0-5Z" fill="${p.paper}"/><path d="M17 14h14" stroke="${p.paper}" stroke-width="4"/><path d="M17 14h7" stroke="${p.green}" stroke-width="4"/><path d="m17 24 2.5 2.5 4-5m4 2.5 2.5 2.5 4-5" stroke="${p.mark}" stroke-width="2.5"/><path d="M17 32h13" stroke="${p.paper}" stroke-width="2"/>`,
  pet:`<path d="M5 39V28C5 15.8 13 6 24 6s19 9.8 19 22v11Z" fill="${body}" stroke="${edge}" stroke-width="${stroke}"/><path d="M9 18q15 5 30 0M5 28q19 5 38 0M24 6v14M14 8l-2 11M34 8l2 11M16 21v9M32 21v9" stroke="${appearance.highContrast?p.paper:p.ink}" stroke-opacity="${appearance.highContrast?1:.32}" stroke-width="1.2"/><path d="M14 40V29c0-7 4-11 10-11s10 4 10 11v11Z" fill="${appearance.highContrast?p.paper:p.door}" stroke="${appearance.highContrast?p.paper:p.top}" stroke-width="3"/><path d="M3 40h40" stroke="${edge}" stroke-width="2"/><path d="m32 37-3 7h15l-3-7Z" fill="${warm}" stroke="${appearance.highContrast?p.ink:p.coral}" stroke-width="1"/><ellipse cx="36.5" cy="37" rx="4.5" ry="1.5" fill="${appearance.highContrast?p.paper:p.gold}"/>`,
  review:`<rect x="8" y="5" width="30" height="38" rx="5" fill="${body}" stroke="${edge}" stroke-width="${stroke}"/><path d="M13 5v30" stroke="${appearance.highContrast?p.paper:p.top}" stroke-width="2"/><path d="M14 37h24v5H14a2.5 2.5 0 0 1 0-5Z" fill="${p.paper}"/><path d="M17 29c6-8 14-12 24-12" stroke="${p.paper}" stroke-width="3"/><path d="M17 23c5-5 10-8 17-9" stroke="${appearance.highContrast?p.paper:p.top}" stroke-width="2"/><path d="M24 12c3-4 6-3 5 0-1 3-4 4-5 0Z" fill="${appearance.highContrast?p.paper:p.green}"/><circle cx="41" cy="16" r="3" fill="${appearance.highContrast?p.paper:p.gold}"/><circle cx="36" cy="25" r="1.3" fill="${p.paper}"/>`,
  settings:`<path d="M34 8c7 0 10 4 10 10m-3-2 3 3 2-4M5 30c0 7 4 11 11 11m-2-3 3 3-3 3" stroke="${p.green}" stroke-width="2"/><polygon points="${gear(18,18,13)}" fill="${warm}" stroke="${appearance.highContrast?p.ink:p.coral}" stroke-width="${stroke}"/><circle cx="18" cy="18" r="5.3" fill="${p.paper}"/><polygon points="${gear(34,34,11)}" fill="${p.green}" stroke="${appearance.highContrast?p.ink:p.mark}" stroke-width="${stroke}"/><circle cx="34" cy="34" r="4.2" fill="${p.paper}"/>`
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round">${definitions}${bodies[name]}</svg>`
}
