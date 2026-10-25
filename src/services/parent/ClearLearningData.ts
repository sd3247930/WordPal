import type {Database} from '../../stores/profile'
import {initialProgress} from '../storage/MigrationV1toV2'
/** Reset learning evidence only. Keep content, settings, rewards and companion assets. */
export function clearLearningProgress(database:Database,installedIds:readonly string[]){
 database.cards={};database.history=[];database.practiceAnswers=[];database.session=null;database.courseSessions={};database.customPractice=null;database.customPracticeCursors=[];database.auxiliaryRecords=[]
 database.courseProgress=Object.fromEntries(installedIds.map(id=>[id,initialProgress(id)]));database.lastLessonAccuracy=null;database.lessonIndex=0;database.streakDates=[];delete database.pendingCourseId
}
