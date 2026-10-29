import {useLearningStore} from '../../stores/learning'

type NavigationMethod='navigateTo'|'redirectTo'|'reLaunch'|'switchTab'|'navigateBack'
type NavigationRequest={url?:string;delta?:number;[key:string]:unknown}
interface GuardDependencies{
 route:()=>string;lockedSession:()=>string;flush:()=>boolean
 confirm:(done:(confirmed:boolean)=>void)=>void
 replay:(method:NavigationMethod,options:NavigationRequest)=>void
}
/** Synchronous cancellation works in both the H5 and native interceptor queues. */
export function createDailyStudyNavigation(deps:GuardDependencies){
 let pending=false,approved:{method:NavigationMethod;url?:string;delta?:number}|null=null
 function invoke(method:NavigationMethod,options:NavigationRequest={}){
  if(approved?.method===method&&approved.url===options.url&&approved.delta===options.delta){approved=null;return}
  if(deps.route()!=='pages/learn/index'||method!=='navigateBack'&&options.url?.split('?')[0]==='/pages/learn/index')return
  const token=deps.lockedSession()
  if(!token)return
  if(pending)return false
  pending=true
  deps.confirm(confirmed=>{
   pending=false
   if(!confirmed||deps.route()!=='pages/learn/index')return
   const current=deps.lockedSession()
   if(current&&current!==token||!deps.flush())return
   approved={method,url:options.url,delta:options.delta}
   try{deps.replay(method,options)}finally{approved=null}
  })
  return false
 }
 function back(){if(deps.route()!=='pages/learn/index'||!deps.lockedSession())return false;invoke('redirectTo',{url:'/pages/home/index'});return true}
 return {invoke,back}
}

let guard:ReturnType<typeof createDailyStudyNavigation>|undefined
export function installDailyStudyNavigation(){
 guard=createDailyStudyNavigation({
  route:()=>{const pages=getCurrentPages();return pages[pages.length-1]?.route||''},
  lockedSession:()=>{const learning=useLearningStore();return learning.isSessionLocked?learning.todayPlan?.id||'':''},
  flush:()=>useLearningStore().flushDraft(),
  confirm:done=>uni.showModal({title:'本轮学习还未完成',content:'当前学习还未完成，确定要暂时离开吗？本轮进度会保存，回来后继续六环节。',confirmText:'保存并离开',cancelText:'继续学习',success:result=>done(!!result.confirm),fail:()=>done(false)}),
  replay:(method,options)=>(uni[method] as (options:NavigationRequest)=>unknown)(options)
 })
 for(const method of ['navigateTo','redirectTo','reLaunch','switchTab','navigateBack'] as const)uni.addInterceptor(method,{invoke:options=>guard?.invoke(method,options)})
}
export function handleDailyStudyBack(){return guard?.back()||false}
