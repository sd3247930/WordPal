export const WORDPAL_APK_URL='https://github.com/sd3247930/WordPal/releases/latest/download/WordPal.apk'
export const WORDPAL_WEB_URL='https://sd3247930.github.io/WordPal/'
export function openWordPalDownload(){
 // #ifdef APP-PLUS
 plus.runtime.openURL(WORDPAL_APK_URL,()=>uni.showToast({title:'请在浏览器中打开下载链接',icon:'none'}))
 return
 // #endif
 // #ifdef MP
 uni.setClipboardData({data:WORDPAL_APK_URL})
 // #endif
}
