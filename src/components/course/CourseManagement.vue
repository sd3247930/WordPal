<template>
 <view class="course-management">
 <text class="section-title">课程管理</text><text class="small muted block">课程安装只增加内容，学习记录与奖励不会改变。</text>
 <view v-if="course.selectionBlocked" class="notice error" role="alert"><text class="block">⚠️ 档案升级未完成或处于只读状态，暂无法切换教材。</text><WPButton kind="secondary" @click="migrationOpen=true">查看处理方式</WPButton></view>
  <view v-if="cleanupPending" class="notice warning" role="status">⚠️ 有 {{cleanupPending}} 个课程的媒体清理未完成。<WPButton kind="secondary" @click="retryCleanupNow">重试清理</WPButton></view>
 <view class="course-list"><view v-for="pack in packs" :key="pack.courseId" class="course-item"><view><text class="strong">{{cleanCourseLabel(pack.title)}}</text><text class="small muted block">{{pack.contentVersion}} · {{pack.vocabulary.length}} 词 · {{pack.abilityLevels.join(' / ')}} · {{installationLabel(pack.courseId)}}</text><text class="small muted block">仅本机学习使用</text><text v-if="resourceStatus[pack.courseId]" class="notice">{{resourceStatus[pack.courseId]}}</text><text class="small muted block">已通过 {{profile.db.courseProgress?.[pack.courseId]?.completedLessons.length||0}} 课</text></view><view class="button-row"><WPButton v-if="isCourseInstalled(pack.courseId)" kind="secondary" @click="selectCourse(pack.courseId)">{{course.currentId===pack.courseId?'当前课程':'设为当前课程'}}</WPButton><WPButton v-if="!isCourseInstalled(pack.courseId)&&canReinstall(pack.courseId)" kind="secondary" @click="installCourse(pack.courseId)">{{installingId===pack.courseId?'安装中…':'安装'}}</WPButton><WPButton v-if="isCourseInstalled(pack.courseId)&&pack.courseId!=='starter'" kind="danger" @click="openRemoveCourse(pack.courseId)">{{isBundledCourse(pack.courseId)?'卸载':'删除'}}</WPButton><WPButton kind="quiet" :loading="exportingId===pack.courseId" :disabled="busy||!!exportingId" @click="exportPack(pack.courseId)">导出课程包</WPButton></view></view></view>
  <view class="button-row"><WPButton kind="secondary" :aria-expanded="batchOpen" @click="batchOpen=!batchOpen">{{batchOpen?'收起逐册卸载':'逐册卸载'}}</WPButton></view>
 <CourseBatchUninstallPanel v-if="batchOpen"/>
  <view class="course-import-form"><view class="course-import-heading"><text class="section-title block">导入课程</text><text class="small muted block">选择文件或粘贴词表，检查后确认导入。</text></view>
  <view class="button-row"><WPButton v-if="canPick" kind="secondary" :loading="busy" @click="chooseFile">选择 JSON / CSV / ZIP 文件</WPButton><WPButton kind="quiet" @click="useTemplate">使用 CSV 模板</WPButton></view>
  <text v-if="!canPick" class="small muted block">此平台文件选择尚待真机验证，可直接粘贴 JSON 或 CSV。</text>
  <WPSegmentedButton :model-value="format" :options="formats" label="课程文本格式" @update:model-value="format=$event as 'json'|'csv'|'markdown';preview=null"/>
  <textarea class="course-textarea" :value="input" :maxlength="2097152" :auto-height="false" aria-label="课程 JSON 或 CSV 文本" placeholder="粘贴课程文本，不包含学习备份或个人信息" @input="updateText(($event as any).detail.value)" @drop="drop" @dragover.prevent/>
  <text class="small muted block">{{fileLabel||'文本入口'}} · {{input.length}} 字符</text>
  <WPActionTile class="course-check" :selected="meta.declared" :aria-pressed="meta.declared" @click="meta.declared=!meta.declared"><text class="course-consent-dot" :class="{checked:meta.declared}" aria-hidden="true"/><text>我确认已获授权，可在本设备用于个人学习。导入不代表获得公开发布、分享或商业使用许可。</text></WPActionTile>
  <WPButton v-if="format==='csv'" kind="quiet" :aria-expanded="mappingOpen" @click="mappingOpen=!mappingOpen">{{mappingOpen?'收起表头设置':'自定义表头（可选）'}}</WPButton>
  <view v-if="format==='csv'&&mappingOpen" class="course-mapping"><text class="small muted block">字段映射（需要时填写：原表头=标准字段，每行一项）</text><textarea class="mapping-textarea" v-model="mappingText" aria-label="CSV 字段映射" :maxlength="2000" placeholder="英文=word&#10;中文=meaning&#10;phonetic=ipa"/></view>
  <WPButton :loading="busy" :disabled="!input.trim()" @click="prepare">检查课程内容</WPButton>
  <view v-if="preview" class="import-preview" role="status"><text class="strong">导入预览</text><text class="block">{{preview.pack?.title||'需要修正输入'}}</text><text class="small block">新增 {{preview.newCount}} · 可复用 {{Object.keys(preview.reuse).length}} · 重复 {{preview.duplicates}}</text><text class="small muted block">缺音频 {{preview.missingAudio}} · 缺图片 {{preview.missingImages}} · 缺拼读 {{preview.missingPhonics}}。不具备条件的活动会关闭。</text><text v-for="(issue,i) in preview.issues" :key="i" class="notice" :class="{error:issue.severity==='error'}">第 {{issue.line}} 行 · {{issue.field}}：{{issue.message}} {{issue.fix}}</text><WPActionTile v-if="Object.keys(preview.reuse).length" class="course-check" :selected="reuseConfirmed" :aria-pressed="reuseConfirmed" @click="reuseConfirmed=!reuseConfirmed"><text aria-hidden="true">{{reuseConfirmed?'✓':'○'}}</text><text>确认复用这些同义词的已有记忆，不重复创建词卡。</text></WPActionTile><view class="button-row"><WPButton :loading="busy" :disabled="!canInstall" @click="install">确认导入课程</WPButton><WPButton kind="quiet" @click="copyErrors">复制修正清单</WPButton></view></view>
  </view>
  <text v-if="message" class="notice" role="status">{{message}}</text>
  <DBMigrationSheet :open="migrationOpen" @close="migrationOpen=false"/>
  <CourseDeleteConfirmSheet :open="removeOpen" :title="removePack?.title" :word-count="removePack?.vocabulary.length||0" :media-count="removePack?.assets.length||0" :bundled="removeTarget?isBundledCourse(removeTarget):false" :candidates="removeCandidates" :needs-replacement="removeTarget===course.currentId" :learned-words="removeLearned" :blocked-reason="removeBlocked" @cancel="removeOpen=false" @confirm="confirmRemoveCourse"/>
 </view>
