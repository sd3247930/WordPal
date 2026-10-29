<template>
 <view v-if="open" class="spirit-stone-backdrop" @click="$emit('close')">
  <view class="spirit-stone-panel" role="dialog" aria-modal="true" aria-label="我的灵石" @click.stop>
   <view class="spirit-stone-panel-heading"><text class="section-title">我的灵石</text><WPButton kind="quiet" class="spirit-stone-close" label="关闭灵石说明" @click="$emit('close')">关闭</WPButton></view>
   <view class="spirit-stone-balance"><image v-if="!failed" :src="iconSource" class="spirit-stone-detail-icon" mode="aspectFit" aria-hidden="true" @error="failed=true"/><text v-else class="spirit-stone-detail-icon spirit-stone-fallback" aria-hidden="true">◇</text><view><text class="small muted block">{{display.state==='ready'?'当前余额':'灵石状态'}}</text><text class="spirit-stone-full-balance" role="status" aria-live="polite">{{display.full}}</text></view></view>
   <text v-if="display.state==='unavailable'" class="notice">请先查看页面上的档案提示，恢复后再来看看。</text>
   <view class="spirit-stone-explanation"><text class="strong block">怎样获得</text><text>认真答题、完成每日学习任务，可以收获灵石。</text></view>
   <view class="spirit-stone-explanation"><text class="strong block">可以用来做什么</text><text>学习时查看提示，或给伙伴分享小点心。点心每份消耗 5 灵石，每个伙伴每天一份。</text></view>
   <text class="small muted block">这里只查看余额和说明，不会增加或扣除灵石。</text>
  </view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,nextTick,onUnmounted} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import {spiritStoneAsset} from '../../services/ui/SpiritStoneAsset'
import {spiritStoneDisplay} from '../../services/ui/SpiritStoneDisplay'
const props=defineProps<{open:boolean;balance?:number;unavailable?:boolean;loading?:boolean}>(),emit=defineEmits<{close:[]}>(),failed=ref(false)
const iconSource=spiritStoneAsset('medium')
const display=computed(()=>spiritStoneDisplay(props.balance,props.unavailable,props.loading))
// #ifdef H5
let previousOverflow='',locked=false
function keyboard(event:KeyboardEvent){
 if(!props.open)return
 if(event.key==='Escape'){event.preventDefault();emit('close');return}
 if(event.key!=='Tab')return
 const buttons=Array.from(document.querySelectorAll<HTMLElement>('.spirit-stone-panel button,.spirit-stone-panel uni-button')).filter(button=>!button.hasAttribute('disabled'))
 if(!buttons.length)return
 const first=buttons[0],last=buttons[buttons.length-1]
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
function unlock(){if(locked){document.body.style.overflow=previousOverflow;locked=false}}
document.addEventListener('keydown',keyboard)
watch(()=>props.open,async open=>{
 if(open){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';locked=true;await nextTick();document.querySelector<HTMLElement>('.spirit-stone-close')?.focus()}
 else unlock()
})
onUnmounted(()=>{document.removeEventListener('keydown',keyboard);unlock()})
// #endif
</script>
