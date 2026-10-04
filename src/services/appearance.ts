import {contrast} from '../styles/themes'
export function accessibleAccent(color:string,background:string){
 let rgb=color.slice(1).match(/../g)!.map(x=>parseInt(x,16))
 const darkBackground=contrast(background,'#ffffff')>contrast(background,'#000000')
 let adjusted=color
 for(let i=0;i<30&&contrast(adjusted,background)<4.5;i++){
  rgb=rgb.map(x=>Math.round(darkBackground?x+(255-x)*.1:x*.9));adjusted='#'+rgb.map(x=>x.toString(16).padStart(2,'0')).join('')
 }
 return adjusted
}
export function getAndroidWallpaperAccent():string {
 // #ifdef APP-PLUS
 try{
  if(plus.os.name!=='Android')return ''
  const Version=plus.android.importClass('android.os.Build$VERSION') as any;if(Version.SDK_INT<27)return ''
  const WallpaperManager=plus.android.importClass('android.app.WallpaperManager') as any
  const manager=WallpaperManager.getInstance(plus.android.runtimeMainActivity());plus.android.importClass(manager)
  const colors=manager.getWallpaperColors(1);if(!colors)return '';plus.android.importClass(colors)
  const primary=colors.getPrimaryColor();plus.android.importClass(primary)
  return '#'+(primary.toArgb()&0xffffff).toString(16).padStart(6,'0')
 }catch{return ''}
 // #endif
 return ''
}
