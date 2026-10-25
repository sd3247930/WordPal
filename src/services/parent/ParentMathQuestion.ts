export interface ParentGateQuestion {id:string;left:number;right:number;answer:number;createdAt:number}
export type ParentGateStatus='idle'|'checking'|'correct'|'incorrect'
export interface ParentGateState {question:ParentGateQuestion|null;input:string;status:ParentGateStatus;attemptCount:number;unlocked:boolean}
export function parentQuestionKey(left:number,right:number){return `${Math.min(left,right)}x${Math.max(left,right)}`}
export function normalizeParentAnswer(value:unknown){const text=String(value??'').trim();return /^\d+$/.test(text)?text.slice(0,2):''}
let sequence=0
/** Choose from a finite set, so even a constant random source cannot loop forever. */
export function createParentMathQuestion(previousKey='',random= Math.random,now=Date.now()):ParentGateQuestion {
 const candidates:Array<[number,number]>=[]
 for(let left=1;left<=9;left++)for(let right=1;right<=9;right++)if(parentQuestionKey(left,right)!==previousKey)candidates.push([left,right])
 const draw=random(),index=Math.floor((Number.isFinite(draw)?Math.max(0,Math.min(draw,1-Number.EPSILON)):0)*candidates.length)
 const [left,right]=candidates[index]
 return {id:`parent-question-${now.toString(36)}-${++sequence}`,left,right,answer:left*right,createdAt:now}
}
