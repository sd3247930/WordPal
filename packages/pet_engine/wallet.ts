/** Offline wallet amounts are exact nonnegative safe integers. Never clamp corrupt data. */
export const validMoney=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0
export function changeBalance(balance:number,delta:number){
 if(!validMoney(balance)||!Number.isSafeInteger(delta))throw new RangeError('invalid-wallet-amount')
 const result=balance+delta
 if(!validMoney(result))throw new RangeError('wallet-overflow-or-insufficient')
 return result
}
