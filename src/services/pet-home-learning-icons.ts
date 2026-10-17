export type PetHomeLearningIconName='practice'|'complete'|'spelling'|'together'
export interface PetHomeLearningIconAppearance {dark?:boolean;highContrast?:boolean}

export function petHomeLearningIconSource(name:PetHomeLearningIconName,{dark=false,highContrast=false}:PetHomeLearningIconAppearance={}):string{
 const file=highContrast?`${dark?'dark':'light'}-contrast-${name}`:name==='together'?'hd-together-lan-yan':`hd-${name}`
 return `/static/icons/pet-home-learning/${file}.png`
}

/** Simple, font-independent silhouettes reserved for high-contrast accessibility. */
export function petHomeLearningContrastSvg(name:PetHomeLearningIconName,{dark=false}:{dark?:boolean}={}):string{
 const fg=dark?'#F1EDE7':'#353B46',bg=dark?'#24272D':'#FFFDF9'
 const bodies:Record<PetHomeLearningIconName,string>={
  practice:`<path d="M7 22q13-5 25 1 12-6 25-1v32q-13-4-25 2-12-6-25-2Z" fill="${bg}"/><path d="M32 24v31m8-22h10m-10 8h10m-10 8h10"/><path d="m18 6 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="${fg}"/>`,
  complete:`<path d="m5 22 27-12 27 12-27 12Z" fill="${fg}"/><path d="M17 29v14q15 10 30 0V29M12 26v18"/><path d="m25 23 5 4 10-9" stroke="${bg}"/><rect x="23" y="47" width="32" height="11" rx="5.5" fill="${bg}"/><path d="M39 47v11"/>`,
  spelling:`<rect x="6" y="8" width="22" height="25" rx="5" fill="${bg}"/><path d="m11 28 6-14 6 14m-9-5h6"/><rect x="40" y="7" width="12" height="21" rx="6" fill="${fg}"/><path d="M35 23a11 11 0 0 0 22 0M46 35v6m-7 0h14m-42 5 23-9-11 23-14 2Z" fill="${bg}"/><path d="m16 54 13-12"/>`,
  together:`<path d="M8 34C1 29 5 18 7 14 7 4 25 4 28 15c6 8 3 17-2 20" fill="${fg}"/><circle cx="18" cy="22" r="8" fill="${bg}"/><circle cx="18" cy="11" r="2.5" fill="${bg}"/><path d="m11 20-5-3 2 9m17-6 5-3-2 9m-14-3 1-1 1 1m4 0 1-1 1 1"/><path d="M38 23c-4-8 1-12 3-17 0 7 7 6 6 1 9 8 10 16 4 21l10-8-4 14-7 5H39l-8-16 10 7Z" fill="${fg}"/><path d="m40 23 2-2 2 2m1 4 5-1-3 4" stroke="${bg}"/><path d="M8 37q12-5 24 1 12-6 24-1v20q-12-4-24 2-12-6-24-2Z" fill="${bg}"/><path d="M32 39v19m8-12h8m-8 6h8"/>`
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${fg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${bodies[name]}</svg>`
}
