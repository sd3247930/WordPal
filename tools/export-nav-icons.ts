import {mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'
import {navIconSvg,type NavIconName} from '../src/services/nav-icons'
import {themePacks} from '../src/styles/themes'
const directory='src/static/icons/nav'
mkdirSync(directory,{recursive:true})
async function main(){for(const name of ['home','learn','pet','review','settings'] as NavIconName[]){
 writeFileSync(`${directory}/${name}.svg`,navIconSvg(name))
 writeFileSync(`${directory}/${name}-active.svg`,navIconSvg(name,true))
 for(const pack of Object.values(themePacks))for(const mode of ['light','dark'] as const)for(const state of ['default','active','contrast']){
  const tokens=pack[mode==='dark'?'buildDark':'buildLight']().tokens
  const color=tokens[state==='active'?'primary':state==='contrast'?'foreground':'muted-foreground']
  await sharp(Buffer.from(navIconSvg(name,state==='active').replace(/currentColor/g,color))).resize(72,72).png().toFile(`${directory}/${pack.id}-${mode}-${state}-${name}.png`)
 }
}
console.log('Exported 10 SVG sources and 120 clean PNG fallbacks.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
