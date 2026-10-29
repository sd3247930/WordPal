<template>
 <view class="wp-brand-header topbar">
  <view class="compact-brand"><image class="brand-logo" src="/static/icons/logo-256.png" mode="aspectFit" aria-label="WordPal 元素魔法书标志"/><view class="header-brand-copy"><text class="brand-name" :class="{'page-title':page==='pet'}">{{page==='pet'?'四象精灵屋':'WordPal'}}</text><text class="brand-subtitle">{{subtitles[page]}}</text></view></view>
  <view class="topbar-actions">
   <!-- #ifdef H5 -->
   <WPButton kind="quiet" class="install-trigger" label="安装 WordPal" aria-haspopup="dialog" :aria-expanded="installOpen" @click="stoneOpen=false;installOpen=true"><text aria-hidden="true">📲</text><text class="install-trigger-label">安装</text></WPButton>
   <!-- #endif -->
   <WPSpiritStoneBadge :balance="spiritStone" :unavailable="spiritStoneUnavailable" :loading="spiritStoneLoading" :open="stoneOpen" @toggle="installOpen=false;stoneOpen=!stoneOpen"/>
  </view>
  <!-- #ifdef H5 -->
  <WPInstallPanel :open="installOpen" @close="installOpen=false"/>
  <!-- #endif -->
  <WPSpiritStoneInfo :open="stoneOpen" :balance="spiritStone" :unavailable="spiritStoneUnavailable" :loading="spiritStoneLoading" @close="stoneOpen=false"/>
 </view>
</template>
<script setup lang="ts">
import type {PageId} from '../../services/navigation'
import {ref,watch,nextTick,getCurrentInstance} from 'vue'
import {onHide} from '@dcloudio/uni-app'
import WPButton from '../wp-button/WPButton.vue'
import WPInstallPanel from '../install/WPInstallPanel.vue'
import WPSpiritStoneBadge from './WPSpiritStoneBadge.vue'
import WPSpiritStoneInfo from './WPSpiritStoneInfo.vue'
const installOpen=ref(false),stoneOpen=ref(false),instance=getCurrentInstance()
const props=defineProps<{page:PageId;spiritStone?:number;spiritStoneUnavailable?:boolean;spiritStoneLoading?:boolean}>()
function closePanels(){const wasOpen=stoneOpen.value||installOpen.value;stoneOpen.value=false;installOpen.value=false;return wasOpen}
watch(()=>props.page,closePanels);onHide(closePanels)
defineExpose({closePanels})
// #ifdef H5
watch(stoneOpen,async(open,wasOpen)=>{if(!open&&wasOpen){await nextTick();(instance?.proxy?.$el as HTMLElement|undefined)?.querySelector<HTMLElement>('.spirit-stone-badge')?.focus()}})
// #endif
const subtitles:Record<PageId,string>={home:'Home',learn:'Study',pet:'PetHouse',review:'Wordbook',settings:'Settings',parent:'Parents',achievements:'Achievements',course:'Textbooks'}
</script>
<style scoped>
.wp-brand-header .topbar-actions{gap:8px;flex-wrap:nowrap;flex-shrink:0}
.wp-brand-header .install-trigger{min-height:48px;padding:0 10px;font-size:var(--wp-font-small);white-space:nowrap}
@media(max-width:599px){.wp-brand-header .install-trigger{width:48px;min-width:48px;padding:0}.install-trigger-label{display:none}.wp-brand-header .topbar-actions{gap:6px}}
</style>
