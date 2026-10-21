<template><view class="keyboard-bridge" aria-hidden="true" /></template>
<script lang="ts">
export default {
 data(){return {observer:null as MutationObserver|null}},
 mounted(){
  // #ifdef H5
  document.addEventListener('keydown',this.handleKey)
  this.syncAccessibility()
  this.observer=new MutationObserver(()=>this.syncAccessibility());this.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-label']})
  // #endif
 },
 unmounted(){
  // #ifdef H5
  document.removeEventListener('keydown',this.handleKey)
  this.observer?.disconnect()
  // #endif
 },
 methods:{
  syncAccessibility(){
   document.querySelectorAll('uni-input[aria-label]').forEach(host=>{const input=host.querySelector('input');const label=host.getAttribute('aria-label');if(input&&label&&input.getAttribute('aria-label')!==label)input.setAttribute('aria-label',label)})
   document.querySelectorAll('.slot-native input').forEach(input=>{input.setAttribute('spellcheck','false');input.setAttribute('autocorrect','off');input.setAttribute('autocapitalize','none');input.setAttribute('autocomplete','off')})
   document.querySelectorAll('uni-button[role="button"]').forEach(host=>{const disabled=host.hasAttribute('disabled');host.setAttribute('aria-disabled',String(disabled));host.setAttribute('tabindex',disabled?'-1':'0')})
  },
  dispatch(event:{key:string;metaKey?:boolean;ctrlKey?:boolean;reduced?:boolean}){if(event.reduced!==undefined)uni.$emit('wp-system-motion',event.reduced);else uni.$emit('wp-shortcut',event)},
  handleKey(event:KeyboardEvent){
   const tag=(event.target as HTMLElement)?.tagName?.toLowerCase()
   if(event.repeat)return
   const action=(event.target as HTMLElement)?.closest('[role="button"]') as HTMLElement|null
   if(action&&(event.key===' '||event.key==='Enter')&&!event.metaKey&&!event.ctrlKey){event.preventDefault();if(action.getAttribute('aria-disabled')!=='true'&&!action.hasAttribute('disabled'))action.click();return}
   if((tag==='input'||tag==='textarea')&&!event.metaKey&&!event.ctrlKey)return
   if([' ','Enter','ArrowLeft','ArrowRight','1','2','3','4'].includes(event.key)){
    if((tag==='button'||tag==='uni-button')&&(event.key===' '||event.key==='Enter'))return
    event.preventDefault();this.dispatch({key:event.key,metaKey:event.metaKey,ctrlKey:event.ctrlKey})
   }
  }
 }
}
</script>
<!-- #ifdef APP-PLUS -->
<script module="keyboard" lang="renderjs">
export default {
 mounted(){
  this.sync=()=>{document.querySelectorAll('uni-input[aria-label]').forEach(host=>{const input=host.querySelector('input'),label=host.getAttribute('aria-label');if(input&&label&&input.getAttribute('aria-label')!==label)input.setAttribute('aria-label',label)});document.querySelectorAll('.slot-native input').forEach(input=>{input.setAttribute('spellcheck','false');input.setAttribute('autocorrect','off');input.setAttribute('autocapitalize','none');input.setAttribute('autocomplete','off')});document.querySelectorAll('uni-button[role="button"]').forEach(host=>{const disabled=host.hasAttribute('disabled');host.setAttribute('aria-disabled',String(disabled));host.setAttribute('tabindex',disabled?'-1':'0')})}
  this.sync();this.observer=new MutationObserver(this.sync);this.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-label']})
  this.listener=(event)=>{const tag=event.target?.tagName?.toLowerCase();if(event.repeat)return;const action=event.target?.closest('[role="button"]');if(action&&(event.key===' '||event.key==='Enter')&&!event.metaKey&&!event.ctrlKey){event.preventDefault();if(action.getAttribute('aria-disabled')!=='true'&&!action.hasAttribute('disabled'))action.click();return}if((tag==='input'||tag==='textarea')&&!event.metaKey&&!event.ctrlKey)return;if([' ','Enter','ArrowLeft','ArrowRight','1','2','3','4'].includes(event.key)){event.preventDefault();this.$ownerInstance.callMethod('dispatch',{key:event.key,metaKey:event.metaKey,ctrlKey:event.ctrlKey})}}
  document.addEventListener('keydown',this.listener)
  this.motion=window.matchMedia('(prefers-reduced-motion: reduce)');this.motionListener=(event)=>this.$ownerInstance.callMethod('dispatch',{reduced:event.matches});this.motionListener(this.motion);this.motion.addEventListener('change',this.motionListener)
 },
 beforeUnmount(){document.removeEventListener('keydown',this.listener);this.motion?.removeEventListener('change',this.motionListener);this.observer?.disconnect()},
 beforeDestroy(){document.removeEventListener('keydown',this.listener);this.motion?.removeEventListener('change',this.motionListener);this.observer?.disconnect()}
}
</script>
<!-- #endif -->
