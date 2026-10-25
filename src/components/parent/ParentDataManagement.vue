<template>
 <view class="parent-data-management">
  <view class="parent-section-title"><CourseToolsArtwork name="cleanup"/><text class="section-title">学习数据清理</text></view>
  <text class="small muted block">清理答题记录、记忆排程、教材学习进度、练习草稿及单词标记。保留已安装教材、等级设置、灵石与宠物成长。</text>
  <view class="tools-cleanup-scope"><text class="strong">仅清理学习数据</text><text class="small muted block">教材内容保留，可重新开始学习；已领取的奖励标记保留，避免重复发奖。</text></view>
  <text class="small muted block">无法直接撤销，请先在本页“导入与备份”中导出学习备份。手动备份和恢复快照保留。</text>
  <input class="spelling-input" v-model="deleteText" aria-label="输入删除确认文字" placeholder="输入：删除学习数据" :disabled="busy"/>
  <WPButton kind="danger" :disabled="deleteText!=='删除学习数据'||profile.readOnly||!active" :loading="busy" @click="ask">删除本设备学习数据</WPButton>
  <text v-if="profile.readOnly" class="notice error">档案只读，请先通过备份工具检查或恢复。</text><text v-if="message" class="notice" role="status">{{message}}</text>
  <view v-if="confirming" class="sheet-backdrop" @click.self="!busy&&(confirming=false)"><view class="sheet-panel" role="dialog" aria-modal="true" aria-label="清理学习数据确认"><text class="section-title">确认清理学习数据？</text><text class="block">将清除全部教材的学习记录、复习排程、练习草稿与单词标记。已安装教材、等级、灵石、宠物成长及已领取奖励标记保留。</text><text class="small muted block">请确认已导出所需备份。此操作无法直接撤销。</text><view class="button-row"><WPButton kind="quiet" :disabled="busy" @click="confirming=false">取消</WPButton><WPButton kind="danger" :loading="busy" @click="erase">确认清理学习数据</WPButton></view></view></view>
 </view>
</template>
<script setup lang="ts">
import {ref,watch} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import CourseToolsArtwork from '../course/CourseToolsArtwork.vue'
import {useParentGateStore} from '../../stores/parent-gate'
import {useProfileStore} from '../../stores/profile'
import {useCourseStore} from '../../stores/course'
import {useReviewStore} from '../../stores/review'
import {useActivitiesStore} from '../../stores/activities'
import {useStudyPresentation} from '../../stores/study-presentation'
import {useWordbookStore} from '../../stores/wordbook'
import {clearLearningProgress} from '../../services/parent/ClearLearningData'
import {stopAudio} from '../../services/audio'
const gate=useParentGateStore(),profile=useProfileStore(),course=useCourseStore(),review=useReviewStore(),activities=useActivitiesStore(),deleteText=ref(''),message=ref(''),confirming=ref(false),busy=ref(false)
const props=withDefaults(defineProps<{active?:boolean}>(),{active:true})
watch(()=>props.active,active=>{if(!active){deleteText.value='';message.value='';confirming.value=false}})
watch(deleteText,text=>{if(text!=='删除学习数据')confirming.value=false})
function allowed(){return props.active&&gate.canAccess()&&deleteText.value==='删除学习数据'&&!profile.readOnly&&!busy.value}
function ask(){if(allowed())confirming.value=true}
async function erase(){
 if(!allowed()||!confirming.value)return
 busy.value=true;message.value=''
 try{
  if(!profile.transact(d=>clearLearningProgress(d,course.installed.map(pack=>pack.courseId))))throw Error('学习档案未清理，请检查设备存储后重试。')
  stopAudio();const results=[activities.reset(),useStudyPresentation().reset(),useWordbookStore().reset()];review.refresh();confirming.value=false
  if(results.every(Boolean)){deleteText.value='';message.value='学习数据已清理，教材、等级、灵石与宠物成长保留。'}else message.value='学习档案已清理，部分界面缓存未清理；请释放存储空间后重试。'
 }catch(error){message.value=(error as Error).message||'清理失败，请检查设备存储。'}finally{busy.value=false}
}
</script>
