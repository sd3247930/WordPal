import type {Familiarity} from './FamiliaritySelector'

/** Exclusive presentation groups; legacy records without evidence remain unrated. */
export function summarizeWordbookLearning(states:readonly Familiarity[]){
 const summary={mastered:0,learning:0,unseen:0,unrated:0,total:states.length}
 for(const state of states){
  if(state.level==='mastered')summary.mastered++
  else if(state.level==='unseen')summary.unseen++
  else if(state.level==='unrated')summary.unrated++
  else summary.learning++
 }
 return summary
}
export type WordbookLearningSummary=ReturnType<typeof summarizeWordbookLearning>
