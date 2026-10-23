<template>
 <view class="custom-route" :class="{'custom-route-compact':compact}" :style="compact?{gridTemplateColumns:'repeat('+session.modes.length+',minmax(0,1fr))'}:undefined" role="list" aria-label="本次练习模式进度">
  <view v-for="(mode,index) in session.modes" :key="mode" role="listitem" class="custom-route-step" :data-mode="mode" :class="{current:session.status!=='completed'&&session.modeIndex===index&&!done(mode),done:done(mode)}">
   <text class="custom-route-number">{{index+1}}</text>
   <image class="custom-route-icon" :src="customResultArtwork.modes[mode]" mode="aspectFit" aria-hidden="true"/>
   <view class="custom-route-copy"><text class="strong">{{CUSTOM_MODE_NAMES[mode]}}</text><text v-if="!compact" class="small muted block">{{descriptions[mode]}}</text></view>
   <view class="custom-route-status"><text class="strong">{{session.results[mode].completedWordIds.length}}/{{session.wordIds.length}}</text><text v-if="!compact" class="small block custom-route-state">{{state(mode,index)}}</text></view>
  </view>
 </view>
</template>
<script setup lang="ts">
import type {LearningMode} from '../../../packages/core_learning'
import type {CustomPracticeSession} from '../../../packages/core_learning/custom-practice'
import {CUSTOM_MODE_NAMES} from '../../services/learning/CustomPractice'
import {customResultArtwork} from '../../services/custom-practice-artwork'
const props=defineProps<{session:CustomPracticeSession;compact?:boolean}>()
const descriptions:Record<LearningMode,string>={flash:'回忆词义',connect:'词义配对',listen:'听音选词',spell:'看中文拼词',dictation:'听音写词'}
function done(mode:LearningMode){return props.session.results[mode].completedWordIds.length===props.session.wordIds.length}
function state(mode:LearningMode,index:number){if(done(mode))return '已完成';if(index!==props.session.modeIndex)return '待开始';if(props.session.status==='running')return '进行中';return props.session.elapsedMs>0||props.session.results[mode].attempts.length||index>0?'已暂停':'待开始'}
</script>
<style scoped>
.custom-route{display:flex;flex-direction:column;gap:6px;min-width:0}.custom-route-step{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-surface);min-width:0;line-height:1.35}.custom-route-number{display:flex;align-items:center;justify-content:center;border:1px solid var(--wp-border);border-radius:50%;width:22px;height:22px;flex-shrink:0;font-size:var(--wp-font-caption)}.custom-route-icon{width:44px;height:44px;flex-shrink:0}.custom-route-copy{min-width:0;flex:1;overflow-wrap:anywhere}.custom-route-copy>.small{margin-top:3px}.custom-route-status{text-align:right;font-size:var(--wp-font-small);flex-shrink:0;font-variant-numeric:tabular-nums}.custom-route-state{margin-top:3px;color:var(--wp-muted-foreground)}.current{border-color:var(--wp-primary);background:var(--wp-secondary)}.current .custom-route-number{background:var(--wp-primary);color:var(--wp-on-primary)}.current .custom-route-state{color:var(--wp-primary)}.done .custom-route-number{border-color:var(--wp-success);color:var(--wp-success)}.done .custom-route-state{color:var(--wp-success)}.custom-route-compact{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}.custom-route-compact .custom-route-step{padding:8px 2px;gap:4px;flex-direction:column;text-align:center;border-radius:14px}.custom-route-compact .custom-route-number{display:none}.custom-route-compact .custom-route-icon{width:30px;height:30px}.custom-route-compact .custom-route-copy{font-size:var(--wp-font-small)}.custom-route-compact .custom-route-status{text-align:center;font-size:var(--wp-font-caption)}
@media(max-width:359px){.custom-route-step{gap:5px;padding:7px 5px}.custom-route-icon{width:38px;height:40px}.custom-route-number{width:20px;height:20px}}
@media(min-width:1000px){.custom-route-compact{display:flex}.custom-route-compact .custom-route-step{padding:14px;gap:10px;flex-direction:row;text-align:left}.custom-route-compact .custom-route-copy{flex:1}.custom-route-compact .custom-route-icon{width:36px;height:36px}}
</style>
