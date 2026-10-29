<template><view class="lh-asset" :class="{'lh-asset-failed':failed}" :aria-hidden="decorative||undefined"><image v-if="!failed" :key="attempt" :src="src" :mode="fit" lazy-load :aria-label="decorative?undefined:label" @load="$emit('load',src)" @error="failed=true;$emit('error',src)"/><view v-else class="lh-asset-error"><text>{{label||'图片暂未加载'}}</text><button v-if="!decorative" role="button" tabindex="0" class="lh-image-retry" @click.stop="attempt++;failed=false">重试</button></view></view></template>
<script setup lang="ts">
import {ref,watch} from 'vue'
const props=withDefaults(defineProps<{src:string;label?:string;decorative?:boolean;fit?:'aspectFit'|'aspectFill'}>(),{decorative:false,fit:'aspectFit'})
const failed=ref(false),attempt=ref(0)
defineEmits<{error:[src:string];load:[src:string]}>()
watch(()=>props.src,()=>{failed.value=false;attempt.value++})
</script>
<style scoped>
.lh-asset{display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;width:100%;height:100%;flex-shrink:0}.lh-asset image{display:block;width:100%;height:100%}.lh-asset-error{max-width:100%;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;color:var(--lh-muted);font-size:var(--wp-font-caption);overflow-wrap:anywhere}.lh-image-retry{font-size:var(--wp-font-caption);min-height:44px;margin:0;padding:4px 8px;background:var(--lh-surface);color:var(--lh-ink);border:1px solid var(--lh-line);border-radius:10px}
</style>
