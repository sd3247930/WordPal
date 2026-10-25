export const courseToolsArtwork={heading:'01教材与数据工具.png',courses:'02课程管理.png',starter:'03原创启蒙课程.png',grade5:'04外研版三起点 五年级上册.png',grade4:'05外研版三起点 四年级下册.png',cleanup:'06学习数据清理.png'} as const
export type CourseToolsArtworkName=keyof typeof courseToolsArtwork
export const courseToolsArtworkSrc=(name:CourseToolsArtworkName)=>'/static/icons/course-tools/'+name+'.png'
/** Stable by course identity, independent of list order, version and installed count. */
export function courseCoverSrc(courseId:string){
 if(courseId==='starter')return courseToolsArtworkSrc('starter')
 if(/^fltrp-3start-g5a(?:-|$)/.test(courseId))return courseToolsArtworkSrc('grade5')
 if(/^fltrp-3start-g4b(?:-|$)/.test(courseId))return courseToolsArtworkSrc('grade4')
 let hash=2166136261;for(const char of courseId){hash^=char.codePointAt(0)!;hash=Math.imul(hash,16777619)}
 return '/static/icons/course-covers/course-icon-'+String((hash>>>0)%50+1).padStart(2,'0')+'.png'
}
