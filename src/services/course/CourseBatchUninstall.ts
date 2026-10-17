import {readStorage,writeStorage} from '../storage'

export const BATCH_KEY='wordpal.batch-uninstall.v1'
export interface BatchUninstallError{courseId:string;reason:string}
export interface BatchUninstallProgress{
 total:number;completed:number;currentId:string|null;retainedWordCount:number
 targets:string[];done:string[];errors:BatchUninstallError[]
}

/** 目标列表是「本次要逐册卸载的册次」，完成后进度可续跑。 */
export function emptyBatchProgress(ids:string[]):BatchUninstallProgress{
 return {total:ids.length,completed:0,currentId:ids[0]||null,retainedWordCount:0,targets:[...ids],done:[],errors:[]}
}

export function readBatchProgress():BatchUninstallProgress|null{
 try{
  const stored=readStorage<BatchUninstallProgress|null>(BATCH_KEY,null)
  if(!stored||!Array.isArray(stored.targets)||!stored.targets.length)return null
  return {total:stored.targets.length,completed:Array.isArray(stored.done)?stored.done.length:0,currentId:stored.currentId??null,retainedWordCount:stored.retainedWordCount||0,targets:stored.targets,done:Array.isArray(stored.done)?stored.done:[],errors:Array.isArray(stored.errors)?stored.errors:[]}
 }catch{return null}
}

export function writeBatchProgress(progress:BatchUninstallProgress){writeStorage(BATCH_KEY,{...progress,total:progress.targets.length,completed:progress.done.length})}
export function clearBatchProgress(){writeStorage(BATCH_KEY,null)}

/**
 * 下一册：跳过已完成、已失败与已不在列表中的册次，全部处理完返回 null（幂等续跑）。
 */
export function nextBatchTarget(progress:BatchUninstallProgress,availableIds:string[]):string|null{
 const available=new Set(availableIds),failed=new Set(progress.errors.map(item=>item.courseId))
 return progress.targets.find(id=>!progress.done.includes(id)&&!failed.has(id)&&available.has(id))||null
}

export function applyBatchResult(progress:BatchUninstallProgress,id:string,retainedWordCount:number):BatchUninstallProgress{
 const already=progress.done.includes(id)
 const done=already?progress.done:[...progress.done,id]
 // 重复点同一册只记一次，保留词数也不重复累加。
 return {...progress,done,completed:done.length,currentId:null,retainedWordCount:progress.retainedWordCount+(already?0:Math.max(0,retainedWordCount))}
}

export function applyBatchError(progress:BatchUninstallProgress,id:string,reason:string):BatchUninstallProgress{
 const errors=[...progress.errors.filter(item=>item.courseId!==id),{courseId:id,reason}]
 return {...progress,errors,currentId:null}
}

/** 「已卸载 N 册 · 已学 M 词保留」——面板与审计共用一句话摘要。 */
export function batchSummary(progress:BatchUninstallProgress):string{
 return `已卸载 ${progress.done.length} 册 · 已学 ${progress.retainedWordCount} 词保留`
}

/** 与当前已安装列表对齐，剔除已消失的册次（续跑时不重算已完成项）。 */
export function alignBatchProgress(progress:BatchUninstallProgress,availableIds:string[]):BatchUninstallProgress{
 // 已完成的册次本就不该再出现在已安装列表里，因此只按目标列表收敛，不因缺失去掉完成记录。
 const done=progress.done.filter(id=>progress.targets.includes(id))
 return {...progress,targets:progress.targets,done,completed:done.length,total:progress.targets.length}
}

/** A finished batch must not hide newly imported or reinstalled textbooks when management is reopened. */
export function openBatchProgress(stored:BatchUninstallProgress|null,availableIds:string[]):BatchUninstallProgress{
 const available=[...new Set(availableIds)]
 if(!stored||available.length&&stored.targets.every(id=>stored.done.includes(id)))return emptyBatchProgress(available)
 // Keep an unfinished batch's original targets: reopening never silently expands a pending deletion plan.
 return alignBatchProgress({...stored,currentId:null},available)
}
