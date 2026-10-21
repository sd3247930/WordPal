<template>
 <view class="wp-word-card word-card-stack" :class="{'easy-practice-card':practice}" :data-word-id="word.id" :data-density="entryLevel<=2?'foundation':entryLevel===3?'balanced':'independent'">
  <WPCard v-if="!spellPrompt" class="word-info-card word-primary-card" :class="{'flash-card':variant==='flash'}">
   <view class="flash-card-heading"><text class="flash-card-label">{{heading}}</text><text>{{practice&&conceal&&mode==='spell'?'看中文，想英文':conceal?'听一听，想一想':showDefinition?'看图记词':'回想中文意思'}}</text></view>
   <PracticeCompanionCue v-if="practice&&['spell','dictation'].includes(mode)" :mode="mode" :correct="correct"/>
   <view class="word-content"><view v-if="!(practice&&conceal&&mode==='spell')" class="word-core">
    <view v-if="practice&&conceal&&['listen','dictation'].includes(mode)" class="listening-wave" :class="{'wave-playing':playbackState==='playing'}" aria-hidden="true"><view v-for="n in 7" :key="n" :style="{height:(12+(4-Math.abs(4-n))*6)+'px'}"/></view>
    <WPPhonicsWord v-else-if="!conceal&&phonics" :word="word.word" :phonics="phonics" :base-size="28" :wrap="true" :active-chunk-index="activeChunkIndex" :playback-state="playbackState"/>
    <text v-else class="word" :class="{'word-placeholder':conceal}">{{conceal?'···':word.word}}</text>
    <text v-if="!conceal&&word.ipa" class="ipa">{{word.ipa}}</text>
    <text v-else-if="!conceal" class="word-resource-note">音标暂缺，可先听发音</text>
   </view><view class="word-extra"><slot /></view></view>
  </WPCard>
  <WPCard v-if="showDefinition" class="word-info-card word-meaning-card word-definition" :data-picture-only="promptPicture?'true':'false'">
   <view v-if="spellPrompt" class="block-spelling-prompt"><view class="block-prompt-copy"><text class="word-meaning-label">{{/\s/.test(word.word)?'拼写短语':'拼写单词'}}</text><text class="meaning">{{word.meaning||'词义暂缺，可以先听发音。'}}</text><text class="word-meaning-label">请拼出英文{{/\s/.test(word.word)?'短语':'单词'}}</text></view><PracticeCompanionCue mode="spell"/></view>
   <view class="word-meaning-layout" :class="{'picture-only':promptPicture}">
    <view v-if="!spellPrompt||word.image" class="word-picture-stage">
     <image v-if="practice&&word.image&&!imageFailed" class="word-picture-extension" :src="word.image" mode="aspectFill" aria-hidden="true"/>
     <image v-if="word.image&&!imageFailed" :key="word.id+':'+word.image" class="word-picture" :class="{'image-complete':practice}" :src="word.image" mode="aspectFit" :alt="word.meaning" @load="imageLoadHandler" @error="imageErrorHandler"/>
     <view v-else-if="wordIllustrations[word.id]" class="word-picture-fallback"><text class="word-illustration" :aria-label="word.meaning">{{wordIllustrations[word.id]}}</text><text>辅助插画</text></view>
     <view v-else class="word-picture-fallback"><text class="word-illustration" aria-hidden="true">▧</text><text>图片暂缺</text></view>
    </view>
    <view v-if="!promptPicture&&!spellPrompt" class="word-meaning-copy"><text class="word-meaning-label">{{practice?'词义':word.pos||'词义'}}</text><text class="meaning" :class="{'long-meaning':word.meaning.length>10}">{{word.meaning||'词义暂缺，可以先听发音。'}}</text></view>
   </view>
   <view v-if="spellPrompt" class="word-extra block-prompt-audio"><slot/></view>
  </WPCard>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import WPCard from '../wp-card/WPCard.vue'
