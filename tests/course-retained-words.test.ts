import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const store=readFileSync('src/stores/course.ts','utf8')
const storage=readFileSync('src/services/content/StorageRepository.ts','utf8')

test('卸载保留已学词条：cards/history/星标/稍后再看全部进入 retained',()=>{
 assert.ok(store.includes('const retained=[...Object.keys(profile.db.cards),...profile.db.history.map(a=>a.wordId),...prefs.favorites,...prefs.later]'))
 assert.ok(storage.includes('retainedPositions.push'))
})
