import {mkdirSync,readFileSync} from 'node:fs'
import sharp from 'sharp'
import {themePacks} from '../src/styles/themes'
import {navIconSvg} from '../src/services/nav-icons'
import {friendlyNavNames} from '../src/services/friendly-nav-icons'

async function main(){
 const speaker=readFileSync('src/static/icons/controls/speaker.svg','utf8')
 for(const mode of ['light','dark'] as const){
  const tokens=themePacks.clay[mode==='light'?'buildLight':'buildDark']().tokens
  for(const name of friendlyNavNames)for(const state of ['default','active','contrast'] as const){
   const color=tokens[state==='active'?'primary':state==='contrast'?'foreground':'muted-foreground']
   mkdirSync('src/static/icons/nav',{recursive:true})
   await sharp(Buffer.from(navIconSvg(name,state==='active').replace(/currentColor/g,color))).resize(72,72).png().toFile(`src/static/icons/nav/clay-${mode}-${state}-${name}.png`)
  }
  await sharp(Buffer.from(speaker.replace(/currentColor/g,tokens.foreground))).resize(60,60).png().toFile(`src/static/icons/controls/clay-${mode}-speaker.png`)
 }
 console.log('Added Clay PNG fallbacks; existing icons were not overwritten.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
