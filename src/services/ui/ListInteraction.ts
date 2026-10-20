interface TouchEventLike {touches?:ArrayLike<{clientX?:number;clientY?:number}>;changedTouches?:ArrayLike<{clientX?:number;clientY?:number}>}
/** Observe gestures without consuming them. A drag, cancellation or tap during inertia is never an action. */
export class ListTapGuard {
 private origin={x:0,y:0};private startedAt=0;private moved=false;private active=false;private interrupted=false;private scrollAt=-Infinity;private blockedUntil=0
 constructor(private now=()=>Date.now()){}
 scroll(){this.scrollAt=this.now();if(this.active)this.moved=true}
 start(event:TouchEventLike){const touch=event.touches?.[0];this.origin={x:touch?.clientX||0,y:touch?.clientY||0};this.startedAt=this.now();this.moved=!touch||(event.touches?.length||0)!==1;this.interrupted=this.now()-this.scrollAt<220;this.active=true}
 move(event:TouchEventLike){const touch=event.touches?.[0]||event.changedTouches?.[0];if(touch&&Math.hypot((touch.clientX||0)-this.origin.x,(touch.clientY||0)-this.origin.y)>8)this.moved=true}
 end(event:TouchEventLike){this.move(event);if(this.moved||this.interrupted||this.now()-this.startedAt>600)this.blockedUntil=this.now()+400;this.active=false}
 cancel(){this.active=false;this.blockedUntil=this.now()+400}
 allow(){return !this.active&&this.now()>=this.blockedUntil}
}
