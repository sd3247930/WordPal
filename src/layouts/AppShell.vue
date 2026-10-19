<template>
 <view class="wp-app" :aria-label="theme.settings.screenReaderLabels?'WordPal 单词小搭子学习应用':undefined" :class="[layout.sizeClass,`theme-${theme.settings.themeId}`,{'reduce-motion':theme.reduced,'large-text':theme.settings.largeText,'scaled-text':layout.fontScale>1.25,'high-contrast':theme.settings.highContrast,'has-native-safe-top':layout.safeTop>0}]" :style="appearanceStyle" :data-window="layout.sizeClass" :data-theme="theme.settings.themeId" :data-mode="theme.mode">
  <view class="app-shell">
   <WPSidebar :page="page"/>
   <view class="app-body">
    <WPBrandHeader :page="page" :spirit-stone="profile.db.gems"/>
    <view class="main-content">
     <view v-if="profile.storageError" class="notice error" role="alert">{{profile.storageError}}</view>
     <slot />
    </view>
    <view class="app-footer"><text>一点进步，也是很棒的一步。</text><text>WordPal · 单词小搭子</text></view>
   </view>
  </view>
  <!-- Pushed pages (e.g. the textbook gallery) own their bottom action bar and hide the tab bar. -->
  <view v-if="page!=='course'" class="bottom-nav" role="navigation" aria-label="底部导航"><WPActionTile role="button" tabindex="0" v-for="item in ['home','learn','pet','review','settings'].map(id=>navigation.find(n=>n.id===id)!)" :key="item.id" v-slot="{highlighted}" toggle-highlight :selected="page===item.id" class="bottom-item" :class="{active:page===item.id}" :style="friendlyNavStyle(item.id as NavIconName,{dark:theme.mode==='dark',highContrast:theme.settings.highContrast})" :aria-label="item.name" :aria-current="page===item.id?'page':undefined" @click="navigate(item.id)"><view class="nav-icon-container"><WPNavIcon :name="item.id as NavIconName" :active="highlighted" variant="friendly" :size="40"/></view><text class="bottom-label">{{item.name}}</text></WPActionTile></view>
  <view class="native-safe-cap" aria-hidden="true"/>
  <KeyboardBridge />
 </view>
</template>
<script setup lang="ts">
import WPActionTile from "../components/button/WPActionTile.vue"

import {computed,ref,watch,nextTick,getCurrentInstance,onMounted,onUnmounted} from 'vue'
import {onShow,onReady} from '@dcloudio/uni-app'
import {windowLayout as layout} from '../services/window'
import {useThemeStore} from '../stores/theme'
import {useProfileStore} from '../stores/profile'
import {useReviewStore} from '../stores/review'
import {navigation,navigate,type PageId} from '../services/navigation'
import KeyboardBridge from '../components/KeyboardBridge.vue'
import WPBrandHeader from '../components/brand/WPBrandHeader.vue'
import WPSidebar from '../components/wp-sidebar/WPSidebar.vue'
import WPNavIcon from '../components/wp-nav-icon/WPNavIcon.vue'
import type {NavIconName} from '../services/nav-icons'
import {friendlyNavStyle} from '../services/friendly-nav-icons'
const props=defineProps<{page:PageId}>();const theme=useThemeStore(),profile=useProfileStore();const pageSubtitle=computed(()=>navigation.find(n=>n.id===props.page)?.subtitle)
// Reserve space for the floating bar and its breathing room only where it is visible.
const navSpace=ref(108),instance=getCurrentInstance();let navMeasureTimer:ReturnType<typeof setTimeout>|undefined
function measureNavigation(){clearTimeout(navMeasureTimer);navMeasureTimer=setTimeout(()=>{void nextTick(()=>{if(!instance?.proxy||props.page==='course'||layout.sizeClass!=='compact')return;uni.createSelectorQuery().in(instance.proxy).select('.bottom-nav').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&typeof rect.height==='number'&&rect.height>0)navSpace.value=Math.ceil(rect.height)+26}).exec()})},80)}
const appearanceStyle=computed(()=>{const scale=Math.max(layout.fontScale,theme.settings.largeText?1.25:1);return `${theme.style};--wp-native-top:${layout.safeTop}px;--wp-brand-font-scale:${scale};--wp-bottom-nav-space:${props.page!=='course'&&layout.sizeClass==='compact'?navSpace.value+'px':'0px'};--wp-font-body:${16*scale}px;--wp-font-small:${14*scale}px;--wp-font-caption:${12*scale}px;--wp-font-card:${17*scale}px;--wp-font-section:${22*scale}px;--wp-font-title:${30*scale}px;--wp-font-word:${Math.min(64,48*scale)}px`})
watch(()=>[layout.width,layout.height,layout.fontScale,theme.settings.largeText],measureNavigation)
onShow(()=>{useReviewStore().refresh();theme.applyNativeAppearance();measureNavigation()})
onReady(()=>{theme.applyNativeAppearance();measureNavigation()})
onUnmounted(()=>clearTimeout(navMeasureTimer))
const shortcut=(event:{key:string;metaKey?:boolean;ctrlKey?:boolean})=>{if(event.metaKey||event.ctrlKey){const destination=({'1':'home','2':'learn','3':'pet'} as Record<string,PageId>)[event.key];if(destination)navigate(destination)}}
onMounted(()=>uni.$on('wp-shortcut',shortcut));onUnmounted(()=>uni.$off('wp-shortcut',shortcut))
</script>
<style scoped>
.native-safe-cap{position:fixed;top:0;left:0;right:0;height:max(var(--wp-native-top,0px),env(safe-area-inset-top,0px));background:var(--wp-background);z-index:65;pointer-events:none}
</style>
