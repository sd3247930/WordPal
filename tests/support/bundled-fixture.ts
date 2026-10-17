import {configureLocalCourses,loadCourseRegistry} from '../../src/services/content/ContentRegistry'
import type {CoursePack} from '../../packages/content_schema/course'

/** 测试用「随应用提供」课程：替代已裁剪的原内置教材，词量与 ID 可控。 */
export function bundledFixture(courseId='test-bundled',count=48):CoursePack{
 const vocabulary=Array.from({length:count},(_,index)=>({id:`${courseId}-w${String(index+1).padStart(2,'0')}`,language:'en' as const,lemma:`${courseId}word${index+1}`,meaning:`测试词${index+1}`,pos:'n.',sourceId:'test-bundled-source',order:index+1,learningLevel:1}))
 return {schemaVersion:2,courseId,contentVersion:'1.0.0',title:'测试随包课程',route:'theme',abilityLevels:['L1','L2'],
  sources:[{id:'test-bundled-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'测试夹具',revision:'test-bundled-1',textLicense:'测试夹具'}],
  vocabulary,units:[{id:'tu01',title:'测试单元',lessons:[{id:'tl01',title:'测试课节',wordIds:vocabulary.map(word=>word.id),activities:['flash','connect','listen','spell']}]}],assets:[]}
}

/** 注册为「随包提供」课程：与本地课程同一条路径，安装/卸载守卫与生产一致。 */
export function useBundledFixture(courseId='test-bundled',count=48){
 const pack=bundledFixture(courseId,count)
 configureLocalCourses([pack])
 loadCourseRegistry()
 return pack
}
