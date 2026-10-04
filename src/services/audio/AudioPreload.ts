const warming=new Map<string,Promise<void>>()
// Keep only the current word and one lookahead; never create a second player.
export function warmUpcomingAudio(urls:string[]){
 const wanted=[...new Set(urls.filter(Boolean))].slice(0,2)
 for(const url of warming.keys())if(!wanted.includes(url))warming.delete(url)
 for(const url of wanted)if(!warming.has(url))warming.set(url,warm(url).catch(()=>{warming.delete(url)}))
}
async function warm(url:string):Promise<void>{
 // #ifdef H5
 if(typeof document!=='undefined'){const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error('Audio unavailable');await response.arrayBuffer();return}
 // #endif
 // #ifndef H5
 if(typeof plus!=='undefined')return await new Promise<void>((resolve,reject)=>plus.io.resolveLocalFileSystemURL(url.startsWith('/static/')?'_www'+url:url,(entry:any)=>entry.file((file:any)=>{if(file.size>5*1024*1024){reject(new Error('Audio too large'));return}const reader=new plus.io.FileReader();reader.onloadend=()=>resolve();reader.onerror=reject;reader.readAsDataURL(file)},reject),reject))
 const api=(globalThis as any).wx;if(api?.getFileSystemManager)return await new Promise<void>((resolve,reject)=>api.getFileSystemManager().readFile({filePath:url,success:()=>resolve(),fail:reject}))
 // #endif
}
