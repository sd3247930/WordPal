/** Cooperative background jobs also work in the app service, where Web Workers are unavailable. */
export type ImportPhase='selecting'|'reading'|'decoding'|'unpacking'|'parsing'|'checking'|'indexing'|'saving'|'verifying'|'committing'|'ready'|'done'
export interface ImportProgress {phase:ImportPhase;completed:number;total:number;unit:'bytes'|'characters'|'items'}
export interface ImportWork {cancelled?:()=>boolean;onProgress?:(progress:ImportProgress)=>void}
export class ImportCancelled extends Error {constructor(){super('导入已取消，课程未安装。');this.name='ImportCancelled'}}
export function assertImportActive(work?:ImportWork){if(work?.cancelled?.())throw new ImportCancelled()}
export function reportImport(work:ImportWork|undefined,phase:ImportPhase,completed:number,total:number,unit:ImportProgress['unit']='items'){
 assertImportActive(work);work?.onProgress?.({phase,completed,total,unit})
}
/** A macrotask gives rendering, input and cancellation a turn; Promise.resolve alone does not. */
export function importScheduler(work?:ImportWork){
 let lastYield=Date.now()
 return async(force=false)=>{assertImportActive(work);if(force||Date.now()-lastYield>=8){await new Promise<void>(resolve=>setTimeout(resolve,0));lastYield=Date.now();assertImportActive(work)}}
}
export function finishSteps<T>(steps:Generator<unknown,T>):T{let result=steps.next();while(!result.done)result=steps.next();return result.value}
export async function runImportSteps<T>(steps:Generator<number,T>,work?:ImportWork,phase:ImportPhase='parsing',total=0,initialYield=true,unit:ImportProgress['unit']='bytes'){
 const pause=importScheduler(work);if(initialYield)await pause(true)
 let result=steps.next()
 while(!result.done){reportImport(work,phase,result.value,total,unit);await pause();result=steps.next()}
 assertImportActive(work);return result.value
}
