import {spellingInputReady} from '../../packages/phonics/letter-blocks'
import {defineStore} from 'pinia'
import {computed,ref,watch} from 'vue'
import {wordById,lessons,words} from '../../packages/content_schema'
import {localDate,canUnlockNextUnit,type LearningMode,type ReviewRating,type Answer,type LearningSession} from '../../packages/core_learning'
import {isCorrectSpelling} from '../../packages/phonics'
import {changeBalance} from '../../packages/pet_engine/wallet'
import {useProfileStore} from './profile'
import {useReviewStore} from './review'
import {useCourseStore} from './course'
import {availableModes} from '../../packages/content_schema/course'
import {readFeedbackSettings} from './feedback'
import {initialProgress} from '../services/storage/MigrationV1toV2'
import {getCourseWord,resolveFrozenWord} from '../services/content/ContentRegistry'
import {useParentSettingsStore} from './parent-settings'
import {orderedCourseWords,courseIntroductions,sessionInCourse} from '../services/learning/CourseStudySequence'
import {selectDailyPlan,ensureDailyPlan,continueDailyPlan,dailyTasks,advanceDailyPlan,recordDailyAnswer,fullCourseWords,completedPrefix,STEP_TITLES} from '../services/learning/DailyLearningPlan'
import {todayCourseWordIds} from '../services/learning/StudyStats'
import {captureMemoryVersions,settleMemoryAnswer} from '../services/learning/MemorySettlement'
import {studyCapability,planCapabilities,questionKey} from '../services/learning/StudyCapability'
import type {AudioProgress} from '../services/audio/AudioPlaybackService'
import type {AudioEvidence,Word} from '../../packages/core_learning'
import {studyHintKind} from '../services/learning/StudyHint'
export const modes:{id:LearningMode;name:string;description:string}[]=[{id:'flash',name:'闪现',description:'看看单词，回想它的意思'},{id:'connect',name:'连接',description:'为单词找到正确的中文意思'},{id:'listen',name:'听音',description:'听发音，选出对应的单词'},{id:'spell',name:'拼写',description:'看中文，用字母拼出单词'},{id:'dictation',name:'听写',description:'听发音，写出这个单词'}]
export const useLearningStore=defineStore('learning',()=>{
 const profile=useProfileStore(),review=useReviewStore(),course=useCourseStore(),parent=useParentSettingsStore()
 const clock=ref(Date.now())
 const todayPlan=computed(()=>selectDailyPlan(profile.db,course.current,new Date(clock.value)))
 const isDaily=computed(()=>course.progress.studyActivity==='daily'&&!!course.progress.dailyPlan?.flow?.begunAt)
 const storedSession=computed(()=>isDaily.value?course.progress.dailyPlan!:profile.db.session&&sessionInCourse(profile.db.session,course.currentId)?profile.db.session:null)
 const session=computed(()=>{const saved=storedSession.value,pending=profile.learningDraft;return saved&&pending?.key===questionKey(saved)?{...saved,...pending.fields}:saved})
 const submitNotice=ref('')
 const audioGate=ref<{key:string;url:string;requestId?:number;started?:boolean;status:'pending'|'ended'|'error';heardAt?:string}|null>(null)
 watch(()=>questionKey(session.value),()=>{audioGate.value=null;submitNotice.value=''},{flush:'sync'})
 const tasks=computed(()=>dailyTasks(todayPlan.value))
 const todayTaskWordIds=computed(()=>(todayPlan.value?.wordIds||[]).slice(0,todayPlan.value?.flow?.target??parent.settings.dailyNewWordLimit))
 const planProblem=computed(()=>todayPlan.value?.wordIds.some(id=>!allowedIds.value.has(id))?'教材内容已变更，原任务已保留。请在家长区恢复对应教材版本后继续。':'')
 const current=computed(()=>session.value ? resolveFrozenWord(session.value.wordSnapshot?.[session.value.wordIds[session.value.index]]||wordById[session.value.wordIds[session.value.index]],session.value.courseId,session.value.resourceVersion||session.value.contentVersion):undefined)
 const todayAnswers=computed(()=>profile.db.history.filter(a=>localDate(new Date(a.at))===localDate()))
 const courseWordPool=computed(()=>orderedCourseWords(course.current)),allowedIds=computed(()=>new Set(courseWordPool.value))
 const introductions=computed(()=>courseIntroductions(profile.db,course.currentId))
 const newTodayWordIds=computed(()=>todayCourseWordIds(profile.db,course.current,new Date(clock.value)))
 const newToday=computed(()=>newTodayWordIds.value.length)
 const newCandidates=computed(()=>courseWordPool.value.filter(id=>!(id in introductions.value)&&!!wordById[id]))
 const studyWords=computed(()=>todayPlan.value&&!todayPlan.value.completedAt?todayPlan.value.wordIds:[])
 const newWords=computed(()=>studyWords.value.filter(id=>!profile.db.cards[id]))
 const due=computed(()=>review.due.filter(card=>allowedIds.value.has(card.wordId)))
 const lesson=computed(()=>{const id=session.value?.wordIds[session.value.index]||todayPlan.value?.wordIds[0]||newCandidates.value[0];return course.lessons.find(lesson=>lesson.wordIds.includes(id))||course.lesson})
 const needsConsolidation=computed(()=>course.currentId==='starter'&&profile.db.lastLessonAccuracy!==null && profile.db.lastLessonAccuracy<.8)
 const dailyPlan=computed(()=>({wordIds:todayPlan.value?.wordIds||[],newIds:todayPlan.value?.wordIds||[],dueIds:[] as string[],weakIds:[] as string[],sequenceIds:todayPlan.value?.wordIds||[],wordSources:todayPlan.value?.wordSources||{}}))
 const textbookProgress=computed(()=>{const ids=courseWordPool.value,learned=Object.keys(fullCourseWords(profile.db,course.current)).length,prefix=completedPrefix(profile.db,course.current);return {total:ids.length,learned,prefix,percent:ids.length?Math.floor(learned/ids.length*100):0}})
 const canContinue=computed(()=>!profile.readOnly&&!profile.bootError&&!planProblem.value&&!!course.progress.dailyPlan?.completedAt&&textbookProgress.value.prefix<textbookProgress.value.total)
 const currentSource=computed(()=>session.value?.wordSources?.[current.value?.id||'']||session.value?.kind||'practice')
 const choices=computed(()=>{
  if(!current.value)return []
  const pool=session.value?.wordSnapshot||wordById,selected=[current.value],meanings=new Set([current.value.meaning])
  for(const id of [...current.value.distractors,...courseWordPool.value]){if(!allowedIds.value.has(id)||selected.some(word=>word.id===id))continue;const word=resolveFrozenWord(pool[id]||getCourseWord(course.currentId,id),course.currentId,session.value?.resourceVersion||session.value?.contentVersion);if(!word||meanings.has(word.meaning)||word.word===current.value.word)continue;selected.push(word);meanings.add(word.meaning);if(selected.length===4)break}
  const offset=(session.value?.index??0)%selected.length
  return [...selected.slice(offset),...selected.slice(0,offset)]
 })
 const capability=computed(()=>studyCapability(current.value,session.value?.mode||'flash',choices.value,readFeedbackSettings().sound))
 const audioEvidence=computed<AudioEvidence|undefined>(()=>{const gate=audioGate.value;return gate?.key===questionKey(session.value)&&gate.url===current.value?.audio&&gate.status==='ended'&&gate.requestId!==undefined&&gate.heardAt?{url:gate.url,requestId:gate.requestId,heardAt:gate.heardAt}:undefined})
 const resourceProblem=computed(()=>capability.value.status==='unavailable'?capability.value.reason||'这道题暂时不能完成。':session.value&&['listen','dictation'].includes(session.value.mode)&&!audioEvidence.value?(audioGate.value?.status==='error'?'发音未能完整播放，请重试；这道听力题还没有完成。':'请先完整听一遍发音，再作答。'):'')
 function beginQuestionAudio(){const s=session.value;if(!s||!current.value)return '';const key=questionKey(s);audioGate.value={key,url:current.value.audio,status:'pending'};return key}
 function observeQuestionAudio(key:string,progress:AudioProgress){
  const gate=audioGate.value
  if(!gate||gate.key!==key||key!==questionKey(session.value)||progress.url!==gate.url||gate.url!==current.value?.audio)return false
  if(gate.requestId!==undefined&&progress.requestId<gate.requestId)return false
  if(gate.requestId!==progress.requestId){gate.requestId=progress.requestId;gate.started=false}
  if(progress.state==='error'){gate.status='error';gate.started=false;delete gate.heardAt}
  else if(progress.state==='ended'){if(!gate.started)return false;gate.status='ended';gate.heardAt=new Date().toISOString()}
  else if(progress.state==='idle'||progress.state==='playing'||progress.waiting){if(progress.state==='playing'&&!progress.waiting)gate.started=true;gate.status='pending';delete gate.heardAt}
  return true
 }
 function setPlanCapabilities(plan:LearningSession){
  const resolve=(id:string)=>resolveFrozenWord(plan.wordSnapshot?.[id],plan.courseId,plan.resourceVersion||plan.contentVersion)
  plan.flow!.capabilities=planCapabilities(plan,resolve,word=>[word,...word.distractors.map(resolve).filter((item):item is Word=>!!item)])
 }
 function freezeWords(ids:string[]){
  const snapshot:Record<string,typeof wordById[string]>={}
  for(const id of ids){
   const source=getCourseWord(course.currentId,id);if(!source)continue
   const sourceLesson=course.lessons.find(lesson=>lesson.wordIds.includes(id)),word=JSON.parse(JSON.stringify({...source,example:sourceLesson?.examples?.[id]||source.example}))
   const alternatives=[...word.distractors,...courseWordPool.value],meanings=new Set([word.meaning]),seen=new Set([id]);word.distractors=[]
   for(const candidate of alternatives){if(seen.has(candidate)||!allowedIds.value.has(candidate))continue;seen.add(candidate);const other=getCourseWord(course.currentId,candidate);if(!other||other.word===word.word||meanings.has(other.meaning))continue;meanings.add(other.meaning);word.distractors.push(candidate);if(word.distractors.length===3)break}
   snapshot[id]=word
   for(const distractor of word.distractors)if(!snapshot[distractor])snapshot[distractor]=JSON.parse(JSON.stringify({...getCourseWord(course.currentId,distractor),distractors:[]}))
  }
  return snapshot
 }
 function startIndependent(request?:string[],scopedDue=false,selection?:{unitId?:string;wordId?:string},practiceOnly=false){
  review.refresh()
  if(profile.db.session&&!profile.db.session.completedAt&&sessionInCourse(profile.db.session,course.currentId))return profile.transact(d=>{d.courseProgress![course.currentId].studyActivity='independent'})
  let ids:string[],kind:LearningSession['kind'],wordSources:LearningSession['wordSources'],sequenceWordIds:string[]|undefined
  const requested=[...new Set(request||[])].filter(id=>allowedIds.value.has(id)&&!!wordById[id])
  if(request?.length&&!requested.length){uni.showToast?.({title:'该单词不在当前教材中，请先选择对应教材。',icon:'none'});return false}
  if(practiceOnly){ids=requested;kind='practice';wordSources=Object.fromEntries(ids.map(id=>[id,'practice' as const]))}
  else if(scopedDue){const allowed=new Set(requested);ids=due.value.map(c=>c.wordId).filter(id=>allowed.has(id));kind='review_due';wordSources=Object.fromEntries(ids.map(id=>[id,'review_due' as const]))}
  else if(due.value.length&&requested.length){ids=due.value.map(c=>c.wordId);kind='review_due'}
  else if(requested.length){ids=requested;kind='practice'}
  else{ids=[];kind='practice'}
  if(!ids.length)return false
  const snapshot=freezeWords(ids)
  return profile.transact(d=>{d.courseProgress??={};(d.courseProgress[course.currentId]??=initialProgress(course.currentId)).studyActivity='independent';const introduced=courseIntroductions(d,course.currentId);if(Object.keys(introduced).length){d.courseProgress??={};const progress=d.courseProgress[course.currentId]??=initialProgress(course.currentId);progress.introducedWords=introduced}d.session={id:`session-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,startedAt:new Date().toISOString(),date:localDate(),kind,wordIds:ids,index:0,mode:'flash',input:'',selected:'',revealed:false,answers:[],courseId:course.currentId,contentVersion:course.current.contentVersion,lessonId:lesson.value.id,wordSnapshot:snapshot,memoryVersions:captureMemoryVersions(d,ids),seed:Date.now(),wordSources,plannerConfig:{...parent.plannerConfig},intent:scopedDue||requested.length&&kind==='review_due'?'review':requested.length?'practice':'course',...(sequenceWordIds?{sequenceWordIds}:{})}})
 }
 function refreshDay(){clock.value=Date.now()}
 // Page previews must not write a new daily assignment over an independent visit.
 // The explicit start action atomically persists the plan and its frozen words.
 function prepareDaily(){refreshDay();return !!todayPlan.value&&!planProblem.value}
 function start(request?:string[],scopedDue=false,selection?:{unitId?:string;wordId?:string}){
  if(request?.length||scopedDue)return startIndependent(request,scopedDue,selection)
  refreshDay();review.refresh()
  const unfinished=todayPlan.value&&!todayPlan.value.completedAt
  if(!unfinished&&profile.db.session&&!profile.db.session.completedAt&&sessionInCourse(profile.db.session,course.currentId)&&profile.db.session.kind==='review_due')return startIndependent(profile.db.session.wordIds,true)
  if(!unfinished&&due.value.length)return startIndependent(due.value.map(card=>card.wordId),true)
  if(!todayPlan.value||planProblem.value){if(planProblem.value)uni.showToast?.({title:planProblem.value,icon:'none'});return false}
  const owner=course.currentId,pack=course.current
  return profile.transact(d=>{
   const plan=ensureDailyPlan(d,pack,new Date(clock.value))!;d.courseProgress![owner].studyActivity='daily'
   if(!plan.wordSnapshot){
    plan.wordSnapshot=freezeWords(plan.wordIds)
    plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,d.cards[id]?(Date.parse(d.cards[id].due)<=clock.value?'review_due':'practice'):'new_word']))
    plan.memoryVersions=captureMemoryVersions(d,plan.wordIds)
   }
   if(!plan.flow!.capabilities)setPlanCapabilities(plan)
   plan.flow!.begunAt??=new Date(clock.value).toISOString();if(plan.mode==='flash'&&!plan.answers[plan.index])plan.revealed=true
  })
 }
 function continueLearning(){
  refreshDay();if(!canContinue.value)return false
  const owner=course.currentId,pack=course.current,expectedId=course.progress.dailyPlan!.id
  let continued=false
  const saved=profile.transact(d=>{
   const plan=continueDailyPlan(d,pack,expectedId,new Date(clock.value));if(!plan)return
   plan.wordSnapshot=freezeWords(plan.wordIds)
   plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,d.cards[id]?(Date.parse(d.cards[id].due)<=clock.value?'review_due':'practice'):'new_word']))
   plan.memoryVersions=captureMemoryVersions(d,plan.wordIds);setPlanCapabilities(plan)
   plan.flow!.begunAt=new Date(clock.value).toISOString();plan.revealed=true
   d.courseProgress![owner].studyActivity='daily';continued=true
  })
  return saved&&continued
 }
 function activeDraft(d:typeof profile.db){return isDaily.value?d.courseProgress?.[course.currentId]?.dailyPlan:d.session}
 function patch(change:Partial<LearningSession>){
  const s=session.value
  if(s&&Object.keys(change).length&&Object.keys(change).every(field=>['input','letterDraft','inputAssistance'].includes(field)))return profile.stageLearningDraft(s,change)
  return profile.transact(d=>{const target=activeDraft(d);if(target&&!target.completedAt){if(target.flow){for(const field of ['input','selected','revealed','letterDraft','inputAssistance'] as const)if(change[field]!==undefined)(target as any)[field]=change[field]}else Object.assign(target,change)}})
 }
 function refreshResources(){
  const s=session.value;if(!s?.flow||s.completedAt)return false
  const fresh=freezeWords(s.wordIds)
  if(s.wordIds.some(id=>{const old=s.wordSnapshot?.[id],word=fresh[id];return !old||!word||old.word!==word.word||old.meaning!==word.meaning||old.pos!==word.pos})){submitNotice.value='教材词义已经变化，原任务已保留，请先恢复对应内容版本。';return false}
  let refreshed=false
  const saved=profile.transact(d=>{const target=d.courseProgress?.[s.courseId!]?.dailyPlan;if(!target||target.id!==s.id)return
   for(const [id,word]of Object.entries(fresh)){const old=target.wordSnapshot?.[id];if(!old){(target.wordSnapshot??={})[id]=word;continue}if(old.word===word.word&&old.meaning===word.meaning&&old.pos===word.pos){old.audio=word.audio;old.image=word.image;old.distractors=word.distractors}}
   target.resourceVersion=course.current.contentVersion
   setPlanCapabilities(target)
   refreshed=true
  })
  if(saved&&refreshed)audioGate.value=null
  return saved&&refreshed
 }
 function setMode(mode:LearningMode){if(isDaily.value)return session.value?.mode===mode;if(session.value?.answers[session.value.index]||!current.value||!availableModes(current.value,Object.values(session.value?.wordSnapshot||wordById),readFeedbackSettings().sound,session.value?.plannerConfig?.entryLevel).includes(mode))return false;return patch({mode,input:'',selected:'',revealed:false,hinted:false,hintKind:undefined,letterDraft:undefined,inputAssistance:undefined})}
 function reveal(){return patch({revealed:true})}
 function hint(){
  const s=session.value
  if(!s||s.completedAt||s.answers[s.index])return false
  if(s.hinted||s.mode!=='flash'&&s.revealed)return true
  if(profile.db.gems<1)return false
  let provided=false
  const saved=profile.transact(d=>{const target=activeDraft(d);if(target&&questionKey(target)===questionKey(s)&&!target.hinted&&!target.answers[target.index]&&d.gems>=1){d.gems=changeBalance(d.gems,-1);target.hinted=true;target.hintKind=studyHintKind(current.value!,s.mode);provided=true}})
  return saved&&provided
 }
 function submit(rating?:ReviewRating){
  if(!session.value||!current.value||session.value.completedAt||session.value.answers[session.value.index])return false
  if(rating!==undefined&&![1,2,3,4].includes(rating))return false
  if(resourceProblem.value){submitNotice.value=resourceProblem.value;return false}
  if(isDaily.value)return submitDaily(rating)
  const s=session.value,w=current.value,source=currentSource.value
  if(s.mode!=='flash' && ((s.mode==='connect'||s.mode==='listen')?!s.selected:!s.input.trim()))return false
  if(s.mode==='flash' && !s.revealed)return false
  if(['connect','listen'].includes(s.mode)&&!choices.value.some(choice=>choice.id===s.selected))return false
  if(['spell','dictation'].includes(s.mode)&&!spellingInputReady(s.input,w,s.letterDraft))return false
  const correct=s.mode==='flash' ? rating!==1 : (s.mode==='spell'||s.mode==='dictation') ? isCorrectSpelling(s.input,w) : s.selected===w.id
  const assisted=answerAssisted(s),actualRating=effectiveRating(correct,rating,assisted)
  const now=new Date()
  const answer:Answer={id:`${s.id}:${s.index}`,wordId:w.id,correct,rating:actualRating,requestedRating:rating??3,at:now.toISOString(),source,mode:s.mode,input:s.input||s.selected,hinted:!!s.hinted||assisted,...(assisted?{hintKind:'answer' as const}:s.hintKind?{hintKind:s.hintKind}:{}),assessmentVersion:1,recallAttempt:'first',courseId:course.currentId,...(s.inputAssistance==='tiles'?{inputAssistance:'tiles' as const}:{}),...(audioEvidence.value?{audioEvidence:audioEvidence.value}:{})}
  let applied=false,reason:Answer['settlement']
  const ok=profile.transact(d=>{
   if(!d.session||questionKey(d.session)!==questionKey(s)||d.session.answers[d.session.index])return
   reason=settleMemoryAnswer(d,d.session,answer,now)
   d.session.answers.push(answer)
   if(s.sequenceWordIds?.includes(w.id)||source==='new_word'){d.courseProgress??={};const p=d.courseProgress[course.currentId]??=initialProgress(course.currentId);p.introducedWords={...courseIntroductions(d,course.currentId),[w.id]:now.toISOString()}}
   if(reason==='settled'){
    if(!d.streakDates.includes(localDate(now)))d.streakDates.push(localDate(now))
   }
   d.session.revealed=true
   applied=true
  })
  if(ok&&applied)showSettlementNotice(reason)
  review.refresh();return ok&&applied
 }
 function answerAssisted(s:LearningSession){return s.inputAssistance==='tiles'||s.hintKind==='answer'||!!(s.hinted&&!s.hintKind&&['spell','dictation'].includes(s.mode))||s.mode!=='flash'&&s.revealed}
 function effectiveRating(correct:boolean,rating:ReviewRating|undefined,assisted:boolean):ReviewRating{return !correct?1:assisted?Math.min(rating??3,2) as ReviewRating:rating??3}
 function showSettlementNotice(reason:Answer['settlement']){submitNotice.value=reason==='stale_due'||reason==='already_settled'?'这张词卡已复习过啦，这次记作练习，继续下一题。':reason==='legacy_session'?'这次保留为练习；完成后可从当前到期队列继续复习。':''}
 function submitDaily(rating?:ReviewRating){
  const s=session.value!,w=current.value!,owner=s.courseId!,step=s.flow!.step
  if(planProblem.value||s.mode!=='flash'&&(['connect','listen'].includes(s.mode)?!s.selected:!s.input.trim())||s.mode==='flash'&&!s.revealed)return false
  if(['connect','listen'].includes(s.mode)&&!choices.value.some(choice=>choice.id===s.selected))return false
  if(['spell','dictation'].includes(s.mode)&&!spellingInputReady(s.input,w,s.letterDraft))return false
  const correct=s.mode==='flash'?rating!==1:['spell','dictation'].includes(s.mode)?isCorrectSpelling(s.input,w):s.selected===w.id
  const now=new Date(),assisted=answerAssisted(s),actualRating=effectiveRating(correct,rating,assisted)
  const source=step==='consolidate'?(s.wordSources?.[w.id]||'new_word'):'practice'
  const answer:Answer={id:`${s.id}:${step}:${s.index}:${s.flow!.attempts.length}`,wordId:w.id,courseId:owner,at:now.toISOString(),correct,rating:actualRating,requestedRating:rating??3,mode:s.mode,step,source,input:s.input||s.selected,hinted:!!s.hinted||assisted,...(assisted?{hintKind:'answer' as const}:s.hintKind?{hintKind:s.hintKind}:{}),...(s.inputAssistance==='tiles'?{inputAssistance:'tiles' as const}:{}),...(audioEvidence.value?{audioEvidence:audioEvidence.value}:{})}
  let applied=false,reason:Answer['settlement']
  const saved=profile.transact(d=>{
   const target=d.courseProgress?.[owner]?.dailyPlan
   if(!target||questionKey(target)!==questionKey(s)||target.answers[target.index])return
   const assessed=target.flow!.assessments?.[w.id]
   if(!recordDailyAnswer(target,answer))return
   d.practiceAnswers??=[]
   if(step==='consolidate'&&!assessed){
    answer.assessmentVersion=1;answer.recallAttempt='first'
    ;(target.flow!.assessments??={})[w.id]=answer.id
    reason=settleMemoryAnswer(d,target,answer,now)
   }else{
    answer.source='practice';answer.settlement=assessed?'already_settled':'practice';d.practiceAnswers.push(answer)
   }
   if(!d.streakDates.includes(localDate(now)))d.streakDates.push(localDate(now))
   applied=true
  })
  if(saved&&applied){showSettlementNotice(reason);review.refresh()}
  return saved&&applied
 }
 function next(){
  if(!session.value||session.value.completedAt||!session.value.answers[session.value.index])return false
  if(isDaily.value){const s=session.value,owner=s.courseId!,step=s.flow!.step,index=s.index;return profile.transact(d=>{
   const p=d.courseProgress![owner],target=p.dailyPlan!
   if(target.id!==s.id||target.flow?.step!==step||target.index!==index||!advanceDailyPlan(target))return
   if(target.completedAt){const at=target.completedAt;p.fullLearnedWords??={};p.introducedWords??={};for(const id of target.wordIds){p.fullLearnedWords[id]=at;p.introducedWords[id]??=at}const nextId=courseWordPool.value[completedPrefix(d,course.current)]||target.wordIds[target.wordIds.length-1];const nextLesson=course.lessons.find(l=>l.wordIds.includes(nextId!));if(nextLesson)p.currentLessonId=nextLesson.id}
  })}
  return profile.transact(d=>{
   const s=d.session!;
   if(s.index<s.wordIds.length-1){s.index++;s.input='';s.selected='';s.revealed=false;delete s.hinted;delete s.hintKind;delete s.letterDraft;delete s.inputAssistance}
   else{
    s.completedAt=new Date().toISOString()
    if(s.sequenceWordIds?.length){const id=s.courseId||course.currentId,p=d.courseProgress![id],introduced=courseIntroductions(d,id),next=courseWordPool.value.find(wordId=>!(wordId in introduced)),target=course.lessons.find(lesson=>lesson.wordIds.includes(next||s.wordIds[s.wordIds.length-1]!))||lesson.value;p.currentLessonId=target.id;p.lastLessonAccuracy=s.answers.filter(answer=>answer.correct).length/s.answers.length;if(id==='starter'){d.lastLessonAccuracy=p.lastLessonAccuracy;d.lessonIndex=Math.max(0,lessons.findIndex(lesson=>lesson.id===target.id))}return}
    if(s.wordSources&&Object.values(s.wordSources).includes('new_word')){
     const answers=s.answers.filter(a=>s.wordSources![a.wordId]==='new_word'),accuracy=answers.filter(a=>a.correct).length/answers.length,courseId=s.courseId||'starter'
     d.courseProgress??={};d.courseProgress[courseId]??=initialProgress(courseId);d.courseProgress[courseId].lastLessonAccuracy=accuracy
     if(courseId==='starter'){
      d.lastLessonAccuracy=accuracy
      if(canUnlockNextUnit(answers)&&lesson.value.wordIds.every(id=>d.cards[id]))d.lessonIndex=Math.min(d.lessonIndex+1,lessons.length-1)
      d.courseProgress.starter.currentLessonId=lessons[d.lessonIndex].id
     }
    }else if((s.courseId||'starter')==='starter'&&s.kind==='new_word'){
     d.lastLessonAccuracy=s.answers.filter(a=>a.correct).length/s.answers.length
     if(canUnlockNextUnit(s.answers)&&s.wordIds.every(id=>lesson.value.wordIds.includes(id))&&lesson.value.wordIds.every(id=>d.cards[id]))d.lessonIndex=Math.min(d.lessonIndex+1,lessons.length-1)
     d.courseProgress??={};d.courseProgress.starter??=initialProgress('starter');d.courseProgress.starter.lastLessonAccuracy=d.lastLessonAccuracy;d.courseProgress.starter.currentLessonId=lessons[d.lessonIndex].id
    }else if(s.kind==='new_word'){
     const courseId=s.courseId!;d.courseProgress??={};d.courseProgress[courseId]??=initialProgress(courseId);d.courseProgress[courseId].lastLessonAccuracy=s.answers.filter(a=>a.correct).length/s.answers.length
    }
   }
  })
 }
 function previous(){if(isDaily.value||!session.value || session.value.index===0)return false;return patch({index:session.value.index-1,input:session.value.answers[session.value.index-1]?.input??'',revealed:true})}
 const learnedCount=computed(()=>Object.keys(profile.db.cards).length)
 const remainingCount=computed(()=>course.wordIds.filter(id=>!profile.db.cards[id]).length)
 const positionFor=(id?:string)=>{const index=courseWordPool.value.indexOf(id||'');return index<0?null:{index:index+1,total:courseWordPool.value.length}}
 const currentPosition=computed(()=>positionFor(current.value?.id))
 return {session,current,currentSource,choices,todayAnswers,newToday,newTodayWordIds,newWords,studyWords,due,dailyPlan,todayPlan,todayTaskWordIds,tasks,isDaily,planProblem,textbookProgress,canContinue,continueLearning,prepareDaily,refreshDay,startPractice:()=>startIndependent(todayPlan.value?.wordIds||lesson.value.wordIds,false,undefined,true),stepTitles:STEP_TITLES,lesson,needsConsolidation,learnedCount,remainingCount,currentPosition,positionFor,start,startSelected:(unitId?:string,wordId?:string)=>start(undefined,false,{unitId,wordId}),startDue:(ids:string[])=>start(ids,true),patch,setMode,reveal,hint,submit,next,previous,capability,resourceProblem,refreshResources,beginQuestionAudio,observeQuestionAudio,submitNotice,flushDraft:profile.flushLearningDraft}
})
