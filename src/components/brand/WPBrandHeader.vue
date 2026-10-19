<template>
 <view class="wp-brand-header topbar">
  <view class="compact-brand"><image class="brand-logo" src="/static/icons/icon-512.png" mode="aspectFit" aria-label="WordPal 应用标志"/><view class="header-brand-copy"><text class="brand-name">WordPal</text><text class="brand-subtitle">{{subtitles[page]}}</text></view></view>
  <view class="topbar-actions"><WPButton kind="quiet" class="install-trigger" aria-haspopup="dialog" :aria-expanded="installOpen" @click="installOpen=true">📲 安装</WPButton><view class="gem-chip" aria-label="灵石数量"><text aria-hidden="true">◇</text><text>{{spiritStone}} 灵石</text></view></view>
  <WPInstallPanel :open="installOpen" @close="installOpen=false"/>
 </view>
</template>
<script setup lang="ts">
import type {PageId} from '../../services/navigation'
import {ref} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import WPInstallPanel from '../install/WPInstallPanel.vue'
const installOpen=ref(false)
withDefaults(defineProps<{page:PageId;spiritStone?:number}>(),{spiritStone:0})
const subtitles:Record<PageId,string>={home:'Home',learn:'Study',pet:'PetHouse',review:'Wordbook',settings:'Settings',parent:'Parents',achievements:'Achievements',course:'Textbooks'}
</script>
<style scoped>
.wp-brand-header .topbar-actions{gap:8px;flex-wrap:wrap}
.wp-brand-header .install-trigger{min-height:var(--wp-button-primary-height,56px);padding:0 10px;font-size:var(--wp-font-small);white-space:nowrap}
</style>
