<template>
 <WPCard ref="cardRef" class="current-course-card study-current-course" :class="{'course-card-compact':compact,'course-card-stacked':stacked}" :data-course="ready?pack?.courseId:undefined">
  <view class="course-summary-head">
   <view class="current-course-art" aria-hidden="true"><image class="course-art-image" :src="failed.cover?fallbackIcon:compactStudyIcons.cover" mode="aspectFit" @error="failed.cover=true"/></view>
   <text class="current-course-label">当前教材</text>
   <text class="current-course-name" :title="ready?pack?.title:undefined">{{ready?pack?.title:unavailable?'教材资料暂不可用':'尚未选择教材'}}</text>
   <view class="current-course-meta"><view><image class="course-meta-icon" :src="compactStudyIcons.words" mode="aspectFit" aria-hidden="true"/><text>{{ready?summary.words:'—'}} 词</text></view><view><image class="course-meta-icon" :src="compactStudyIcons.units" mode="aspectFit" aria-hidden="true"/><text>{{ready?summary.units:'—'}} 单元</text></view><view><image class="course-meta-icon" :src="compactStudyIcons.level" mode="aspectFit" aria-hidden="true"/><text class="course-level-label" :aria-label="ready?'能力起点 '+levelLabel:'能力起点暂不可用'">{{levelLabel}}</text></view></view>
   <WPButton class="course-choose" :loading="opening" label="选择教材" @click="choose"><text>选择教材</text><view class="course-choose-chevron" aria-hidden="true"/></WPButton>
  </view>
  <view class="course-progress-panel">
   <view class="course-progress-art" :style="{'--course-book-ink':bookInk}" aria-hidden="true"><image class="course-art-image" :src="failed.progress?fallbackIcon:progressIcon" mode="aspectFit" @error="failed.progress=true"/><text v-if="!failed.progress" class="course-level-on-book">{{levelLabel}}</text></view>
   <view class="course-progress-copy">
    <view class="course-plan-line"><text class="course-entry-level" :aria-label="ready?'能力起点 '+levelLabel:'能力起点暂不可用'">{{levelLabel}}</text><text>{{dailyUnavailable?'计划暂不可用':(carried?'待续计划 ':'今日计划 ')+dailyWords+' 词'}}</text></view>
    <view class="course-progress-numbers"><text class="course-progress-label">{{!ready?'资料暂不可用':!progressValid?'进度暂不可用':progress?.total===0?'暂无教材单词':'已学'}}</text><text class="course-completion-count" aria-label="全书已完整学习词数">{{progressValid?progress?.learned+' / '+progress?.total:'— / —'}}</text><text v-if="progressValid&&progress&&progress.total>0" class="course-completion-percent">{{percent}}%</text></view>
    <WPProgress v-if="progressValid&&progress&&progress.total>0" :value="progress.learned" :total="progress.total" label="当前教材完整学习进度"/>
    <view v-else class="course-progress-empty-track" aria-hidden="true"/>
   </view>
  </view>
  <text v-if="!ready" class="small muted block" role="status">{{unavailable?'请先恢复学习档案，再查看教材与学习进度。':'选择已安装的教材后，这里会显示学习计划与进度。'}}</text>
  <view v-if="$slots.default" class="course-status-notes"><slot/></view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref,reactive,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import type {CoursePack} from '../../../packages/content_schema/course'
