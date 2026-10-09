<template>
 <view class="wp-brand-header topbar">
  <view class="compact-brand"><image class="brand-logo" src="/static/icons/logo-128.png" mode="aspectFit" aria-label="WordPal 应用标志"/><view class="header-brand-copy"><text class="brand-name">WordPal</text><text class="brand-subtitle">{{subtitles[page]}}</text></view></view>
  <view class="topbar-actions"><view class="gem-chip" aria-label="灵石数量"><text aria-hidden="true">◇</text><text>{{spiritStone}} 灵石</text></view></view>
 </view>
</template>
<script setup lang="ts">
import type {PageId} from '../../services/navigation'
withDefaults(defineProps<{page:PageId;spiritStone?:number}>(),{spiritStone:0})
const subtitles:Record<PageId,string>={home:'Home',learn:'Study',pet:'PetHouse',review:'Wordbook',settings:'Settings',parent:'Parents',achievements:'Achievements',course:'Textbooks'}
</script>
