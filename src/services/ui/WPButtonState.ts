export interface WPButtonFlags{disabled?:boolean;loading?:boolean;interruptible?:boolean;playing?:boolean}

/**
 * 交互阻断的唯一真源是 `disabled`。`loading` 只在动作不可打断时阻断点击，
 * 因此可以「正在加载但仍可点」的按钮不会被隐式禁用。
 */
export function wpButtonBlocked(flags:WPButtonFlags):boolean{
 return !!flags.disabled||(!!flags.loading&&!flags.interruptible)
}

/** `aria-busy` 只描述进行中状态，不参与禁用判断。 */
export function wpButtonBusy(flags:WPButtonFlags):boolean|undefined{
 return flags.loading||flags.playing||undefined
}
