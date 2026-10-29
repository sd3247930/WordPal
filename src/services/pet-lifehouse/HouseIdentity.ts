import type {Element} from '../../../packages/pet_engine'
import type {HouseLevel} from './types'

/** Display names only. Pet identity, element IDs and saved ownership stay stable. */
export const houseIdentity:Record<Element,{title:string;signs:string;traits:string;levels:readonly string[]}>={
 water:{title:'深蓝绮梦·水象守护居',signs:'巨蟹 · 天蝎 · 双鱼',traits:'情感 · 安全感 · 疗愈 · 想象',levels:['星沙摇篮','月贝听海居','泡泡知心角','珍珠温语庭','潮汐映月庭','星海幻梦堡']},
 earth:{title:'大地咏叹·土象丰饶居',signs:'金牛 · 处女 · 摩羯',traits:'稳定 · 秩序 · 触感 · 积累',levels:['初生芳草地','原木安眠所','落英向阳角','丰饶聚宝阁','层叠绿意廊','厚土万物园']},
 fire:{title:'炽焰颂歌·火象荣耀居',signs:'白羊 · 狮子 · 射手',traits:'热情 · 行动 · 冒险 · 被看见',levels:['无畏起航营','微光聚能窝','赤阳锻造坊','金芒颂歌厅','双曜凯旋台','永恒荣耀殿']},
 wind:{title:'云端拾光·风象自由居',signs:'双子 · 天秤 · 水瓶',traits:'好奇 · 交流 · 变化 · 创意',levels:['随风起舞坪','流风静听阁','云端阅想亭','浮光会客居','风动双子台','无界灵空城']}
}
export const houseLevelName=(element:Element,level:number)=>houseIdentity[element].levels[level]??houseIdentity[element].levels[0]
export const houseLevelBrief=['陪伴从这里开始','软软的休息角','窗边读一本书','一起布置生活','走过桥廊与花阶','庭院与露台都开放'] as const
export function houseLevelAdditions(level:HouseLevel):readonly string[]{return [
 ['安全落脚点'],['基础床赠礼','休息位置'],['书架和窗赠礼','绿植位置'],['花园开放','活动桌位'],['楼上角落','双区桥廊'],['庭院开放','露台装饰位']
 ][level]}
