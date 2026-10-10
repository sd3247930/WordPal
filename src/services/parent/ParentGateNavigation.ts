import {useParentGateStore} from '../../stores/parent-gate'
/** Invalidate the visit before native navigation, including direct calls and back-stack operations. */
export function installParentGateNavigation(){
 for(const method of ['navigateTo','redirectTo','reLaunch','switchTab','navigateBack'] as const){
  uni.addInterceptor(method,{invoke(){useParentGateStore().leaveVisit()}})
 }
}
