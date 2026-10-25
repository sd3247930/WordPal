<template>
 <view class="course-management">
 <WPCard id="parent-tool-courses" class="tools-course-card"><view class="parent-section-row"><view class="parent-section-title"><CourseToolsArtwork name="courses"/><text class="section-title">课程管理</text></view><text class="small muted">已安装 {{packs.length}} 个教材</text></view>
 <view v-if="course.selectionBlocked" class="notice error" role="alert">档案只读或升级未完成，暂无法切换。<WPButton kind="quiet" @click="migrationOpen=true">查看处理方式</WPButton></view>
 <view v-if="cleanupPending" class="notice warning" role="status">有 {{cleanupPending}} 个课程待清理媒体。<WPButton kind="quiet" @click="retryCleanupNow">重试清理</WPButton></view>
 <view class="course-list"><view v-for="pack in packs" :key="pack.courseId" class="course-item" :data-course="pack.courseId"><CourseToolsArtwork :course-id="pack.courseId"/><view class="tools-course-info"><text class="strong tools-course-title">{{cleanCourseLabel(pack.title)}}</text><text class="small muted block">{{pack.abilityLevels.join(' / ')}} · {{metrics[pack.courseId].total}} 词 · {{pack.units.length}} 单元 · 已安装</text><text v-if="!profile.readOnly&&!profile.bootError" class="small muted block">已完整学完 {{metrics[pack.courseId].learned}} 词</text><text v-else class="small muted block">学习进度暂不可用</text><view v-if="!profile.readOnly&&!profile.bootError" class="tools-course-progress"><view class="tools-course-track" role="progressbar" :aria-label="pack.title+'完整学习进度'" :aria-valuemin="0" :aria-valuemax="metrics[pack.courseId].total" :aria-valuenow="metrics[pack.courseId].learned"><view :style="{width:metrics[pack.courseId].percent+'%'}"/></view><text class="small">{{metrics[pack.courseId].percent}}%</text></view><text v-if="resourceStatus[pack.courseId]" class="small notice">{{resourceStatus[pack.courseId]}}</text></view><view class="button-row tools-course-actions"><text v-if="course.currentId===pack.courseId" class="small strong tools-current-state">当前使用</text><WPButton v-else kind="secondary" label="设为当前课程" :disabled="busy||course.selectionBlocked" @click="selectCourse(pack.courseId)">设为当前</WPButton><WPButton v-if="pack.courseId!=='starter'" kind="danger" :disabled="busy" @click="openRemoveCourse(pack.courseId)">{{isBundledCourse(pack.courseId)?'卸载':'删除'}}</WPButton><WPButton kind="quiet" :loading="exportingId===pack.courseId" :disabled="busy||!!exportingId" @click="exportPack(pack.courseId)">导出课程包</WPButton></view></view></view>
 <view class="tools-secondary-actions"><WPButton v-if="availablePacks.length" kind="quiet" :aria-expanded="availableOpen" @click="availableOpen=!availableOpen">其他可安装教材 {{availablePacks.length}}</WPButton><WPButton kind="quiet" :aria-expanded="batchOpen" @click="batchOpen=!batchOpen">{{batchOpen?'收起逐册卸载':'逐册卸载'}}</WPButton></view>
 <view v-if="availableOpen" class="tools-available-courses"><view v-for="pack in availablePacks" :key="pack.courseId" class="course-item"><CourseToolsArtwork :course-id="pack.courseId"/><view class="tools-course-info"><text class="strong">{{pack.title}}</text><text class="small muted block">未安装</text></view><WPButton kind="secondary" :loading="installingId===pack.courseId" @click="installCourse(pack.courseId)">安装</WPButton></view></view><CourseBatchUninstallPanel v-if="batchOpen"/></WPCard>
 <WPCard v-show="importOpen" class="tools-import-card">  <view id="parent-tool-import" class="course-import-form"><view class="course-import-heading"><text class="section-title block">导入课程</text><text class="small muted block">选择文件或粘贴词表，检查后确认导入。</text></view>
  <view v-if="progress" class="course-import-progress" :aria-busy="!!job" role="status" aria-live="polite"><view class="course-import-progress-heading"><text class="strong">{{phaseLabel}}</text><text class="small muted">{{elapsed}} 秒</text></view><view class="course-import-track" :class="{indeterminate:!progress.total}" role="progressbar" :aria-label="phaseLabel" :aria-valuemin="0" :aria-valuemax="progress.total||undefined" :aria-valuenow="progress.total?progress.completed:undefined"><view :style="{width:progress.total?Math.floor(progress.completed/progress.total*100)+'%':'30%'}"/></view><text class="small block">{{progressText}}</text><text class="small muted block">{{job?'正在后台分批处理，可继续滚动页面。完成读回校验后才会安装。':progress.phase==='done'?'全部资源已核验，课程已安装。':'检查完成，请确认预览后导入。'}}</text><WPButton v-if="job" kind="quiet" :disabled="cancelRequested" @click="cancelImport">{{cancelRequested?'正在取消并清理…':'取消本次导入'}}</WPButton></view>
  <view class="button-row"><WPButton v-if="canPick" kind="secondary" :disabled="busy||!!exportingId" @click="chooseFile">选择 JSON / CSV / ZIP 文件</WPButton><WPButton kind="quiet" :disabled="busy" @click="useTemplate">使用 CSV 模板</WPButton></view>
  <text v-if="!canPick" class="small muted block">此平台文件选择尚待真机验证，可直接粘贴 JSON 或 CSV。</text>
  <WPSegmentedButton :model-value="format" :disabled="busy||fileMode" :options="formats" label="课程文本格式" @update:model-value="format=$event as 'json'|'csv'|'markdown';preview=null;progress=null"/>
  <view v-if="fileMode" class="course-file-summary"><text class="strong block">{{fileLabel}}</text><text class="small muted block">文件内容已在后台读取，预览显示在下方。</text><WPButton kind="quiet" :disabled="busy" @click="useTextEntry">改为粘贴词表</WPButton></view>
  <textarea v-else class="course-textarea" :disabled="busy" :value="input" :maxlength="2097152" :auto-height="false" aria-label="课程 JSON 或 CSV 文本" placeholder="粘贴课程文本，不包含学习备份或个人信息" @input="updateText(($event as any).detail.value)" @drop="drop" @dragover.prevent/>
  <text class="small muted block">{{fileLabel||'文本入口'}} · {{textLength}} 字符</text>
  <WPActionTile class="course-check" :disabled="busy" :selected="meta.declared" :aria-pressed="meta.declared" @click="meta.declared=!meta.declared"><text class="course-consent-dot" :class="{checked:meta.declared}" aria-hidden="true"/><text>我确认已获授权，可在本设备用于个人学习。导入不代表获得公开发布、分享或商业使用许可。</text></WPActionTile>
  <WPButton v-if="format==='csv'" kind="quiet" :aria-expanded="mappingOpen" @click="mappingOpen=!mappingOpen">{{mappingOpen?'收起表头设置':'自定义表头（可选）'}}</WPButton>
  <view v-if="format==='csv'&&mappingOpen" class="course-mapping"><text class="small muted block">字段映射（需要时填写：原表头=标准字段，每行一项）</text><textarea class="mapping-textarea" :disabled="busy" v-model="mappingText" aria-label="CSV 字段映射" :maxlength="2000" placeholder="英文=word&#10;中文=meaning&#10;phonetic=ipa"/></view>
  <WPButton :loading="busy" :disabled="!textLength||!!exportingId" @click="prepare">检查课程内容</WPButton>
  <view v-if="preview" class="import-preview" role="status"><text class="strong">导入预览</text><text class="block">{{preview.pack?.title||'需要修正输入'}}</text><text class="small block">新增 {{preview.newCount}} · 可复用 {{Object.keys(preview.reuse).length}} · 重复 {{preview.duplicates}}</text><text class="small muted block">缺音频 {{preview.missingAudio}} · 缺图片 {{preview.missingImages}} · 缺拼读 {{preview.missingPhonics}}。不具备条件的活动会关闭。</text><text v-for="(issue,i) in preview.issues.slice(0,30)" :key="i" class="notice" :class="{error:issue.severity==='error'}">第 {{issue.line}} 行 · {{issue.field}}：{{issue.message}} {{issue.fix}}</text><text v-if="preview.issues.length>30" class="small muted">共 {{preview.issues.length}} 项，页面展示前 30 项，可复制完整修正清单。</text><WPActionTile v-if="Object.keys(preview.reuse).length" class="course-check" :disabled="busy" :selected="reuseConfirmed" :aria-pressed="reuseConfirmed" @click="reuseConfirmed=!reuseConfirmed"><text aria-hidden="true">{{reuseConfirmed?'✓':'○'}}</text><text>确认复用这些同义词的已有记忆，不重复创建词卡。</text></WPActionTile><view class="button-row"><WPButton :loading="busy" :disabled="!canInstall||!!exportingId" @click="install">确认导入课程</WPButton><WPButton kind="quiet" :disabled="busy" @click="copyErrors">复制修正清单</WPButton></view></view>
  </view>
