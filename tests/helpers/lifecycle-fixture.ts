import type {CoursePack} from '../../packages/content_schema/course'
export function lifecyclePack(id:string,exclusive=id+'-word'):CoursePack{return {
 schemaVersion:2,courseId:id,contentVersion:'1.0.0',title:'合成生命周期 '+id,route:'theme',abilityLevels:['L1','L2','L3','L4','L5'],assets:[],
 sources:[{id:'lifecycle-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'原创测试夹具',revision:'r1'}],
 vocabulary:[{id:'lifecycle-shared',language:'en',lemma:'shared',meaning:'共享',pos:'adj.',sourceId:'lifecycle-source'},{id:exclusive,language:'en',lemma:exclusive.replace(/-/g,''),meaning:'独有词 '+exclusive,pos:'n.',sourceId:'lifecycle-source'}],
 units:[{id:'unit-one',title:'合成单元',lessons:[{id:'lesson-one',title:'合成课节',wordIds:['lifecycle-shared',exclusive]}]}]
}}
