<template>
 <view v-if="open" class="sheet-backdrop course-delete-backdrop" :class="{'keyboard-open':keyboardOverlap>0}" :style="{'--course-delete-keyboard':keyboardOverlap+'px'}" @click.self="requestClose" @touchmove.self.stop.prevent>
  <view class="sheet-panel course-delete-sheet" role="dialog" aria-modal="true" :aria-label="actionLabel+'教材确认'" :aria-busy="busy||undefined">
   <view class="course-delete-body" @touchmove.stop>
    <view class="course-delete-heading"><CourseToolsArtwork v-if="courseId" :course-id="courseId"/><text class="course-delete-title" role="heading" aria-level="2" tabindex="-1">{{title?actionLabel+'《'+title+'》？':'课程信息不可用'}}</text></view>
    <view v-if="validTarget" class="course-delete-impact">
     <view class="course-delete-counts" role="group" aria-label="当前版本资源"><view class="course-delete-count"><image class="course-delete-icon" src="/static/icons/course-delete/words.png" mode="aspectFit" aria-hidden="true"/><text><text class="strong">{{wordCount}}</text> 词条</text></view><view class="course-delete-count"><image class="course-delete-icon" src="/static/icons/course-delete/media.png" mode="aspectFit" aria-hidden="true"/><text><text class="strong">{{mediaCount}}</text> 媒体</text></view><text class="course-delete-count-label small muted">当前版本</text></view>
     <text class="small block">{{bundled?'卸载本机教材、历史版本及本册记录；记录先备份。需重新安装，安装包原文件保留。':'删除本机教材、历史版本及本册记录；记录先备份，之后需重新导入。'}}</text>
     <view class="course-delete-retained"><image class="course-delete-icon" src="/static/icons/course-delete/retained.png" mode="aspectFit" aria-hidden="true"/><text class="small">共享词卡、其他教材与全局奖励保留。</text></view>
    </view>
    <text v-if="blockedReason||!validTarget" class="notice warning course-delete-error" role="alert">{{blockedReason||'课程身份或资源数量无法确认，请关闭后重新打开。'}}</text>
    <template v-else>
     <view v-if="needsReplacement" class="course-replacement">
      <text class="small strong block">这是当前教材，请先选择替代教材：</text>
      <WPActionTile v-for="item in candidates" :key="item.courseId" :disabled="busy" class="course-check" :selected="replacementId===item.courseId" :aria-pressed="replacementId===item.courseId" @click="replacementId=item.courseId"><text aria-hidden="true">{{replacementId===item.courseId?'●':'○'}}</text><text>{{item.title}}</text></WPActionTile>
      <text v-if="!candidates.length" class="notice warning">至少需要保留一份已安装教材。请先安装其他教材。</text>
     </view>
     <view class="course-delete-confirmation"><text class="small block">输入「{{actionLabel}}」以确认：</text><input class="spelling-input course-delete-input" :disabled="busy" :value="typed" :aria-label="actionLabel+'确认文字'" :placeholder="actionLabel" :adjust-position="false" :cursor-spacing="12" confirm-type="done" @input="typed=($event as any).detail.value" @confirm="hideKeyboard"/></view>
    </template>
    <text v-if="error" class="notice error course-delete-error" role="alert">{{error}}</text>
    <text v-if="busy" class="small muted block" role="status" aria-live="polite">正在备份并移除本册内容，请稍候。</text>
   </view>
   <view class="course-delete-actions"><WPButton kind="secondary" :disabled="busy" @click="requestClose">取消</WPButton><WPButton kind="danger" :loading="busy" :disabled="!canConfirm" @click="confirm">确认{{actionLabel}}</WPButton></view>
  </view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,nextTick,onMounted,onUnmounted} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import CourseToolsArtwork from './CourseToolsArtwork.vue'
