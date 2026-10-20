import type {CoursePack} from '../../packages/content_schema/course'
export function customCourse(courseId='custom-fixture',count=113):CoursePack{
 const vocabulary=Array.from({length:count},(_,index)=>({id:`${courseId}-w${String(index+1).padStart(3,'0')}`,language:'en' as const,lemma:`term ${index+1}`,meaning:`合成词义 ${index+1}`,sourceId:'custom-fixture-source',audio:`/static/test-audio/custom-${index+1}.wav`,order:index+1}))
 return {schemaVersion:2,courseId,contentVersion:'1.0.0',title:'合成全书练习教材',route:'textbook',publisher:'合成测试',edition:'测试版',grade:5,semester:'上册',abilityLevels:['L1','L2','L3','L4','L5'],sources:[{id:'custom-fixture-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'合成测试词条'}],assets:[],vocabulary,
  units:Array.from({length:Math.ceil(count/10)},(_,index)=>({id:`${courseId}-u${index+1}`,title:`Unit ${index+1}`,lessons:[{id:`${courseId}-l${index+1}`,title:`合成课 ${index+1}`,wordIds:vocabulary.slice(index*10,index*10+10).map(word=>word.id)}]})).reverse()}
}
