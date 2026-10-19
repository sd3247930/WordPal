import type {IncomingHttpHeaders} from 'node:http'
import type {Plugin} from 'vite'

const loopback=/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i
const localOnly=new Set(['private','docs','.git','.tmp','test-results','playwright-report'])
/** The development server must not expose local-only files or editor commands. */
export function allowDevRequest(rawURL:string,headers:IncomingHttpHeaders){
 const host=headers.host||''
 if(!loopback.test(host)||headers['sec-fetch-site']==='cross-site')return false
 if(headers.origin){try{if(new URL(headers.origin).host.toLowerCase()!==host.toLowerCase())return false}catch{return false}}
 let decoded=rawURL
 try{for(let i=0;i<4;i++){const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next}}catch{return false}
 if(!decoded.startsWith('/')||decoded.includes('\\')||decoded.includes('\0'))return false
 const pathname=decoded.split(/[?#]/,1)[0]
 if(pathname.includes('//')||pathname.startsWith('/__open-in-editor'))return false
 const parts=pathname.toLowerCase().split('/').map(part=>part.replace(/[. ]+$/g,''))
 return !parts.some(part=>localOnly.has(part)||/^\.env(?:\.|$)/.test(part)||/\.(?:pem|key|p12|pfx|keystore)$/.test(part))
}
export function devServerGuard():Plugin{return {name:'wordpal-local-development-guard',apply:'serve',configureServer(server){
 server.middlewares.use((request,response,next)=>{
  if(allowDevRequest(request.url||'/',request.headers)){next();return}
  response.statusCode=403;response.setHeader('Content-Type','text/plain; charset=utf-8');response.end('Local development request denied.')
 })
}}}
