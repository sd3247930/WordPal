import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {createPet} from '../../packages/pet_engine'
export function goldenDatabase(){
 const db=freshDatabase();const date='2026-10-03T07:00:00.000Z'
 for(const id of ['cat','dog','fish','bird','duck','apple','egg','milk']){
  db.cards[id]={...newCard(id,new Date(['cat','dog','fish'].includes(id)?date:'2026-10-10T08:00:00.000Z')),reps:3,state:2,stability:4,difficulty:5,last_review:'2026-10-01T08:00:00.000Z',lapses:id==='dog'?1:0}
 }
 const answer={id:'golden-session:0',wordId:'cat',rating:3 as const,correct:true,at:date,source:'review_due' as const,mode:'flash' as const,input:''}
 db.history=[answer];db.streakDates=['2026-10-01','2026-10-02','2026-10-03'];db.lessonIndex=1;db.gems=18
 db.pets={water:{...createPet('water'),exp:140,level:2,affection:36,mood:'happy',equippedCosmetics:['ribbon']},fire:createPet('fire'),earth:createPet('earth'),wind:createPet('wind')}
 db.session={id:'golden-session',date:'2026-10-03',startedAt:date,kind:'review_due',wordIds:['cat','dog','fish'],index:1,mode:'connect',input:'',selected:'',revealed:false,answers:[answer]}
 return db
}
