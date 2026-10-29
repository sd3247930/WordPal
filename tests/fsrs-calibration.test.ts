import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fsrs,createEmptyCard,default_w} from 'ts-fsrs'
import {ALGORITHM,LIBRARY,DAY,validateDataset,prepareDataset,validateCandidate,replayMetrics,evaluateCandidate,type ResearchDataset,type ResearchReview} from '../tools/fsrs-calibration/domain'

const id=(prefix:string,n:number)=>prefix+'-'+n.toString(16).padStart(32,'0')
function dataset(people=30,repetitions=40):ResearchDataset {
 const reviews:ResearchReview[]=[]
 for(let p=0;p<people;p++)for(let i=0;i<repetitions;i++)reviews.push({eventId:id('e',p*1000+i),participantId:id('p',p),cardId:id('c',p),elapsedMs:i*DAY,rating:i%5===4?1:3,correct:i%5!==4,source:i?'review_due':'new_word',settlement:'settled',mode:i?'spell':'flash',assessmentVersion:1,recallAttempt:'first'})
 return {schemaVersion:1,algorithm:ALGORITHM,timeBasis:'participant-relative-ms',cohort:{ageBand:'6-8',consentConfirmed:true,deidentified:true,protocolId:id('r',1)},reviews}
}
const candidate=(trainingHash:string)=>({schemaVersion:1,algorithm:ALGORITHM,library:LIBRARY,trainingHash,weights:[...default_w]})

