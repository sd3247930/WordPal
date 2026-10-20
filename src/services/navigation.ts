export type PageId='home'|'learn'|'review'|'pet'|'achievements'|'parent'|'settings'|'course'
export const navigation=[{id:'home',name:'首页',subtitle:'Home',icon:'⌂'},{id:'learn',name:'学习',subtitle:'Study',icon:'▤'},{id:'review',name:'单词本',subtitle:'Wordbook',icon:'▥'},{id:'pet',name:'宠物屋',subtitle:'PetHouse',icon:'✧'},{id:'achievements',name:'成就',subtitle:'Achievements',icon:'⚑'},{id:'parent',name:'家长中心',subtitle:'Parents',icon:'◎'},{id:'settings',name:'设置',subtitle:'Settings',icon:'⚙'}] as const
export function navigate(id:PageId){const pages=getCurrentPages();const current=pages[pages.length-1]?.route;if(current!==`pages/${id}/index`)uni.redirectTo({url:`/pages/${id}/index`})}
/** Push the standalone textbook gallery so the platform back button returns to the caller. */
let requestedCourseId=''
export function openCourseGallery(courseId=''){requestedCourseId=courseId;uni.navigateTo({url:'/pages/course/index'})}
export function consumeGalleryCourseId(){const id=requestedCourseId;requestedCourseId='';return id}
export function closeCourseGallery(){uni.navigateBack({delta:1})}
/** Open the existing practice controls without replacing a session or its draft. */
let requestedStudyPractice=false
export function openStudyPractice(){requestedStudyPractice=true;navigate('learn')}
export function consumeStudyPractice(){const requested=requestedStudyPractice;requestedStudyPractice=false;return requested}
/** A transient browsing intent, following the existing practice/gallery entry pattern. */
import type {HomeReviewPriority} from './home-review-priority'
let requestedHomePriority:HomeReviewPriority|null=null
export function openHomePriority(kind:HomeReviewPriority){requestedHomePriority=kind;navigate('review')}
export function consumeHomePriority(){const requested=requestedHomePriority;requestedHomePriority=null;return requested}
