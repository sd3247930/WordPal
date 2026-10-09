import type {ThemeId} from './themes'
export type PhonicsColor='red'|'green'|'blue'
export interface PhonicsTone {ink:string;active:string;soft:string}
type PhonicsPalette=Record<PhonicsColor,PhonicsTone>
const order:PhonicsColor[]=['red','green','blue']
/**
 * Signal-light hues. Every theme now uses this red → green → blue family; the exact shade is
 * picked per surface so the project's accessibility gates stay green
 * (active vs surface >= 4.5, ink at 75% opacity >= 3).
 */
export const SIGNAL_COLORS:Record<PhonicsColor,string>={red:'#E53935',green:'#43A047',blue:'#1E88E5'}
/** Whole-word fallback and single-chunk words always read blue; otherwise red → green → blue. */
export const getPhonicsColor=(index:number,total=2):PhonicsColor=>total<=1?'blue':order[index%3]
// bento / soft light surfaces are near-white.
const light:PhonicsPalette={
 red:{ink:'#B71C1C',active:'#C62828',soft:'#FDECEA'},
 green:{ink:'#1B5E20',active:'#2E7D32',soft:'#E8F5E9'},
 blue:{ink:'#0A3A85',active:'#0D47A1',soft:'#E3F2FD'}
}
const dark:PhonicsPalette={
 red:{ink:'#FF8A80',active:'#FFCDD2',soft:'#3A2226'},
 green:{ink:'#A5D6A7',active:'#C8E6C9',soft:'#1E3324'},
 blue:{ink:'#90CAF9',active:'#BBDEFB',soft:'#16283C'}
}
// oled light uses a very dark page background, so it needs the bright signal shades too.
const night:PhonicsPalette={
 red:{ink:'#FF8A80',active:'#FFCDD2',soft:'#32252C'},
 green:{ink:'#A5D6A7',active:'#C8E6C9',soft:'#233027'},
 blue:{ink:'#90CAF9',active:'#BBDEFB',soft:'#232D3F'}
}
// swiss light sits on a grey surface and swiss dark on a slate surface.
const swissLight:PhonicsPalette={
 red:{ink:'#B71C1C',active:'#C62828',soft:'#F0F2F3'},
 green:{ink:'#1B5E20',active:'#2E7D32',soft:'#F0F2F3'},
 blue:{ink:'#0A3A85',active:'#0D47A1',soft:'#F0F2F3'}
}
const swissDark:PhonicsPalette={
 red:{ink:'#FFCDD2',active:'#FFEBEE',soft:'#2A3342'},
 green:{ink:'#C8E6C9',active:'#E8F5E9',soft:'#2A3342'},
 blue:{ink:'#BBDEFB',active:'#E3F2FD',soft:'#2A3342'}
}
export function phonicsColor(index:number,theme:ThemeId,mode:'light'|'dark',total=2):PhonicsTone{
 const palette=theme==='oled'?(mode==='light'?night:dark):theme==='swiss'?(mode==='light'?swissLight:swissDark):(mode==='light'?light:dark)
 return palette[getPhonicsColor(index,total)]
}
