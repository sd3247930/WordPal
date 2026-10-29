import type {LearningSession} from '../../../packages/core_learning'
export const DAILY_SESSION_LOCK_MESSAGE='完成本轮六环节后解锁切换'
/** A started checkpoint stays locked while the child temporarily visits another page. */
export function dailySessionLocked(plan:LearningSession|null|undefined){return !!plan?.flow?.begunAt&&!plan.completedAt}
