import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useLearningStore} from '../src/stores/learning'
import {useProfileStore} from '../src/stores/profile'
import {useStudyPresentation} from '../src/stores/study-presentation'
import {studyHint} from '../src/services/learning/StudyHint'
import {answerDailyWord} from './helpers/daily-flow'
import type {LearningMode} from '../packages/core_learning'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function fresh(){fail=false;storage.clear();setActivePinia(createPinia());const profile=useProfileStore();profile.transact(d=>{d.gems=3;d.abilityLevel='L1'});return {profile,learning:useLearningStore(),view:useStudyPresentation()}}
test('五模式线索不返回完整隐藏英文或正确词义，缺词性与单字母仍有可用说明',()=>{
 for(const mode of ['flash','connect','listen','spell','dictation'] as LearningMode[]){const text=studyHint({word:'potato',pos:'n.'},mode);assert(text);assert(!text.includes('potato'));assert(!text.includes('马铃薯'));if(['spell','dictation'].includes(mode)){assert(text.includes('6'));assert(text.includes('首字母是 p'))}}
 assert(studyHint({word:'Merry Christmas!',pos:''},'spell').includes('2 部分'))
 assert(studyHint({word:'I',pos:''},'dictation').includes('1 个英文字母'));assert(!studyHint({word:'I',pos:''},'dictation').includes('首字母'))
 assert(studyHint({word:'',pos:''},'spell').includes('再听'));assert(studyHint({word:'test',pos:''},'connect').includes('情景'))
})
for(const mode of ['flash','connect','listen','spell','dictation'] as LearningMode[])test(`${mode}提示连续点击只扣一次，计划与学习记录不变，冷重建恢复后可再看且切词清理`,()=>{
 const {profile,learning,view}=fresh();assert(learning.start());while(learning.session!.flow!.step!==mode)answerDailyWord(learning);view.sync();const before=JSON.parse(JSON.stringify(profile.db)),oldRevealed=learning.session!.revealed
 for(let i=0;i<20;i++)assert(view.hint());assert.equal(view.hinted,true);assert.equal(learning.session!.revealed,oldRevealed);assert.equal(profile.db.gems,2)
 const expected=JSON.parse(JSON.stringify(before));expected.gems=2;expected.courseProgress.starter.dailyPlan.hinted=true;assert.deepEqual(profile.db,expected)
 setActivePinia(createPinia());const restored=useStudyPresentation();restored.sync();assert(restored.hinted);assert(restored.hint());assert.equal(useProfileStore().db.gems,2)
 answerDailyWord(useLearningStore());assert.equal(useLearningStore().session!.hinted,undefined);assert.equal(restored.hinted,false)
})
test('提示写入失败不扣费或改题；零灵石不负数，不静默改变成揭晓答案',()=>{
 const {profile,learning,view}=fresh();assert(learning.start());const before=JSON.stringify(profile.db);fail=true;assert.equal(view.hint(),false);assert.equal(JSON.stringify(profile.db),before);fail=false;profile.transact(d=>{d.gems=0});assert(view.hint());assert.equal(profile.db.gems,0);assert.equal(learning.session!.hinted,true)
})
test('旧非闪现揭晓标记按已用提示兼容读取，不重新扣费或在题面显示正确答案',()=>{
 const {profile,learning,view}=fresh();assert(learning.start());while(learning.session!.mode!=='connect')answerDailyWord(learning);learning.patch({revealed:true});view.sync();const before=JSON.stringify(profile.db);assert(view.hinted);assert.equal(view.revealed,false);assert(view.hint());assert.equal(JSON.stringify(profile.db),before)
})
