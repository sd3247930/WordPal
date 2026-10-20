export const homeStatNames=['streak','review','new'] as const
export type HomeStatName=typeof homeStatNames[number]
export const homeStatIconSource=(name:HomeStatName)=>`/static/icons/home-stats/${name}.png`

/** Original small clay-style symbols, drawn locally without embedded reference artwork. */
export function homeStatIconSvg(name:HomeStatName):string {
 const prefix='home-'+name
 const gradient=(id:string,top:string,bottom:string)=>`<linearGradient id="${prefix}-${id}" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`
 const fill=(id:string)=>`url(#${prefix}-${id})`
 const defs=gradient('cream','#FFFBEA','#F5DEAF')+gradient('orange','#FFA55D','#E5652E')+gradient('flame','#FF8954','#E84F29')+gradient('blue','#8ED8FF','#2B83DC')+gradient('paper','#FFFDF0','#F8E1A9')+gradient('green','#91D879','#39A957')
 const bodies:Record<HomeStatName,string>={
  streak:`<rect x="10" y="14" width="45" height="43" rx="10" fill="#D8AE74"/><rect x="8" y="11" width="46" height="44" rx="10" fill="${fill('cream')}" stroke="#E8C78D" stroke-width="1.2"/><path d="M8 28V21q0-10 10-10h26q10 0 10 10v7Z" fill="${fill('orange')}"/><path d="M18 8v10M43 8v10" stroke="#CF692C" stroke-width="7"/><path d="M18 7v10M43 7v10" stroke="#FFBA71" stroke-width="5"/><path d="M17 24h29" stroke="#FFE2B8" stroke-opacity=".65" stroke-width="2"/><path d="M31 29c2 7 8 8 8 15a9 9 0 0 1-18 0c0-5 3-8 5-10-1 5 2 5 3 5 2-2 1-7 2-10Z" fill="${fill('flame')}"/><path d="M30 40c-1 4-4 4-4 7a4 4 0 0 0 8 0c0-3-3-4-4-7Z" fill="#FFD266"/>`,
  review:`<path d="M13 28A20 20 0 0 1 47 17M51 37A20 20 0 0 1 17 48" transform="translate(0 2)" stroke="#3078BC" stroke-width="11"/><path d="M13 27A20 20 0 0 1 47 16M51 36A20 20 0 0 1 17 47" stroke="${fill('blue')}" stroke-width="11"/><path d="m49 8 5 16-17-1q-3-1-1-3L46 9q2-3 3-1ZM15 56 10 40l17 1q3 1 1 3L18 55q-2 3-3 1Z" fill="${fill('blue')}" stroke="#3F97E3" stroke-width="1"/><path d="M16 22a17 17 0 0 1 22-10M48 41a17 17 0 0 1-22 10" stroke="#D2F0FF" stroke-width="2" stroke-opacity=".65"/>`,
  new:`<path d="M7 24q12-7 25 0 13-7 25 0v31q-14-5-25 1-11-6-25-1Z" transform="translate(0 2)" fill="#D39B43"/><path d="M7 24q12-7 25 0 13-7 25 0v29q-14-5-25 1-11-6-25-1Z" fill="#F4C46C" stroke="#DEAA51" stroke-width="1"/><path d="M10 22q11-5 22 1v28q-11-5-22-1ZM54 22q-11-5-22 1v28q11-5 22-1Z" fill="${fill('paper')}"/><path d="M32 23v28" stroke="#EAC98D" stroke-width="1.5"/><path d="M32 30V16" stroke="#3A9B50" stroke-width="3.5"/><path d="M31 21C18 22 11 9 16 7c8-3 17 6 15 14ZM33 18C34 7 46 3 49 7c3 7-7 14-16 11Z" fill="${fill('green')}"/><path d="m18 10 10 8M46 8l-10 8" stroke="#C0EB9C" stroke-width="1.6" stroke-opacity=".7"/>`
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs>${defs}</defs><ellipse cx="32" cy="59" rx="22" ry="2" fill="#825C38" opacity=".1"/>${bodies[name]}</svg>`
}
