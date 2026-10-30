import {defineConfig} from '@playwright/test'
const port=Number(process.env.WORDPAL_PROD_TEST_PORT||5185)
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid production preview port.')
export default defineConfig({
 testDir:'./tests/production',timeout:60000,workers:1,reporter:'list',
 expect:{timeout:10000},
 use:{baseURL:`http://127.0.0.1:${port}/WordPal/`,browserName:'chromium',headless:true,viewport:{width:390,height:844},timezoneId:'Asia/Dubai',locale:'zh-CN',trace:'retain-on-failure'},
 outputDir:'test-results/production',
 webServer:{command:`npx vite preview --outDir dist/build/h5 --host 127.0.0.1 --port ${port} --strictPort --base /WordPal/`,url:`http://127.0.0.1:${port}/WordPal/`,reuseExistingServer:false,timeout:60000,env:{UNI_PLATFORM:'h5',WORDPAL_BASE_PATH:'/WordPal/',VITE_WORDPAL_LOCAL_CONTENT:'0'}}
})
