import type {PetStatusName} from './pet-status'
export function petStatusIconSource(name:PetStatusName,contrast=false,dark=false){return `/static/icons/pet-status/${contrast?(dark?'dark':'light')+'-contrast':'hd'}-${name}.png`}
/** Font-independent equivalents for high contrast and failed bitmap requests. */
export function petStatusIconSvg(name:PetStatusName,dark=false){
 const fg=dark?'#F1EDE7':'#353B46',bg=dark?'#24272D':'#FFFDF9'
 const star='<path d="m23 14 6 12 13 2-10 10 2 14-11-7-12 7 2-14-10-10 14-2Z"/>'
 const parts={excitement:star+'<path d="M36 49q17-3 20-29m-9 5 10-9 3 14" fill="none" stroke="'+fg+'" stroke-width="4"/>',happiness:star+'<path d="M53 7a12 12 0 1 0 7 20c-13 2-18-11-7-20Z"/><rect x="43" y="41" width="16" height="7" rx="2"/><rect x="43" y="51" width="16" height="7" rx="2"/>',experience:'<g fill="none" stroke="'+fg+'" stroke-width="6"><ellipse cx="24" cy="32" rx="16" ry="22" transform="rotate(-20 24 32)"/><ellipse cx="42" cy="32" rx="16" ry="22" transform="rotate(20 42 32)"/></g><circle cx="19" cy="10" r="4" fill="'+bg+'" stroke="'+fg+'"/>',affection:'<ellipse cx="13" cy="26" rx="6" ry="8"/><ellipse cx="25" cy="15" rx="6" ry="8"/><ellipse cx="40" cy="15" rx="6" ry="8"/><ellipse cx="52" cy="26" rx="6" ry="8"/><path d="M18 37q14-22 28 0c16 26-11 23-14 20-9 4-29 3-14-20Z"/><path d="M32 48 23 39c-7-8 4-14 9-7 6-7 16-1 9 7Z" fill="'+bg+'"/>'}[name]
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="${fg}" stroke-linejoin="round" stroke-linecap="round">${parts}</svg>`
}
