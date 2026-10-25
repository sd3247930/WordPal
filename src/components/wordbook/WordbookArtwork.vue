<template>
 <view class="wordbook-artwork" aria-hidden="true"><image v-if="!failed" :src="wordbookPageIcons[name].src" mode="aspectFit" @error="failed=true"/><text v-else>{{wordbookPageIcons[name].fallback}}</text></view>
</template>
<script setup lang="ts">
import {ref,watch} from 'vue'
import {wordbookPageIcons} from '../../services/wordbook-page-icons'
const props=defineProps<{name:keyof typeof wordbookPageIcons}>(),failed=ref(false)
watch(()=>props.name,()=>{failed.value=false})
</script>
<style scoped>
.wordbook-artwork{display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0}
.wordbook-artwork image{display:block;width:100%;height:100%;object-fit:contain}
</style>
