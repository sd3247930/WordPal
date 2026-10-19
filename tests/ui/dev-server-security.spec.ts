import {test,expect} from '@playwright/test'

test('开发服务器允许本机源码，拒绝私有目录、编码绕行与跨站请求',async({request,baseURL})=>{
 expect((await request.get('/src/main.ts')).status()).toBe(200)
 for(const url of ['/private/not-public','/docs/not-public','/.env.not-public','/%2570rivate/not-public'])expect((await request.get(url)).status()).toBe(403)
 expect((await request.get('/src/main.ts',{headers:{Origin:'https://outside.invalid'}})).status()).toBe(403)
 expect((await request.get('/src/main.ts',{headers:{'Sec-Fetch-Site':'cross-site'}})).status()).toBe(403)
 expect((await request.get('/src/main.ts',{headers:{Origin:baseURL!}})).status()).toBe(200)
})
