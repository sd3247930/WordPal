import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import sharp from 'sharp'
import {navIconSvg,type NavIconName} from '../src/services/nav-icons'
import {themePacks} from '../src/styles/themes'
import {friendlyNavIconSvg,friendlyNavNames,friendlyNavIconSource} from '../src/services/friendly-nav-icons'
const directory='src/static/icons/nav'
mkdirSync(directory,{recursive:true})
async function main(){for(const name of friendlyNavNames){
 const target='src'+friendlyNavIconSource(name),sources=process.argv[2]
 if(sources){const input=sharp(`${sources}/${name}.png`);if(!(await input.metadata()).hasAlpha)throw new Error('Transparent source required: '+name);await input.trim({threshold:8}).resize(896,896,{fit:'contain',background:'#00000000'}).extend({top:64,bottom:64,left:64,right:64,background:'#00000000'}).png({compressionLevel:9}).toFile(target)}else if(!existsSync(target))throw new Error('Provide high-definition transparent navigation icons.')
 writeFileSync(`${directory}/${name}.svg`,navIconSvg(name))
 writeFileSync(`${directory}/${name}-active.svg`,navIconSvg(name,true))
 for(const active of [false,true])writeFileSync(`${directory}/friendly-${name}${active?'-active':''}.svg`,friendlyNavIconSvg(name,{active}))
 for(const mode of ['light','dark'])for(const state of ['default','active','contrast']){
  const svg=friendlyNavIconSvg(name,{dark:mode==='dark',active:state==='active',highContrast:state==='contrast'})
  const size=state==='contrast'?256:96
  await sharp(Buffer.from(svg)).resize(size,size).png().toFile(`${directory}/friendly-${mode}-${state}-${name}.png`)
 }
 for(const pack of Object.values(themePacks))for(const mode of ['light','dark'] as const)for(const state of ['default','active','contrast']){
  const tokens=pack[mode==='dark'?'buildDark':'buildLight']().tokens
  const color=tokens[state==='active'?'primary':state==='contrast'?'foreground':'muted-foreground']
  await sharp(Buffer.from(navIconSvg(name,state==='active').replace(/currentColor/g,color))).resize(72,72).png().toFile(`${directory}/${pack.id}-${mode}-${state}-${name}.png`)
 }
}
console.log('Preserved five 1024px transparent icons; exported accessible navigation sources and PNG fallbacks.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
