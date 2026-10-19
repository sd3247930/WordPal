import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const options=Object.fromEntries(process.argv.slice(2).reduce((list,value,index,all)=>value.startsWith('--')?[...list,[value.slice(2),all[index+1]]]:list,[]))
if(!options.sdk)throw Error('Pass --sdk with the extracted official Android SDK directory.')
const root=process.cwd(),output=path.resolve(options.output||'build/android'),buildRoot=path.resolve('build')+path.sep
if(!output.startsWith(buildRoot))throw Error('Generated Android project must remain inside build/.')
const manifest=JSON.parse(fs.readFileSync('src/manifest.json','utf8')),pkg=JSON.parse(fs.readFileSync('package.json','utf8'))
if(manifest.versionName!==pkg.version)throw Error('Package and App versions differ.')
const resources=path.resolve(options.resources||'dist/build/app')
if(!fs.existsSync(path.join(resources,'manifest.json')))throw Error('Build uni-app App resources first.')
for(const dir of ['src/content/local-courses','src/static/local-master-audio','src/static/local-course-media','src/static/local-starter-media']){
 if(dir.endsWith('local-courses')){for(const file of ['catalog.json','starter.json'])if(fs.existsSync(dir+'/'+file)){const data=JSON.parse(fs.readFileSync(dir+'/'+file,'utf8'));if(data&&(!Array.isArray(data)||data.length))throw Error('Public Android build requires a clean checkout without local courses.')}}
 else if(fs.existsSync(dir)&&fs.readdirSync(dir).length)throw Error('Public Android build must exclude local media.')
}
fs.cpSync('android',output,{recursive:true})
const write=(file,data)=>{const target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data)}
write('wordpal-version.properties',`name=${manifest.versionName}\ncode=${manifest.versionCode}\n`)
const required=JSON.parse(fs.readFileSync('tools/android/runtime-libraries.json','utf8'))
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name))}
const candidates=walk(path.resolve(options.sdk))
for(const library of required){
 const source=candidates.find(file=>path.basename(file)===library.name&&createHash('sha256').update(fs.readFileSync(file)).digest('hex')===library.sha256)
 if(!source)throw Error('Matching official 5.26 library missing: '+library.name)
 const target=path.join(output,'app/libs',library.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target)
}
const www=path.join(output,'app/src/main/assets/apps',manifest.appid,'www')
if(fs.existsSync(www)){if(!path.resolve(www).startsWith(buildRoot))throw Error('Invalid generated resource path.');fs.rmSync(www,{recursive:true})}
fs.cpSync(resources,www,{recursive:true})
for(const [density,size] of Object.entries({ldpi:48,mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
 const target=path.join(output,'app/src/main/res','mipmap-'+density,'icon.png');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(`src/static/icons/icon-${size}.png`,target)
}
write('app/src/main/assets/data/dcloud_control.xml',`<hbuilder><apps><app appid="${manifest.appid}" appver="${manifest.versionName}"/></apps></hbuilder>\n`)
const features={Console:'io.dcloud.feature.pdr.LoggerFeatureImpl',Device:'io.dcloud.feature.device.DeviceFeatureImpl',File:'io.dcloud.js.file.FileFeatureImpl',Storage:'io.dcloud.feature.pdr.NStorageFeatureImpl',Cache:'io.dcloud.feature.pdr.CoreCacheFeatureImpl',Invocation:'io.dcloud.invocation.Invocation',Navigator:'io.dcloud.feature.ui.navigator.NavigatorUIFeatureImpl',NativeUI:'io.dcloud.feature.ui.nativeui.NativeUIFeatureImpl',Gallery:'io.dcloud.js.gallery.GalleryFeatureImpl',Downloader:'io.dcloud.net.DownloaderFeatureImpl',Uploader:'io.dcloud.net.UploadFeature',Zip:'io.dcloud.feature.pdr.ZipFeature',Audio:'io.dcloud.feature.audio.AudioFeatureImpl',Runtime:'io.dcloud.feature.pdr.RuntimeFeatureImpl',XMLHttpRequest:'io.dcloud.net.XMLHttpRequestFeature',NativeObj:'io.dcloud.feature.nativeObj.FeatureImpl'}
write('app/src/main/assets/data/dcloud_properties.xml','<properties><features>'+Object.entries(features).map(([name,value])=>`<feature name="${name}" value="${value}"/>`).join('')+'<feature name="UI" value="io.dcloud.feature.ui.UIFeatureImpl"><module name="Navigator" value="io.dcloud.feature.ui.NavView"/></feature></features><services><service name="Downloader" value="io.dcloud.net.DownloaderBootImpl"/></services></properties>\n')
console.log(JSON.stringify({version:pkg.version,code:manifest.versionCode,libraries:required.length,localContentIncluded:false,output:path.relative(root,output)}))
