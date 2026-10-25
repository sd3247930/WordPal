export const parentSettingsArtwork={
 heading:'01_主题插图_WordPal萌芽书本.png',stats:'02_最近7天_彩色统计柱.png',days:'03_学习天数_日历.png',tasks:'05_今日任务_黄色星星.png',settings:'06_家长设置_立体齿轮.png',
 level1:'07_L1_萌芽学习书本.png',level2:'08_L2_积木与盾牌书本.png',level3:'09_L3_成长柱状书本.png',level4:'10_L4_飞镖目标.png',level5:'11_L5_登顶台阶.png',
 current:'12_当前等级_彩色翻开书本.png',method:'13_学习方式_三本叠放书.png',guard:'14_家长验证_绿色盾牌.png',courses:'15_教材管理_彩色叠放书本.png',cover:'16_教材封面_WordPal蓝色书本.png',danger:'18_卸载教材_垃圾桶.png',manage:'19_管理教材_黄色文件夹.png',transfer:'20_导入与备份_蓝色上传云.png',import:'21_导入JSON与ZIP_上传文件夹.png',csv:'22_导出CSV.png',backup:'23_立即备份.png',help:'24_帮助说明_金色灯泡.png',levels:'25_学习分级说明_翻开书.png',privacy:'26_数据隐私_绿色盾牌.png'
} as const
export type ParentSettingsArtworkName=keyof typeof parentSettingsArtwork
export const parentSettingsArtworkSrc=(name:ParentSettingsArtworkName)=>'/static/icons/parent-settings/'+name+'.png'
