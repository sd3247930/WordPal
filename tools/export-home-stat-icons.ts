import {mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'
import {homeStatNames,homeStatIconSvg} from '../src/services/home-stat-icons'

async function main(){
 const directory='src/static/icons/home-stats';mkdirSync(directory,{recursive:true})
 for(const name of homeStatNames){const svg=homeStatIconSvg(name);writeFileSync(`${directory}/${name}.svg`,svg);await sharp(Buffer.from(svg)).resize(256,256).png().toFile(`${directory}/${name}.png`)}
 console.log('Exported 3 original home statistics icons (transparent 256px PNG and SVG).')
}
main().catch(error=>{console.error(error);process.exitCode=1})