// 无真实数据时明确阻断标定，绝不生成儿童专属权重。
test('calibration: empty dataset blocks fitting and activation',()=>{
 const p=prepareDataset(dataset(0));assert.equal(p.manifest.ready,false);assert.equal(p.manifest.active,false)
 assert.equal(p.trainingCsv,'card_id,review_time,review_rating\n');assert.ok(p.manifest.blockers.length>0)
})
// 声明不能代替人工授权，但缺少声明必须拒绝。
test('calibration: consent, age cohort and algorithm are mandatory',()=>{
 const d=dataset(1,2)
 assert.throws(()=>validateDataset({...d,cohort:{...d.cohort,consentConfirmed:false}}),/授权/)
 assert.throws(()=>validateDataset({...d,cohort:{...d.cohort,ageBand:'all'}}),/分组/)
 assert.throws(()=>validateDataset({...d,algorithm:'FSRS-5'}),/版本/)
})
// 白名单禁止姓名、词形、路径、自由文本等潜在隐私进入研究输出。
test('calibration: rejects identity fields and non-opaque identifiers',()=>{
 const d=dataset(1,2)
 assert.throws(()=>validateDataset({...d,name:'synthetic'}),/未允许字段/)
 assert.throws(()=>validateDataset({...d,cohort:{...d.cohort,school:'synthetic'}}),/未允许字段/)
 assert.throws(()=>validateDataset({...d,reviews:[{...d.reviews[0],lemma:'cat'}]}),/未允许字段/)
 assert.throws(()=>validateDataset({...d,reviews:[{...d.reviews[0],participantId:'child-alias'}]}),/去标识/)
})
test('calibration: invalid time, rating and source combinations are rejected',()=>{
 const d=dataset(1,2),r=d.reviews[0]
 for(const patch of [{elapsedMs:-1},{elapsedMs:Infinity},{rating:5},{correct:false},{source:'practice',settlement:'settled'},{mode:'unknown'},{hinted:'yes'}])assert.throws(()=>validateDataset({...d,reviews:[{...r,...patch}]}))
})
// 完全重复的导出事件去重；同一事件身份出现不同内容则拒绝。
test('calibration: deduplicates exact events and rejects conflicting identities',()=>{
 const d=dataset(1,3)
 assert.equal(validateDataset({...d,reviews:[...d.reviews,{...d.reviews[1]}]}).reviews.length,3)
 assert.throws(()=>validateDataset({...d,reviews:[...d.reviews,{...d.reviews[1],elapsedMs:2*DAY}]}),/冲突/)
})
// 练习、旧队列提交不排程，因此过滤后不会删除真实状态更新。
test('calibration: practice and stale attempts never enter optimizer input',()=>{
 const d=dataset(1,3)
 d.reviews.push({...d.reviews[1],eventId:id('e',999),source:'practice',settlement:'practice'})
 d.reviews.push({...d.reviews[1],eventId:id('e',998),settlement:'stale_due'})
 const p=prepareDataset(d)
 assert.equal(p.manifest.counts.reviews,3);assert.equal(p.manifest.counts.excludedEvents,2)
})
// 助答、旧格式或未知首次评估会破坏整条状态链，禁止只删中间一个事件。
test('calibration: excludes entire assisted or legacy chain without bridging gaps',()=>{
 for(const patch of [{hintKind:'answer' as const},{inputAssistance:'tiles' as const},{hinted:true},{assessmentVersion:undefined}]){
  const d=dataset(2,3);Object.assign(d.reviews[1],patch)
  const p=prepareDataset(d);assert.equal(p.manifest.counts.excludedChains,1);assert.equal(p.manifest.counts.reviews,3)
 }
 const d=dataset(1,3);Object.assign(d.reviews[1],{hinted:true,hintKind:'encouragement'})
 assert.equal(prepareDataset(d).manifest.counts.reviews,3)
})
test('calibration: rejects left-censored, reset and ambiguous simultaneous chains',()=>{
 const left=dataset(1,3);left.reviews.shift();assert.equal(prepareDataset(left).chains.length,0)
 const reset=dataset(1,3);reset.reviews[1].source='new_word';assert.equal(prepareDataset(reset).chains.length,0)
 const tie=dataset(1,3);tie.reviews[1].elapsedMs=0;assert.equal(prepareDataset(tie).chains.length,0)
})
// 以儿童而非单词切分，确保同一人的所有卡都落入同一折。
test('calibration: deterministic learner split has no leakage and train CSV excludes held-outs',()=>{
 const d=dataset();const p=prepareDataset(d)
 assert.deepEqual(p.folds,prepareDataset({...d,reviews:[...d.reviews].reverse()}).folds)
 assert.deepEqual(p.manifest.folds,{train:18,validation:6,test:6})
 assert.equal(new Set(Object.values(p.folds).flat()).size,30)
 for(const participant of [...p.folds.validation,...p.folds.test])assert.equal(p.trainingCsv.includes(participant),false)
 for(const participant of p.folds.train)assert.equal(p.trainingCsv.includes(participant),true)
 const heldOut=d.reviews.find(r=>r.participantId===p.folds.test[0])!;heldOut.rating=2
 assert.equal(prepareDataset(d).trainingHash,p.trainingHash)
 assert.equal(p.manifest.ready,true);assert.equal(p.manifest.active,false)
})
// 仅达到工程门槛不代表临床效用；长时与遗忘证据不足必须显示阻断。
test('calibration: sparse delayed data and self-report-only evidence block readiness',()=>{
 const short=dataset();short.reviews.forEach(r=>r.elapsedMs/=1440);assert.equal(prepareDataset(short).manifest.ready,false)
 const flash=dataset();flash.reviews.forEach(r=>r.mode='flash');assert.equal(prepareDataset(flash).manifest.counts.objectiveDelayed,0)
 assert.equal(prepareDataset(flash).manifest.ready,false)
})
test('calibration: checks exact version, 21 finite bounded weights and training hash',()=>{
 const p=prepareDataset(dataset()),c=candidate(p.trainingHash)
 assert.deepEqual(validateCandidate(c,p.trainingHash).weights,[...default_w])
 for(const patch of [{algorithm:'FSRS-7'},{library:'ts-fsrs@next'},{trainingHash:'other'},{weights:default_w.slice(0,17)},{weights:[NaN,...default_w.slice(1)]},{weights:[-1,...default_w.slice(1)]},{weights:[...default_w,1]}])assert.throws(()=>validateCandidate({...c,...patch},p.trainingHash))
})
// 对照引擎手算第二次答题前的预测，防止把已知答案用于预测本次正确率。
test('calibration: replay predicts before update and scores delayed observations only',()=>{
 const d=dataset(1,2),p=prepareDataset(d),engine=fsrs({request_retention:.9,maximum_interval:365,enable_fuzz:false})
 const start=new Date(Date.UTC(2000,0,1)),card=engine.next(createEmptyCard(start),start,3).card
 const probability=engine.get_retrievability(card,new Date(+start+DAY),false)
 const metrics=replayMetrics(p.chains,[id('p',0)])
 assert.equal(metrics.n,1);assert.ok(Math.abs(metrics.logLoss!-(-Math.log(probability)))<1e-12)
 const sameDay=dataset(1,2);sameDay.reviews[1].elapsedMs=60000
 assert.equal(replayMetrics(prepareDataset(sameDay).chains,[id('p',0)]).n,0)
})
test('calibration: self-report is context but not an objective recall endpoint',()=>{
 const d=dataset(1,4);d.reviews[1].mode='flash'
 const p=prepareDataset(d);assert.equal(replayMetrics(p.chains,[id('p',0)]).n,2)
 assert.equal(replayMetrics(p.chains,[id('p',0)],default_w,false).n,3)
})
// 同参数不会因为样本足够而被错误当成性能改进；所有产物都禁止自动启用。
test('calibration: unchanged default candidate cannot pass improvement gate or activate',()=>{
 const p=prepareDataset(dataset()),evaluation=evaluateCandidate(p,candidate(p.trainingHash))
 assert.equal(evaluation.sufficient,true);assert.equal(evaluation.eligibleForIndependentReview,false)
 assert.equal(evaluation.active,false);assert.equal(evaluation.researchOnly,true)
 assert.deepEqual(evaluation.baseline,evaluation.candidate)
 const sparse=prepareDataset(dataset(1,2));assert.equal(evaluateCandidate(sparse,candidate(sparse.trainingHash)).eligibleForIndependentReview,false)
})
