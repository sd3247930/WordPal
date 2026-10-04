import {defineConfig} from '@playwright/test'
export default defineConfig({
 testDir:'./tests/ui',timeout:30000,fullyParallel:true,workers:3,
 expect:{timeout:6000,toHaveScreenshot:{maxDiffPixelRatio:process.env.WORDPAL_REFRESH_VISUALS==='1'?0:.01}},
 use:{baseURL:'http://localhost:5173',browserName:'chromium',headless:true,viewport:{width:1280,height:900},timezoneId:'Asia/Dubai',locale:'zh-CN',colorScheme:'light',trace:'retain-on-failure'},
 outputDir:'test-results',reporter:[['list'],['html',{open:'never'}]],
 snapshotPathTemplate:'{testDir}/__screenshots__/{projectName}/{arg}{ext}',
 webServer:{command:'npm run dev:h5',url:'http://localhost:5173',reuseExistingServer:!process.env.CI,timeout:120000}
})
