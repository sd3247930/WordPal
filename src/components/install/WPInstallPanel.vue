<template>
 <view v-if="open" class="install-backdrop" @click.self="$emit('close')">
  <view class="install-panel" role="dialog" aria-modal="true" aria-label="安装 WordPal">
   <view class="install-heading"><view><text class="section-title">把伙伴装进口袋</text><text class="small muted block">WordPal · 单词小搭子</text></view><WPButton kind="quiet" label="关闭安装面板" @click="$emit('close')">关闭</WPButton></view>
   <text>Android 手机下载 APK，安装后即可离线学习。</text>
   <!-- #ifdef H5 -->
   <a class="wp-button install-download" :href="WORDPAL_APK_URL" target="_blank" rel="noopener noreferrer">📥 下载应用（APK）</a>
   <!-- #endif -->
   <!-- #ifndef H5 -->
   <WPButton class="install-download" @click="openWordPalDownload">📥 下载应用（APK）</WPButton>
   <!-- #endif -->
   <view class="install-steps"><text>1. 用手机浏览器下载并打开安装包。</text><text>2. 首次安装时，按系统提示允许当前浏览器安装应用。</text><text>3. 桌面出现 WordPal 图标后，点开开始学习。</text></view>
   <text class="small muted">iPhone / iPad 请使用网页版，也可通过 Safari「添加到主屏幕」。APK 适用于 Android。</text>
   <view class="install-backup"><text class="strong">把学习进度带过去</text><text class="small">在网页「设置 → 家长设置 → 本机学习备份」导出；在 App 同一位置校验并导入。自导入教材需先在 App 安装对应课程，课程与学习备份分别迁移。</text><WPButton kind="secondary" @click="openBackup">前往学习备份</WPButton></view>
  </view>
 </view>
</template>
<script setup lang="ts">
import {watch,nextTick,onUnmounted} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import {WORDPAL_APK_URL,openWordPalDownload} from '../../services/install'
import {navigate} from '../../services/navigation'
const props=defineProps<{open:boolean}>(),emit=defineEmits<{close:[]}>()
function openBackup(){emit('close');navigate('parent')}
// #ifdef H5
function keyboard(event:KeyboardEvent){
 if(!props.open)return
 if(event.key==='Escape'){event.preventDefault();emit('close');return}
 if(event.key!=='Tab')return
 const elements=Array.from(document.querySelectorAll<HTMLElement>('.install-panel a,.install-panel button,.install-panel uni-button')).filter(el=>!el.hasAttribute('disabled'))
 if(!elements.length)return
 const first=elements[0],last=elements.at(-1)!
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
document.addEventListener('keydown',keyboard)
watch(()=>props.open,async open=>{await nextTick();(document.querySelector(open?'.install-download':'.install-trigger') as HTMLElement|null)?.focus()})
onUnmounted(()=>document.removeEventListener('keydown',keyboard))
// #endif
</script>
<style scoped>
.install-backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:calc(16px + env(safe-area-inset-top,0px)) 16px calc(16px + env(safe-area-inset-bottom,0px));background:var(--wp-scrim);box-sizing:border-box}
.install-panel{width:100%;max-width:480px;min-width:0;max-height:100%;overflow-y:auto;overscroll-behavior:contain;padding:24px;display:flex;flex-direction:column;gap:16px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-dialog);background:var(--wp-surface);color:var(--wp-foreground);box-shadow:var(--wp-shadow-raised);line-height:1.65;overflow-wrap:anywhere}
.install-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.install-heading>view{min-width:0}.install-heading .wp-button{flex-shrink:0;min-height:56px;padding:0 10px}
.install-download{width:100%;box-sizing:border-box;text-decoration:none;flex-shrink:0;min-height:56px}.install-steps,.install-backup{display:flex;flex-direction:column;gap:8px}.install-backup{padding:16px;border-radius:var(--wp-radius-sm);background:var(--wp-surface-tonal)}.install-backup .wp-button{margin-top:4px;width:100%}
@media(max-width:359px){.install-panel{padding:18px}}
</style>
