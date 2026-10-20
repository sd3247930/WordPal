import type {CoursePack} from '../../../packages/content_schema/course'
import {occurrences,type CourseOccurrence} from './IdentityModel'

export function resolveTextbookWordPosition(pack:CoursePack,wordId:string,unitId?:string){return occurrences(pack).find(position=>position.lexemeId===wordId&&(unitId===undefined||position.unitId===unitId))}
export function wordSourceLabel(title:string,position?:CourseOccurrence){
 const name=title||'原教材'
 if(!position||position.positionStatus!=='confirmed')return name+' · 位置待确认'
 if(position.unitId)return position.unitTitle&&Number.isInteger(position.unitWordOrder)&&position.unitWordOrder!>0?`${name} · ${position.unitTitle} · 第${position.unitWordOrder}词`:name+' · 位置待确认'
 return Number.isInteger(position.bookWordOrder)&&position.bookWordOrder!>0?`${name} · 全书第${position.bookWordOrder}词`:name+' · 位置待确认'
}
