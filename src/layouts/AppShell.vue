<template>
 <view class="wp-app" :aria-label="theme.settings.screenReaderLabels?'WordPal 单词小搭子学习应用':undefined" :class="[layout.sizeClass,`theme-${theme.settings.themeId}`,{'reduce-motion':theme.reduced,'large-text':theme.settings.largeText,'high-contrast':theme.settings.highContrast,'has-native-safe-top':layout.safeTop>0}]" :style="appearanceStyle" :data-window="layout.sizeClass" :data-theme="theme.settings.themeId" :data-mode="theme.mode">
  <view class="app-shell">
   <WPSidebar :page="page"/>
   <view class="app-body">
    <view class="topbar"><view class="compact-brand"><image src="/static/icons/logo-128.png" class="brand-logo" aria-label="WordPal 应用标志"/><view class="header-brand-copy"><text class="brand-name">WordPal</text><text class="brand-subtitle">{{pageSubtitle}}</text></view></view><view class="topbar-actions"><view class="gem-chip"><text aria-hidden="true">◇</text><text>{{profile.db.gems}} 灵石</text></view><button role="button" tabindex="0" class="profile-button" aria-label="打开家长中心" @click="navigate('parent')">小<text class="online-dot"/></button></view></view>
    <view class="main-content">
     <view v-if="profile.storageError" class="notice error" role="alert">{{profile.storageError}}</view>
     <slot />
    </view>
    <view class="app-footer"><text>一点进步，也是很棒的一步。</text><text>WordPal · 单词小搭子</text></view>
   </view>
  </view>
  <view class="bottom-nav" role="navigation" aria-label="底部导航"><button role="button" tabindex="0" v-for="item in ['home','learn','pet','review','settings'].map(id=>navigation.find(n=>n.id===id)!)" :key="item.id" class="bottom-item" :class="{active:page===item.id}" :aria-label="item.name" :aria-current="page===item.id?'page':undefined" @click="navigate(item.id)"><view class="nav-icon-container"><WPNavIcon :name="item.id as NavIconName" :active="page===item.id"/></view><text>{{item.name}}</text></button></view>
  <KeyboardBridge />
 </view>
</template>
<script setup lang="ts">
import {computed,onMounted,onUnmounted} from 'vue'
import {onShow,onReady} from '@dcloudio/uni-app'
import {windowLayout as layout} from '../services/window'
import {useThemeStore} from '../stores/theme'
import {useProfileStore} from '../stores/profile'
import {useReviewStore} from '../stores/review'
import {navigation,navigate,type PageId} from '../services/navigation'
import KeyboardBridge from '../components/KeyboardBridge.vue'
import WPSidebar from '../components/wp-sidebar/WPSidebar.vue'
import WPNavIcon from '../components/wp-nav-icon/WPNavIcon.vue'
import type {NavIconName} from '../services/nav-icons'
const props=defineProps<{page:PageId}>();const theme=useThemeStore(),profile=useProfileStore();const pageSubtitle=computed(()=>navigation.find(n=>n.id===props.page)?.subtitle)
const appearanceStyle=computed(()=>{const scale=Math.max(layout.fontScale,theme.settings.largeText?1.25:1);return `${theme.style};--wp-native-top:${layout.safeTop}px;--wp-font-body:${16*scale}px;--wp-font-small:${14*scale}px;--wp-font-caption:${12*scale}px;--wp-font-card:${17*scale}px;--wp-font-section:${22*scale}px;--wp-font-title:${30*scale}px;--wp-font-word:${Math.min(64,48*scale)}px`})
onShow(()=>{useReviewStore().refresh();theme.applyNativeAppearance()})
onReady(()=>theme.applyNativeAppearance())
const shortcut=(event:{key:string;metaKey?:boolean;ctrlKey?:boolean})=>{if(event.metaKey||event.ctrlKey){const destination=({'1':'home','2':'learn','3':'pet'} as Record<string,PageId>)[event.key];if(destination)navigate(destination)}}
onMounted(()=>uni.$on('wp-shortcut',shortcut));onUnmounted(()=>uni.$off('wp-shortcut',shortcut))
</script>
