import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'

const android={ldpi:48,mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192}
const ios={appstore:1024,iphone:{'app@2x':120,'app@3x':180,'notification@2x':40,'notification@3x':60,'settings@2x':58,'settings@3x':87,'spotlight@2x':80,'spotlight@3x':120},ipad:{app:76,'app@2x':152,'proapp@2x':167,notification:20,'notification@2x':40,settings:29,'settings@2x':58,spotlight:40,'spotlight@2x':80}}

/** Validate paths from the project root in CLI sources, and from the App resource root after compilation. */
export async function checkAppIcons({root=process.cwd(),output,manifestFile}={}){
 const base=path.resolve(root,output||'.'),manifestPath=path.resolve(root,manifestFile||(output?path.join(output,'manifest.json'):'src/manifest.json'))
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')),icons=(output?manifest.plus:manifest['app-plus'])?.distribute?.icons
 if(!icons)throw Error('App launcher icon configuration is missing.')
 let normalized=false;const rows=[],validated=new Map()
 async function inspect(config,spec,keys=[]){
  for(const [key,size]of Object.entries(spec)){
   const field=[...keys,key],node='icons.'+field.join('.')
   if(typeof size==='object'){await inspect(config?.[key],size,field);continue}
   let file=config?.[key];if(typeof file!=='string')throw Error(node+': icon path is missing.')
   if(output&&file.startsWith('src/static/icons/')){file=file.slice(4);normalized=true}
   const expected=(output?'static':'src/static')+`/icons/icon-${size}.png`
   if(file!==expected)throw Error(node+': expected '+expected)
   const target=path.resolve(base,file);if(!fs.existsSync(target))throw Error(node+': file does not exist: '+file)
   let meta=validated.get(file)
   if(!meta){
    const bytes=fs.readFileSync(target);meta=await sharp(bytes).metadata();await sharp(bytes).raw().toBuffer()
    if(meta.format!=='png'||meta.width!==size||meta.height!==size)throw Error(node+': expected a valid '+size+'x'+size+' PNG.')
    for(let offset=8;offset+12<=bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(offset+12+length>bytes.length)throw Error(node+': truncated PNG.');if(['eXIf','caBX'].includes(type))throw Error(node+': private image metadata must be removed.');offset+=length+12}
    validated.set(file,meta)
   }
   if(field[0]==='ios'&&meta.hasAlpha)throw Error(node+': iOS launcher icons must not contain alpha.')
   config[key]=file;rows.push({node,file,width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha})
  }
 }
 await inspect(icons,{android,ios})
 if(normalized)fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
 return {mode:output?'compiled-app':'cli-source',references:rows.length,uniqueFiles:validated.size,normalized,icons:rows}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const index=process.argv.indexOf('--output'),result=await checkAppIcons({output:index>=0?process.argv[index+1]:undefined});console.log(`App icons: ${result.mode}; ${result.references} references, ${result.uniqueFiles} valid PNG files; output paths normalized=${result.normalized}.`)}
 catch(error){console.error(error.message);process.exitCode=1}
}
