<template>
 <WPCard class="home-word-list home-word-list-clay" role="region" :aria-label="title">
  <view class="home-word-content">
   <view class="section-heading"><view class="home-word-heading"><view class="home-word-sprout" aria-hidden="true"><view/><view/><view/></view><text>{{title}}</text></view><WPChip v-if="rows.length" class="home-word-unit" element="water">{{unitLabel}}</WPChip></view>
   <text class="home-word-source">{{sourceLabel}}</text>
   <view v-if="unavailable" class="home-word-empty" role="status">词单暂不可用，请先在设置中恢复档案或对应教材版本。</view>
   <view v-else-if="!rows.length" class="home-word-empty" role="status">当前教材暂无今日任务词单，继续学习时会在这里显示。</view>
   <view v-else class="home-word-grid" :style="{'--home-word-columns':String(columns)}">
    <view v-for="row in rows" :key="row.key" class="home-word-tile" :data-word-id="row.word.id" :data-unit-id="row.unitId">
     <WPActionTile class="home-word-body" toggle-highlight :disabled="!row.word.audio" :aria-label="row.word.word+'，'+row.word.meaning+(row.word.audio?'，听发音':'，暂无离线音频')" @click="play(row)" @cancel="cancel(row)">
      <view class="home-word-picture">
       <template v-if="row.word.image&&!failedImages.has(row.key+':'+row.word.image)">
        <image v-if="extendImage(row.word.image)" class="home-word-image-backdrop" :src="row.word.image" mode="aspectFill" :lazy-load="true" aria-hidden="true"/>
        <image :key="row.key+':'+row.word.image" class="home-word-image" :class="{'image-extended':extendImage(row.word.image)}" :src="row.word.image" :mode="extendImage(row.word.image)?'aspectFit':'aspectFill'" :lazy-load="true" :alt="row.word.meaning" @load="imageLoaded(row.word.image,$event)" @error="failedImages.add(row.key+':'+row.word.image)"/>
       </template>
       <view v-else class="home-word-picture-fallback"><text class="home-word-illustration" aria-hidden="true">{{wordIllustrations[row.word.id]||'▧'}}</text><text>{{wordIllustrations[row.word.id]?'辅助插画':row.word.image?'配图暂不可用':'图片暂缺'}}</text></view>
      </view>
      <view class="home-word-details"><text class="home-word-english">{{row.word.word}}</text><text class="home-word-meaning">{{row.word.meaning||'词义暂缺'}}</text><text v-if="unitCount>1" class="home-word-position">{{row.unitTitle}}</text></view>
     </WPActionTile>
     <view class="home-word-actions"><WPAudioButton :url="row.word.audio" :label="'播放 '+row.word.word+' 的发音'" :owns-playback="playingKey===row.key" icon-only :icon-src="speakerIcon" @click="play(row)"/></view>
    </view>
   </view>
   <text v-if="playbackError" class="home-word-error" role="status">{{playbackError}}</text>
   <text class="home-word-hint">点喇叭可反复听发音；点击词卡可高亮，再次点击取消。</text>
  </view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onHide,onShow} from '@dcloudio/uni-app'
