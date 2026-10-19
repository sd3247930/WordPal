import {test} from 'node:test'
import assert from 'node:assert/strict'
import {allowDevRequest} from '../tools/dev-server-guard'
const local={host:'localhost:5181',origin:'http://localhost:5181','sec-fetch-site':'same-origin'}
test('本机源码、媒体、Vite客户端与依赖请求仍可用',()=>{
 for(const url of ['/','/src/main.ts','/src/static/audio/cat.wav','/@vite/client','/node_modules/.vite/deps/vue.js?v=123','/packages/core_learning/index.ts'])assert.equal(allowDevRequest(url,local),true,url)
 assert.equal(allowDevRequest('/',{host:'127.0.0.1:5173'}),true)
 assert.equal(allowDevRequest('/',{host:'[::1]:5173'}),true)
})
test('私有目录、凭据、编辑器命令和编码变体不可从开发服务器读取',()=>{
 for(const url of ['/private/reference.png','/docs/audit/report.md','/.git/config','/.tmp/output.json','/test-results/trace.zip','/playwright-report/index.html','/.env.local','/signing.key','/__open-in-editor?file=test','/src/../private/book.json','/%70rivate/book.json','/%2570rivate/book.json','/PRIVATE./book.json','/private%20/book.json','/src\\private\\book.json','/@fs//server/share','/%00bad','/%ZZ'])assert.equal(allowDevRequest(url,local),false,url)
})
test('外站来源、跨站请求和非本机Host被拒绝',()=>{
 assert.equal(allowDevRequest('/',{host:'localhost:5181',origin:'https://outside.invalid'}),false)
 assert.equal(allowDevRequest('/',{host:'localhost:5181','sec-fetch-site':'cross-site'}),false)
 assert.equal(allowDevRequest('/',{host:'outside.invalid:5181'}),false)
 assert.equal(allowDevRequest('/',{host:'localhost:5181',origin:'null'}),false)
 assert.equal(allowDevRequest('/',{host:'localhost:5181',origin:'http://localhost:5182'}),false)
 assert.equal(allowDevRequest('/',{}),false)
})
