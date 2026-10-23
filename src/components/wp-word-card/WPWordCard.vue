<template>
 <view class="wp-word-card word-card-stack" :class="{'easy-practice-card':practice,'blind-dictation':blind}" :data-word-id="word.id" :data-density="entryLevel<=2?'foundation':entryLevel===3?'balanced':'independent'">
  <WPCard class="word-info-card word-primary-card word-meaning-card" :class="{'flash-card':variant==='flash'}">
   <view v-if="blind" class="dictation-hero">
    <view class="listening-wave" :class="{'wave-playing':playbackState==='playing'}" aria-hidden="true"><view v-for="n in 7" :key="n" :style="{height:(12+(4-Math.abs(4-n))*6)+'px'}"/></view>
    <view class="word-extra"><slot v-if="word.audio"/><text v-else class="word-no-audio" role="status">暂无发音</text></view>
   </view>
   <view v-else class="word-meaning-layout">
    <view class="word-picture-stage">
     <image v-if="word.image&&!imageFailed" :key="word.id+':'+word.image" class="word-picture image-complete" :src="word.image" mode="aspectFit" :alt="imageLabel" @error="imageErrorHandler"/>
     <view v-else class="word-picture-fallback" :class="{'has-image-retry':!!word.image}" role="group" :aria-label="'魔法书占位图，'+(word.image?'图片暂缺':'暂无配图')"><image :src="practiceBadge" mode="aspectFit" aria-hidden="true"/><WPButton v-if="word.image" kind="quiet" class="word-picture-retry" label="重新加载词条图片" @click="imageFailed=false">图片暂缺 · 重试</WPButton><text v-else>图片暂缺</text></view>
    </view>
    <view class="word-content">
     <view class="word-core">
      <view class="word-title-slot"><WPPhonicsWord v-if="!conceal&&phonics" :word="word.word" :phonics="phonics" :base-size="wordSize" :wrap="true" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/><text v-else class="word" :class="{'word-placeholder':conceal,'long-word':wordSize<34}" :aria-label="conceal?'英文暂不展示':undefined">{{conceal?'···':word.word}}</text></view>
      <view v-if="!conceal&&word.ipa" class="word-ipa-slot"><text class="ipa">{{word.ipa}}</text></view>
     </view>
     <view class="word-meaning-copy"><text v-if="definition" class="meaning" :class="{'long-meaning':word.meaning.length>10,'spelling-meaning':mode==='spell'&&conceal}">{{word.meaning||'词义暂缺'}}</text><text v-else class="word-instruction">{{mode==='connect'?'选出词义':mode==='listen'?'听音选词':'想一想，再看答案'}}</text></view>
     <view class="word-extra"><slot v-if="word.audio"/><text v-else class="word-no-audio" role="status">暂无发音</text></view>
    </view>
   </view>
  </WPCard>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPCard from '../wp-card/WPCard.vue'
import WPButton from '../wp-button/WPButton.vue'
import WPPhonicsWord from '../phonics/WPPhonicsWord.vue'
import {practiceBadge} from '../../services/study-mode-icons'
import type {PhonicsData,PhonicsPlaybackState} from '../../../packages/phonics'
import type {Word} from '../../../packages/core_learning'
const props=withDefaults(defineProps<{word:Word;heading?:string;variant?:'default'|'flash';entryLevel?:number;promptPicture?:boolean;conceal?:boolean;revealMeaning?:boolean;showMeaning?:boolean;phonics?:PhonicsData;activeChunkIndex?:number|null;playbackState?:PhonicsPlaybackState;practice?:boolean;mode?:string;correct?:boolean}>(),{entryLevel:3,variant:'default',heading:'单词闪现',showMeaning:true,mode:'',correct:undefined})
const blind=computed(()=>props.mode==='dictation'&&props.conceal)
const wordSize=computed(()=>Array.from(props.word.word).length>18?24:Array.from(props.word.word).length>11?28:34)
const definition=computed(()=>props.mode==='flash'||props.showMeaning&&!props.conceal||props.revealMeaning||props.promptPicture)
// A concealed English answer must not leak through image alt text.
const imageLabel=computed(()=>props.mode==='listen'&&props.conceal?'本题场景图片':props.word.meaning||'词条配图')
const imageFailed=ref(false)
const imageErrorHandler=computed(()=>{const id=props.word.id,src=props.word.image;return ()=>{if(props.word.id===id&&props.word.image===src)imageFailed.value=true}})
watch(()=>[props.word.id,props.word.image].join('\u001f'),()=>{imageFailed.value=false})
</script>
<style scoped>
.word-card-stack{width:100%;min-width:0;max-width:100%;overflow-anchor:none}
.word-card-stack .word-info-card.wp-card{padding:12px;border:1px solid var(--wp-border);border-radius:var(--wp-radius);box-shadow:var(--wp-elevation);min-width:0;background:var(--wp-surface);box-sizing:border-box}
.word-meaning-layout{display:grid;grid-template-columns:minmax(0,42fr) minmax(0,58fr);align-items:center;gap:12px;min-width:0;min-height:160px}
.word-picture-stage{width:100%;height:clamp(160px,46vw,190px);min-width:0;position:relative;background:transparent}
/* Reserve the full height before loading: portrait artwork can use the whole
   left column without clipping its sides or moving the answer controls. */
