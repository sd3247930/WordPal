import {test} from 'node:test'
import assert from 'node:assert/strict'
import {audioPreloadUrl} from '../src/services/audio/AudioPreload'

// GitHub Pages 的应用子目录必须同时用于音频预加载。
test('音频预加载在子目录部署时请求应用内资源',()=>{
 assert.equal(audioPreloadUrl('/static/audio/cat.wav','/WordPal/'),'/WordPal/static/audio/cat.wav')
 assert.equal(audioPreloadUrl('/static/audio/dog.wav','/WordPal'),'/WordPal/static/audio/dog.wav')
 assert.equal(audioPreloadUrl('/static/audio/cat.wav','https://cdn.example/WordPal/'),'https://cdn.example/WordPal/static/audio/cat.wav')
})

// 默认根目录和相对部署路径保留原有资源位置。
test('音频预加载兼容根目录和相对部署',()=>{
 assert.equal(audioPreloadUrl('/static/audio/cat.wav','/'),'/static/audio/cat.wav')
 assert.equal(audioPreloadUrl('/static/audio/cat.wav','./'),'./static/audio/cat.wav')
 assert.equal(audioPreloadUrl('','/WordPal/'),'')
})

// 导入课程的独立地址及本机媒体句柄不应被应用目录改写。
test('音频预加载保留外部、导入课程及已解析地址',()=>{
 for(const url of ['https://media.example/cat.wav','blob:https://media.example/audio','data:audio/wav;base64,UklGRg==','/WordPal/static/audio/cat.wav','_doc/course/cat.wav','audio/cat.wav'])assert.equal(audioPreloadUrl(url,'/WordPal/'),url)
})
