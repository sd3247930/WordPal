<template>
 <view class="parent-management-tools">
  <CourseManagement :active="active" v-model:import-open="importOpen"/>
  <WPCard id="parent-tool-backup" class="tools-transfer-card"><view class="parent-section-title"><ParentSettingsArtwork name="transfer"/><text class="section-title">导入与备份</text></view>
   <text class="small muted block">导入新教材，保存学习档案。</text>
   <view class="tools-transfer-actions"><WPButton kind="secondary" @click="openImport"><ParentSettingsArtwork name="import"/>导入教材</WPButton><WPButton kind="secondary" :disabled="!records.length||profile.readOnly||!!profile.bootError" :loading="exporting" @click="exportCsv"><ParentSettingsArtwork name="csv"/>导出 CSV</WPButton><WPButton kind="secondary" :disabled="!!profile.bootError" :loading="backingUp" @click="backupNow"><ParentSettingsArtwork name="backup"/>立即备份</WPButton></view>
   <text class="small muted block">{{profile.readOnly||profile.bootError?'档案暂不可用，可展开备份与恢复导出故障快照。':records.length?'CSV 仅为正式学习记录，恢复请使用 JSON 完整备份。':'暂无正式记录可导出 CSV，仍可备份完整档案。'}}</text><text v-if="message" class="notice" role="status">{{message}}</text>
   <WPButton kind="quiet" :aria-expanded="backupOpen" @click="backupOpen=!backupOpen">{{backupOpen?'收起备份与恢复':'展开备份与恢复'}}</WPButton>
   <LearningBackupPanel v-show="backupOpen" ref="backupPanel" :active="active&&backupOpen"/>
  </WPCard>
  <WPCard id="parent-tool-data" class="tools-cleanup-card"><ParentDataManagement :active="active"/></WPCard>
 </view>
</template>
<script setup lang="ts">
import {ref,computed,nextTick,watch,onUnmounted} from 'vue'
import WPButton from '../wp-button/WPButton.vue'
import WPCard from '../wp-card/WPCard.vue'
import CourseManagement from '../course/CourseManagement.vue'
import LearningBackupPanel from '../course/LearningBackupPanel.vue'
import ParentDataManagement from './ParentDataManagement.vue'
import ParentSettingsArtwork from './ParentSettingsArtwork.vue'
import {useProfileStore} from '../../stores/profile'
import {useParentGateStore} from '../../stores/parent-gate'
import {parentLearningCsv,parentLearningRecords} from '../../services/parent/ParentDashboardData'
import {downloadLocalFile} from '../../services/course-import/FilePicker'
const props=defineProps<{active:boolean}>(),profile=useProfileStore(),gate=useParentGateStore(),importOpen=ref(false),backupOpen=ref(false),exporting=ref(false),backingUp=ref(false),message=ref(''),backupPanel=ref<InstanceType<typeof LearningBackupPanel>>()
const records=computed(()=>parentLearningRecords(profile.db))
let scrollTimer:ReturnType<typeof setTimeout>|undefined
function scroll(selector:string){clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{if(props.active&&gate.canAccess())uni.pageScrollTo({selector,duration:0})},60)}
function openImport(){if(!props.active||!gate.canAccess())return;importOpen.value=true;void nextTick(()=>scroll('#parent-tool-import'))}
async function backupNow(){if(!props.active||!gate.canAccess()||profile.bootError||backingUp.value)return;backingUp.value=true;backupOpen.value=true;try{await nextTick();await backupPanel.value?.exportBackup();scroll('#parent-tool-backup')}finally{backingUp.value=false}}
async function exportCsv(){if(!props.active||!gate.canAccess()||exporting.value||profile.readOnly||profile.bootError||!records.value.length)return;exporting.value=true;message.value='';try{message.value=await downloadLocalFile('wordpal-learning-records.csv',parentLearningCsv(profile.db))?'学习记录 CSV 已保存到本机，不能用于完整恢复。':'未保存 CSV，请重试。'}catch{message.value='CSV 保存失败，请检查设备存储后重试。'}finally{exporting.value=false}}
watch(()=>props.active,active=>{if(!active){backupOpen.value=false;message.value='';clearTimeout(scrollTimer)}})
onUnmounted(()=>clearTimeout(scrollTimer))
defineExpose({scroll,openImport})
</script>
