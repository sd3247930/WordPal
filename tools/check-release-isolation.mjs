import fs from 'node:fs/promises'
import path from 'node:path'
import {readFileSync} from 'node:fs'
import {verifySpiritStoneArtwork} from './lib/spirit-stone-artwork.mjs'

const roots=process.argv.slice(2).length?process.argv.slice(2):['dist/build/h5','dist/build/app','dist/build/mp-weixin']
const forbidden=['wordpal.test.synthetic-course','wordpal.test.textbook-series','synthetic-quartz','synthetic-archived','synthetic-textbook']
let checked=0
async function inspect(folder){
 for(const entry of await fs.readdir(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name)
  if(entry.isDirectory()){await inspect(file);continue}
  if(!/\.(?:js|json|html)$/.test(entry.name))continue
  checked++;const text=await fs.readFile(file,'utf8')
  if(forbidden.some(value=>text.includes(value)))throw Error('Release contains test content: '+file.replaceAll('\\','/'))
 }
}
for(const root of roots){
 verifySpiritStoneArtwork(file=>readFileSync(path.join(root,file)))
 await inspect(root)
}
if(!checked)throw Error('No built release files were found.')
console.log(`Release isolation passed: ${checked} built files, no synthetic switches or test courses.`)
