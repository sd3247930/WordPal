import type {CoursePack} from '../../../packages/content_schema/course'

/** Why a course switch was refused. Every reason has a user-facing sentence. */
export type CourseSelectionFailure='not-registered'|'archived'|'db-version-mismatch'|'db-readonly'|'unknown'

export interface CourseSelectionResult {
  ok: boolean
  reason?: CourseSelectionFailure
  message?: string
  /** True when the switch was stored and will apply after the running round finishes. */
  queued?: boolean
}

export const COURSE_SELECTION_MESSAGE: Record<CourseSelectionFailure,string> = {
  'not-registered':'未找到该课程，请确认课程是否已安装。',
  'archived':'该课程已归档，先恢复后再选择。',
  'db-version-mismatch':'档案升级中，暂无法切换教材。',
  'db-readonly':'档案处于只读状态，请先完成升级或导出故障快照。',
  unknown:'课程切换失败，请稍后重试。'
}

export const COURSE_REVIEW_NOTE='此册词表来自社区索引，版次尚未与正式教材核对，仅供自编学习使用。'

/**
 * A course needs a "待核对" badge unless every source is cleared for
 * redistribution and its edition metadata is real (not an unverified placeholder).
 */
export function courseNeedsReview(pack?:CoursePack|null):boolean {
  if(!pack)return false
  const editionText=[pack.publisher,pack.edition,pack.title].filter(Boolean).join(' ')
  return pack.sources.some(source=>source.rightsStatus!=='redistribution-approved')||/待核对/.test(editionText)
}

export interface CourseSummary {words:number;units:number;lessons:number;levels:string;needsReview:boolean}

export function courseSummary(pack?:CoursePack|null):CourseSummary {
  return {
    words:pack?.vocabulary.length||0,
    units:pack?.units.length||0,
    lessons:pack?pack.units.reduce((total,unit)=>total+unit.lessons.length,0):0,
    levels:pack?.abilityLevels.join(' / ')||'',
    needsReview:courseNeedsReview(pack)
  }
}

/** One-line textbook label, e.g. "人教版社区索引（教材系列待核对）· 社区 edition 1（年份待核对）". */
export function courseEditionLabel(pack?:CoursePack|null):string {
  if(!pack)return ''
  if(pack.route!=='textbook'){
    const levels=pack.abilityLevels.join('/')
    return levels?pack.title+' · '+levels:pack.title
  }
  const parts=[pack.publisher,pack.edition||(pack.editionYear?String(pack.editionYear)+' 年版':'')].filter(Boolean)
  return parts.join(' · ')
}

/** Shared gallery grouping includes the entry grade, not just the publisher. */
export const courseSeriesKey=(pack:CoursePack)=>[pack.publisher,pack.edition||pack.editionYear,pack.startGrade||'unknown'].join('|')
export const courseSeriesLabel=(pack:CoursePack)=>pack.courseId.startsWith('fltrp-3start-')?'外研版三起点':(pack.edition||pack.publisher||pack.title)+(pack.startGrade?' · '+pack.startGrade+' 年级起点':'')
export function courseReviewNote(pack?:CoursePack|null):string {return pack?.sources.some(source=>source.type==='user-provided'&&source.rightsStatus==='pending-review')?'此册来自用户提供的词表照片，仅收录可辨文字。册次、版次及完整性尚未与正式教材核对，仅供本机学习，请家长确认使用。':COURSE_REVIEW_NOTE}
