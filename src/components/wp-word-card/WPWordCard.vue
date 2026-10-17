<template>
 <WPCard class="wp-word-card" :class="{'flash-card':variant==='flash'}" :data-density="entryLevel<=2?'foundation':entryLevel===3?'balanced':'independent'">
  <view v-if="variant==='flash'" class="flash-card-heading"><text class="flash-card-label">单词闪现</text><text>{{showMeaning?'词义已揭晓':'回想中文意思'}}</text></view>
  <view class="word-content" :class="{'word-wide':!conceal&&word.word.length>8}">
   <view class="word-core"><text class="eyebrow">{{word.pos}} · {{word.unit}}</text><WPPhonicsWord v-if="!conceal&&phonics" :word="word.word" :phonics="phonics" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/><text v-else class="word">{{conceal?'···':word.word}}</text><text class="ipa" v-if="!conceal&&entryLevel>=3">{{word.ipa}}</text></view>
   <view v-if="(showMeaning!==false && !conceal) || revealMeaning || promptPicture" class="word-definition"><image v-if="(!conceal||promptPicture)&&word.image&&!imageFailed" class="word-picture" :src="word.image" mode="aspectFit" :alt="word.meaning" @error="imageFailed=true"/><view v-else-if="!conceal||promptPicture" class="word-illustration" aria-hidden="true">{{wordIllustrations[word.id]||'📖'}}</view><text v-if="!promptPicture" class="meaning">{{word.meaning}}</text></view>
   <view class="word-extra"><slot /></view>
  </view>
 </WPCard>
</template>
<script setup lang="ts">
import WPCard from '../wp-card/WPCard.vue'
import {wordIllustrations} from './illustrations'
import WPPhonicsWord from '../phonics/WPPhonicsWord.vue'
import type {PhonicsData,PhonicsPlaybackState} from '../../../packages/phonics'
import {ref,watch} from 'vue'
import type {Word} from '../../../packages/core_learning';const props=withDefaults(defineProps<{word:Word;variant?:'default'|'flash';entryLevel?:number;promptPicture?:boolean;conceal?:boolean;revealMeaning?:boolean;showMeaning?:boolean;phonics?:PhonicsData;activeChunkIndex?:number|null;playbackState?:PhonicsPlaybackState}>(),{entryLevel:3,variant:'default'})
const imageFailed=ref(false);watch(()=>props.word.id,()=>{imageFailed.value=false})
</script>
<style scoped>.word-content{min-height:200px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}.word-core,.word-definition,.word-extra{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}.word-extra{max-width:100%}.word{font-size:var(--wp-font-word);line-height:1.15;font-weight:var(--wp-weight-display);letter-spacing:-1px;overflow-wrap:anywhere}.word-illustration{font-size:40px;line-height:1.3;padding:8px 16px;background:var(--wp-surface-tonal);border-radius:var(--wp-radius)}.ipa{color:var(--wp-muted-foreground);font-size:var(--wp-font-body-large)}.meaning{font-size:22px;font-weight:var(--wp-weight-medium)}.eyebrow{font-size:var(--wp-font-caption);color:var(--wp-muted-foreground)}</style>
<style scoped>
.wp-word-card.flash-card{border-top:3px solid var(--wp-primary);box-shadow:var(--wp-shadow-raised)}
.flash-card .flash-card-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;color:var(--wp-muted-foreground);font-size:var(--wp-font-caption);line-height:1.5;padding-bottom:12px;border-bottom:1px solid var(--wp-divider)}
.flash-card .flash-card-label{font-weight:600;color:var(--wp-primary);letter-spacing:1px}
.wp-word-card.flash-card .word-content{flex-direction:column;flex-wrap:nowrap;gap:16px;min-height:170px;padding-top:20px}
.wp-word-card.flash-card .word-core{flex:none;width:100%;gap:10px}
.flash-card .word-core .eyebrow{display:none}
.wp-word-card.flash-card .word-definition{flex:auto;display:flex;flex-direction:row;justify-content:center;flex-wrap:wrap;width:100%;gap:14px;padding:14px;background:var(--wp-surface-tonal);border-radius:var(--wp-radius-sm)}
.wp-word-card.flash-card .word-picture{width:88px;height:88px;flex-shrink:0;border-radius:var(--wp-radius-sm)}
.flash-card .word-definition .meaning{font-size:var(--wp-font-section);line-height:1.5;overflow-wrap:anywhere}
.wp-word-card.flash-card .word-extra{display:flex;flex-direction:column;gap:8px;flex:none;width:100%;max-width:100%;padding-top:12px;border-top:1px solid var(--wp-divider)}
@media(max-width:599px){.wp-word-card.flash-card .word-content{min-height:146px;padding-top:16px;gap:14px}.flash-card .flash-card-heading{padding-bottom:10px}.wp-word-card.flash-card .word-definition{padding:12px;gap:12px}}
</style>