import type {CoursePack} from '../../../packages/content_schema/course'
import {registerParentBackHandler,registerParentNavigationBlocker} from '../../services/parent/ParentGateNavigation'
const props=withDefaults(defineProps<{
 open:boolean;busy?:boolean;courseId?:string;title?:string;wordCount?:number;mediaCount?:number
 bundled:boolean;candidates?:CoursePack[];needsReplacement:boolean;blockedReason?:string;error?:string;resetKey?:number
}>(),{candidates:()=>[],blockedReason:'',error:''})
const emit=defineEmits<{cancel:[];confirm:[replacementId:string]}>()
const typed=ref(''),replacementId=ref(''),submitted=ref(false),keyboardOverlap=ref(0)
const actionLabel=computed(()=>props.bundled?'卸载':'删除')
const validTarget=computed(()=>!!props.courseId&&!!props.title?.trim()&&typeof props.wordCount==='number'&&Number.isInteger(props.wordCount)&&props.wordCount>=0&&typeof props.mediaCount==='number'&&Number.isInteger(props.mediaCount)&&props.mediaCount>=0)
const canConfirm=computed(()=>props.open&&validTarget.value&&!props.busy&&!submitted.value&&!props.blockedReason&&typed.value.trim()===actionLabel.value&&(!props.needsReplacement||!!replacementId.value))
function hideKeyboard(){uni.hideKeyboard?.()}
function requestClose(){if(props.open&&!props.busy&&!submitted.value){hideKeyboard();emit('cancel')}}
function confirm(){if(!canConfirm.value)return;submitted.value=true;hideKeyboard();emit('confirm',replacementId.value);void nextTick(()=>{submitted.value=false})}
function shortcut(event:{key:string}){if(props.open&&event.key==='Escape')requestClose()}
let releaseBack:(()=>void)|undefined,releaseNavigation:(()=>void)|undefined,openHeight=0
function keyboard(event:{height:number}){if(!props.open)return;const resized=Math.max(0,openHeight-uni.getSystemInfoSync().windowHeight);keyboardOverlap.value=Math.max(0,event.height-resized)}
watch(()=>[props.open,props.courseId,props.resetKey,props.blockedReason],()=>{typed.value='';submitted.value=false;replacementId.value=props.candidates[0]?.courseId||''})
watch(()=>props.needsReplacement,()=>{if(!props.busy)typed.value=''})
watch(()=>props.candidates,list=>{if(!props.busy&&!list.some(item=>item.courseId===replacementId.value))replacementId.value=list[0]?.courseId||''})
watch(()=>props.busy,busy=>{if(busy)hideKeyboard()})
watch(()=>props.open,open=>{
 releaseBack?.();releaseNavigation?.();releaseBack=releaseNavigation=undefined;keyboardOverlap.value=0
 if(open){openHeight=uni.getSystemInfoSync().windowHeight;releaseBack=registerParentBackHandler(()=>{requestClose();return true});releaseNavigation=registerParentNavigationBlocker(()=>!!props.busy)}
},{immediate:true})
onMounted(()=>{uni.$on('wp-shortcut',shortcut);uni.onKeyboardHeightChange?.(keyboard)})
onUnmounted(()=>{releaseBack?.();releaseNavigation?.();uni.$off('wp-shortcut',shortcut);uni.offKeyboardHeightChange?.(keyboard)})
// #ifdef H5
let previousFocus:HTMLElement|null=null,previousOverflow='',locked=false
const inertElements:{element:HTMLElement;inert:boolean}[]=[]
function releaseFocus(){if(!locked)return;locked=false;document.body.style.overflow=previousOverflow;for(const item of inertElements.splice(0))item.element.inert=item.inert;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});else document.querySelector<HTMLElement>('.tools-back')?.focus({preventScroll:true});previousFocus=null}
async function focusDialog(){await nextTick();if(!props.open)return;previousFocus=document.activeElement as HTMLElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';locked=true
 let element=document.querySelector<HTMLElement>('.course-delete-backdrop');while(element&&element.parentElement){const parent=element.parentElement;for(const sibling of Array.from(parent.children))if(sibling!==element&&sibling instanceof HTMLElement){inertElements.push({element:sibling,inert:sibling.inert});sibling.inert=true}if(parent.classList.contains('wp-app'))break;element=parent}
 document.querySelector<HTMLElement>('.course-delete-title')?.focus({preventScroll:true})
}
function trapFocus(event:KeyboardEvent){if(!props.open||event.key!=='Tab')return;const panel=document.querySelector('.course-delete-sheet'),controls=Array.from(panel?.querySelectorAll<HTMLElement>('[role="button"],input')||[]).filter(element=>!element.hasAttribute('disabled')&&element.getAttribute('aria-disabled')!=='true');const first=controls[0],last=controls[controls.length-1];if(!first){event.preventDefault();return}if(!controls.includes(document.activeElement as HTMLElement)){event.preventDefault();(event.shiftKey?last:first).focus()}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
function viewport(){if(!props.open||!window.visualViewport)return;keyboardOverlap.value=Math.max(0,window.innerHeight-window.visualViewport.height-window.visualViewport.offsetTop)}
watch(()=>props.open,open=>{if(open)void focusDialog();else releaseFocus()},{immediate:true})
onMounted(()=>{document.addEventListener('keydown',trapFocus);window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport)})
onUnmounted(()=>{releaseFocus();document.removeEventListener('keydown',trapFocus);window.visualViewport?.removeEventListener('resize',viewport);window.visualViewport?.removeEventListener('scroll',viewport)})
// #endif
defineExpose({actionLabel})
</script>
<style scoped>
.course-delete-backdrop{z-index:110;bottom:var(--course-delete-keyboard,0px);padding-top:max(12px,var(--wp-native-top,0px),env(safe-area-inset-top,0px));background:var(--wp-scrim);overscroll-behavior:none}
.sheet-panel.course-delete-sheet{max-height:100%;min-width:0;padding:0;gap:0;overflow:hidden;border:1px solid var(--wp-border);border-radius:var(--wp-radius-dialog) var(--wp-radius-dialog) 0 0;box-shadow:var(--wp-shadow-raised);line-height:1.55}
.course-delete-body{display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px 16px 12px;scroll-padding:12px}
.course-delete-heading{display:flex;align-items:center;gap:10px;min-width:0}
.course-delete-heading>.course-tools-artwork{width:60px;height:72px;max-width:24%;flex-shrink:0}
.course-delete-title{min-width:0;font-size:var(--wp-font-headline);font-weight:700;line-height:1.45;overflow-wrap:anywhere}
.course-delete-impact{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:var(--wp-surface-tonal)}
.course-delete-counts{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;min-width:0;font-size:var(--wp-font-body);font-variant-numeric:tabular-nums}
.course-delete-count{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;overflow-wrap:anywhere}
.course-delete-count>text{min-width:0}
.course-delete-count .strong{font-size:var(--wp-font-headline)}
.course-delete-count-label{margin-left:auto}
.course-delete-icon{display:block;width:28px;height:28px;flex:none}
.course-delete-retained{display:flex;align-items:center;gap:6px;padding-top:8px;border-top:1px solid var(--wp-border);min-width:0}
.course-delete-retained>text{min-width:0;overflow-wrap:anywhere}
.course-delete-retained>.course-delete-icon{width:24px;height:24px}
.course-delete-confirmation{display:flex;flex-direction:column;gap:6px}
.course-delete-input.spelling-input{height:52px;min-height:52px;margin:0;width:100%;padding:8px 12px;font-size:var(--wp-font-body);line-height:1.5;text-align:left;border:2px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);color:var(--wp-foreground)}
.course-delete-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;flex:none;padding:10px 16px max(12px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--wp-border);background:var(--wp-surface)}
.course-delete-actions>.wp-button{display:flex;align-items:center;justify-content:center;width:100%;min-width:0;min-height:56px;margin:0;padding:10px 12px;font-size:var(--wp-font-body);line-height:1.4;white-space:normal;border-radius:var(--wp-radius-sm)}
.course-delete-error{margin:0;overflow-wrap:anywhere}.course-replacement .course-check{padding:10px 0;white-space:normal;text-align:left;font-size:var(--wp-font-small)}
.keyboard-open .course-delete-actions{padding-bottom:12px}
@media(min-width:600px){.course-delete-backdrop{padding:20px;align-items:center}.sheet-panel.course-delete-sheet{border-radius:var(--wp-radius-dialog)}}
@media(max-width:359px){.course-delete-body{padding-inline:14px}.course-delete-actions{padding-inline:14px;gap:8px}.course-delete-impact{padding:10px}.course-delete-counts{column-gap:10px}.course-delete-heading>.course-tools-artwork{width:52px;height:64px}}
</style>
