import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {wpButtonBlocked,wpButtonBusy} from '../src/services/ui/WPButtonState'

const buttonSource=readFileSync('src/components/wp-button/WPButton.vue','utf8')

test('WPButton：disabled 是阻断的唯一真源，loading 默认不再隐式禁用',()=>{
 assert.equal(wpButtonBlocked({}),false)
 assert.equal(wpButtonBlocked({disabled:false,loading:false}),false)
 // 可打断的进行中状态仍然可以点击（app-plus 下安装按钮曾被这条语义误伤）。
 assert.equal(wpButtonBlocked({loading:true,interruptible:true}),false)
 assert.equal(wpButtonBlocked({loading:true}),true)
 assert.equal(wpButtonBlocked({disabled:true}),true)
 assert.equal(wpButtonBlocked({disabled:true,loading:true,interruptible:true}),true)
})

test('WPButton：aria-busy 只反映进行中状态，结束后恢复未设置',()=>{
 assert.equal(wpButtonBusy({}),undefined)
 assert.equal(wpButtonBusy({loading:false,playing:false}),undefined)
 assert.equal(wpButtonBusy({loading:true}),true)
 assert.equal(wpButtonBusy({playing:true}),true)
 // 正在加载但可点击：仍然是 busy，只是不禁用。
 assert.equal(wpButtonBusy({loading:true,interruptible:true}),true)
 assert.equal(wpButtonBlocked({loading:true,interruptible:true}),false)
})

test('WPButton 组件接入统一判定，内联表达式不再重复实现阻断规则',()=>{
 assert.ok(buttonSource.includes("import {wpButtonBlocked,wpButtonBusy} from '../../services/ui/WPButtonState'"))
 assert.ok(buttonSource.includes('const blocked=computed(()=>wpButtonBlocked(props)),busy=computed(()=>wpButtonBusy(props))'))
 assert.ok(buttonSource.includes(':disabled="blocked"'))
 assert.ok(buttonSource.includes(':aria-busy="busy||undefined"'))
 // 旧写法会把 loading 直接接进可访问性状态，正是这次要拦住的分叉。
 assert.ok(!buttonSource.includes(':aria-busy="loading||playing||undefined"'))
 assert.ok(!buttonSource.includes('props.disabled||props.loading'))
})
