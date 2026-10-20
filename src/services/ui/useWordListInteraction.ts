import {onMounted,onUnmounted,nextTick} from 'vue'
import {onPageScroll} from '@dcloudio/uni-app'
import {ListTapGuard} from './ListInteraction'

export function useWordListInteraction(){
 const guard=new ListTapGuard();let scrollTop=0,savedTop=0,alive=true
 onPageScroll(event=>{scrollTop=event.scrollTop;guard.scroll()})
 // #ifdef H5
 const observeScroll=()=>{scrollTop=window.scrollY;guard.scroll()}
 onMounted(()=>{scrollTop=window.scrollY;window.addEventListener('scroll',observeScroll,{capture:true,passive:true})})
 onUnmounted(()=>window.removeEventListener('scroll',observeScroll,true))
 // #endif
 onUnmounted(()=>{alive=false})
 function remember(){savedTop=scrollTop}
 async function restore(){await nextTick();if(alive)uni.pageScrollTo({scrollTop:savedTop,duration:0})}
 async function first(selector:string,topInset:number,isCurrent:()=>boolean){
  await nextTick();if(!alive||!isCurrent())return
  const query=uni.createSelectorQuery();query.select(selector).boundingClientRect();query.selectViewport().scrollOffset(()=>{})
  query.exec(result=>{const row=result[0] as {top:number}|null,viewport=result[1] as {scrollTop:number}|null;if(alive&&isCurrent()&&row&&viewport)uni.pageScrollTo({scrollTop:Math.max(0,viewport.scrollTop+row.top-topInset-12),duration:0})})
 }
 return {guard,remember,restore,first}
}
