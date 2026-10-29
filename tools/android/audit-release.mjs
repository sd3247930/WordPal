import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {unzipSync} from 'fflate'
import {verifySpiritStoneArtwork} from '../lib/spirit-stone-artwork.mjs'
import {verifyBuildIdentity} from '../lib/build-identity.mjs'
const source='build/android/app/build/outputs/apk/release/app-release.apk'
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT
const expected=process.env.WORDPAL_EXPECTED_CERT_SHA256?.replaceAll(':','').toLowerCase()
if(!sdk||!expected||!/^[a-f0-9]{64}$/.test(expected))throw Error('Android SDK and expected release certificate fingerprint are required.')
const buildTools=path.join(sdk,'build-tools/36.0.0'),exe=name=>path.join(buildTools,name+(process.platform==='win32'?'.exe':''))
const run=(file,args)=>execFileSync(file,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024})
const signature=run('java',['-jar',path.join(buildTools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',source])
if(signature.match(/Signer #1 certificate SHA-256 digest:\s*([a-f0-9]+)/i)?.[1].toLowerCase()!==expected)throw Error('APK signer does not match the expected release certificate.')
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),manifest=JSON.parse(fs.readFileSync('src/manifest.json','utf8'))
const info=run(exe('aapt2'),['dump','badging',source]),identity=info.match(/package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/)
if(!identity||identity[1]!=='com.wordpal.app'||identity[2]!==String(manifest.versionCode)||identity[3]!==pkg.version||/application-debuggable/.test(info))throw Error('APK package, version or release mode is invalid.')
run(exe('zipalign'),['-c','-P','16','4',source])
const permissions=[...run(exe('aapt2'),['dump','permissions',source]).matchAll(/uses-permission: name='([^']+)'/g)].map(match=>match[1])
const allowed=new Set(['android.permission.INTERNET','android.permission.ACCESS_NETWORK_STATE','android.permission.RECORD_AUDIO','android.permission.VIBRATE','com.wordpal.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'])
if(permissions.some(permission=>!allowed.has(permission)))throw Error('APK requests a permission outside the reviewed application scope.')
const bytes=fs.readFileSync(source),files=unzipSync(bytes)
const buildIdentity=verifyBuildIdentity(file=>{
 const entries=Object.keys(files).filter(name=>name.startsWith('assets/apps/')&&name.endsWith('/www/'+file))
 if(entries.length!==1)throw Error('APK must contain exactly one source build identity.')
 return files[entries[0]]
})
verifySpiritStoneArtwork(file=>{
 const suffix='/www/'+file,entries=Object.keys(files).filter(name=>name.startsWith('assets/apps/')&&name.endsWith(suffix))
 if(entries.length!==1)throw Error('APK must contain exactly one reviewed spirit-stone asset: '+file)
 return files[entries[0]]
})
const forbidden=Object.keys(files).filter(name=>/(?:^|\/)(?:private|docs|test-results|local-course-media|local-starter-media|local-master-audio|local-spirit-stone)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:keystore|jks|pem|key|log|har)$/i.test(name))
if(forbidden.length)throw Error('APK includes excluded local or credential files.')
fs.mkdirSync('build/release',{recursive:true})
fs.copyFileSync(source,'build/release/WordPal.apk')
const hash=createHash('sha256').update(bytes).digest('hex')
fs.writeFileSync('build/release/WordPal.apk.sha256',hash+'  WordPal.apk\n')
const report={version:pkg.version,versionCode:manifest.versionCode,packageName:identity[1],bytes:bytes.length,sha256:hash,signatureVerified:true,debuggable:false,zip16kAligned:true,permissions,excludedFiles:forbidden.length,localContentIncluded:false,spiritStoneArtworkVerified:true,buildIdentity}
fs.writeFileSync('build/release-audit.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
