import type {ThemeId} from './themes'
export interface PhonicsColor {ink:string;soft:string}
const light:PhonicsColor[]=[{ink:'#315F8C',soft:'#EAF2FB'},{ink:'#87502A',soft:'#FBEFE6'},{ink:'#675085',soft:'#F1ECFA'},{ink:'#4F673D',soft:'#EEF5E8'},{ink:'#874D64',soft:'#F9EBF1'}]
const dark:PhonicsColor[]=[{ink:'#B0C5DE',soft:'#29364A'},{ink:'#D5B79C',soft:'#3C322C'},{ink:'#C5B9D8',soft:'#363145'},{ink:'#BBD0AA',soft:'#303B2D'},{ink:'#DAB5C1',soft:'#40303B'}]
const night:PhonicsColor[]=[{ink:'#8EACC9',soft:'#202C3E'},{ink:'#C3A082',soft:'#302922'},{ink:'#AD9AC9',soft:'#2B263B'},{ink:'#A0B690',soft:'#273025'},{ink:'#C59DAE',soft:'#342631'}]
export function phonicsColor(index:number,theme:ThemeId,mode:'light'|'dark'):PhonicsColor{
 const palette=theme==='oled'?night:mode==='light'?light:dark,color=palette[index%palette.length]
 return theme==='swiss'?{...color,soft:mode==='light'?'#F0F2F3':'#2A3342'}:color
}
