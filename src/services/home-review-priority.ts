export type HomeReviewPriority='due'|'weak'|'known'
export const homeReviewPriorities:readonly HomeReviewPriority[]=['due','weak','known']
export const homeReviewPriorityLabels:Record<HomeReviewPriority,string>={due:'到期复习',weak:'重点巩固',known:'已经认识'}
export const homeReviewPriorityNotes:Record<HomeReviewPriority,string>={
 due:'当前教材中已到复习时间的单词，按独立词条计数。',
 weak:'全局记忆记录中需要多练的单词，沿用系统困难词判定；包含已星标的困难词。',
 known:'全局已有记忆卡的单词，跨教材去重；不代表熟练掌握。'
}
/** Keep the source order and identity policy; this view never writes learning evidence. */
export function priorityItems<T extends {word:{id:string}}>(items:readonly T[],ids:readonly string[]):T[]{
 const wanted=new Set(ids),seen=new Set<string>()
 return items.filter(item=>{const id=item.word.id;if(!wanted.has(id)||seen.has(id))return false;seen.add(id);return true})
}
