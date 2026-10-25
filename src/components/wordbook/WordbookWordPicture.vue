<template>
 <view class="wordbook-word-picture">
  <image v-if="word.image&&!failed" :key="word.id+word.image" :src="word.image" :alt="word.word+'：'+word.meaning" mode="aspectFit" lazy-load @error="failed=true"/>
  <view v-else class="wordbook-picture-fallback" role="img" :aria-label="word.image?'配图暂不可用':'暂无配图'"><text aria-hidden="true">{{wordIllustrations[word.id]||'▧'}}</text><text>{{word.image?'配图暂缺':'暂无配图'}}</text></view>
 </view>
</template>
<script setup lang="ts">
import {ref,watch} from 'vue'
import type {Word} from '../../../packages/core_learning'
import {wordIllustrations} from '../wp-word-card/illustrations'
const props=defineProps<{word:Word}>(),failed=ref(false)
watch(()=>[props.word.id,props.word.image],()=>{failed.value=false})
</script>
