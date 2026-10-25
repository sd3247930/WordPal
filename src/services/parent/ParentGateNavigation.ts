import {useParentGateStore} from '../../stores/parent-gate'
const backHandlers:(()=>boolean)[]=[],navigationBlockers=new Set<()=>boolean>()
/** A handled native back closes local UI without navigating away from the protected visit. */
export function registerParentBackHandler(handler:()=>boolean){backHandlers.push(handler);return ()=>{const index=backHandlers.indexOf(handler);if(index>=0)backHandlers.splice(index,1)}}
export function handleParentBack(){for(let i=backHandlers.length-1;i>=0;i--)if(backHandlers[i]())return true;return false}
/** Non-cancellable destructive work keeps its result visible until it settles. */
export function registerParentNavigationBlocker(blocked:()=>boolean){navigationBlockers.add(blocked);return ()=>{navigationBlockers.delete(blocked)}}
/** Invalidate the visit before native navigation, including direct calls and back-stack operations. */
export function installParentGateNavigation(){
 for(const method of ['navigateTo','redirectTo','reLaunch','switchTab','navigateBack'] as const){
  uni.addInterceptor(method,{invoke(options?:{from?:string}){const gate=useParentGateStore();if(gate.canAccess()){if([...navigationBlockers].some(blocked=>blocked()))return false;if(method==='navigateBack'&&options?.from==='backbutton'&&handleParentBack())return false}gate.leaveVisit()}})
 }
}