</template>
<script setup lang="ts">
import {useParentGateStore} from '../../stores/parent-gate'
const parentGate=useParentGateStore()

import {computed,ref,watch,onMounted} from 'vue'
import {strFromU8} from 'fflate'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPSegmentedButton from '../button/WPSegmentedButton.vue'
import DBMigrationSheet from './DBMigrationSheet.vue'
import {useCourseStore} from '../../stores/course'
import {cleanCourseLabel} from '../../services/course/CourseSelection'
import {openCourseGallery} from '../../services/navigation'
import {useProfileStore} from '../../stores/profile'
import {courseRegistry,archiveStatus,wordById,resourceStatus,isCourseInstalled,isBundledCourse,isUserDeleted} from '../../services/content/ContentRegistry'
import {installationLabel} from '../../services/content/CourseDirectory'
import {defaultImportMetadata,inferImportMetadata,previewImport,csvTemplate,type ImportPreview} from '../../services/course-import/ImportWizard'
import {installTextCourse,installMediaCourse,exportCourse,enableBundledCourse,retryCourseCleanup,pendingCleanupCount} from '../../services/content/StorageRepository'
import CourseDeleteConfirmSheet from './CourseDeleteConfirmSheet.vue'
import CourseBatchUninstallPanel from './CourseBatchUninstallPanel.vue'
import {canReinstall} from '../../services/content/CourseDirectory'
import {readZip,makeZip} from '../../services/course-import/ZipImporter'
import {pickCourseFile,canPickCourseFile,downloadLocalFile,type PickedCourseFile} from '../../services/course-import/FilePicker'
const course=useCourseStore(),profile=useProfileStore(),packs=computed(()=>Object.values(courseRegistry).filter(pack=>!isUserDeleted(pack.courseId)).map(pack=>({...pack,title:cleanCourseLabel(pack.title)}))),input=ref(''),format=ref<'json'|'csv'|'markdown'>('csv'),meta=ref(defaultImportMetadata()),preview=ref<ImportPreview|null>(null),reuseConfirmed=ref(false),message=ref(''),busy=ref(false),fileLabel=ref(''),mappingText=ref(''),mappingOpen=ref(false),canPick=canPickCourseFile(),migrationOpen=ref(false)
let mediaFiles:Record<string,Uint8Array>|undefined
watch([meta,mappingText],()=>{preview.value=null;reuseConfirmed.value=false},{deep:true,flush:'sync'})
const formats=[{id:'csv',name:'CSV 词表'},{id:'json',name:'JSON 课程'},{id:'markdown',name:'Markdown 表格'}]
const canInstall=computed(()=>!!preview.value?.pack&&!preview.value.issues.some(i=>i.severity==='error')&&meta.value.declared&&(!Object.keys(preview.value.reuse).length||reuseConfirmed.value)&&profile.db.version===2)
onMounted(refreshCleanup);onMounted(()=>{
 // #ifdef H5
 document.querySelector('.course-textarea textarea')?.setAttribute('aria-label','课程 JSON 或 CSV 文本')
 document.querySelector('.mapping-textarea textarea')?.setAttribute('aria-label','CSV 字段映射')
 // #endif
})
function useTemplate(){if(!parentGate.canAccess())return;format.value='csv';input.value=csvTemplate;mediaFiles=undefined;preview.value=null;fileLabel.value='CSV 模板'}
function updateText(value:string){if(input.value!==value){input.value=value;fileLabel.value='';mediaFiles=undefined;preview.value=null}}
function prepare(){
 if(!parentGate.canAccess())return
 message.value=''
 const mapping=Object.fromEntries(mappingText.value.split(/\r?\n/).map(line=>line.split('=').map(v=>v.trim())).filter(pair=>pair.length===2&&pair[0]&&pair[1]))
 try{
  meta.value={...inferImportMetadata(input.value,format.value,fileLabel.value,mapping),declared:meta.value.declared}
  preview.value=previewImport(input.value,format.value,meta.value,wordById,mapping)
 }catch(error){preview.value=null;message.value=(error as Error).message}
 reuseConfirmed.value=false
}
async function receive(file:PickedCourseFile){if(!parentGate.canAccess())return;fileLabel.value=file.name.replace(/^.*[\\/]/,'');mediaFiles=undefined;if(/\.zip$/i.test(file.name)){const parsed=readZip(file.bytes);input.value=JSON.stringify(parsed.pack,null,2);format.value='json';mediaFiles=parsed.files}else if(/\.(json|csv|md)$/i.test(file.name)){if(file.bytes.length>2*1024*1024)throw new Error('课程文本超过 2 MiB。');input.value=strFromU8(file.bytes);format.value=/\.json$/i.test(file.name)?'json':/\.md$/i.test(file.name)?'markdown':'csv'}else throw new Error('请选择 JSON、CSV 或 ZIP。');prepare()}
async function chooseFile(){if(!parentGate.canAccess())return;busy.value=true;try{const file=await pickCourseFile();if(file)await receive(file);else message.value='已取消选择，可以继续粘贴词表。'}catch(error){message.value=(error as Error).message}finally{busy.value=false}}
async function drop(event:any){if(!parentGate.canAccess())return;
 // #ifdef H5
 event.preventDefault();const file=event.dataTransfer?.files?.[0];if(file){try{await receive({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())})}catch(error){message.value=(error as Error).message}}
 // #endif
}
async function install(){if(!parentGate.canAccess())return;if(!canInstall.value)return;busy.value=true;try{const pack=preview.value!.pack!,aliases=preview.value!.reuse;if(pack.assets.length){if(!mediaFiles)throw new Error('媒体尚未导入，请选择带资源的 ZIP。');await installMediaCourse(pack,mediaFiles,aliases,(done,total)=>message.value='保存资源 '+done+' / '+total+'，完成读回校验后才安装。')}else await installTextCourse(pack,aliases);message.value='课程安装完成。选择课程后开始学习；已有学习记录和奖励未改变。';preview.value=null}catch(error){message.value=(error as Error).message}finally{busy.value=false}}
const removeOpen=ref(false),removeTarget=ref(''),cleanupPending=ref(0),installingId=ref(''),batchOpen=ref(false),exportingId=ref('')
const removePack=computed(()=>removeTarget.value?courseRegistry[removeTarget.value]:undefined)
const removeCandidates=computed(()=>course.installed.filter(pack=>pack.courseId!==removeTarget.value))
const removeLearned=computed(()=>removePack.value?removePack.value.vocabulary.filter(word=>!!profile.db.cards[word.id]).length:0)
const removeBlocked=computed(()=>{
 if(removeTarget.value==='starter')return '原创启蒙课程不可卸载，作为兜底保留。'
 if(profile.readOnly)return '档案处于只读状态，暂无法卸载。'
 if(removeTarget.value===course.currentId&&!removeCandidates.value.length)return '至少需要保留一份已安装教材。请先安装其他教材。'
 return ''
})
function refreshCleanup(){try{cleanupPending.value=pendingCleanupCount()}catch{cleanupPending.value=0}}
function openRemoveCourse(id:string){if(!parentGate.canAccess())return;removeTarget.value=id;removeOpen.value=true}
async function confirmRemoveCourse(replacementId:string){
 if(!parentGate.canAccess())return
 // 卸载会移除课程注册表条目，所有文案必须在删除前取值。
 const target=removeTarget.value,removed=removePack.value,learned=removeLearned.value,verb=removed&&isBundledCourse(target)?'卸载':'删除'
 busy.value=true
 try{
  const result=await course.uninstall(target,true,replacementId||undefined)
  const mediaNote=removed?.assets.length?(result.pendingCleanup?'本地媒体文件将在下次启动继续清理。':'本地媒体文件已清理，'):''
  message.value=result.pendingCleanup?'教材已停用，部分内容待清理，重启后自动重试。本册记录备份已保存。':'教材及本册专属记录已清理，本机记录备份已保存。共享词卡与全局奖励保留。'
  removeOpen.value=false
 }catch(error){message.value=(error as Error).message}
 finally{busy.value=false;refreshCleanup()}
}
function installCourse(id:string){
 if(installingId.value===id)return
 if(!parentGate.canAccess())return
 installingId.value=id
 try{enableBundledCourse(id);message.value='教材已安装。需要时再设为当前课程。';refreshCleanup()}
 catch(error){message.value=(error as Error).message}
 finally{installingId.value=''}
}
async function retryCleanupNow(){
 try{const left=await retryCourseCleanup();cleanupPending.value=left;message.value=left?'媒体清理仍未完成，稍后再试。':'媒体清理完成。'}
 catch{message.value='媒体清理仍未完成，稍后再试。'}
}function selectCourse(id:string){if(!parentGate.canAccess())return;if(!isCourseInstalled(id)){openCourseGallery(id);return}const result=course.applyCourseSelection(id);message.value=result.message||'';if(!result.ok&&(result.reason==='db-version-mismatch'||result.reason==='db-readonly'))migrationOpen.value=true}
async function exportPack(id:string){
 if(!parentGate.canAccess()||exportingId.value||busy.value)return
 exportingId.value=id;message.value='正在准备课程包，请稍候…'
 try{
  const {pack,files}=await exportCourse(id,{purpose:'local-backup'})
  const saved=await downloadLocalFile(pack.courseId+'.zip',makeZip(pack,files),{chooseDestination:true})
  message.value=saved?'课程包已保存到本机；仅包含课程内容，不含个人学习记录。原有来源与使用范围保持不变。':'未保存课程包。若取消了保存窗口，可以再次点击导出。'
 }catch(error){message.value=(error as Error).message}
 finally{exportingId.value=''}
}
function copyErrors(){if(!parentGate.canAccess())return;if(preview.value)uni.setClipboardData({data:preview.value.issues.map(i=>'第 '+i.line+' 行 '+i.field+'：'+i.message+' '+i.fix).join('\n')||'校验通过，无修正项。'})}
</script>
