export type ThemeId='swiss'|'clay'
export type ColorMode='system'|'light'|'dark'
export type WordPalTokens=Record<string,string>
export interface WordPalTheme {id:ThemeId;mode:'light'|'dark';tokens:WordPalTokens}
export interface WordPalThemePack {
 id:ThemeId;name:string;description:string;tokens:WordPalTokens
 buildLight:()=>WordPalTheme;buildDark:()=>WordPalTheme
 petRenderer:'illustration'|'avatar';rewardMotion:'fade'|'pop'
}
const light:WordPalTokens={
 background:'#faf8f4',foreground:'#29313e',surface:'#ffffff','surface-foreground':'#29313e',
 'surface-soft':'#f3f0e9','surface-raised':'#ffffff',primary:'#b34b20','on-primary':'#ffffff',
 brand:'#eb793f',secondary:'#f9eadf',muted:'#f3f0e9','muted-foreground':'#606975',
 success:'#2d704e',warning:'#865b20',danger:'#b33e50','on-danger':'#ffffff',
 border:'#e3dfd7',divider:'#ebe7df','focus-ring':'#b34b20',
 water:'#65abe2','water-soft':'#eaf4fb','element-water':'#26689e',
 fire:'#e98c58','fire-soft':'#fcefe5','element-fire':'#a14823',
 earth:'#91b866','earth-soft':'#eff5e7','element-earth':'#506f32',
 wind:'#a792d8','wind-soft':'#f2edf9','element-wind':'#7250aa',
 reward:'#f7edda','on-reward':'#795622',radius:'22px','radius-sm':'14px','radius-chip':'10px','radius-lg':'24px','radius-dialog':'26px',
 'card-border':'1px','pet-size':'108px','weight-display':'700',
 elevation:'0 3px 12px rgba(31,38,55,0.04)','shadow-raised':'0 6px 20px rgba(31,38,55,0.06)',scrim:'rgba(16,24,42,0.18)',
 'motion-fast':'180ms','motion-normal':'240ms','motion-slow':'320ms',
 'font-family':"'Source Han Sans SC','思源黑体','Noto Sans SC','Noto Sans','Segoe UI','Arial Unicode MS',Arial,system-ui,'PingFang SC','Microsoft YaHei',sans-serif",
 'font-brand':"'Trebuchet MS','PingFang SC',sans-serif"
}
const dark:WordPalTokens={...light,
 background:'#181d27',foreground:'#eceef5',surface:'#232a37','surface-foreground':'#eceef5','surface-soft':'#2a3342','surface-raised':'#303a4a',
 primary:'#eab18c','on-primary':'#302018',brand:'#e7a27a',secondary:'#3d302b',muted:'#2a3342','muted-foreground':'#b9c0cf',
 success:'#9cd0ae',warning:'#dfc195',danger:'#edacb8','on-danger':'#321921',border:'#424b5d',divider:'#353f50','focus-ring':'#eab18c',
 water:'#74aeda','water-soft':'#263549','element-water':'#b1d2f0',fire:'#dca077','fire-soft':'#3b302c','element-fire':'#edc0a6',
 earth:'#a4be81','earth-soft':'#30392c','element-earth':'#c5d6ae',wind:'#b39cd9','wind-soft':'#343045','element-wind':'#d3c2ec',
 reward:'#38312a','on-reward':'#e0caa5',elevation:'none','shadow-raised':'none'
}
interface Variant {name:string;description:string;light:WordPalTokens;dark:WordPalTokens;petRenderer:WordPalThemePack['petRenderer'];rewardMotion:'fade'|'pop'}
const variants:Record<ThemeId,Variant>={
 swiss:{name:'瑞士专注主题',description:'清晰 · 克制',
  light:{background:'#f7f8f8',foreground:'#242a31','surface-foreground':'#242a31',primary:'#a34c2c','focus-ring':'#a34c2c',secondary:'#f3e9e3',
   border:'#d9dde0',divider:'#e5e7e9',muted:'#f0f2f3','surface-soft':'#f0f2f3',radius:'10px','radius-sm':'8px','radius-chip':'8px','radius-lg':'12px',
   'element-water':'#a34c2c','element-fire':'#a34c2c','element-earth':'#a34c2c','element-wind':'#a34c2c',
   'water-soft':'#f0f2f3','fire-soft':'#f0f2f3','earth-soft':'#f0f2f3','wind-soft':'#f0f2f3',
   elevation:'none','shadow-raised':'none','pet-size':'44px','motion-fast':'150ms'},
  dark:{radius:'10px','radius-sm':'8px','radius-chip':'8px','radius-lg':'12px',elevation:'none','shadow-raised':'none','pet-size':'44px','motion-fast':'150ms',
   'element-water':'#eab18c','element-fire':'#eab18c','element-earth':'#eab18c','element-wind':'#eab18c',
   'water-soft':'#2a3342','fire-soft':'#2a3342','earth-soft':'#2a3342','wind-soft':'#2a3342'},
  petRenderer:'avatar',rewardMotion:'fade'},
 clay:{name:'奶油粘土主题',description:'温暖 · 玩具粘土',
  light:{background:'#FFF7EB',foreground:'#3E322C','surface-foreground':'#3E322C',surface:'#FFFDF7','surface-raised':'#FFF9EF','surface-soft':'#F6EDDF',muted:'#F6EDDF','muted-foreground':'#766253',primary:'#9A4F32','on-primary':'#FFFFFF',brand:'#C77D49',secondary:'#F8E3CD',border:'#E4D2BD',divider:'#EADCCD','focus-ring':'#9A4F32',
   water:'#79BCEC','water-soft':'#EBF5FC','element-water':'#275E86',fire:'#EFC2BD','fire-soft':'#FBECDD','element-fire':'#924529',earth:'#A8CDB6','earth-soft':'#EAF3E9','element-earth':'#41683F',wind:'#C8B4DF','wind-soft':'#F5EBF4','element-wind':'#6A4E80',
   radius:'24px','radius-sm':'18px','radius-chip':'999px','radius-lg':'28px','radius-dialog':'28px',
   elevation:'inset 0 1px 0 rgba(255,255,255,.9),0 4px 0 rgba(168,117,67,.10),0 9px 20px rgba(108,73,39,.07)','shadow-raised':'inset 0 1px 0 rgba(255,255,255,.9),0 5px 0 rgba(168,117,67,.13),0 12px 26px rgba(108,73,39,.09)',
   'clay-task':'#FFF0CD','clay-mint':'#ECF5E9','clay-sky':'#EDF6FB','clay-control-border':'#A68B73','clay-pressed':'inset 0 2px 3px rgba(83,50,24,.12),0 1px 0 rgba(168,117,67,.15)','motion-fast':'140ms'},
  dark:{background:'#25201D',foreground:'#FFF2DF','surface-foreground':'#FFF2DF',surface:'#342C27','surface-raised':'#3D322B','surface-soft':'#44372E',muted:'#44372E','muted-foreground':'#D4BDA7',primary:'#F0B784','on-primary':'#35251A',brand:'#F0B784',secondary:'#503B2D',border:'#6A5445',divider:'#574537','focus-ring':'#F0B784',
   'water-soft':'#2C3941','element-water':'#B3D6EF','fire-soft':'#45312B','element-fire':'#F0B999','earth-soft':'#303D30','element-earth':'#BAD7B0','wind-soft':'#3B3040','element-wind':'#D7BFE9',
   radius:'24px','radius-sm':'18px','radius-chip':'999px','radius-lg':'28px','radius-dialog':'28px',
   elevation:'inset 0 1px 0 rgba(255,235,209,.07),0 4px 0 rgba(0,0,0,.18),0 9px 20px rgba(0,0,0,.12)','shadow-raised':'inset 0 1px 0 rgba(255,235,209,.09),0 5px 0 rgba(0,0,0,.22),0 12px 24px rgba(0,0,0,.16)',
   'clay-task':'#433629','clay-mint':'#303A2E','clay-sky':'#2C3840','clay-control-border':'#B89C84','clay-pressed':'inset 0 2px 3px rgba(0,0,0,.24),0 1px 0 rgba(255,235,209,.06)','motion-fast':'140ms'},
  petRenderer:'illustration',rewardMotion:'fade'}
}
function complete(tokens:WordPalTokens):WordPalTokens {
 return {...tokens,'surface-tonal':tokens['surface-soft'],'primary-foreground':tokens['on-primary']}
}
export const themePacks=Object.fromEntries(Object.entries(variants).map(([key,v])=>{
 const id=key as ThemeId
 return [id,{id,name:v.name,description:v.description,tokens:complete({...light,...v.light}),petRenderer:v.petRenderer,rewardMotion:v.rewardMotion,
  buildLight:()=>({id,mode:'light',tokens:complete({...light,...v.light})}),buildDark:()=>({id,mode:'dark',tokens:complete({...dark,...v.dark})})}]
})) as Record<ThemeId,WordPalThemePack>
export function tokenStyle(tokens:WordPalTokens){return Object.entries(tokens).map(([key,value])=>'--wp-'+key+':'+value).join(';')}
export function contrast(a:string,b:string){
 const luminance=(hex:string)=>{const channels=hex.replace('#','').match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722}
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)
}