import type {LearningSession} from '../../../packages/core_learning'
import type {EntryLevel} from '../../../packages/parent_settings'
import {courseSummary} from '../../services/course/CourseSelection'
import {windowLayout} from '../../services/window'
import {useThemeStore} from '../../stores/theme'
import {themePacks} from '../../styles/themes'
import WPCard from '../wp-card/WPCard.vue'
import WPButton from '../wp-button/WPButton.vue'
import WPProgress from '../wp-progress/WPProgress.vue'
import {compactStudyIcons} from '../../services/study-compact-icons'
import progressIcon from '../../static/icons/study-course/progress-book.png'
import fallbackIcon from '../../static/icons/pet-growth/hd-book.png'
const props=defineProps<{pack?:CoursePack|null;plan?:LearningSession|null;progress?:{learned:number;total:number};entryLevel:EntryLevel;today:string;unavailable?:boolean;problem?:string}>(),emit=defineEmits<{choose:[]}>(),theme=useThemeStore()
// The illustration stays cream in dark mode; its lettering keeps the original light-palette ink.
const bookInk=themePacks.clay.buildLight().tokens.primary
const ready=computed(()=>!props.unavailable&&!!props.pack),summary=computed(()=>courseSummary(props.pack))
const ownedPlan=computed(()=>props.plan?.courseId===props.pack?.courseId?props.plan:null)
const levelLabel=computed(()=>{const level=ownedPlan.value?.flow?.entryLevel??props.entryLevel;return ready.value&&[1,2,3,4,5].includes(level)?'L'+level:'—'})
const carried=computed(()=>!!ownedPlan.value&&!ownedPlan.value.completedAt&&ownedPlan.value.date!==props.today)
const dailyUnavailable=computed(()=>!ready.value||!!props.problem||!!props.plan&&!ownedPlan.value),dailyWords=computed(()=>ownedPlan.value?.wordIds.length||0)
// Guard display only. The original textbook selector owns completion and persistence.
const progressValid=computed(()=>ready.value&&!!props.progress&&Number.isInteger(props.progress.total)&&props.progress.total>=0&&Number.isInteger(props.progress.learned)&&props.progress.learned>=0&&props.progress.learned<=props.progress.total)
const percent=computed(()=>progressValid.value&&props.progress&&props.progress.total>0?Math.floor(props.progress.learned/props.progress.total*100):null)
const failed=reactive({cover:false,progress:false}),opening=ref(false),width=ref(340),instance=getCurrentInstance(),cardRef=ref<InstanceType<typeof WPCard>>()
const compact=computed(()=>width.value<520),stacked=computed(()=>width.value<280||Math.max(windowLayout.fontScale,theme.settings.largeText?1.25:1)>=1.4)
let releaseTimer:ReturnType<typeof setTimeout>|undefined,pageVisible=false,disposed=false
function choose(){if(opening.value)return;opening.value=true;emit('choose');releaseTimer=setTimeout(()=>opening.value=false,650)}
function measure(){if(!pageVisible||disposed)return;void nextTick(()=>{if(pageVisible&&!disposed&&instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.study-current-course').boundingClientRect(rect=>{if(pageVisible&&!disposed&&rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()})}
watch(()=>props.pack?.courseId,()=>{failed.cover=false;failed.progress=false})
watch(()=>[windowLayout.width,windowLayout.height,windowLayout.fontScale,theme.settings.largeText],measure)
onMounted(measure);onShow(()=>{pageVisible=true;opening.value=false;measure()});onHide(()=>{pageVisible=false});onUnmounted(()=>{disposed=true;clearTimeout(releaseTimer)})
// #ifdef H5
let observer:ResizeObserver|undefined
watch(cardRef,card=>{observer?.disconnect();const element=card?.$el as HTMLElement|undefined;if(element?.nodeType===1&&typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(measure);observer.observe(element)}},{flush:'post'})
onUnmounted(()=>observer?.disconnect())
// #endif
</script>
<style scoped>
.current-course-card.study-current-course.wp-card{display:flex;flex-direction:column;gap:10px;min-width:0;max-width:100%;padding:16px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-lg);background:var(--wp-surface-raised);box-shadow:var(--wp-elevation)}
.theme-clay .current-course-card.study-current-course.wp-card{background:var(--wp-clay-sky)}
.course-summary-head{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:6px 8px;min-width:0}
.current-course-art{grid-column:1;grid-row:1;width:48px;height:48px}
.course-art-image{display:block;width:100%;height:100%}
.current-course-label{grid-column:2;grid-row:1;font-size:calc(var(--wp-font-body)*1.15);font-weight:700;line-height:1.4;color:var(--wp-foreground);min-width:0;overflow-wrap:anywhere}
.current-course-name{grid-column:1/-1;grid-row:2;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:var(--wp-font-body);font-weight:600;line-height:1.5;color:var(--wp-foreground);min-width:0;overflow-wrap:anywhere}
.current-course-meta{grid-column:1/-1;grid-row:3;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:4px;max-width:100%;padding:4px 6px;border-radius:var(--wp-radius-chip);background:var(--wp-surface);font-size:var(--wp-font-small);line-height:1.5;color:var(--wp-foreground)}
.current-course-meta>view{display:flex;align-items:center;justify-content:center;gap:4px;min-width:0}
.current-course-meta>view+view{border-left:1px solid var(--wp-divider)}
.current-course-meta text{min-width:0;overflow-wrap:anywhere}
.course-meta-icon{width:20px;height:20px;flex:0 0 20px}
.course-choose.wp-button{grid-column:3;grid-row:1;display:flex;align-items:center;justify-content:center;gap:7px;min-width:104px;min-height:48px;max-width:100%;margin:0;padding:8px 10px;border-radius:var(--wp-radius-chip);font-size:var(--wp-font-small);line-height:1.5;white-space:normal}
.course-choose-chevron{flex:0 0 7px;width:7px;height:7px;border-top:2px solid currentColor;border-right:2px solid currentColor;transform:rotate(45deg);margin-right:3px}
.course-progress-panel{display:grid;grid-template-columns:60px minmax(0,1fr);align-items:center;gap:10px;padding:10px;border:1px solid var(--wp-divider);border-radius:var(--wp-radius-sm);background:var(--wp-surface);min-width:0}
.course-progress-art{position:relative;width:60px;height:60px}
.course-level-on-book{position:absolute;left:61%;top:39%;transform:translate(-50%,-50%) rotate(-13deg);font-size:14px;font-weight:700;line-height:1;color:var(--course-book-ink);white-space:nowrap}
.course-progress-copy{display:flex;flex-direction:column;gap:5px;min-width:0;overflow-wrap:anywhere}
.course-plan-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 6px;font-size:var(--wp-font-small);line-height:1.5;color:var(--wp-foreground)}
.course-entry-level{font-weight:700;white-space:nowrap}
.course-progress-label{font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground)}
.course-progress-numbers{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 6px;font-variant-numeric:tabular-nums;line-height:1.5;color:var(--wp-foreground)}
.course-completion-count{font-size:var(--wp-font-body);font-weight:600}.course-completion-percent{margin-left:auto;font-size:var(--wp-font-small);color:var(--wp-primary);font-weight:600}
.course-progress-empty-track{height:9px;border-radius:var(--wp-radius-lg);background:var(--wp-secondary)}
.course-status-notes{display:flex;flex-direction:column;gap:6px;min-width:0}
.course-status-notes :deep(.notice){margin:0;padding:8px 10px}
.course-card-stacked .course-summary-head{grid-template-columns:40px minmax(0,1fr)}
.course-card-stacked .current-course-art{width:40px;height:40px}
.course-card-stacked .course-choose.wp-button{grid-column:1/-1;grid-row:4;width:100%}
.course-card-stacked .current-course-name{-webkit-line-clamp:unset;overflow:visible}
.course-card-stacked .current-course-meta{grid-template-columns:minmax(0,1fr);padding:6px}
.course-card-stacked .current-course-meta>view{justify-content:flex-start}
.course-card-stacked .current-course-meta>view+view{border-left:0}
.course-card-stacked .course-progress-panel{grid-template-columns:minmax(0,1fr)}
[data-mode=dark] .current-course-card.study-current-course.wp-card,.high-contrast .current-course-card.study-current-course.wp-card{box-shadow:none}
.high-contrast .current-course-card.study-current-course.wp-card{border-width:2px}
</style>
