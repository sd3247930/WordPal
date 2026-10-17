import fs from 'node:fs'
import path from 'node:path'
const directory='src/content/local-courses',file=path.join(directory,'catalog.json')
fs.mkdirSync(directory,{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,'[]\n')
const voiceCatalog=path.join(directory,'audio-fallbacks.json')
if(!fs.existsSync(voiceCatalog))fs.writeFileSync(voiceCatalog,'[]\n')
const starterFile=path.join(directory,'starter.json')
if(!fs.existsSync(starterFile))fs.writeFileSync(starterFile,'null\n')
// Local-only media directories: master audio plus per-textbook audio/images.
const mediaDirectories=['src/static/local-master-audio','src/static/local-course-media','src/static/local-starter-media']
const hasLocalMedia=mediaDirectories.some(dir=>fs.existsSync(dir)&&fs.readdirSync(dir).length>0)
const hasLocalCourses=JSON.parse(fs.readFileSync(file,'utf8')).length>0||!!JSON.parse(fs.readFileSync(starterFile,'utf8'))
if(process.argv.includes('--release')&&(hasLocalCourses||hasLocalMedia)&&process.env.VITE_WORDPAL_LOCAL_CONTENT!=='1')throw new Error('本机词库与教材媒体尚未授权再分发。构建本机包需显式设置 VITE_WORDPAL_LOCAL_CONTENT=1；公开构建请使用无本机内容的干净检出。')
