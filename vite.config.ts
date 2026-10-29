import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import {devServerGuard} from './tools/dev-server-guard'
import {fileURLToPath} from 'node:url'
import {writeBuildIdentity} from './tools/lib/build-identity.mjs'
const projectRoot=fileURLToPath(new URL('.',import.meta.url))
const testPort=Number(process.env.WORDPAL_TEST_PORT||0)
export default defineConfig({
 base:process.env.UNI_PLATFORM==='h5'?process.env.WORDPAL_BASE_PATH||'/':'/',
 cacheDir:Number.isInteger(testPort)&&testPort>=1024&&testPort<=65535?`node_modules/.vite-wordpal-test-${testPort}`:undefined,
 define:{'import.meta.env.VITE_WORDPAL_ACCEPTANCE':JSON.stringify(process.env.VITE_WORDPAL_ACCEPTANCE||'0')},
 plugins:[{name:'wordpal-build-identity',configResolved(config){writeBuildIdentity(projectRoot,{platform:process.env.UNI_PLATFORM||'unknown',mode:config.mode==='production'?'production':'development',localContent:process.env.VITE_WORDPAL_LOCAL_CONTENT==='1'})}},devServerGuard(),uni()],
 server:{host:'127.0.0.1',port:5173,watch:{ignored:[
  '**/private/**','**/docs/**','**/.tmp/**','**/tests/ui/__screenshots__/**','**/test-results/**','**/playwright-report/**','**/dist/**'
 ]}}
})