.word-picture{display:block;width:100%;height:100%;position:absolute;inset:0;object-fit:contain}
.word-picture-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:8px;text-align:center;color:var(--wp-muted-foreground);font-size:var(--wp-font-caption)}.word-picture-fallback>image{width:64px;height:64px;max-width:72%;max-height:65%}
.word-picture-fallback.has-image-retry{padding:4px}.has-image-retry>image{width:36px;height:36px;max-height:36%}.word-picture-fallback .word-picture-retry{min-height:48px;min-width:48px;width:100%;margin:0;padding:2px!important;font-size:var(--wp-font-caption);line-height:1.3;white-space:normal}
.word-content{display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:6px;min-width:0;text-align:left}.word-core{min-width:0;max-width:100%}.word-title-slot{min-height:42px;display:flex;align-items:center;min-width:0}
.word-core .word{display:block;width:100%;max-width:100%;font-size:34px;font-weight:750;line-height:1.2;overflow-wrap:anywhere;letter-spacing:0;text-align:left}.word-core :deep(.phonics-word){justify-content:flex-start}.word-placeholder{color:var(--wp-muted-foreground);letter-spacing:.15em!important}
.word-ipa-slot{min-height:20px;line-height:1.3}.ipa{font-family:var(--wp-font-family);font-size:var(--wp-font-body);color:var(--wp-muted-foreground);overflow-wrap:anywhere;line-height:1.3}
.word-meaning-copy{min-height:30px;min-width:0;display:flex;align-items:center}.meaning{display:block;max-width:100%;font-size:20px;font-weight:600;line-height:1.4;overflow-wrap:anywhere;background:var(--wp-secondary);border-radius:8px;padding:3px 7px;box-sizing:border-box}.meaning.long-meaning{font-size:var(--wp-font-body)}.word-instruction,.word-no-audio{font-size:var(--wp-font-small);line-height:1.5;color:var(--wp-muted-foreground)}
.meaning.spelling-meaning:not(.long-meaning){font-size:max(24px,var(--wp-font-section))}.word-core .word.long-word{font-size:28px}
.word-extra{min-height:48px;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px}.word-extra :deep(.practice-audio.wp-button){min-height:48px!important;height:48px;padding:0 8px!important;width:100%;max-width:180px;white-space:nowrap;font-size:var(--wp-font-small);gap:6px}.word-extra :deep(.audio-control-icon){width:32px!important;height:32px!important}
.dictation-hero{min-height:160px;display:flex;align-items:center;justify-content:center;gap:18px}.dictation-hero .word-extra{min-width:120px}.dictation-hero .word-extra :deep(.practice-audio.wp-button){min-height:104px!important;height:104px;width:150px;max-width:100%;flex-direction:column;gap:6px}.dictation-hero .word-extra :deep(.audio-control-icon){width:58px!important;height:58px!important}
.listening-wave{display:flex;gap:5px;align-items:center;justify-content:center;min-height:48px;color:var(--wp-muted-foreground)}.listening-wave>view{width:4px;border-radius:8px;background:currentColor}.listening-wave.wave-playing{color:var(--wp-primary)}.wave-playing>view:nth-child(even){transform:scaleY(.7)}
@media(min-width:600px){.word-picture-stage{max-width:220px;height:220px;justify-self:center}.word-meaning-layout,.dictation-hero{min-height:164px}.word-info-card{max-width:760px;margin-inline:auto}.word-content{gap:8px}}
@media(max-width:359px){.word-card-stack .word-info-card.wp-card{padding:10px}.word-meaning-layout{gap:10px}.word-core .word{font-size:32px}.word-extra :deep(.practice-audio.wp-button){font-size:var(--wp-font-caption)}}
.large-text .meaning,.scaled-text .meaning{font-size:var(--wp-font-section)}.large-text .word-core .word,.scaled-text .word-core .word{font-size:var(--wp-study-word-size)}
.large-text .word-extra :deep(.practice-audio.wp-button),.scaled-text .word-extra :deep(.practice-audio.wp-button){height:104px;min-height:104px!important;white-space:normal;font-size:var(--wp-font-caption)}
</style>
