import {createHash} from 'node:crypto'
import {fsrs,createEmptyCard,default_w,CLAMP_PARAMETERS,W17_W18_Ceiling,FSRSVersion,type Grade} from 'ts-fsrs'

// Offline research only. This module is never imported by the application scheduler.
export const ALGORITHM='FSRS-6.0',LIBRARY='ts-fsrs@5.4.2',DAY=86400000
const ANCHOR=Date.UTC(2000,0,1)
const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
export interface ResearchReview {
 eventId:string;participantId:string;cardId:string;elapsedMs:number;rating:1|2|3|4;correct:boolean
 source:'new_word'|'review_due'|'practice';settlement:'settled'|'practice'|'stale_due'|'already_settled'|'legacy_session'
 mode:'flash'|'connect'|'listen'|'spell';assessmentVersion?:1;recallAttempt?:'first'
 hinted?:boolean;hintKind?:'answer'|'encouragement';inputAssistance?:'tiles'
}
export interface ResearchDataset {
 schemaVersion:1;algorithm:typeof ALGORITHM;timeBasis:'participant-relative-ms'
 cohort:{ageBand:'6-8'|'9-12';consentConfirmed:true;deidentified:true;protocolId:string}
 reviews:ResearchReview[]
}
type Fold='train'|'validation'|'test'
type CleanChain={participantId:string;cardId:string;reviews:ResearchReview[]}
export interface Prepared {
 chains:CleanChain[];folds:Record<Fold,string[]>;trainingCsv:string;trainingHash:string
 manifest:{algorithm:string;library:string;ageBand:string;datasetHash:string;trainingHash:string;researchOnly:true;active:false
  counts:{participants:number;reviews:number;delayed:number;delayedFailures:number;objectiveDelayed:number;spanDays:number;maxParticipantShare:number;excludedEvents:number;excludedChains:number}
  folds:Record<Fold,number>;ready:boolean;blockers:string[]}
}
function demand(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message)}
function object(value:unknown,keys:string[]):asserts value is Record<string,unknown>{
 demand(value!==null&&typeof value==='object'&&!Array.isArray(value),'对象结构无效')
 demand(Object.keys(value).every(key=>keys.includes(key)),'存在未允许字段；禁止身份信息和自由文本')
}
function opaque(value:unknown,prefix:string){return typeof value==='string'&&new RegExp('^'+prefix+'-[a-f0-9]{32}$').test(value)}
export function validateDataset(value:unknown):ResearchDataset {
 demand(FSRSVersion==='v5.4.2 using FSRS-6.0','运行库版本无效；先重新审核标定协议')
 object(value,['schemaVersion','algorithm','timeBasis','cohort','reviews'])
 demand(value.schemaVersion===1&&value.algorithm===ALGORITHM&&value.timeBasis==='participant-relative-ms','数据版本、算法或相对时间基准无效')
 object(value.cohort,['ageBand','consentConfirmed','deidentified','protocolId'])
 const cohort=value.cohort
 demand(cohort.consentConfirmed===true&&cohort.deidentified===true,'缺少授权或去标识声明')
 demand(['6-8','9-12'].includes(cohort.ageBand as string)&&opaque(cohort.protocolId,'r'),'年龄分组或协议代号无效')
 demand(Array.isArray(value.reviews),'评估序列无效')
 const seen=new Map<string,string>(),reviews:ResearchReview[]=[]
 for(const item of value.reviews){
  object(item,['eventId','participantId','cardId','elapsedMs','rating','correct','source','settlement','mode','assessmentVersion','recallAttempt','hinted','hintKind','inputAssistance'])
  demand(opaque(item.eventId,'e')&&opaque(item.participantId,'p')&&opaque(item.cardId,'c'),'仅接受随机去标识代号')
  demand(Number.isSafeInteger(item.elapsedMs)&&(item.elapsedMs as number)>=0&&(item.elapsedMs as number)<=10*366*DAY,'相对时间无效')
  demand([1,2,3,4].includes(item.rating as number)&&typeof item.correct==='boolean'&&item.correct===(item.rating!==1),'评分与结果不一致')
  demand(['new_word','review_due','practice'].includes(item.source as string)&&['settled','practice','stale_due','already_settled','legacy_session'].includes(item.settlement as string),'来源或结算类型无效')
  demand(['flash','connect','listen','spell'].includes(item.mode as string),'题型无效')
  demand(item.assessmentVersion===undefined||item.assessmentVersion===1,'评估版本无效')
  demand(item.recallAttempt===undefined||item.recallAttempt==='first','首次尝试标记无效')
  demand(item.hinted===undefined||typeof item.hinted==='boolean','提示标记无效')
  demand(item.hintKind===undefined||['answer','encouragement'].includes(item.hintKind as string),'提示类型无效')
  demand(item.inputAssistance===undefined||item.inputAssistance==='tiles','助答标记无效')
  demand(!(item.source==='practice'&&item.settlement==='settled'),'练习不能标记正式排程')
  const serialized=JSON.stringify(Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))))
  const old=seen.get(item.eventId as string)
  demand(old===undefined||old===serialized,'同一事件代号出现冲突')
  if(old===undefined){seen.set(item.eventId as string,serialized);reviews.push(item as unknown as ResearchReview)}
 }
 return {...value,reviews} as unknown as ResearchDataset
}
export function prepareDataset(input:unknown):Prepared {
 const data=validateDataset(input),groups=new Map<string,ResearchReview[]>()
 let excludedEvents=0,excludedChains=0
 for(const review of data.reviews){
  if(review.settlement!=='settled'){excludedEvents++;continue}
  const key=review.participantId+review.cardId
  if(!groups.has(key))groups.set(key,[])
  groups.get(key)!.push(review)
 }
 const chains:CleanChain[]=[]
 for(const rows of groups.values()){
  rows.sort((a,b)=>a.elapsedMs-b.elapsedMs||a.eventId.localeCompare(b.eventId))
  const invalid=rows.some((r,i)=>r.assessmentVersion!==1||r.recallAttempt!=='first'||r.hintKind==='answer'||r.inputAssistance==='tiles'||(r.hinted&&r.hintKind!=='encouragement')||r.source!==(i===0?'new_word':'review_due')||(i>0&&r.elapsedMs<=rows[i-1].elapsedMs))
  // A removed formal update would corrupt every later state: exclude the whole chain.
  if(invalid){excludedChains++;excludedEvents+=rows.length;continue}
  chains.push({participantId:rows[0].participantId,cardId:rows[0].cardId,reviews:rows})
 }
 chains.sort((a,b)=>(a.participantId+a.cardId).localeCompare(b.participantId+b.cardId))
 const participants=[...new Set(chains.map(c=>c.participantId))].sort((a,b)=>hash('wordpal-calibration-v1:'+a).localeCompare(hash('wordpal-calibration-v1:'+b)))
 const first=Math.floor(participants.length*.6),second=Math.floor(participants.length*.8)
 const folds={train:participants.slice(0,first),validation:participants.slice(first,second),test:participants.slice(second)}
 const inTrain=new Set(folds.train),csv=['card_id,review_time,review_rating']
 let delayed=0,delayedFailures=0,objectiveDelayed=0,spanDays=0
 const perPerson=new Map<string,number>(),delayedPeople=new Set<string>(),longitudinalPeople=new Set<string>()
 for(const chain of chains){
  for(let i=0;i<chain.reviews.length;i++){
   const r=chain.reviews[i]
   perPerson.set(r.participantId,(perPerson.get(r.participantId)??0)+1)
   if(inTrain.has(r.participantId))csv.push(`${r.participantId}_${r.cardId},${ANCHOR+r.elapsedMs},${r.rating}`)
   if(i>0&&r.elapsedMs-chain.reviews[i-1].elapsedMs>=DAY){delayed++;delayedPeople.add(r.participantId);if(r.rating===1)delayedFailures++;if(r.mode!=='flash')objectiveDelayed++}
  }
  const days=(chain.reviews[chain.reviews.length-1].elapsedMs-chain.reviews[0].elapsedMs)/DAY
  spanDays=Math.max(spanDays,days);if(days>=30)longitudinalPeople.add(chain.participantId)
 }
 const reviews=chains.reduce((n,c)=>n+c.reviews.length,0),maxParticipantShare=reviews?Math.max(...perPerson.values())/reviews:0
 const blockers:string[]=[]
 // Engineering gates, not a claim of statistical power or pediatric validation.
 if(participants.length<30)blockers.push('至少需要30名独立参与者')
 if(reviews<1000)blockers.push('至少需要1000条完整干净评估')
 if(delayed<500||delayedFailures<50)blockers.push('延迟样本或遗忘样本不足')
 if(delayedPeople.size<20||longitudinalPeople.size<20)blockers.push('至少20名参与者须有延迟样本及30天完整序列')
 if(objectiveDelayed<200)blockers.push('客观题延迟样本不足')
 if(spanDays<30)blockers.push('完整序列跨度不足30天')
 if(maxParticipantShare>.2)blockers.push('单一参与者占比超过20%')
 if(folds.validation.length<5||folds.test.length<5)blockers.push('验证或锁定测试参与者不足5名')
 const trainingCsv=csv.join('\n')+'\n',trainingHash=hash(trainingCsv)
 return {chains,folds,trainingCsv,trainingHash,manifest:{algorithm:ALGORITHM,library:LIBRARY,ageBand:data.cohort.ageBand as string,datasetHash:hash(JSON.stringify({cohort:data.cohort,chains})),trainingHash,researchOnly:true,active:false,counts:{participants:participants.length,reviews,delayed,delayedFailures,objectiveDelayed,spanDays,maxParticipantShare,excludedEvents,excludedChains},folds:{train:folds.train.length,validation:folds.validation.length,test:folds.test.length},ready:blockers.length===0,blockers}}
}
export interface Candidate {schemaVersion:1;algorithm:typeof ALGORITHM;library:typeof LIBRARY;trainingHash:string;weights:number[]}
export function validateCandidate(input:unknown,trainingHash:string):Candidate {
 object(input,['schemaVersion','algorithm','library','trainingHash','weights'])
 demand(input.schemaVersion===1&&input.algorithm===ALGORITHM&&input.library===LIBRARY,'候选版本必须匹配FSRS-6.0与ts-fsrs@5.4.2')
 demand(input.trainingHash===trainingHash,'候选训练输入散列不匹配')
 const weights=input.weights,bounds=CLAMP_PARAMETERS(W17_W18_Ceiling)
 demand(Array.isArray(weights)&&weights.length===21&&weights.every((w,i)=>typeof w==='number'&&Number.isFinite(w)&&w>=bounds[i][0]&&w<=bounds[i][1]),'候选必须含21个范围内的有限权重；禁止自动截断或迁移')
 return input as unknown as Candidate
}
export interface Metrics {n:number;failures:number;participants:number;logLoss:number|null;brier:number|null;calibrationRMSE:number|null;macroLogLoss:number|null}
export function replayMetrics(chains:CleanChain[],participants:string[],weights:readonly number[]=default_w,objectiveOnly=true):Metrics {
 const engine=fsrs({w:[...weights],request_retention:.9,maximum_interval:365,enable_fuzz:false})
 const allowed=new Set(participants),bins=Array.from({length:10},()=>({n:0,p:0,y:0})),persons=new Map<string,{n:number;loss:number}>()
 let n=0,failures=0,loss=0,brier=0
 for(const chain of chains){
  if(!allowed.has(chain.participantId))continue
  let card=createEmptyCard(new Date(ANCHOR+chain.reviews[0].elapsedMs))
  for(let i=0;i<chain.reviews.length;i++){
   const r=chain.reviews[i],now=new Date(ANCHOR+r.elapsedMs)
   if(i>0&&r.elapsedMs-chain.reviews[i-1].elapsedMs>=DAY&&(!objectiveOnly||r.mode!=='flash')){
    const p=Math.max(1e-9,Math.min(1-1e-9,engine.get_retrievability(card,now,false))),y=r.rating===1?0:1
    const l=-(y*Math.log(p)+(1-y)*Math.log(1-p)),bin=bins[Math.min(9,Math.floor(p*10))]
    n++;if(!y)failures++;loss+=l;brier+=(p-y)**2;bin.n++;bin.p+=p;bin.y+=y
    const person=persons.get(r.participantId)??{n:0,loss:0};person.n++;person.loss+=l;persons.set(r.participantId,person)
   }
   // Prediction must precede the observed rating; retain every valid context update.
   card=engine.next(card,now,r.rating as Grade).card
  }
 }
 return {n,failures,participants:persons.size,logLoss:n?loss/n:null,brier:n?brier/n:null,calibrationRMSE:n?Math.sqrt(bins.reduce((sum,b)=>sum+(b.n?b.n*((b.p-b.y)/b.n)**2:0),0)/n):null,macroLogLoss:persons.size?[...persons.values()].reduce((sum,p)=>sum+p.loss/p.n,0)/persons.size:null}
}
export function evaluateCandidate(prepared:Prepared,input:unknown,fold:'validation'|'test'='validation') {
 const candidate=validateCandidate(input,prepared.trainingHash),candidateHash=hash(JSON.stringify(candidate.weights))
 const baseline=replayMetrics(prepared.chains,prepared.folds[fold]),metrics=replayMetrics(prepared.chains,prepared.folds[fold],candidate.weights)
 const sufficient=baseline.n>=100&&baseline.failures>=10&&baseline.n-baseline.failures>=10&&baseline.participants>=5
 const improved=sufficient&&metrics.logLoss!<baseline.logLoss!&&metrics.macroLogLoss!<baseline.macroLogLoss!&&metrics.brier!<=baseline.brier!&&metrics.calibrationRMSE!<=baseline.calibrationRMSE!
 return {algorithm:ALGORITHM,library:LIBRARY,trainingHash:prepared.trainingHash,datasetHash:prepared.manifest.datasetHash,candidateHash,fold,baseline,candidate:metrics,allModes:replayMetrics(prepared.chains,prepared.folds[fold],candidate.weights,false),sufficient,eligibleForIndependentReview:prepared.manifest.ready&&improved,researchOnly:true,active:false as const}
}
