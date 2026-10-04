import {mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'
import {themePacks} from '../src/styles/themes'
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>'
async function main(){const dir='src/static/icons/controls';mkdirSync(dir,{recursive:true});writeFileSync(dir+'/speaker.svg',svg);for(const pack of Object.values(themePacks))for(const mode of ['light','dark'] as const){const color=pack[mode==='dark'?'buildDark':'buildLight']().tokens.foreground;await sharp(Buffer.from(svg.replace(/currentColor/g,color))).resize(60,60).png().toFile(`${dir}/${pack.id}-${mode}-speaker.png`)}}
main().catch(error=>{console.error(error);process.exitCode=1})
