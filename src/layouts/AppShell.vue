<template>
 <view class="wp-app" :aria-label="theme.settings.screenReaderLabels?'WordPal 单词小搭子学习应用':undefined" :class="[layout.sizeClass,`theme-${theme.settings.themeId}`,{'reduce-motion':theme.reduced,'large-text':theme.settings.largeText,'high-contrast':theme.settings.highContrast,'has-native-safe-top':layout.safeTop>0}]" :style="appearanceStyle" :data-window="layout.sizeClass" :data-theme="theme.settings.themeId" :data-mode="theme.mode">
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
  <view v-if="page!=='course'" class="bottom-nav" role="navigation" aria-label="底部导航"><WPActionTile role="button" tabindex="0" v-for="item in ['home','learn','pet','review','settings'].map(id=>navigation.find(n=>n.id===id)!)" :key="item.id" class="bottom-item" :class="{active:page===item.id}" :aria-label="item.name" :aria-current="page===item.id?'page':undefined" @click="navigate(item.id)"><view class="nav-icon-container"><WPNavIcon :name="item.id as NavIconName" :active="page===item.id"/></view><text>{{item.name}}</text></WPActionTile></view>
  <KeyboardBridge />
 </view>
</template>
<script setup lang="ts">
import WPActionTile from "../components/button/WPActionTile.vue"

import {computed,onMounted,onUnmounted} from 'vue'
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
const props=defineProps<{page:PageId}>();const theme=useThemeStore(),profile=useProfileStore();const pageSubtitle=computed(()=>navigation.find(n=>n.id===props.page)?.subtitle)
// --wp-bottom-nav-space follows the existing 96px convention used by .app-footer, and drops to 0 on
// pushed pages where the tab bar is hidden so their own fixed action bar needs no extra offset.
const appearanceStyle=computed(()=>{const scale=Math.max(layout.fontScale,theme.settings.largeText?1.25:1);return `${theme.style};--wp-native-top:${layout.safeTop}px;--wp-brand-font-scale:${scale};--wp-bottom-nav-space:${props.page==='course'?'0px':'96px'};--wp-font-body:${16*scale}px;--wp-font-small:${14*scale}px;--wp-font-caption:${12*scale}px;--wp-font-card:${17*scale}px;--wp-font-section:${22*scale}px;--wp-font-title:${30*scale}px;--wp-font-word:${Math.min(64,48*scale)}px`})
onShow(()=>{useReviewStore().refresh();theme.applyNativeAppearance()})
onReady(()=>theme.applyNativeAppearance())
const shortcut=(event:{key:string;metaKey?:boolean;ctrlKey?:boolean})=>{if(event.metaKey||event.ctrlKey){const destination=({'1':'home','2':'learn','3':'pet'} as Record<string,PageId>)[event.key];if(destination)navigate(destination)}}
onMounted(()=>uni.$on('wp-shortcut',shortcut));onUnmounted(()=>uni.$off('wp-shortcut',shortcut))
</script>
