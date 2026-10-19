import {defineConfig} from '@playwright/test'
const port=Number(process.env.WORDPAL_TEST_PORT||5181)
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('测试端口无效。')
const baseURL='http://localhost:'+port
export default defineConfig({
 testDir:'./tests/ui',timeout:30000,fullyParallel:true,workers:3,
 expect:{timeout:6000,toHaveScreenshot:{maxDiffPixelRatio:process.env.WORDPAL_REFRESH_VISUALS==='1'?0:.01}},
 use:{baseURL,browserName:'chromium',headless:true,viewport:{width:1280,height:900},timezoneId:'Asia/Dubai',locale:'zh-CN',colorScheme:'light',trace:'retain-on-failure'},
 outputDir:'test-results',reporter:[['list'],['html',{open:'never'}]],
 snapshotPathTemplate:'{testDir}/__screenshots__/{projectName}/{arg}{ext}',
 webServer:{command:'npx uni --host 127.0.0.1 --port '+port,url:baseURL,reuseExistingServer:false,timeout:120000,env:{WORDPAL_TEST_PORT:String(port),VITE_WORDPAL_LOCAL_CONTENT:process.env.WORDPAL_TEST_LOCAL_CONTENT==='1'?'1':'0'}}
})
