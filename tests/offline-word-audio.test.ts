import test from 'node:test'
import assert from 'node:assert/strict'
import {withOfflineWordAudio} from '../packages/content_schema/offline-audio'
import {wordById} from '../packages/content_schema'
const voice={lemma:'police station',audio:'/static/local-master-audio/df9d79f52caf03d49cd1.wav',locale:'en-US'}
test('缺录音历史词使用本机系统语音，标准录音优先且不改冻结词条',()=>{
 const word={...wordById.cat,id:'retained-police',word:' Police   Station ',audio:''},before=JSON.stringify(word)
 const resolved=withOfflineWordAudio(word,[voice])!
 assert.equal(resolved.audio,voice.audio);assert.ok(resolved.tags?.includes('offline-system-fallback-en-us'))
 assert.equal(JSON.stringify(word),before)
 const original={...word,audio:'/static/audio/cat.wav'}
 assert.equal(withOfflineWordAudio(original,[voice]),original)
})
test('缺失或不安全的本机语音映射不能伪造可播放资源',()=>{
 const word={...wordById.cat,word:'police station',audio:''}
 assert.equal(withOfflineWordAudio(word,[]),word)
 for(const audio of ['https://example.invalid/voice.wav','../voice.wav','/static/local-master-audio/invalid.wav'])assert.equal(withOfflineWordAudio(word,[{...voice,audio}]),word)
 assert.equal(withOfflineWordAudio(undefined,[voice]),undefined)
})
