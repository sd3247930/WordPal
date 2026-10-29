export interface ScenePoint { x:number; y:number }
export interface SceneRect { x:number; y:number; width:number; height:number }
export type ScenePolygon=readonly ScenePoint[]
export interface SceneViewport extends SceneRect { scale:number }
export const finitePoint=(p:ScenePoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y)
export const distance=(a:ScenePoint,b:ScenePoint)=>Math.hypot(a.x-b.x,a.y-b.y)
export function pointInPolygon(p:ScenePoint,polygon:ScenePolygon):boolean{
 if(!finitePoint(p)||polygon.length<3)return false
 let inside=false
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j],cross=(p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x)
  if(Math.abs(cross)<1e-8&&p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&p.y>=Math.min(a.y,b.y)-1e-8&&p.y<=Math.max(a.y,b.y)+1e-8)return true
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside
 }
 return inside
}
export const rectanglePolygon=(r:SceneRect):ScenePolygon=>[{x:r.x,y:r.y},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height},{x:r.x,y:r.y+r.height}]
export function polygonArea(p:ScenePolygon){return Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a.x*b.y-b.x*a.y},0))/2}
export function sceneViewport(width:number,height:number,aspect=1.5):SceneViewport|undefined{
 if(![width,height,aspect].every(v=>Number.isFinite(v)&&v>0))return
 const w=Math.min(width,height*aspect),h=w/aspect
 return{x:(width-w)/2,y:(height-h)/2,width:w,height:h,scale:w}
}
export function scenePointer(p:ScenePoint,viewport:SceneRect):ScenePoint|undefined{
 if(!finitePoint(p)||!(viewport.width>0&&viewport.height>0))return
 const target={x:(p.x-viewport.x)/viewport.width,y:(p.y-viewport.y)/viewport.height}
 return target.x>=0&&target.x<=1&&target.y>=0&&target.y<=1?target:undefined
}
export function walkablePoint(p:ScenePoint,areas:readonly ScenePolygon[],obstacles:readonly ScenePolygon[]=[]){return finitePoint(p)&&areas.some(a=>pointInPolygon(p,a))&&!obstacles.some(a=>pointInPolygon(p,a))}
export function clearSceneSegment(a:ScenePoint,b:ScenePoint,areas:readonly ScenePolygon[],obstacles:readonly ScenePolygon[]=[]){
 const steps=Math.max(2,Math.ceil(distance(a,b)/.0125))
 for(let i=0;i<=steps;i++)if(!walkablePoint({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},areas,obstacles))return false
 return true
}
/** Bounded grid search plus line-of-sight smoothing; drawing and hit testing share normalized coordinates. */
export function scenePath(start:ScenePoint,target:ScenePoint,areas:readonly ScenePolygon[],obstacles:readonly ScenePolygon[]=[]):ScenePoint[]|undefined{
 if(!walkablePoint(start,areas,obstacles)||!walkablePoint(target,areas,obstacles))return
 if(clearSceneSegment(start,target,areas,obstacles))return[start,target]
 const n=40,key=(x:number,y:number)=>y*(n+1)+x,point=(k:number)=>({x:(k%(n+1))/n,y:Math.floor(k/(n+1))/n})
 const valid=new Map<number,boolean>(),allowed=(k:number)=>{if(!valid.has(k))valid.set(k,walkablePoint(point(k),areas,obstacles));return valid.get(k)!}
 const nearest=(p:ScenePoint)=>{let selected=-1,best=Infinity;for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const k=key(x,y),d=distance(p,point(k));if(d<best&&allowed(k)&&clearSceneSegment(p,point(k),areas,obstacles)){selected=k;best=d}}return selected}
 const first=nearest(start),last=nearest(target);if(first<0||last<0)return
 const open=new Set([first]),cost=new Map([[first,0]]),parent=new Map<number,number>(),closed=new Set<number>()
 while(open.size){
  let current=-1,best=Infinity
  for(const k of open){const f=cost.get(k)!+distance(point(k),point(last));if(f<best){best=f;current=k}}
  if(current===last){const nodes=[target,point(last)];let k=last;while(parent.has(k)){k=parent.get(k)!;nodes.push(point(k))}nodes.push(start);nodes.reverse();const smooth=[nodes[0]];let i=0;while(i<nodes.length-1){let j=nodes.length-1;while(j>i+1&&!clearSceneSegment(nodes[i],nodes[j],areas,obstacles))j--;smooth.push(nodes[j]);i=j}return smooth}
  open.delete(current);closed.add(current);const p=point(current),cx=Math.round(p.x*n),cy=Math.round(p.y*n)
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=cx+dx,y=cy+dy;if(x<0||y<0||x>n||y>n)continue
   const next=key(x,y);if(closed.has(next)||!allowed(next)||!clearSceneSegment(p,point(next),areas,obstacles))continue
   const g=cost.get(current)!+distance(p,point(next));if(g<(cost.get(next)??Infinity)){cost.set(next,g);parent.set(next,current);open.add(next)}
  }
 }
}
