import type {Answer,LearningMode,Word} from './index'
import type {LetterBlockDraft} from '../phonics/letter-blocks'

export interface CustomPracticeScope {type:'whole-book'|'units';unitIds:string[]}
export interface CustomModeResult {completedWordIds:string[];attempts:Answer[]}
export interface CustomPracticeCursor {courseId:string;contentFingerprint:string;scope:CustomPracticeScope;nextOffset:number;lastSessionId:string;updatedAt:string}
export interface CustomPracticeSession {
 schemaVersion:1;source:'custom';id:string;courseId:string;contentVersion:string;contentFingerprint:string
 courseTitle:string;scope:CustomPracticeScope;scopeLabel:string;wordIds:string[];wordSnapshot:Record<string,Word>
 requestedCount:number;modes:LearningMode[];modeIndex:number;index:number
 sequenceStart?:number
 results:Record<LearningMode,CustomModeResult>;input:string;selected:string;revealed:boolean;answer:Answer|null
 letterDraft?:LetterBlockDraft;inputAssistance?:'tiles'
 status:'running'|'paused'|'completed'|'ended';startedAt:string;updatedAt:string
 elapsedMs:number;activeSince?:string;completedAt?:string;endedAt?:string;seed:number
}
