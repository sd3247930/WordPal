<template>
 <view class="detail-image-group">
  <view class="detail-image-frame" :style="{aspectRatio:String(ratio)}" :aria-busy="loading||undefined">
   <image v-if="word.image&&!failed" :key="epoch" class="detail-illustration detail-picture" :src="word.image" :alt="word.word+'：'+word.meaning" mode="aspectFit" @load="loaded" @error="failed=true;loading=false"/>
   <view v-else class="detail-image-placeholder" role="img" :aria-label="word.image?'配图暂时无法显示':'暂无配图'"><text class="small muted">{{word.image?'配图暂时无法显示':'暂无配图'}}</text><WPButton v-if="word.image" kind="quiet" @click="retry">重试配图</WPButton></view>
   <text v-if="loading" class="detail-image-loading small muted" role="status">配图加载中</text>
  </view>
  <text v-if="lowResolution" class="small muted block">原图较小，按原始画面完整显示。</text>
 </view>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import type {Word} from '../../../packages/core_learning'
import WPButton from '../wp-button/WPButton.vue'
const props=defineProps<{word:Word}>(),failed=ref(false),epoch=ref(0),ratio=ref(1),loading=ref(!!props.word.image),lowResolution=ref(false)
function loaded(event:Event){
 const detail=(event as Event&{detail?:{width?:number;height?:number}}).detail
 const width=Number(detail?.width)||0,height=Number(detail?.height)||0
 if(width>0&&height>0){ratio.value=Math.max(.6,Math.min(2,width/height));lowResolution.value=Math.max(width,height)<256}
 loading.value=false
}
function retry(){epoch.value++;failed.value=false;loading.value=true;lowResolution.value=false}
</script>
