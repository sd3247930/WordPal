import {distance,type ScenePoint} from './SceneGeometry'
export type SceneMotion='idle'|'move'|'jump'|'float'|'hide_reveal'
export type SceneFx='none'|'sparkle'|'ripple'|'book_shift'|'cushion_squish'|'wind_chime'|'leaf_sway'|'bubble'|'glow'|'object_sort'|'doodle_trace'|'light_chase'|'watering'|'harvest'
export type SceneActionPhase='ready'|'playing'|'responding'|'cooldown'|'interrupted'
export interface SceneActionState {phase:SceneActionPhase;position:ScenePoint;motion:SceneMotion;fx:SceneFx;targetId:string|null;message:string;duration:number;generation:number;pose?:'sit'|'sleep'}
export interface SceneActionSpec {id:string;motion:SceneMotion;fx:SceneFx;message:string;targetId:string;responsePath?:readonly ScenePoint[];returnToStart?:boolean;pose?:'sit'|'sleep';responseAnchor?:ScenePoint}
export interface SceneClock {set:(callback:()=>void,ms:number)=>unknown;clear:(handle:unknown)=>void}
const realClock:SceneClock={set:(callback,ms)=>setTimeout(callback,ms),clear:handle=>clearTimeout(handle as ReturnType<typeof setTimeout>)}
/** Owns every wait, including cancellation resolution; stale completions never update a new scene. */
export class SceneActionController{
 private version=0;private disposed=false;private pending=new Map<unknown,(valid:boolean)=>void>();private current:SceneActionState
 constructor(start:ScenePoint,private publish:(state:SceneActionState)=>void,private clock:SceneClock=realClock){this.current={phase:'ready',position:{...start},motion:'idle',fx:'none',targetId:null,message:'',duration:0,generation:0}}
 get state(){return this.current}
 private update(patch:Partial<SceneActionState>){this.current={...this.current,...patch,generation:this.version};if(!this.disposed)this.publish(this.current)}
 private wait(ms:number){return new Promise<boolean>(resolve=>{const handle=this.clock.set(()=>{this.pending.delete(handle);resolve(true)},ms);this.pending.set(handle,resolve)})}
 cancel(reason=''){
  this.version++;for(const[handle,resolve]of this.pending){this.clock.clear(handle);resolve(false)}this.pending.clear()
  this.update({phase:'interrupted',motion:'idle',fx:'none',pose:undefined,targetId:null,duration:0,message:reason});this.update({phase:'ready'})
 }
 reset(position:ScenePoint){this.cancel();this.update({position:{...position},message:''})}
 dispose(){this.cancel();this.disposed=true}
 async run(spec:SceneActionSpec,path:readonly ScenePoint[],reduced=false):Promise<boolean>{
  if(this.disposed||this.current.phase!=='ready'||path.length<1||[...path,...(spec.responsePath??[])].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false
  for(const [handle,resolve]of this.pending){this.clock.clear(handle);resolve(false)}this.pending.clear()
  const generation=++this.version,valid=()=>!this.disposed&&generation===this.version
  this.update({phase:'playing',pose:undefined,targetId:spec.targetId,fx:spec.fx==='light_chase'?spec.fx:'none',message:'',motion:reduced?'idle':'move'})
  if(!reduced)for(const p of path.slice(1)){
   const duration=Math.max(120,Math.min(650,distance(this.current.position,p)*1600));this.update({position:{...p},duration})
   if(!await this.wait(duration)||!valid())return false
  }
  if(!valid())return false
  if(!reduced)for(const p of spec.responsePath??[]){this.update({phase:'playing',position:{...p},motion:'move',duration:500,fx:spec.fx});if(!await this.wait(500)||!valid())return false}
  this.update({phase:'responding',pose:spec.pose,position:{...(spec.responseAnchor??(spec.responsePath?.length?spec.responsePath[spec.responsePath.length-1]:path[path.length-1]))},duration:0,motion:spec.pose||reduced?'idle':spec.motion,fx:spec.fx,message:spec.message})
  if(!await this.wait(reduced?300:spec.pose?2200:1100)||!valid())return false
  // Peek actions leave the occluder again; they never strand the actor behind it.
  if((spec.motion==='hide_reveal'||spec.returnToStart)&&!reduced)for(const p of path.slice(0,-1).reverse()){
   const duration=Math.max(120,Math.min(650,distance(this.current.position,p)*1600));this.update({phase:'playing',pose:undefined,position:{...p},motion:'move',fx:'none',duration})
   if(!await this.wait(duration)||!valid())return false
  }
  this.update({phase:'cooldown',pose:undefined,motion:'idle',fx:'none',duration:0,...(spec.motion==='hide_reveal'||spec.returnToStart?{position:{...path[0]}}:{})})
  if(!await this.wait(200)||!valid())return false
  this.update({phase:'ready',targetId:null})
  void this.wait(3000).then(active=>{if(active&&valid()&&this.current.phase==='ready')this.update({message:''})})
  return true
 }
}
