import {onUnmounted,ref,watch,type WatchSource} from 'vue'
import {onHide} from '@dcloudio/uni-app'
/** UI guard only; correctness and submit idempotency remain in learning services. */
export function useChoiceGuard(question:WatchSource<string>){
 const locked=ref(false);let timer:ReturnType<typeof setTimeout>|undefined
 function reset(){clearTimeout(timer);locked.value=false}
 function choose(action:()=>void){if(locked.value)return;locked.value=true;action();timer=setTimeout(reset,300)}
 watch(question,reset);onHide(reset);onUnmounted(reset)
 return {locked,choose}
}
