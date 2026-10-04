import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'))
const expected=pkg.dependencies['@dcloudio/uni-app']
if(!/^3\.0\.0-50206\d{11}$/.test(expected))throw new Error('Compiler family must match the 5.26 SDK.')
for(const section of ['dependencies','devDependencies'])for(const [name,version]of Object.entries(pkg[section])){
 if(!name.startsWith('@dcloudio/')||name==='@dcloudio/types')continue
 if(version!==expected)throw new Error(name+' is not pinned to the 5.26 release.')
 const file=require.resolve(name+'/package.json')
 if(JSON.parse(fs.readFileSync(file,'utf8')).version!==expected)throw new Error(name+' is stale. Run npm ci before launching HBuilderX.')
}
const manifestFile=path.join('dist','build','app','manifest.json')
if(!process.argv.includes('--dependencies-only')&&fs.existsSync(manifestFile)){
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'))
 const generatedVersion=manifest.plus?.['uni-app']?.compilerVersion
 if(generatedVersion&&generatedVersion!=='5.26')throw new Error('Generated App compiler is not 5.26.')
}
console.log('DCloud CLI dependencies match the 5.26 SDK family.')
