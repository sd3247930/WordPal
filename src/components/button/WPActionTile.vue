<template>
 <!-- #ifndef MP -->
 <button v-bind="forwarded" :role="String(attrs.role||'button')" class="wp-action-tile" :class="classes" :tabindex="disabled?-1:0" :disabled="disabled" :aria-disabled="disabled||undefined" :aria-pressed="pressed" :data-icon-highlight="toggleHighlight?highlighted:undefined" @click="activate"><slot :highlighted="highlighted"/></button>
 <!-- #endif -->
 <!-- #ifdef MP -->
 <!-- Mini-program templates require explicit attribute bindings. -->
 <button :id="mpAttrs.id" :style="mpAttrs.style" :role="String(attrs.role||'button')" class="wp-action-tile" :class="classes" :tabindex="disabled?-1:0" :disabled="disabled" :aria-disabled="disabled||undefined" :aria-pressed="pressed" :aria-label="mpAttrs['aria-label']" :aria-labelledby="mpAttrs['aria-labelledby']" :aria-describedby="mpAttrs['aria-describedby']" :aria-controls="mpAttrs['aria-controls']" :aria-expanded="mpAttrs['aria-expanded']" :aria-current="mpAttrs['aria-current']" :aria-checked="mpAttrs['aria-checked']" :aria-hidden="mpAttrs['aria-hidden']" :aria-busy="mpAttrs['aria-busy']" :data-icon-highlight="toggleHighlight?highlighted:undefined" :data-mode="attrs['data-mode']" :data-stat="attrs['data-stat']" :data-task="attrs['data-task']" :data-category="attrs['data-category']" :data-level="attrs['data-level']" :data-scope="attrs['data-scope']" :data-state="attrs['data-state']" :data-status="attrs['data-status']" :data-metric="attrs['data-metric']" :data-theme-choice="attrs['data-theme-choice']" @click="activate" @longpress="forwardEvent('onLongpress',$event)" @touchstart="forwardEvent('onTouchstart',$event)" @touchend="forwardEvent('onTouchend',$event)"><slot :highlighted="highlighted"/></button>
 <!-- #endif -->
</template>
<script setup lang="ts">
import {computed,ref,useAttrs,watch,type ButtonHTMLAttributes} from 'vue'
defineOptions({inheritAttrs:false})
const props=withDefaults(defineProps<{disabled?:boolean;selected?:boolean;toggleHighlight?:boolean}>(),{selected:undefined}),attrs=useAttrs()
const emit=defineEmits<{click:[event:Event];cancel:[event:Event]}>()
const selectionClasses=new Set(['selected','active','chosen','form-selected','equipped','is-highlighted'])
const external=computed(()=>props.selected??(attrs['aria-pressed']!==undefined?attrs['aria-pressed']===true||attrs['aria-pressed']==='true':attrs['aria-checked']!==undefined?attrs['aria-checked']===true||attrs['aria-checked']==='true':attrs['aria-current']==='page'?true:undefined))
const cleared=ref(false),local=ref(false)
watch(external,()=>{cleared.value=false;local.value=false})
const highlighted=computed(()=>!cleared.value&&(external.value??local.value))
const pressed=computed<boolean|'mixed'|undefined>(()=>props.toggleHighlight?highlighted.value:props.selected??(attrs['aria-pressed']==='mixed'?'mixed':attrs['aria-pressed']==null?undefined:attrs['aria-pressed']===true||attrs['aria-pressed']==='true'))
const classes=computed(()=>{
 const incoming=String(attrs.class||'').split(/\s+/).filter(Boolean)
 return [...incoming.filter(name=>!(props.toggleHighlight&&!highlighted.value&&selectionClasses.has(name))),{'icon-highlighted':props.toggleHighlight&&highlighted.value}]
})
const forwarded=computed(()=>Object.fromEntries(Object.entries(attrs).filter(([key])=>!['class','aria-pressed'].includes(key))))
const mpAttrs=computed(()=>attrs as ButtonHTMLAttributes)
function forwardEvent(name:string,event:Event){if(props.disabled)return;const listener=attrs[name];for(const callback of Array.isArray(listener)?listener:[listener])if(typeof callback==='function')callback(event)}
function activate(event:Event){
 if(props.disabled)return
 if(props.toggleHighlight&&highlighted.value){cleared.value=true;local.value=false;emit('cancel',event);return}
 cleared.value=false;local.value=true;emit('click',event)
}
</script>
