<template>
 <view class="wp-word-card word-card-stack" :data-word-id="word.id" :data-density="entryLevel<=2?'foundation':entryLevel===3?'balanced':'independent'">
  <WPCard class="word-info-card word-primary-card" :class="{'flash-card':variant==='flash'}">
   <view class="flash-card-heading"><text class="flash-card-label">{{heading}}</text><text>{{conceal?'听一听，想一想':showDefinition?'看图记词':'回想中文意思'}}</text></view>
   <view class="word-content"><view class="word-core">
    <WPPhonicsWord v-if="!conceal&&phonics" :word="word.word" :phonics="phonics" :base-size="28" :wrap="true" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/>
    <text v-else class="word" :class="{'word-placeholder':conceal}">{{conceal?'···':word.word}}</text>
    <text v-if="!conceal&&word.ipa" class="ipa">{{word.ipa}}</text>
    <text v-else-if="!conceal" class="word-resource-note">音标暂缺，可先听发音</text>
   </view><view class="word-extra"><slot /></view></view>
  </WPCard>
  <WPCard v-if="showDefinition" class="word-info-card word-meaning-card word-definition" :data-picture-only="promptPicture?'true':'false'">
   <view class="word-meaning-layout" :class="{'picture-only':promptPicture}">
    <view class="word-picture-stage">
     <image v-if="word.image&&!imageFailed" :key="word.id+':'+word.image" class="word-picture" :src="word.image" mode="aspectFit" :alt="word.meaning" @error="imageErrorHandler"/>
     <view v-else-if="wordIllustrations[word.id]" class="word-picture-fallback"><text class="word-illustration" :aria-label="word.meaning">{{wordIllustrations[word.id]}}</text><text>辅助插画</text></view>
     <view v-else class="word-picture-fallback"><text class="word-illustration" aria-hidden="true">▧</text><text>图片暂缺</text></view>
    </view>
    <view v-if="!promptPicture" class="word-meaning-copy"><text class="word-meaning-label">{{word.pos||'词义'}}</text><text class="meaning">{{word.meaning||'词义暂缺，可以先听发音。'}}</text></view>
   </view>
  </WPCard>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPCard from '../wp-card/WPCard.vue'
import WPPhonicsWord from '../phonics/WPPhonicsWord.vue'
import {wordIllustrations} from './illustrations'
import type {PhonicsData,PhonicsPlaybackState} from '../../../packages/phonics'
import type {Word} from '../../../packages/core_learning'
const props=withDefaults(defineProps<{word:Word;heading?:string;variant?:'default'|'flash';entryLevel?:number;promptPicture?:boolean;conceal?:boolean;revealMeaning?:boolean;showMeaning?:boolean;phonics?:PhonicsData;activeChunkIndex?:number|null;playbackState?:PhonicsPlaybackState}>(),{entryLevel:3,variant:'default',heading:'单词闪现',showMeaning:true})
const showDefinition=computed(()=>(props.showMeaning&&!props.conceal)||props.revealMeaning||props.promptPicture)
const imageFailed=ref(false)
const imageErrorHandler=computed(()=>{const id=props.word.id,src=props.word.image;return ()=>{if(props.word.id===id&&props.word.image===src)imageFailed.value=true}})
watch(()=>[props.word.id,props.word.image],()=>{imageFailed.value=false})
</script>
<style scoped>
.word-card-stack{display:flex;flex-direction:column;gap:var(--wp-card-gap);width:100%;min-width:0;max-width:100%}
.word-card-stack .word-info-card.wp-card{padding:var(--wp-study-card-pad);border:1px solid var(--wp-border);border-radius:var(--wp-radius);box-shadow:var(--wp-elevation);min-width:0;scroll-margin-top:calc(max(var(--wp-native-top,0px),env(safe-area-inset-top,0px)) + 12px)}
.word-primary-card{background:linear-gradient(155deg,var(--wp-surface),var(--wp-surface-tonal))}
.flash-card-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:var(--wp-font-caption);color:var(--wp-muted-foreground);line-height:1.5;margin-bottom:12px}
.flash-card-label{color:var(--wp-primary);font-weight:600}
.word-content{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;min-width:0}
.word-core,.word-extra{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;max-width:100%;min-width:0}
.word-extra:empty{display:none}
.word-core .word{display:block;max-width:100%;font-size:var(--wp-study-word-size);font-weight:700;line-height:1.3;overflow-wrap:anywhere;letter-spacing:0}
.word-placeholder{letter-spacing:.35em!important;color:var(--wp-muted-foreground)}
.ipa{font-family:var(--wp-font-family);font-size:var(--wp-study-ipa-size);color:var(--wp-muted-foreground);line-height:1.6;overflow-wrap:anywhere;max-width:100%}
.word-resource-note{font-size:var(--wp-font-small);color:var(--wp-muted-foreground)}
.word-meaning-card{background:linear-gradient(130deg,var(--wp-surface),var(--wp-surface-tonal));container-type:inline-size}
.word-meaning-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(104px,1fr);align-items:center;gap:var(--wp-card-gap);min-width:0}
.word-picture-stage{width:100%;min-width:0;aspect-ratio:1;position:relative;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:var(--wp-radius-sm);box-shadow:0 0 0 1px var(--wp-divider);overflow:hidden}
.word-picture{display:block;width:100%;height:100%;position:absolute;inset:0;max-width:100%;object-fit:contain}
.word-picture-fallback{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;color:#606975;text-align:center;font-size:14px}
.word-illustration{font-size:36px;line-height:1.2}
.word-meaning-copy{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
.word-meaning-label{font-size:var(--wp-font-caption);color:var(--wp-muted-foreground);line-height:1.5}
.meaning{display:block;width:100%;font-size:var(--wp-study-meaning-size);font-weight:500;line-height:1.55;word-break:normal;overflow-wrap:anywhere;max-width:100%}
.picture-only{grid-template-columns:minmax(0,1fr);max-width:260px;margin:auto}
@container (max-width:240px){.word-meaning-layout{grid-template-columns:minmax(0,1fr)}.word-picture-stage{max-width:220px;margin:auto}}
@media(max-width:479px){.large-text .word-meaning-layout,.scaled-text .word-meaning-layout{grid-template-columns:minmax(0,1fr)}.large-text .word-picture-stage,.scaled-text .word-picture-stage{max-width:240px;margin:auto}}
@media(min-width:840px){.word-meaning-layout{grid-template-columns:minmax(0,1.15fr) minmax(160px,1fr)}.word-picture-stage{max-width:280px;justify-self:center}}
</style>
