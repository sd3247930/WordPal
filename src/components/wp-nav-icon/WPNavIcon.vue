<template><image class="wp-nav-icon" :src="source" :style="{width:size+'px',height:size+'px'}" mode="aspectFit" aria-hidden="true"/></template>
<script setup lang="ts">
import {computed} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {navIconSvg,type NavIconName} from '../../services/nav-icons'
const props=withDefaults(defineProps<{name:NavIconName;active?:boolean;size?:number}>(),{active:false,size:24})
const theme=useThemeStore()
const source=computed(()=>{
 const key=props.active?'primary':theme.settings.highContrast?'foreground':'muted-foreground'
 const color=theme.style.match(new RegExp('(?:^|;)--wp-'+key+':([^;]+)'))?.[1]||'#606975'
 // #ifdef MP-WEIXIN
 return `/static/icons/nav/${theme.settings.themeId}-${theme.mode}-${props.active?'active':theme.settings.highContrast?'contrast':'default'}-${props.name}.png`
 // #endif
 // #ifndef MP-WEIXIN
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(navIconSvg(props.name,props.active).replace(/currentColor/g,color))
 // #endif
})
</script>
<style scoped>.wp-nav-icon{display:block;flex-shrink:0}</style>
