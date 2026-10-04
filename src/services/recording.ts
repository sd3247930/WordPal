type Manager=ReturnType<typeof uni.getRecorderManager>
interface Handlers {start:()=>void;stop:(result:{tempFilePath:string})=>void;error:()=>void}
let manager:Manager|undefined,active:Handlers|undefined,occupied=false
export function bindNativeRecorder(handlers:Handlers){
 if(!manager){
  manager=uni.getRecorderManager()
  manager.onStart(()=>active?.start())
  manager.onStop(result=>{const owner=active;active=undefined;occupied=false;owner?.stop(result)})
  manager.onError(()=>{const owner=active;active=undefined;occupied=false;owner?.error()})
 }
 return {
  start(options:Parameters<Manager['start']>[0]){
   if(occupied)return false
   occupied=true;active=handlers
   try{manager!.start(options)}catch{active=undefined;occupied=false;handlers.error()}
   return true
  },
  stop(){if(active===handlers)manager!.stop()},
  release(){if(active===handlers){active=undefined;manager!.stop()}}
 }
}
