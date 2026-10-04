<template><image class="audio-control-icon" :src="source" mode="aspectFit" aria-hidden="true"/></template>
<script setup lang="ts">
import {computed} from 'vue'
import {useThemeStore} from '../../stores/theme'
const theme=useThemeStore()
const source=computed(()=>{
 // #ifdef MP-WEIXIN
 return `/static/icons/controls/${theme.settings.themeId}-${theme.mode}-speaker.png`
 // #endif
 // #ifndef MP-WEIXIN
 const color=theme.style.match(/(?:^|;)--wp-foreground:([^;]+)/)?.[1]||'#606975'
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>'
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace(/currentColor/g,color))
 // #endif
})
</script>
