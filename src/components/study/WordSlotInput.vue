<template>
 <view class="word-slot-input" :class="{focused,soft:!slotted,answered:disabled}" :data-input-layout="slotted?'slots':'line'" :style="inputStyle">
  <text v-if="showInstruction" class="slot-instruction">{{mode==='spell'?'看中文，用字母拼出单词':'听一听，用字母写下来'}}</text>
  <view class="slot-editor">
   <view v-if="slotted" class="letter-slots" aria-hidden="true"><view v-for="index in count" :key="index" class="letter-slot" :class="{current:focused&&cursor===index-1,filled:index<=modelValue.length}"/></view>
   <!-- Keep one visible native input for selection, paste, IME and hardware keyboards. -->
   <input class="spelling-input slot-native" :value="modelValue" :disabled="disabled" :focus="focused" :aria-label="mode==='spell'?'输入中文对应的英文单词':'输入听到的英文单词'" :placeholder="slotted?'':'输入单词或词组'" :maxlength="240" type="text" confirm-type="done" :adjust-position="true" :cursor-spacing="120" :hold-keyboard="false" :auto-blur="true" :ignore-composition-event="false" :spellcheck="false" autocorrect="off" autocapitalize="none" autocomplete="off" @input="input" @focus="focus" @blur="blur" @confirm="confirm" @click="selection" @keyup="selection" @compositionstart="composing=true" @compositionend="composing=false"/>
  </view>
  <text class="slot-help">{{focused?'空格和标点也可以直接输入。':'点一下开始输入，不用担心出错。'}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,getCurrentInstance,nextTick,onMounted,onUnmounted,ref,watch} from 'vue'
