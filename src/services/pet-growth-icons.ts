export const petGrowthIconNames=['progress','experience','affection','device','book'] as const
export type PetGrowthIconName=typeof petGrowthIconNames[number]
export function petGrowthIconSource(name:PetGrowthIconName,contrast=false,dark=false){return `/static/icons/pet-growth/${contrast?(dark?'dark':'light')+'-contrast':'hd'}-${name}.png`}
/** Small monochrome equivalents are independent of fonts and bitmap loading. */
export function petGrowthContrastSvg(name:PetGrowthIconName,dark=false){
 const fg=dark?'#F1EDE7':'#353B46',bg=dark?'#24272D':'#FFFDF9'
 const paw=`<ellipse cx="27" cy="27" rx="3" ry="4"/><ellipse cx="36" cy="26" rx="3" ry="4"/><ellipse cx="43" cy="32" rx="3" ry="4"/><ellipse cx="20" cy="33" rx="3" ry="4"/><path d="M22 42q10-19 20 0c2 8-8 6-10 4-5 2-12 4-10-4Z"/>`
 const book=`<path d="M7 23q12-5 25 1 13-6 25-1v30q-12-4-25 2-13-6-25-2Z" fill="${bg}" stroke="${fg}"/><path d="M32 25v29m7-20h10m-10 9h10" fill="none" stroke="${fg}"/>`
 const body={progress:`<rect x="5" y="25" width="54" height="17" rx="8" fill="${bg}" stroke="${fg}"/><path d="M16 33h24" stroke="${fg}" stroke-width="6"/><circle cx="16" cy="33" r="12" fill="${bg}" stroke="${fg}"/><g transform="translate(4 20) scale(.38)">${paw}</g>`,experience:`<path d="m32 7 8 16 18 3-13 13 3 18-16-9-16 9 3-18L6 26l18-3Z"/>`,affection:`<path d="M32 55 10 33C-4 16 19 1 32 18 45 1 68 16 54 33Z"/><g fill="${bg}">${paw}</g>`,device:`<rect x="9" y="5" width="33" height="51" rx="7" fill="${bg}" stroke="${fg}"/><path d="M19 12h13" stroke="${fg}"/>${book}`,book}[name]
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="${fg}" stroke-linejoin="round" stroke-linecap="round" stroke-width="2.5">${body}</svg>`
}
