<template>
 <view class="learning-backup-panel">
  <text class="section-title">本机学习备份</text><text class="small muted block">学习备份包含记忆、正式队列、课程进度、活动记录、灵石与伙伴成长。只保存到本机应用文件区。</text>
  <view class="button-row"><WPButton kind="secondary" :disabled="!!profile.bootError" @click="exportBackup">导出学习备份</WPButton><WPButton kind="quiet" @click="exportRecovery">导出故障快照</WPButton><WPButton v-if="canPick" kind="quiet" @click="choose">选择备份 JSON</WPButton></view>
  <textarea class="recovery-textarea" :value="input" :maxlength="16777216" aria-label="学习备份文本" placeholder="粘贴本机学习备份；课程文件请使用课程导入" @input="updateText(($event as any).detail.value)"/>
  <WPButton kind="secondary" :disabled="!input.trim()" @click="prepare">校验恢复范围</WPButton>
  <view v-if="preview" class="import-preview"><text class="strong">将替换本设备的学习档案</text><text class="small block">{{Object.keys(preview.cards).length}} 个记忆词卡 · {{preview.history.length}} 条学习记录 · {{preview.gems}} 灵石</text><text class="small muted block">课程内容保留；界面标记和未完成的独立练习将清空。当前档案先保存为恢复前快照。</text><input class="spelling-input" v-model="confirmation" aria-label="输入恢复学习备份确认文字" placeholder="输入：恢复学习备份"/><WPButton kind="danger" :disabled="confirmation!=='恢复学习备份'" @click="restore">确认替换学习档案</WPButton></view>
  <text v-if="message" class="notice" role="status">{{message}}</text>
 </view>
</template>
<script setup lang="ts">
import {useParentGateStore} from '../../stores/parent-gate'
const parentGate=useParentGateStore()

import {ref,onMounted,watch} from 'vue'
import {strFromU8} from 'fflate'
import WPButton from '../wp-button/WPButton.vue'
import {useProfileStore,type Database} from '../../stores/profile'
import {useActivitiesStore} from '../../stores/activities'
import {useStudyPresentation} from '../../stores/study-presentation'
import {useWordbookStore} from '../../stores/wordbook'
import {useReviewStore} from '../../stores/review'
import {makeLearningBackup,previewLearningBackup} from '../../services/storage/LearningBackup'
import {exportRecoverySnapshot} from '../../services/storage/MigrationV1toV2'
import {canPickCourseFile,pickCourseFile,downloadLocalFile} from '../../services/course-import/FilePicker'
import {stopAudio} from '../../services/audio'
const profile=useProfileStore(),input=ref(''),confirmation=ref(''),preview=ref<Database|null>(null),message=ref(''),canPick=canPickCourseFile()
const props=withDefaults(defineProps<{active?:boolean}>(),{active:true})
watch(()=>props.active,active=>{if(!active){confirmation.value='';preview.value=null;message.value=''}})
onMounted(()=>{
 // #ifdef H5
 document.querySelector('.recovery-textarea textarea')?.setAttribute('aria-label','学习备份文本')
 // #endif
})
async function exportBackup(){if(!props.active||!parentGate.canAccess())return;try{message.value=await downloadLocalFile('wordpal-private-learning-backup.json',makeLearningBackup(profile.db))?'学习备份已保存到本机。':'未保存学习备份，请重试。'}catch{message.value='备份无法保存，请检查本机存储。'}}
defineExpose({exportBackup})
async function exportRecovery(){if(!props.active||!parentGate.canAccess())return;try{await downloadLocalFile('wordpal-private-recovery.json',exportRecoverySnapshot());message.value='故障快照已保存，最新档案未被覆盖。'}catch{message.value='故障快照无法保存。'}}
async function choose(){if(!props.active||!parentGate.canAccess())return;try{const file=await pickCourseFile();if(file&&props.active&&parentGate.canAccess()){if(file.bytes.length>16*1024*1024)throw new Error('学习备份过大。');input.value=strFromU8(file.bytes);prepare()}}catch(error){message.value=(error as Error).message}}
function updateText(value:string){if(input.value!==value){input.value=value;preview.value=null}}
function prepare(){if(!props.active||!parentGate.canAccess())return;try{preview.value=previewLearningBackup(input.value);confirmation.value='';message.value='备份校验通过，请核对替换范围。'}catch(error){preview.value=null;message.value=(error as Error).message}}
function restore(){if(!props.active||!parentGate.canAccess())return;if(!preview.value||confirmation.value!=='恢复学习备份')return;if(profile.restore(preview.value)){stopAudio();const cleared=useActivitiesStore().reset()&&useStudyPresentation().reset()&&useWordbookStore().reset();useReviewStore().refresh();preview.value=null;input.value='';confirmation.value='';message.value=cleared?'学习档案已恢复，可以继续原正式队列。':'学习档案已恢复，部分界面状态尚未清除，请检查存储。'}else message.value=profile.storageError}
</script>