</WPCard>
  <text v-if="message" class="notice" role="status">{{message}}</text>
  <DBMigrationSheet :open="migrationOpen" @close="migrationOpen=false"/>
  <CourseDeleteConfirmSheet :open="removeOpen" :busy="deleting" :course-id="removeSnapshot?.courseId" :title="removeSnapshot?.title" :word-count="removeSnapshot?.wordCount" :media-count="removeSnapshot?.mediaCount" :bundled="removeSnapshot?.bundled||false" :candidates="removeCandidates" :needs-replacement="removeNeedsReplacement" :blocked-reason="removeBlocked" :error="removeError" :reset-key="removeAttempt" @cancel="closeRemoveCourse" @confirm="confirmRemoveCourse"/>
 </view>
</template>
<script setup lang="ts">
import {useParentGateStore} from '../../stores/parent-gate'
const parentGate=useParentGateStore()

import {computed,ref,shallowRef,watch,onMounted,onUnmounted,nextTick} from 'vue'
import {strFromU8} from 'fflate'
import WPButton from '../wp-button/WPButton.vue'
import WPCard from '../wp-card/WPCard.vue'
import CourseToolsArtwork from './CourseToolsArtwork.vue'
import {fullCourseWords} from '../../services/learning/DailyLearningPlan'
import {orderedCourseWords} from '../../services/learning/CourseStudySequence'
import WPActionTile from '../button/WPActionTile.vue'
import WPSegmentedButton from '../button/WPSegmentedButton.vue'
import DBMigrationSheet from './DBMigrationSheet.vue'
import {useCourseStore} from '../../stores/course'
import {cleanCourseLabel} from '../../services/course/CourseSelection'
import {courseRemovalPreview,type CourseRemovalPreview} from '../../services/course/CourseRemovalPreview'
import type {CoursePack} from '../../../packages/content_schema/course'
import {openCourseGallery} from '../../services/navigation'
import {useProfileStore} from '../../stores/profile'
import {courseRegistry,wordById,resourceStatus,isCourseInstalled,isBundledCourse,isUserDeleted} from '../../services/content/ContentRegistry'
import {defaultImportMetadata,prepareImportAsync,csvTemplate,type ImportPreview} from '../../services/course-import/ImportWizard'
import {installTextCourse,installMediaCourse,exportCourse,enableBundledCourse,retryCourseCleanup,pendingCleanupCount} from '../../services/content/StorageRepository'
import CourseDeleteConfirmSheet from './CourseDeleteConfirmSheet.vue'
import CourseBatchUninstallPanel from './CourseBatchUninstallPanel.vue'
import {canReinstall} from '../../services/content/CourseDirectory'
import {readZipAsync,makeZip} from '../../services/course-import/ZipImporter'
import {ImportCancelled,assertImportActive,type ImportProgress,type ImportPhase,type ImportWork} from '../../services/course-import/ImportTask'
import {pickCourseFile,canPickCourseFile,downloadLocalFile,type PickedCourseFile} from '../../services/course-import/FilePicker'
const course=useCourseStore(),profile=useProfileStore(),packs=computed(()=>course.installed),input=ref(''),format=ref<'json'|'csv'|'markdown'>('csv'),meta=ref(defaultImportMetadata()),preview=shallowRef<ImportPreview|null>(null),reuseConfirmed=ref(false),message=ref(''),busy=ref(false),fileLabel=ref(''),mappingText=ref(''),mappingOpen=ref(false),canPick=canPickCourseFile(),migrationOpen=ref(false)
// Large file bodies and binary resources never enter Vue's deep proxies or the native view bridge.
let mediaFiles:Record<string,Uint8Array>|undefined,fileText=''
const fileMode=ref(false),fileCharacters=ref(0),textLength=computed(()=>fileMode.value?fileCharacters.value:input.value.length)
const job=shallowRef<{cancelled:boolean}|null>(null),cancelRequested=ref(false),progress=shallowRef<ImportProgress|null>(null),elapsed=ref(0)
const phaseLabels={selecting:'等待选择课程文件',reading:'读取课程文件',decoding:'准备文件内容',unpacking:'解压课程资源',parsing:'解析课程文本',checking:'核对课程与资源',indexing:'匹配已有词条',saving:'保存课程资源',verifying:'读回校验资源',committing:'安装课程',ready:'课程预览已就绪',done:'导入完成'}
const phaseLabel=computed(()=>progress.value?phaseLabels[progress.value.phase]:''),progressText=computed(()=>{const p=progress.value;if(!p)return '';if(p.phase==='selecting')return '请在系统窗口选择文件。';const amount=(n:number)=>p.unit==='bytes'?(n/1048576).toFixed(2)+' MiB':String(n)+(p.unit==='characters'?' 字符':'');return p.total?amount(p.completed)+' / '+amount(p.total)+' · '+Math.floor(p.completed/p.total*100)+'%（本阶段）':'已处理 '+amount(p.completed)})
let elapsedTimer:ReturnType<typeof setInterval>|undefined
function cancelImport(){if(job.value){job.value.cancelled=true;cancelRequested.value=true}}
async function runImport(action:(work:ImportWork)=>Promise<void>,initialPhase:ImportPhase='parsing'){
 if(!canAct()||busy.value||exportingId.value)return
 const token={cancelled:false};let started=Date.now();job.value=token;busy.value=true;cancelRequested.value=false;preview.value=null;message.value='';elapsed.value=0;progress.value={phase:initialPhase,completed:0,total:0,unit:'bytes'}
 elapsedTimer=setInterval(()=>{elapsed.value=Math.floor((Date.now()-started)/1000)},1000)
 let lastProgress=0
 const work:ImportWork={cancelled:()=>token.cancelled||!canAct()||profile.readOnly,onProgress:value=>{if(job.value!==token||token.cancelled||!canAct())return;const now=Date.now();if(progress.value?.phase==='selecting'&&value.phase!=='selecting'){started=now;elapsed.value=0}if(progress.value?.phase!==value.phase||value.completed===value.total||now-lastProgress>=60){progress.value=value;lastProgress=now}}}
 try{uni.hideKeyboard?.();await nextTick();uni.pageScrollTo?.({selector:'.course-import-progress',duration:0});assertImportActive(work);await action(work)}catch(error){preview.value=null;progress.value=null;if(canAct())message.value=error instanceof ImportCancelled?error.message:(error as Error).message}
 finally{clearInterval(elapsedTimer);elapsed.value=Math.floor((Date.now()-started)/1000);if(job.value===token){job.value=null;busy.value=false;cancelRequested.value=false}}
}
watch([meta,mappingText],()=>{preview.value=null;reuseConfirmed.value=false;if(!job.value)progress.value=null},{deep:true,flush:'sync'})
const formats=[{id:'csv',name:'CSV 词表'},{id:'json',name:'JSON 课程'},{id:'markdown',name:'Markdown 表格'}]
const props=withDefaults(defineProps<{active?:boolean}>(),{active:true}),importOpen=defineModel<boolean>('importOpen',{default:false}),availableOpen=ref(false)
const availablePacks=computed(()=>Object.values(courseRegistry).filter(pack=>!isUserDeleted(pack.courseId)&&!isCourseInstalled(pack.courseId)&&canReinstall(pack.courseId)))
const metrics=computed(()=>Object.fromEntries(packs.value.map(pack=>{const total=orderedCourseWords(pack).length,learned=Math.min(total,Object.keys(fullCourseWords(profile.db,pack)).length);return [pack.courseId,{total,learned,percent:total?Math.floor(learned/total*100):0}]})))
function canAct(){return props.active&&parentGate.canAccess()}
watch(()=>props.active,active=>{if(!active){cancelImport();removeOpen.value=false;batchOpen.value=false;preview.value=null;reuseConfirmed.value=false;progress.value=null}})
onUnmounted(()=>{cancelImport();clearInterval(elapsedTimer);mediaFiles=undefined;fileText=''})
const canInstall=computed(()=>!!preview.value?.pack&&!preview.value.issues.some(i=>i.severity==='error')&&meta.value.declared&&(!Object.keys(preview.value.reuse).length||reuseConfirmed.value)&&profile.db.version===2)
onMounted(refreshCleanup);onMounted(()=>{
 // #ifdef H5
 document.querySelector('.course-textarea textarea')?.setAttribute('aria-label','课程 JSON 或 CSV 文本')
 document.querySelector('.mapping-textarea textarea')?.setAttribute('aria-label','CSV 字段映射')
 // #endif
})
function useTextEntry(){if(!canAct()||busy.value)return;fileMode.value=false;fileText='';fileCharacters.value=0;input.value='';mediaFiles=undefined;preview.value=null;fileLabel.value='';progress.value=null}
function useTemplate(){if(!canAct()||busy.value)return;useTextEntry();format.value='csv';input.value=csvTemplate;fileLabel.value='CSV 模板'}
function updateText(value:string){if(busy.value)return;if(input.value!==value){input.value=value;fileLabel.value='';mediaFiles=undefined;preview.value=null;progress.value=null}}
async function prepareCurrent(work:ImportWork){
 const mapping=Object.fromEntries(mappingText.value.split(/\r?\n/).map(line=>line.split('=').map(v=>v.trim())).filter(pair=>pair.length===2&&pair[0]&&pair[1]))
 const result=await prepareImportAsync(fileMode.value?fileText:input.value,format.value,meta.value.declared,wordById,fileLabel.value,mapping,work)
 assertImportActive(work);meta.value=result.meta;preview.value=result.preview
 reuseConfirmed.value=false
}
async function prepare(){await runImport(prepareCurrent)}
async function receive(file:PickedCourseFile,work:ImportWork){
 assertImportActive(work);if(file.bytes.length>50*1024*1024)throw new Error('文件超过 50 MiB。')
 fileLabel.value=file.name.replace(/^.*[\\/]/,'');mediaFiles=undefined;fileMode.value=true;input.value='';fileText='';fileCharacters.value=0
 if(/\.zip$/i.test(file.name)){const parsed=await readZipAsync(file.bytes,work);fileText=parsed.text;format.value='json';mediaFiles=parsed.files}
 else if(/\.(json|csv|md)$/i.test(file.name)){if(file.bytes.length>2*1024*1024)throw new Error('课程文本超过 2 MiB。');fileText=strFromU8(file.bytes);format.value=/\.json$/i.test(file.name)?'json':/\.md$/i.test(file.name)?'markdown':'csv'}else throw new Error('请选择 JSON、CSV、Markdown 或 ZIP。')
 fileCharacters.value=fileText.length;await prepareCurrent(work)
}
async function chooseFile(){await runImport(async work=>{const file=await pickCourseFile(work);assertImportActive(work);if(file)await receive(file,work);else{progress.value=null;message.value='已取消选择，可以继续粘贴词表。'}},'selecting')}
async function drop(event:any){if(!canAct()||busy.value)return;
 // #ifdef H5
 event.preventDefault();const file=event.dataTransfer?.files?.[0];if(file)await runImport(async work=>{if(file.size>50*1024*1024)throw new Error('文件超过 50 MiB。');await receive({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())},work)})
 // #endif
}
async function install(){if(!canInstall.value)return;const pack=preview.value!.pack!,aliases=preview.value!.reuse;await runImport(async work=>{if(pack.assets.length){if(!mediaFiles)throw new Error('媒体尚未导入，请选择带资源的 ZIP。');await installMediaCourse(pack,mediaFiles,aliases,undefined,work)}else await installTextCourse(pack,aliases,work);message.value='课程安装完成。选择课程后开始学习；已有学习记录和奖励未改变。';mediaFiles=undefined;fileText='';fileCharacters.value=0})}
const removeOpen=ref(false),removeTarget=ref(''),cleanupPending=ref(0),installingId=ref(''),batchOpen=ref(false),exportingId=ref(''),deleting=ref(false),removeWasCurrent=ref(false),removeSnapshot=shallowRef<CourseRemovalPreview|null>(null),removeError=ref(''),removeAttempt=ref(0)
let removeSource:CoursePack|undefined,removeFingerprint=''
const removePack=computed(()=>removeTarget.value?courseRegistry[removeTarget.value]:undefined)
const removeCandidates=computed(()=>course.installed.filter(pack=>pack.courseId!==removeTarget.value))
const removeNeedsReplacement=computed(()=>deleting.value?removeWasCurrent.value:removeTarget.value===course.currentId)
const removeBlocked=computed(()=>{
 if(deleting.value)return '' // The registry is evicted before asynchronous media cleanup finishes.
 if(!removeSnapshot.value||!removePack.value||!isCourseInstalled(removeTarget.value))return '该课程已不可用，请关闭后重新核对课程列表。'
 const live=courseRemovalPreview(removePack.value,isBundledCourse(removeTarget.value))
 if(removePack.value!==removeSource||JSON.stringify(live)!==JSON.stringify(removeSnapshot.value))return '课程信息已变化，请关闭后重新确认。'
 if(JSON.stringify(removePack.value)!==removeFingerprint)return '课程内容已变化，请关闭后重新确认。'
 if(removeTarget.value==='starter')return '原创启蒙课程不可卸载，作为兜底保留。'
 if(!canAct())return '本次家长验证已失效，请重新验证。'
 if(profile.readOnly||profile.bootError||profile.db.version!==2)return '档案暂不可用，请先完成升级或导出故障快照。'
 if(removeTarget.value===course.currentId&&!removeCandidates.value.length)return '至少需要保留一份已安装教材。请先安装其他教材。'
 return ''
})
function refreshCleanup(){try{cleanupPending.value=pendingCleanupCount()}catch{cleanupPending.value=0}}
function openRemoveCourse(id:string){
 if(!canAct()||busy.value||exportingId.value)return
 const source=courseRegistry[id],snapshot=courseRemovalPreview(source,isBundledCourse(id))
 if(!snapshot||snapshot.courseId!==id||!isCourseInstalled(id)){message.value='无法确认课程身份或资源数量，请重新打开课程列表。';return}
 removeSource=source;removeFingerprint=JSON.stringify(source);removeSnapshot.value=snapshot;removeTarget.value=id;removeError.value='';removeOpen.value=true
}
function closeRemoveCourse(){if(!deleting.value)removeOpen.value=false}
async function confirmRemoveCourse(replacementId:string){
 if(busy.value||!removeOpen.value)return
 if(!canAct()||removeBlocked.value){removeError.value=removeBlocked.value||'本次家长验证已失效，请重新验证。';removeAttempt.value++;return}
 if(!removeSnapshot.value||removePack.value!==removeSource||JSON.stringify(removePack.value)!==removeFingerprint){removeError.value='课程内容已变化，请关闭后重新核对删除范围。';removeAttempt.value++;return}
 if(removeTarget.value===course.currentId&&(!replacementId||replacementId===removeTarget.value||!isCourseInstalled(replacementId))){removeError.value='请选择另一份已安装教材作为当前课程。';removeAttempt.value++;return}
 // 卸载会移除课程注册表条目，所有文案必须在删除前取值。
 const target=removeTarget.value
 removeWasCurrent.value=target===course.currentId;busy.value=true;deleting.value=true;removeError.value=''
 try{
  const result=await course.uninstall(target,true,replacementId||undefined)
  message.value=result.pendingCleanup?'教材已停用，部分内容待清理，重启后自动重试。本册记录备份已保存。':'教材及本册专属记录已清理，本机记录备份已保存。共享词卡与全局奖励保留。'
  removeOpen.value=false
 }catch(error){removeError.value=(error as Error).message;removeAttempt.value++}
 finally{deleting.value=false;busy.value=false;refreshCleanup()}
}
function installCourse(id:string){
 if(installingId.value===id)return
 if(!canAct())return
 installingId.value=id
 try{enableBundledCourse(id);message.value='教材已安装。需要时再设为当前课程。';refreshCleanup()}
 catch(error){message.value=(error as Error).message}
 finally{installingId.value=''}
}
async function retryCleanupNow(){
 try{const left=await retryCourseCleanup();cleanupPending.value=left;message.value=left?'媒体清理仍未完成，稍后再试。':'媒体清理完成。'}
 catch{message.value='媒体清理仍未完成，稍后再试。'}
}function selectCourse(id:string){if(!canAct())return;if(!isCourseInstalled(id)){openCourseGallery(id);return}const result=course.applyCourseSelection(id);message.value=result.message||'';if(!result.ok&&(result.reason==='db-version-mismatch'||result.reason==='db-readonly'))migrationOpen.value=true}
async function exportPack(id:string){
 if(!canAct()||exportingId.value||busy.value)return
 exportingId.value=id;message.value='正在准备课程包，请稍候…'
 try{
  const {pack,files}=await exportCourse(id,{purpose:'local-backup'})
  const saved=await downloadLocalFile(pack.courseId+'.zip',makeZip(pack,files),{chooseDestination:true})
  message.value=saved?'课程包已保存到本机；仅包含课程内容，不含个人学习记录。原有来源与使用范围保持不变。':'未保存课程包。若取消了保存窗口，可以再次点击导出。'
 }catch(error){message.value=(error as Error).message}
 finally{exportingId.value=''}
}
function copyErrors(){if(!canAct())return;if(preview.value)uni.setClipboardData({data:preview.value.issues.map(i=>'第 '+i.line+' 行 '+i.field+'：'+i.message+' '+i.fix).join('\n')||'校验通过，无修正项。'})}
</script>