import {onHide} from '@dcloudio/uni-app'
import {windowLayout} from '../../services/window'
import {useThemeStore} from '../../stores/theme'
import {studyInput} from '../../services/study-input'
const props=withDefaults(defineProps<{modelValue:string;mode:string;disabled?:boolean;questionKey:string;showInstruction?:boolean}>(),{disabled:false,showInstruction:true})
const emit=defineEmits<{(event:'update:modelValue',value:string):void;(event:'confirm'):void;(event:'blur'):void}>()
const theme=useThemeStore(),instance=getCurrentInstance(),focused=ref(false),cursor=ref(0),composing=ref(false),width=ref(240)
let timer:ReturnType<typeof setTimeout>|undefined,blurTimer:ReturnType<typeof setTimeout>|undefined,focusHeight=0
const scale=computed(()=>Math.max(windowLayout.fontScale,theme.settings.largeText?1.25:1)),font=computed(()=>24*scale.value),slot=computed(()=>Math.max(32,font.value*.6+14)),step=computed(()=>slot.value+6)
const capacity=computed(()=>Math.floor((width.value+6)/step.value))
// Count depends only on the child's input, never on an unrevealed target word.
const slotted=computed(()=>scale.value<=1.5&&!composing.value&&/^[a-zA-Z]*$/.test(props.modelValue)&&capacity.value>=6&&props.modelValue.length<Math.min(10,capacity.value))
const count=computed(()=>Math.min(capacity.value,Math.max(6,props.modelValue.length+1)))
const inputStyle=computed(()=>({'--slot-width':slot.value+'px','--slot-step':step.value+'px','--slot-font':font.value+'px','--slot-tracking':step.value-font.value*.6+'px','--slot-text-inset':(slot.value-font.value*.6)/2+'px','--slot-row-width':count.value*step.value-6+'px'}))
function measure(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.slot-editor').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()})}
function selection(event:any){const position=event.detail?.cursor??event.target?.selectionStart;if(typeof position==='number'&&position>=0)cursor.value=position}
function input(event:any){const value=String(event.detail?.value??event.target?.value??'');cursor.value=event.detail?.cursor??value.length;emit('update:modelValue',value)}
function focus(event:any){clearTimeout(blurTimer);focused.value=true;focusHeight=uni.getSystemInfoSync().windowHeight;selection(event);measure()}
function reset(){focused.value=false;studyInput.keyboardRaised=false;studyInput.overlap=0;clearTimeout(timer);clearTimeout(blurTimer)}
// Let the tap's click finish before changing document height or restoring navigation.
function blur(){emit('blur');clearTimeout(blurTimer);blurTimer=setTimeout(reset,180)}
function release(){if(focused.value)uni.hideKeyboard?.();reset()}
function confirm(){if(!composing.value&&!props.disabled&&props.modelValue.trim())emit('confirm')}
function keyboard(event:{height:number}){
 if(!focused.value)return
 if(event.height<=80){clearTimeout(timer);timer=setTimeout(()=>{studyInput.keyboardRaised=false;studyInput.overlap=0},180);return}
 studyInput.keyboardRaised=event.height>80
 const windowHeight=uni.getSystemInfoSync().windowHeight
 studyInput.overlap=event.height>80?Math.max(0,event.height-Math.max(0,focusHeight-windowHeight)):0
 clearTimeout(timer)
 if(event.height>80)timer=setTimeout(()=>{if(!focused.value||!instance?.proxy)return;const query=uni.createSelectorQuery().in(instance.proxy);query.select('.slot-editor').boundingClientRect(()=>{});query.selectViewport().scrollOffset(()=>{});query.exec((rects:any[])=>{const [rect,scroll]=rects;if(!rect||!scroll)return;const bottom=uni.getSystemInfoSync().windowHeight-studyInput.overlap-110;if(rect.bottom>bottom)uni.pageScrollTo?.({scrollTop:Math.max(0,scroll.scrollTop+rect.bottom-bottom),duration:150})})},120)
}
// #ifdef H5
function viewport(){const visual=window.visualViewport;if(!focused.value||!visual)return;keyboard({height:Math.max(0,focusHeight-visual.height-visual.offsetTop)})}
// #endif
onMounted(()=>{measure();uni.onKeyboardHeightChange?.(keyboard)
 // #ifdef H5
 window.visualViewport?.addEventListener('resize',viewport)
 // #endif
})
watch(()=>[windowLayout.width,windowLayout.fontScale,theme.settings.largeText],measure)
watch(()=>[props.questionKey,props.disabled],()=>{release();cursor.value=props.modelValue.length;composing.value=false})
onHide(release)
onUnmounted(()=>{release();uni.offKeyboardHeightChange?.(keyboard)
 // #ifdef H5
 window.visualViewport?.removeEventListener('resize',viewport)
 // #endif
})
</script>
<style scoped>
.word-slot-input{min-width:0;width:100%;max-width:560px;margin-top:16px;container-type:inline-size}
.slot-instruction{display:block;font-size:var(--wp-font-body);font-weight:600;line-height:1.5;margin-bottom:12px;color:var(--wp-foreground)}
.slot-editor{position:relative;width:100%;min-height:60px;max-width:100%}
.letter-slots{display:flex;gap:6px;position:absolute;left:0;top:0;pointer-events:none;height:60px;max-width:100%}
.letter-slot{width:var(--slot-width);flex-shrink:0;box-sizing:border-box;border:1px solid var(--wp-border);border-bottom-width:3px;border-radius:12px;background:var(--wp-surface-tonal);box-shadow:inset 0 2px 3px rgba(80,50,30,.06)}
.letter-slot.current{border-color:var(--wp-primary);background:var(--wp-secondary)}
.word-slot-input .spelling-input.slot-native{position:relative;z-index:1;box-sizing:border-box;display:block;width:100%;height:60px;min-height:60px;margin:0;border:0!important;border-radius:0!important;background:transparent!important;padding:0 0 0 var(--slot-text-inset);font-family:monospace;font-size:var(--slot-font);font-weight:600;letter-spacing:var(--slot-tracking);line-height:60px;color:var(--wp-foreground);caret-color:var(--wp-primary);box-shadow:none!important}
.slot-native :deep(input){background:transparent!important;border:0!important;border-radius:0!important;font:inherit;letter-spacing:inherit;color:inherit;caret-color:inherit}
.soft .slot-editor{border:1px solid var(--wp-border);border-bottom-width:3px;border-radius:16px;background:var(--wp-surface-tonal);box-sizing:border-box}
.soft.focused .slot-editor{border-color:var(--wp-primary)}
.soft .spelling-input.slot-native{padding:0 12px;letter-spacing:normal;font-family:var(--wp-font-family);font-size:max(20px,var(--wp-font-body));height:64px;line-height:64px}
.slot-help{display:block;margin-top:10px;font-size:var(--wp-font-small);color:var(--wp-muted-foreground);line-height:1.5}
.answered{opacity:.8}
@media(prefers-reduced-motion:no-preference){.wp-app:not(.reduce-motion) .letter-slot.filled{animation:slot-settle 180ms ease-out}@keyframes slot-settle{from{transform:translateY(2px)}to{transform:translateY(0)}}}
</style>
