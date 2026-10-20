import type {CoursePack,CourseUnit} from './course'

/** Explicit positions take precedence; otherwise preserve the source's stable array order. */
export function orderedUnits(pack:CoursePack):CourseUnit[]{
 const position=(unit:CourseUnit,index:number)=>Number.isFinite(unit.order)&&unit.order!>0?unit.order!:Number((unit.title+' '+unit.id).match(/(?:unit|module|u)[\s-]*0*(\d+)/i)?.[1]||index+1)
 return pack.units.map((unit,index)=>({unit,index})).sort((a,b)=>position(a.unit,a.index)-position(b.unit,b.index)||a.index-b.index).map(item=>item.unit)
}
export function orderedWordIds(pack:CoursePack,ids:readonly string[]):string[]{
 const entries=new Map(pack.vocabulary.map(word=>[word.id,word])),unique=[...new Set(ids)]
 const orders=unique.map(id=>entries.get(id)?.order)
 // Missing or repeated numbers cannot override a trustworthy imported lesson/vocabulary sequence.
 if(orders.some(order=>!Number.isFinite(order)||order!<1)||new Set(orders).size!==orders.length)return unique
 return unique.map((id,index)=>({id,index})).sort((a,b)=>entries.get(a.id)!.order!-entries.get(b.id)!.order!||a.index-b.index).map(item=>item.id)
}
