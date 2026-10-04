import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { FSRSScheduler, migrateLegacy } from '../../packages/srs_fsrs'
import { useProfileStore } from './profile'
import { wordById } from '../../packages/content_schema'
export const useReviewStore=defineStore('review',()=>{
  const profile=useProfileStore(); const clock=ref(Date.now())
  if(Object.values(profile.db.cards).some(c=>c.strategy!=='fsrs')) profile.transact(d=>{for(const id in d.cards) if(d.cards[id].strategy!=='fsrs') d.cards[id]=migrateLegacy(d.cards[id])})
  const cards=computed(()=>Object.values(profile.db.cards))
  const due=computed(()=>new FSRSScheduler(cards.value).getDueCards(new Date(clock.value)).filter(c=>wordById[c.wordId]))
  const weak=computed(()=>cards.value.filter(c=>c.lapses>0 || c.difficulty>=7))
  const mistakes=computed(()=>[...new Set(profile.db.history.filter(a=>!a.correct).map(a=>a.wordId))].map(id=>profile.db.cards[id]).filter(Boolean))
  function refresh() {clock.value=Date.now()}
  return {cards,due,weak,mistakes,refresh}
})
