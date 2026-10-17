import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const storage=readFileSync('src/services/content/StorageRepository.ts','utf8')

test('bundled 课程只标记 notInstalled，可随时重新安装',()=>{
 assert.ok(storage.includes("if(isBundledCourse(id)){setInstallationState(id,'notInstalled');return {bundled:true,pendingCleanup:0,retainedWordCount}}"))
 assert.ok(storage.includes('export function enableBundledCourse'))
})