import WPPhonicsWord from '../phonics/WPPhonicsWord.vue'
import PracticeCompanionCue from '../study/PracticeCompanionCue.vue'
import {wordIllustrations} from './illustrations'
import type {PhonicsData,PhonicsPlaybackState} from '../../../packages/phonics'
import type {Word} from '../../../packages/core_learning'
const props=withDefaults(defineProps<{word:Word;heading?:string;variant?:'default'|'flash';entryLevel?:number;promptPicture?:boolean;conceal?:boolean;revealMeaning?:boolean;showMeaning?:boolean;phonics?:PhonicsData;activeChunkIndex?:number|null;playbackState?:PhonicsPlaybackState;practice?:boolean;mode?:string;correct?:boolean}>(),{entryLevel:3,variant:'default',heading:'单词闪现',showMeaning:true,mode:'',correct:undefined})
const showDefinition=computed(()=>(props.showMeaning&&!props.conceal)||props.revealMeaning||props.promptPicture)
const spellPrompt=computed(()=>props.practice&&props.mode==='spell'&&props.conceal)
const imageFailed=ref(false)
const imageRatio=ref(1)
const imageLoadHandler=computed(()=>{const id=props.word.id,src=props.word.image;return (event:any)=>{const {width,height}=event.detail||{};if(props.word.id===id&&props.word.image===src&&width>0&&height>0)imageRatio.value=width/height}})
const imageErrorHandler=computed(()=>{const id=props.word.id,src=props.word.image;return ()=>{if(props.word.id===id&&props.word.image===src)imageFailed.value=true}})
watch(()=>[props.word.id,props.word.image].join('\u001f'),()=>{imageFailed.value=false;imageRatio.value=1})
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
.easy-practice-card .word-meaning-layout:not(.picture-only){grid-template-columns:minmax(0,1fr);gap:14px}
.easy-practice-card .word-picture{object-fit:cover}
.easy-practice-card .word-picture.image-complete{object-fit:contain}
.easy-practice-card .word-picture-stage{width:100%;max-width:none!important;aspect-ratio:1;border-radius:16px;box-shadow:none;background:var(--wp-surface-soft,var(--wp-surface-tonal));align-self:center}
.word-picture-extension{position:absolute;inset:0;width:100%;height:100%;filter:blur(8px);transform:scale(1.08);opacity:.55;pointer-events:none}
.easy-practice-card .picture-only{width:100%;max-width:none}
.block-spelling-prompt{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.block-prompt-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:6px}.block-spelling-prompt .meaning{font-size:calc(var(--wp-font-section) + 6px);font-weight:750;line-height:1.5}.block-prompt-audio{margin-top:16px}
.easy-practice-card .word-primary-card>.practice-companion-cue{margin-left:auto;margin-top:-4px;margin-bottom:8px}
.easy-practice-card .word-meaning-label{font-size:var(--wp-font-small);font-weight:500}
.easy-practice-card .meaning{font-size:calc(var(--wp-font-section) + 2px);font-weight:650;line-height:1.5}
.easy-practice-card .meaning.long-meaning{font-size:var(--wp-font-section)}
.listening-wave{display:flex;gap:6px;align-items:center;justify-content:center;min-height:48px;color:var(--wp-muted-foreground)}
.listening-wave>view{width:5px;border-radius:8px;background:currentColor;transition:color 180ms,transform 180ms}
.listening-wave.wave-playing{color:var(--wp-primary)}
.wave-playing>view:nth-child(even){transform:scaleY(.7)}
@media(prefers-reduced-motion:reduce){.listening-wave>view{transition:none}}
@container(max-width:240px){.easy-practice-card .word-meaning-layout:not(.picture-only){grid-template-columns:minmax(0,1fr)}}
@media(max-width:479px){.large-text .easy-practice-card .word-meaning-layout:not(.picture-only),.scaled-text .easy-practice-card .word-meaning-layout:not(.picture-only){grid-template-columns:minmax(0,1fr)}}
</style>
