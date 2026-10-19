import test from 'node:test'
import assert from 'node:assert/strict'
import {applyBatchError,applyBatchResult,alignBatchProgress,openBatchProgress,batchSummary,clearBatchProgress,emptyBatchProgress,nextBatchTarget,readBatchProgress,writeBatchProgress} from '../src/services/course/CourseBatchUninstall'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,data:string)=>void storage.set(key,data)}

test('逐册卸载：一次一册、跳过已完成与已失败、重复点同一册无副作用',()=>{
 const progress=emptyBatchProgress(['a','b','c'])
 assert.equal(nextBatchTarget(progress,['a','b','c']),'a')
 const afterA=applyBatchResult(progress,'a',7)
 assert.equal(afterA.completed,1)
 assert.equal(nextBatchTarget(afterA,['b','c']),'b')
 const again=applyBatchResult(afterA,'a',7)
 assert.equal(again.completed,1)
 assert.equal(again.retainedWordCount,7)
 const failed=applyBatchError(afterA,'b','请先完成当前学习，再移除教材。')
 assert.equal(nextBatchTarget(failed,['b','c']),'c')
 assert.equal(batchSummary(applyBatchResult(failed,'c',3)),'已卸载 2 册 · 共享 10 词保留')
})

test('进度写入 wordpal.batch-uninstall.v1：中断后可续跑，结束后清空',()=>{
 storage.clear()
 writeBatchProgress(applyBatchResult(emptyBatchProgress(['x','y']),'x',4))
 assert.ok(storage.has('wordpal.batch-uninstall.v1'))
 const restored=readBatchProgress()
 assert.ok(restored)
 assert.equal(restored!.targets.length,2)
 assert.deepEqual(restored!.done,['x'])
 assert.equal(nextBatchTarget(restored!,['y']),'y')
 clearBatchProgress()
 assert.equal(readBatchProgress(),null)
})

test('进度与当前已安装列表对齐，不重算已完成项',()=>{
 const aligned=alignBatchProgress(applyBatchResult(emptyBatchProgress(['x','y']),'x',1),['y'])
 assert.equal(aligned.total,2)
 assert.equal(aligned.done.length,1)
 assert.equal(aligned.retainedWordCount,1)
})

test('旧卸载任务完成后重新打开，显示新导入或同ID重装的教材，不执行卸载',()=>{
 const old=applyBatchResult(emptyBatchProgress(['old']),'old',39),before=JSON.stringify(old)
 for(const id of ['new','old']){const opened=openBatchProgress(old,[id,id]);assert.deepEqual(opened.targets,[id]);assert.deepEqual(opened.done,[]);assert.equal(nextBatchTarget(opened,[id]),id);assert.equal(opened.retainedWordCount,0)}
 assert.equal(JSON.stringify(old),before);assert.deepEqual(openBatchProgress(old,[]).done,['old'],'没有新教材时保留原任务结果供内容源裁剪')
})

test('未完成的卸载任务继续原队列，不把新教材自动加入删除计划',()=>{
 const old=applyBatchResult(emptyBatchProgress(['a','b']),'a',7),opened=openBatchProgress(old,['b','new'])
 assert.deepEqual(opened.targets,['a','b']);assert.deepEqual(opened.done,['a']);assert.equal(opened.retainedWordCount,7);assert.equal(nextBatchTarget(opened,['b','new']),'b')
})

