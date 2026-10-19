import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spiritStoneDisplay} from '../src/services/ui/SpiritStoneDisplay'

test('灵石展示保留零余额与真实整数，紧凑数字仍保留完整读屏值',()=>{
 for(const value of [0,1,13,999,9999,12800,999999,1e8,1e12,Number.MAX_SAFE_INTEGER]){
  const result=spiritStoneDisplay(value)
  assert.equal(result.state,'ready');assert.equal(result.full,String(value));assert.ok(result.label.includes(String(value)))
 }
 assert.equal(spiritStoneDisplay(0).short,'0');assert.equal(spiritStoneDisplay(12800).short,'1.28万');assert.equal(spiritStoneDisplay(1e8).short,'1亿')
})
test('缺失、负数、非整数及不安全数字不冒充零余额',()=>{
 for(const value of [undefined,null,'13',-1,1.2,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
  const result=spiritStoneDisplay(value);assert.equal(result.state,'unavailable');assert.equal(result.short,'—');assert.notEqual(result.full,'0')
 }
 assert.equal(spiritStoneDisplay(13,true).state,'unavailable')
})
test('加载状态独立于零余额和读取失败，不创建可变账户状态',()=>{
 assert.equal(spiritStoneDisplay(0,false,true).state,'loading');assert.equal(spiritStoneDisplay(undefined,true,true).short,'…')
 assert.equal(spiritStoneDisplay(0).state,'ready');assert.equal(spiritStoneDisplay(0).short,'0')
})
