import type {ActivityKind} from '../stores/activities'

const root='/static/icons/study-compact/'
export const compactStudyIcons={cover:root+'current-cover.png',words:root+'word-count.png',units:root+'unit-count.png',level:root+'level.png',complete:root+'complete-book.png',correct:root+'correct.png',saved:root+'saved.png',revisit:root+'revisit.png',practice:root+'practice.png'}
/** Stable activity IDs also name the approved, metadata-free offline artwork. */
export const activityMenuIcons:Record<ActivityKind,{src:string;locked?:string}>=Object.fromEntries(
 ['check','pair','letters','sentence','cloze','story','picture','listen-picture','phonics','challenge','speed'].map(id=>[id,{src:root+id+'.png',...(['sentence','cloze','story','phonics'].includes(id)?{locked:root+id+'-locked.png'}:{})}])
) as Record<ActivityKind,{src:string;locked?:string}>
