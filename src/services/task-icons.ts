export const taskIconNames=['new','listen','spell','review'] as const
export type TaskIconName=typeof taskIconNames[number]
export interface TaskIconAppearance {dark?:boolean;highContrast?:boolean}

export function taskIconSource(name:TaskIconName,{dark=false,highContrast=false}:TaskIconAppearance={}){
 return `/static/icons/tasks/${highContrast?(dark?'dark':'light')+'-contrast':'hd'}-${name}.png`
}
export function taskIconFallbackSource(name:TaskIconName,{dark=false,highContrast=false}:TaskIconAppearance={}){
 return `/static/icons/tasks/${dark?'dark':'light'}-${highContrast?'contrast':'normal'}-${name}.png`
}

function gear(cx:number,cy:number,r:number){
 const points=[]
 for(let tooth=0;tooth<8;tooth++)for(const [offset,scale]of [[-22.5,.76],[-12,1],[12,1],[22.5,.76]]){
  const angle=(tooth*45+offset)*Math.PI/180
  points.push(`${(cx+Math.cos(angle)*r*scale).toFixed(2)},${(cy+Math.sin(angle)*r*scale).toFixed(2)}`)
 }
 return points.join(' ')
}

/** Sculpted task symbols use layered local vectors, without fonts or embedded reference images. */
export function taskIconSvg(name:TaskIconName,{dark=false,highContrast=false}:TaskIconAppearance={}):string{
 const fg=dark?'#ECEEF5':'#242A31',bg=dark?'#232A37':'#FFFFFF'
 const paper=highContrast?bg:dark?'#D4D6CE':'#FFF7E7'
 const rose=highContrast?fg:dark?'#CB9C98':'#DEB1A5',roseDeep=highContrast?fg:dark?'#A27680':'#B68C99'
 const purple=highContrast?fg:dark?'#B4ABCD':'#C4BBDD',purpleDeep=highContrast?fg:dark?'#847C9F':'#9E94BC'
 const blue=highContrast?fg:dark?'#A0C3D6':'#B6D3E6',blueDeep=highContrast?fg:dark?'#7194B0':'#88ACC9'
 const gold=highContrast?fg:dark?'#D4C188':'#ECDDA8',goldDeep=highContrast?fg:dark?'#A89863':'#CDB878'
 const mint=highContrast?fg:dark?'#A8C5A3':'#B3CCA3',id='wp-task-'+name
 const fill=(key:string,fallback:string)=>highContrast?fallback:`url(#${id}-${key})`
 const gradient=(key:string,a:string,b:string)=>`<linearGradient id="${id}-${key}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
 const defs=highContrast?'':`<defs>${gradient('rose',rose,roseDeep)}${gradient('purple',purple,purpleDeep)}${gradient('blue',blue,blueDeep)}${gradient('gold',gold,goldDeep)}</defs>`
 const shadow=highContrast?'':`<ellipse cx="32" cy="60" rx="23" ry="2.4" fill="${dark?'#080D17':'#B8B5C5'}" opacity=".16"/>`
 const highlight=highContrast?bg:paper
 const letterA='m25 36 9-22 10 22m-15-8h10'
 const headphones='M13 36v-7a19 19 0 0 1 38 0v7'
 const letters={a:'m17 28 8-19 9 19m-14-7h11',b:'M12 38v19m0-19h8a4.8 4.8 0 0 1 0 9.5h-8m8 0a4.8 4.8 0 0 1 0 9.5h-8',c:'M55 39c-15-10-24 21-7 19l7-1'}
 const bodies:Record<TaskIconName,string>={
  new:`<rect x="10" y="9" width="43" height="49" rx="10" fill="${roseDeep}"/><path d="M19 48h33v9H19a5 5 0 0 1 0-9Z" fill="${paper}" stroke="${highContrast?fg:purpleDeep}" stroke-width="1.4"/><path d="M19 52h29" stroke="${highContrast?fg:purple}" stroke-width="1.3"/><rect x="12" y="6" width="41" height="43" rx="9" fill="${fill('rose',fg)}" stroke="${roseDeep}" stroke-width="1.2"/><path d="M20 10v33" stroke="${roseDeep}" stroke-width="3" ${highContrast?'':'opacity=".45"'}/>${highContrast?'':`<path d="M24 9h19q7 0 7 7" stroke="${paper}" stroke-opacity=".45" stroke-width="2"/>`}<path d="${letterA}" transform="translate(0 1.4)" stroke="${roseDeep}" stroke-width="5"/><path d="${letterA}" stroke="${highlight}" stroke-width="4.5"/>`,
  listen:`<path d="${headphones}" transform="translate(0 1.5)" stroke="${purpleDeep}" stroke-width="8"/><path d="${headphones}" stroke="${fill('purple',fg)}" stroke-width="6.5"/><rect x="7" y="33" width="13" height="20" rx="6" fill="${fill('rose',fg)}"/><rect x="15" y="32" width="6" height="23" rx="3" fill="${fill('purple',fg)}" stroke="${highContrast?bg:purpleDeep}" stroke-width="1"/><rect x="44" y="33" width="13" height="20" rx="6" fill="${fill('rose',fg)}"/><rect x="43" y="32" width="6" height="23" rx="3" fill="${fill('purple',fg)}" stroke="${highContrast?bg:purpleDeep}" stroke-width="1"/><path d="M27 38v8m5-13v18m5-13v8" stroke="${fill('purple',fg)}" stroke-width="4"/><path d="M43 5h10a9 9 0 0 1 9 9v1a9 9 0 0 1-9 9h-4l-7 5 1-5a9 9 0 0 1-9-9v-1a9 9 0 0 1 9-9Z" fill="${fill('blue',fg)}" stroke="${blueDeep}" stroke-width=".8"/><g fill="${paper}"><circle cx="42" cy="14" r="1.8"/><circle cx="49" cy="14" r="1.8"/><circle cx="56" cy="14" r="1.8"/></g>`,
  spell:`<path d="${letters.a}" transform="translate(0 1.5)" stroke="${roseDeep}" stroke-width="7"/><path d="${letters.a}" stroke="${fill('rose',fg)}" stroke-width="6.5"/><path d="${letters.b}" transform="translate(0 1.5)" stroke="${goldDeep}" stroke-width="7"/><path d="${letters.b}" stroke="${fill('gold',fg)}" stroke-width="6.5"/><path d="${letters.c}" transform="translate(0 1.5)" stroke="${blueDeep}" stroke-width="7"/><path d="${letters.c}" stroke="${fill('blue',fg)}" stroke-width="6.5"/><path d="M46 16h8M30 39h7" stroke="${mint}" stroke-width="5"/>`,
  review:`<polygon points="${gear(23,28,15)}" transform="translate(0 1.8)" fill="${roseDeep}"/><polygon points="${gear(23,28,15)}" fill="${fill('rose',fg)}" stroke="${roseDeep}" stroke-width=".8"/><circle cx="23" cy="28" r="6" fill="${paper}" stroke="${roseDeep}" stroke-width="1.5"/><polygon points="${gear(47,17,12)}" transform="translate(0 1.5)" fill="${purpleDeep}"/><polygon points="${gear(47,17,12)}" fill="${fill('purple',fg)}" stroke="${purpleDeep}" stroke-width=".8"/><circle cx="47" cy="17" r="4.6" fill="${paper}" stroke="${purpleDeep}" stroke-width="1.5"/><rect x="8" y="51" width="48" height="9" rx="4.5" fill="${highContrast?bg:purple}" stroke="${highContrast?fg:purpleDeep}" stroke-width="1"/><path d="M13 55.5h37" stroke="${paper}" stroke-width="4"/><path d="M13 55.5h23" stroke="${fill('gold',fg)}" stroke-width="4"/>`
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${shadow}${bodies[name]}</svg>`
}
