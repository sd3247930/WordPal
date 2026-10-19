import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {unzipSync} from 'fflate'
const location=process.env.WORDPAL_ANDROID_SDK_URL,expected=process.env.WORDPAL_ANDROID_SDK_SHA256
if(!location||!/^https:\/\//.test(location)||!expected||!/^[a-f0-9]{64}$/i.test(expected))throw Error('Configure WORDPAL_ANDROID_SDK_URL and its SHA256 before Android automation. Official SDK distribution is not bundled in this repository.')
let response
try{response=await fetch(location)}catch{throw Error('Official SDK archive connection failed; review the configured source.')}
if(!response.ok)throw Error('Official SDK archive download failed; review the configured source.')
const bytes=Buffer.from(await response.arrayBuffer())
if(createHash('sha256').update(bytes).digest('hex')!==expected.toLowerCase())throw Error('SDK archive checksum mismatch.')
const output=path.resolve('build/dcloud-sdk'),files=unzipSync(bytes)
for(const [name,data]of Object.entries(files)){
 if(name.endsWith('/'))continue
 const destination=path.resolve(output,name)
 if(!destination.startsWith(output+path.sep)||name.includes('\\'))throw Error('Unsafe SDK archive entry.')
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,data)
}
console.log('Official SDK checksum verified and archive extracted into the ignored build directory.')
