import {elements,type Element} from '../../../packages/pet_engine'
import type {FurnitureDefinition,FurnitureKind,HouseLevel,SlotId} from './types'
import {houseIdentity,houseLevelBrief} from './HouseIdentity'

export const houseCatalogVersion=1 as const
export const housePrices=[0,300,800,1500,2500,4000] as const
export const houseLevelNames=Object.fromEntries(elements.map(e=>[e,houseIdentity[e].levels])) as Record<Element,readonly string[]>
export const houseLevelNotes=houseLevelBrief
export const elementHouseNames=Object.fromEntries(elements.map(e=>[e,houseIdentity[e].title])) as Record<Element,string>
export const slotDefinitions:Record<SlotId,{name:string;level:HouseLevel;kinds:FurnitureKind[];x:number;y:number;w:number;h:number;z:number}>={
 left:{name:'左侧休息区',level:1,kinds:['bed'],x:1,y:50,w:35,h:41,z:3},
 right:{name:'右侧书架区',level:1,kinds:['shelf'],x:72,y:35,w:27,h:50,z:2},
 center:{name:'中央地毯',level:1,kinds:['rug'],x:25,y:70,w:53,h:25,z:1},
 wall:{name:'窗边墙面',level:2,kinds:['window','chime'],x:36,y:4,w:31,h:43,z:1},
 light:{name:'床边灯位',level:1,kinds:['lamp'],x:2,y:40,w:17,h:25,z:4},
 plant:{name:'绿植角落',level:2,kinds:['plant'],x:83,y:72,w:16,h:24,z:4},
 garden:{name:'小花园',level:3,kinds:['garden'],x:74,y:67,w:25,h:30,z:4},
 activity:{name:'活动桌位',level:3,kinds:['table'],x:42,y:73,w:26,h:25,z:6},
 extra:{name:'楼上小角落',level:4,kinds:['plant','lamp','chime'],x:71,y:17,w:18,h:25,z:2},
 balcony:{name:'露台装饰位',level:5,kinds:['plant','chime'],x:8,y:10,w:19,h:27,z:2}
}
const themedNames:Record<Element,string[]>={water:['贝壳小床','珊瑚书架','水纹地毯','珍珠台灯'],fire:['桃光小床','暖星书架','暖阳地毯','柔焰台灯'],earth:['叶芽小床','森芽书架','叶子地毯','花苞台灯'],wind:['云朵吊床','云翼书架','薄荷地毯','风铃台灯']}
const kinds=['bed','shelf','rug','lamp'] as const
const responses={bed:'这里软软的，休息一下真舒服。',shelf:'一本书，就是一个小小的新世界。',rug:'这块软垫真适合一起玩。',lamp:'一点暖光，照亮我们的小家。',window:'窗外还有好多故事等着我们。',plant:'和小叶子一起，慢慢长大。',garden:'这里开了一朵属于我们的小花。',table:'把喜欢的小东西摆在这里吧。',chime:'听，微风给我们带来了问候。'}
const themed=elements.flatMap(element=>kinds.map((kind,i):FurnitureDefinition=>({id:element+'-'+kind,name:themedNames[element][i],element,kind,category:kind==='bed'?'rest':kind==='shelf'?'function':'decor',price:[80,120,50,60][i],level:kind==='shelf'?2:1,asset:element+'-'+kind,response:responses[kind]})))
const shared:FurnitureDefinition[]=[
 {id:'common-plant',name:'薄荷绿植',kind:'plant',category:'decor',price:50,level:2,asset:'common-plant',element:'all',response:responses.plant},
 {id:'common-garden',name:'星光花园',kind:'garden',category:'activity',price:150,level:3,asset:'common-garden',element:'all',response:responses.garden},
 {id:'common-table',name:'奶油茶桌',kind:'table',category:'function',price:100,level:3,asset:'common-table',element:'all',response:responses.table},
 {id:'common-chime',name:'云朵风铃',kind:'chime',category:'decor',price:80,level:2,asset:'common-chime',element:'all',response:responses.chime},
 {id:'starter-bed',name:'奶油基础床',kind:'bed',category:'rest',price:0,level:1,asset:'starter-bed',element:'all',gift:true,response:responses.bed},
 {id:'starter-shelf',name:'奶油基础书架',kind:'shelf',category:'function',price:0,level:2,asset:'starter-shelf',element:'all',gift:true,response:responses.shelf},
 {id:'starter-window',name:'天空拱窗',kind:'window',category:'decor',price:0,level:2,asset:'starter-window',element:'all',gift:true,response:responses.window}
]
export const furnitureRegistry:Record<string,FurnitureDefinition>=Object.fromEntries([...themed,...shared].map(item=>[item.id,item]))
export const catalogForElement=(element:Element)=>[...themed.filter(item=>item.element===element),...shared.filter(item=>!item.gift)]
export const compatibleSlots=(item:FurnitureDefinition,level:number)=>(Object.keys(slotDefinitions) as SlotId[]).filter(id=>slotDefinitions[id].level<=level&&item.level<=level&&slotDefinitions[id].kinds.includes(item.kind))
export const furnitureAsset=(id:string,size:'icon'|'stage'='icon')=>furnitureRegistry[id]?`/static/pet-house/lifehouse/furniture/${furnitureRegistry[id].asset}-${size==='icon'?256:512}.png`:''
export const roomAsset=(level:number)=>`/static/pet-house/lifehouse/rooms/room-${Math.min(5,Math.max(0,Math.floor(level)))}.jpg`
export const themeAsset=(element:Element)=>`/static/pet-house/lifehouse/decor/${element}-motif.png`
