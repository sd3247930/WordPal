import type {ThemeId} from './themes'
export type PhonicsColor='red'|'green'|'blue'
export interface PhonicsTone {ink:string;active:string;soft:string}
type PhonicsPalette=Record<PhonicsColor,PhonicsTone>
const order:PhonicsColor[]=['red','green','blue']
export const getPhonicsColor=(index:number):PhonicsColor=>order[index%3]
// Base tones also retain readable contrast at 75% upcoming-chunk opacity.
const light:PhonicsPalette={
 red:{ink:'#B74444',active:'#983434',soft:'#FBECEC'},
 green:{ink:'#29784B',active:'#1F603A',soft:'#EAF6EF'},
 blue:{ink:'#3069B4',active:'#245291',soft:'#EAF2FB'}
}
const dark:PhonicsPalette={
 red:{ink:'#E27B7B',active:'#EFA0A0',soft:'#38262B'},
 green:{ink:'#70BF8E',active:'#92D0A8',soft:'#23352C'},
 blue:{ink:'#72A3E6',active:'#9ABBE9',soft:'#243248'}
}
const night:PhonicsPalette={
 red:{ink:'#D07575',active:'#DF8787',soft:'#32252C'},
 green:{ink:'#6BB885',active:'#85C69B',soft:'#233027'},
 blue:{ink:'#709ED7',active:'#86B0E7',soft:'#232D3F'}
}
const swissLight:PhonicsPalette={
 red:{ink:'#A34A4A',active:'#873939',soft:'#F0F2F3'},
 green:{ink:'#376F4E',active:'#28573B',soft:'#F0F2F3'},
 blue:{ink:'#466897',active:'#33507A',soft:'#F0F2F3'}
}
const swissDark:PhonicsPalette={
 red:{ink:'#CB8C8C',active:'#D6B3B3',soft:'#2A3342'},
 green:{ink:'#87B69A',active:'#B3CFBD',soft:'#2A3342'},
 blue:{ink:'#88A9D3',active:'#B3C7E1',soft:'#2A3342'}
}
export function phonicsColor(index:number,theme:ThemeId,mode:'light'|'dark'):PhonicsTone{
 const palette=theme==='oled'?night:theme==='swiss'?(mode==='light'?swissLight:swissDark):mode==='light'?light:dark
 return palette[getPhonicsColor(index)]
}
