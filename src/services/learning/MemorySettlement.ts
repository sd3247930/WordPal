import type {Answer,LearningSession,MemoryCard} from '../../../packages/core_learning'
import {FSRSScheduler,newCard} from '../../../packages/srs_fsrs'
import {applyLearningReward} from '../../../packages/pet_engine'
import type {Database} from '../../stores/profile'

/** Stable across JSON reloads; changes after every real scheduling operation. */
export function memoryVersion(card?:MemoryCard){
 return card?JSON.stringify([card.wordId,card.strategy,card.due,card.last_review??null,card.reps,card.lapses,card.state,card.learning_steps,card.stability,card.difficulty,card.elapsed_days,card.scheduled_days]):'new'
}
export function captureMemoryVersions(db:Pick<Database,'cards'>,ids:string[]){return Object.fromEntries(ids.map(id=>[id,memoryVersion(db.cards[id])]))}

/** Called only inside the existing profile transaction, before changing the global card. */
export function settleMemoryAnswer(db:Database,session:LearningSession,answer:Answer,now:Date):Answer['settlement']{
 let reason:Answer['settlement']='settled'
 const card=db.cards[answer.wordId],expected=session.memoryVersions?.[answer.wordId]
 // A never-assessed legacy new word has an unconsumed global "new" state.
 // A legacy due card cannot make this proof and always requires a new queue.
 const provenNew=expected===undefined&&answer.source==='new_word'&&!card&&!db.history.some(saved=>saved.wordId===answer.wordId)
 if(answer.source==='practice')reason='practice'
 else if(db.rewardIds.includes(answer.id)||db.history.some(saved=>saved.id===answer.id))reason='already_settled'
 else if(expected===undefined&&!provenNew)reason='legacy_session'
 else if(expected!==undefined&&expected!==memoryVersion(card)||answer.source==='new_word'&&!!card||answer.source==='review_due'&&(!card||!(Date.parse(card.due)<=+now)))reason='stale_due'
 answer.settlement=reason
 if(reason!=='settled'){
  answer.source='practice';(db.practiceAnswers??=[]).push(answer)
  return reason
 }
 if(card&&answer.source==='review_due')answer.dueAtSubmit=card.due
 db.cards[answer.wordId]=new FSRSScheduler().schedule(card??newCard(answer.wordId,now),answer.rating,now).card
 db.history.push(answer);applyLearningReward(db,answer)
 return reason
}
