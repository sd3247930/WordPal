<template>
 <view class="wp-nav-icon" :style="{width:size+'px',height:size+'px'}" aria-hidden="true">
  <image v-if="attempt<2" :key="source" class="wp-nav-icon-image" :src="source" mode="aspectFit" @error="onError"/>
  <text v-else class="wp-nav-icon-fallback">{{fallbackLabel[name]}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useThemeStore} from '../../stores/theme'
import {navIconSvg,type NavIconName} from '../../services/nav-icons'
import {friendlyNavIconSource,friendlyNavFallbackSource} from '../../services/friendly-nav-icons'
const props=withDefaults(defineProps<{name:NavIconName;active?:boolean;size?:number;variant?:'outline'|'friendly'}>(),{active:false,size:24,variant:'outline'})
const theme=useThemeStore()
const appearance=computed(()=>({dark:theme.mode==='dark',highContrast:theme.settings.highContrast,active:props.active}))
const backupSource=computed(()=>props.variant==='friendly'?friendlyNavFallbackSource(props.name,appearance.value):`/static/icons/nav/${theme.settings.themeId}-${theme.mode}-${props.active?'active':theme.settings.highContrast?'contrast':'default'}-${props.name}.png`)
const primarySource=computed(()=>{
 if(props.variant==='friendly')return friendlyNavIconSource(props.name,appearance.value)
 const key=props.active?'primary':theme.settings.highContrast?'foreground':'muted-foreground'
 const color=theme.style.match(new RegExp('(?:^|;)--wp-'+key+':([^;]+)'))?.[1]||'#606975'
 // #ifdef MP-WEIXIN
 return backupSource.value
 // #endif
 // #ifndef MP-WEIXIN
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(navIconSvg(props.name,props.active).replace(/currentColor/g,color))
 // #endif
})
const attempt=ref(0),source=computed(()=>attempt.value===0?primarySource.value:backupSource.value)
const fallbackLabel:Record<NavIconName,string>={home:'家',learn:'学',pet:'宠',review:'词',settings:'设'}
function onError(){attempt.value=attempt.value===0&&primarySource.value!==backupSource.value?1:2}
watch([primarySource,backupSource],()=>{attempt.value=0})
</script>
<style scoped>
.wp-nav-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;aspect-ratio:1;min-width:0}
.wp-nav-icon-image{display:block;width:100%;height:100%;flex-shrink:0}
.wp-nav-icon-fallback{font-size:18px;font-weight:700;line-height:1;color:currentColor}
</style>