import type {Word} from '../../../packages/core_learning'
import {useCourseStore} from '../../stores/course'
import {useLearningStore} from '../../stores/learning'
import {useProfileStore} from '../../stores/profile'
import {useThemeStore} from '../../stores/theme'
import {getCourseWord} from '../../services/content/ContentRegistry'
import {orderedCourseUnits} from '../../services/learning/CourseStudySequence'
import {audioPlayback,playWord,stopAudio} from '../../services/audio'
import {windowLayout as layout} from '../../services/window'
import {wordIllustrations} from '../wp-word-card/illustrations'
import WPCard from '../wp-card/WPCard.vue'
import WPChip from '../wp-chip/WPChip.vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPAudioButton from '../button/WPAudioButton.vue'
import speakerLight from '../../static/icons/controls/clay-speaker-3d.png'
import speakerDark from '../../static/icons/controls/clay-speaker-3d-dark.png'
const props=defineProps<{today:string}>(),course=useCourseStore(),learning=useLearningStore(),profile=useProfileStore(),theme=useThemeStore()
const speakerIcon=computed(()=>theme.mode==='dark'?speakerDark:speakerLight)
interface HomeWordRow {key:string;word:Word;unitId:string;unitTitle:string}
const unavailable=computed(()=>profile.readOnly||!!profile.bootError||!!learning.planProblem)
const rows=computed<HomeWordRow[]>(()=>unavailable.value?[]:(learning.todayPlan?.wordIds||[]).flatMap(id=>{const word=getCourseWord(course.currentId,id);if(!word)return [];const unit=orderedCourseUnits(course.current).find(unit=>unit.lessons.some(lesson=>lesson.wordIds.includes(id)));return [{key:course.currentId+':'+course.current.contentVersion+':'+id,word,unitId:unit?.id||'',unitTitle:unit?.title||'未分单元'}]}))
const units=computed(()=>Array.from(new Map(rows.value.map(row=>[row.unitId,row.unitTitle])).values())),unitCount=computed(()=>units.value.length),unitLabel=computed(()=>unitCount.value>1?'多个单元':units.value[0]||'本日词单')
const pending=computed(()=>!!learning.todayPlan&&learning.todayPlan.date!==props.today),title=computed(()=>pending.value?'待续学的单词':'今天认识的单词')
const sourceLabel=computed(()=>unavailable.value?'请恢复资料后再查看词单。':pending.value?'待续学 · '+learning.todayPlan!.date+' 的固定词单。':learning.todayPlan?.completedAt?'今日六环节词单已完成，可再次听发音。':'今日任务词单，浏览和听发音不计入已学。')
const width=ref(300),instance=getCurrentInstance(),failedImages=ref(new Set<string>()),imageRatios=ref<Record<string,number>>({}),playingKey=ref(''),audioError=ref('')
const playbackError=computed(()=>audioError.value||(playingKey.value&&audioPlayback.error.value?audioPlayback.error.value.message:''))
const columns=computed(()=>Math.max(layout.fontScale,theme.settings.largeText?1.25:1)>=1.2||width.value<256?1:2)
function extendImage(src:string){const ratio=imageRatios.value[src];return !!ratio&&(ratio<.65||ratio>1.8)}
function imageLoaded(src:string,event:Event){const detail=(event as Event&{detail?:{width:number;height:number}}).detail;if(detail&&detail.width>0&&detail.height>0)imageRatios.value[src]=detail.width/detail.height}
let request=0
function halt(){request++;if(playingKey.value)stopAudio();playingKey.value='';audioError.value=''}
function play(row:HomeWordRow){const epoch=++request;playingKey.value=row.key;audioError.value='';void playWord(row.word,message=>{if(request===epoch&&playingKey.value===row.key)audioError.value=row.word.word+'：'+message})}
function cancel(row:HomeWordRow){if(playingKey.value===row.key)halt()}
watch(()=>props.today+'|'+course.currentId+'|'+rows.value.map(row=>[row.key,row.word.image,row.word.audio,row.word.meaning].join(':')).join('|'),()=>{halt();failedImages.value=new Set();imageRatios.value={}})
function measure(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.home-word-content').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()})}
watch(()=>[layout.width,layout.height,layout.fontScale,theme.settings.largeText],measure)
onMounted(measure);onShow(measure);onHide(halt);onUnmounted(halt)
// #ifdef H5
let observer:ResizeObserver|undefined
function visibility(){if(document.visibilityState==='hidden')halt()}
onMounted(()=>{document.addEventListener('visibilitychange',visibility);const element=instance?.proxy?.$el as HTMLElement|undefined;if(element&&typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(measure);observer.observe(element)}})
onUnmounted(()=>{observer?.disconnect();document.removeEventListener('visibilitychange',visibility)})
// #endif
</script>
<style scoped>
.home-word-list.home-word-list-clay.wp-card{min-width:0;padding:20px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:var(--wp-surface-raised);box-shadow:0 5px 14px rgba(108,73,39,.06)}
.home-word-content{min-width:0;max-width:1040px;margin:auto}
.home-word-list-clay .section-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:0 0 8px}
.home-word-heading{display:flex;align-items:center;gap:8px;min-width:0;font-size:var(--wp-font-section);line-height:1.4;font-weight:700;overflow-wrap:anywhere}
.home-word-unit.wp-chip{margin-left:auto;max-width:100%;border-radius:var(--wp-radius-chip);font-size:var(--wp-font-small);line-height:1.5;white-space:normal;overflow-wrap:anywhere}
.home-word-source,.home-word-hint,.home-word-position{display:block;font-size:var(--wp-font-caption);line-height:1.6;color:var(--wp-muted-foreground);overflow-wrap:anywhere}
.home-word-source{margin-bottom:14px}.home-word-hint{margin-top:14px}.home-word-position{margin-top:auto}
.home-word-sprout{position:relative;flex:0 0 28px;width:28px;height:30px}
.home-word-sprout>view:nth-child(1){position:absolute;left:13px;top:9px;bottom:1px;width:3px;border-radius:3px;background:var(--wp-element-earth)}
.home-word-sprout>view:nth-child(2),.home-word-sprout>view:nth-child(3){position:absolute;width:16px;height:10px;border-radius:2px 12px 2px 12px;background:linear-gradient(150deg,var(--wp-earth-soft),var(--wp-earth));box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
.home-word-sprout>view:nth-child(2){left:0;top:9px;transform:rotate(20deg)}.home-word-sprout>view:nth-child(3){right:0;top:3px;transform:rotate(-55deg)}
.home-word-grid{display:grid;grid-template-columns:repeat(var(--home-word-columns),minmax(0,1fr));align-items:stretch;gap:12px}
.home-word-tile{display:grid;grid-template-columns:minmax(0,1fr) 52px;min-width:0;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 8px rgba(108,73,39,.05);overflow:hidden}
.home-word-body.wp-action-tile{grid-area:1/1/2/3;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:6px;width:100%;min-width:0;min-height:0;margin:0;padding:4px;border:0;border-radius:var(--wp-radius-sm);background:transparent;color:var(--wp-foreground);text-align:left;line-height:1.5}
.home-word-body.wp-action-tile[disabled]{opacity:1}
.home-word-body.wp-action-tile.icon-highlighted{background:var(--wp-secondary);box-shadow:inset 0 0 0 2px var(--wp-primary)}
.home-word-picture{position:relative;width:100%;aspect-ratio:1;border-radius:12px;background:var(--wp-surface-soft);overflow:hidden}
.home-word-image,.home-word-image-backdrop{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover}
/* uni-image paints its visible bitmap in the child div on H5 and App. */
.home-word-image:not(.image-extended) :deep(div){background-position:50% 12%!important}
.home-word-image-backdrop{opacity:.3}.home-word-image.image-extended{object-fit:contain}
.home-word-details{box-sizing:border-box;min-width:0;min-height:48px;width:100%;padding-right:50px}
.home-word-picture-fallback{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:2px;padding:6px;color:var(--wp-muted-foreground);font-size:var(--wp-font-caption);line-height:1.3;text-align:center;overflow-wrap:anywhere}
.home-word-illustration{font-size:28px;line-height:1.2}
.home-word-english{display:block;width:100%;font-size:var(--wp-font-body);line-height:1.35;font-weight:700;word-break:normal;overflow-wrap:anywhere}
.home-word-meaning{display:block;width:100%;font-size:var(--wp-font-small);line-height:1.55;font-weight:400;color:var(--wp-muted-foreground);word-break:normal;overflow-wrap:anywhere}
.home-word-actions{grid-area:1/2/2/3;align-self:end;z-index:1;display:flex;justify-content:flex-end;min-width:0;padding:0 4px 4px 0}
.home-word-actions :deep(.wp-button){box-sizing:border-box;flex:0 0 48px;width:48px;height:48px;min-width:48px;min-height:48px;max-width:100%;margin:0;padding:10px;border:1px solid var(--wp-border);border-radius:50%;line-height:1;background:linear-gradient(150deg,var(--wp-surface-raised),var(--wp-secondary));color:var(--wp-foreground);box-shadow:inset 0 2px 2px rgba(255,255,255,.45),0 2px 3px rgba(108,73,39,.12)}
.home-word-actions :deep(.audio-control-icon){width:28px;height:28px;flex-shrink:0}
.home-word-actions :deep(.playing){outline:2px double var(--wp-primary);outline-offset:-5px}
.home-word-actions :deep(.audio-failed){border-style:dashed}
.home-word-actions :deep([data-audio-state="loading"]){outline:2px dotted var(--wp-primary);outline-offset:-4px}
.high-contrast .home-word-actions :deep(.wp-button){border:2px solid var(--wp-foreground);box-shadow:none}
.home-word-empty,.home-word-error{display:block;padding:14px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);font-size:var(--wp-font-small);line-height:1.6;color:var(--wp-foreground);background:var(--wp-secondary);overflow-wrap:anywhere}
.home-word-error{margin-top:12px}
.high-contrast .home-word-list.home-word-list-clay.wp-card,.high-contrast .home-word-tile{box-shadow:none;border-width:2px}
.reduce-motion .home-word-body.wp-action-tile:active,.reduce-motion .home-word-actions :deep(.wp-button:active){transform:none}
@media(max-width:599px){.home-word-list.home-word-list-clay.wp-card{padding:16px}}
@media(prefers-reduced-motion:reduce){.home-word-body.wp-action-tile:active,.home-word-actions :deep(.wp-button:active){transform:none}}
</style>
