import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,recordDailyAnswer,advanceDailyPlan} from '../../src/services/learning/DailyLearningPlan'
import {newCard} from '../../packages/srs_fsrs'
import {customCourse} from './custom-course'

export function compactStudyFixture(completed=true,resources=true,id='compact-study'){
 const pack=customCourse(id,23);pack.title=resources?'合成英语 · 星星探索册':'合成英语 · 资源准备册'
 for(const [index,word] of pack.vocabulary.entries())Object.assign(word,{lemma:'sample'+String.fromCharCode(97+index),example:resources?'I know sample'+String.fromCharCode(97+index)+'.':'',audio:resources?'/static/audio/cat.wav':'',image:resources?'/static/icons/study-compact/picture.png':'',phonics:resources?['s','ample'+String.fromCharCode(97+index)]:[],phonemes:resources?['s','æmpl']:[]})
 const lesson=pack.units.find(unit=>unit.id.endsWith('-u1'))!.lessons[0];if(resources)lesson.storyId='compact-story'
 pack.stories=resources?[{id:'compact-story',title:'合成词汇故事',sentences:['I know samplea.'],targetWordIds:[lesson.wordIds[0]]}]:[]
 const now=new Date('2040-01-01T08:00:00Z'),db={...freshDatabase(),version:2,currentCourseId:id,abilityLevel:'L3',courseProgress:{[id]:{...initialProgress(id),currentLessonId:lesson.id,curriculumSchema:1}},auxiliaryRecords:[]} as Database
 if(resources)db.cards=Object.fromEntries(lesson.wordIds.map(wordId=>[wordId,newCard(wordId,new Date('2040-02-01T08:00:00Z'))]))
 if(completed){const plan=selectDailyPlan(db,pack,now)!;plan.flow!.begunAt=now.toISOString();while(!plan.completedAt){recordDailyAnswer(plan,{id:`${plan.id}:${plan.flow!.step}:${plan.index}`,wordId:plan.wordIds[plan.index],courseId:id,mode:plan.mode,source:'practice',correct:true,rating:3,input:'',at:now.toISOString()});advanceDailyPlan(plan,now)}Object.assign(db.courseProgress![id],{dailyPlan:plan,studyActivity:'daily',fullLearnedWords:Object.fromEntries(plan.wordIds.map(wordId=>[wordId,now.toISOString()]))})}
 return {pack,db,lesson,now}
}
