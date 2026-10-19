import {starterPack} from '../../../packages/content_schema/registry'
import type {CoursePack} from '../../../packages/content_schema/course'
/** Original WordPal vocabulary, never photographed textbook content. Explicit test opt-in only. */
export const syntheticTextbooks:CoursePack[]=/* @__PURE__ */ ['g3a','g3b','g4a','g4b','g5a','g5b'].map((key,index)=>{
 const grade=Number(key[1]),semester=key.endsWith('a')?'上册':'下册',words=starterPack.vocabulary.slice(0,10).map(w=>({...w,sourceId:'synthetic-textbook'}))
 return {schemaVersion:2,courseId:'fltrp-3start-'+key,contentVersion:'synthetic-1',title:'合成系列 '+grade+'年级'+semester+'（待核对）',route:'textbook',publisher:'合成测试出版社',edition:'三年级起点 · 合成示例',editionYear:null,startGrade:3,grade,semester,abilityLevels:['L'+[1,2,3,4,4,5][index]],sources:[{id:'synthetic-textbook',type:'user-provided',rightsStatus:'pending-review',attribution:'WordPal 原创单词构造的公开合成测试教材；不包含用户照片词表',revision:'synthetic-1',textLicense:'WordPal 原创教学示例，仅作为合成测试'}],vocabulary:words,units:[{id:'unit-1',order:1,title:'合成 Unit 1',lessons:[{id:'unit-1-lesson-1',title:'合成第 1 课',wordIds:words.map(w=>w.id),activities:['flash','connect','listen','spell','dictation']}]}],assets:[]}
})
