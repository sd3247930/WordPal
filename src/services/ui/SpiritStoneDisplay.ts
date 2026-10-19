/** Read-only presentation; the profile remains the only balance source. */
export function spiritStoneDisplay(balance:unknown,unavailable=false,loading=false){
 if(loading)return {state:'loading' as const,full:'正在读取',short:'…',label:'正在读取灵石，查看灵石说明'}
 if(unavailable||typeof balance!=='number'||!Number.isSafeInteger(balance)||balance<0)return {state:'unavailable' as const,full:'暂时无法读取',short:'—',label:'灵石暂时无法读取，查看灵石说明'}
 let short=String(balance)
 for(const [unit,value] of [['万亿',1e12],['亿',1e8],['万',1e4]] as const)if(balance>=value){short=(Math.floor(balance/value*100)/100).toFixed(2).replace(/\.?0+$/,'')+unit;break}
 return {state:'ready' as const,full:String(balance),short,label:`灵石余额 ${balance}，查看灵石说明`}
}
