const pending=new Map<string,Promise<boolean>>(),ready=new Set<string>()
export function loadSceneImage(source:string):Promise<boolean>{
 if(!source)return Promise.resolve(false)
 if(ready.has(source))return Promise.resolve(true)
 const existing=pending.get(source);if(existing)return existing
 const task=new Promise<boolean>(resolve=>{
  let complete=false;const finish=(ok:boolean)=>{if(complete)return;complete=true;clearTimeout(timer);if(ok){ready.add(source);if(ready.size>256)ready.delete(ready.values().next().value!)}resolve(ok)}
  const timer=setTimeout(()=>finish(false),6000)
  try{uni.getImageInfo({src:source,success:()=>finish(true),fail:()=>finish(false)})}catch{finish(false)}
 }).finally(()=>pending.delete(source))
 pending.set(source,task);return task
}
