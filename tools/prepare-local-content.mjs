import fs from 'node:fs'
import path from 'node:path'
const directory='src/content/local-courses',file=path.join(directory,'catalog.json')
fs.mkdirSync(directory,{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,'[]\n')
const audioDirectory='src/static/local-master-audio',hasLocalMedia=fs.existsSync(audioDirectory)&&fs.readdirSync(audioDirectory).length>0
if(process.argv.includes('--release')&&(JSON.parse(fs.readFileSync(file,'utf8')).length||hasLocalMedia)&&process.env.VITE_WORDPAL_LOCAL_CONTENT!=='1')throw new Error('本机主词库尚未授权再分发。构建本机包需显式设置 VITE_WORDPAL_LOCAL_CONTENT=1；公开构建请使用无本机词库的干净检出。')

