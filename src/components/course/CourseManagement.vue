<template>
 <view class="course-management">
 <text class="section-title">课程管理</text><text class="small muted block">课程安装只增加内容，学习记录与奖励不会改变。</text>
 <view v-if="course.selectionBlocked" class="notice error" role="alert"><text class="block">⚠️ 档案升级未完成或处于只读状态，暂无法切换教材。</text><WPButton kind="secondary" @click="migrationOpen=true">查看处理方式</WPButton></view>
  <view class="course-list"><view v-for="pack in packs" :key="pack.courseId" class="course-item"><view><text class="strong">{{pack.title}}</text><text class="small muted block">{{pack.contentVersion}} · {{pack.vocabulary.length}} 词 · {{pack.abilityLevels.join(' / ')}} · {{installationLabel(pack.courseId)}}</text><text class="small muted block">{{pack.sources.map(s=>s.attribution).join('；')}}</text><text v-if="resourceStatus[pack.courseId]" class="notice">{{resourceStatus[pack.courseId]}}</text><text class="small muted block">已通过 {{profile.db.courseProgress?.[pack.courseId]?.completedLessons.length||0}} 课</text></view><view class="button-row"><WPButton kind="secondary" :disabled="!!archiveStatus[pack.courseId]" @click="selectCourse(pack.courseId)">{{course.currentId===pack.courseId?'当前课程':isCourseInstalled(pack.courseId)?'选择课程':'安装 / 查看'}}</WPButton><WPButton v-if="pack.courseId!=='starter'" kind="quiet" @click="archive(pack.courseId)">{{archiveStatus[pack.courseId]?'恢复课程':'归档课程'}}</WPButton><WPButton kind="quiet" @click="rollback(pack.courseId)">上一内容版本</WPButton><WPButton kind="quiet" @click="exportPack(pack.courseId)">导出课程包</WPButton></view></view></view>
  <text v-if="profile.db.pendingCourseId" class="notice">课程已排队，当前学习的输入和评分保留。完成后可切换。</text>
  <text class="section-title block">导入课程</text><text class="small muted block">选择文件或粘贴 → 来源与字段 → 预览 → 确认安装</text>
  <view class="button-row"><WPButton v-if="canPick" kind="secondary" :loading="busy" @click="chooseFile">选择 JSON / CSV / ZIP 文件</WPButton><WPButton kind="quiet" @click="useTemplate">使用 CSV 模板</WPButton></view>
  <text v-if="!canPick" class="small muted block">此平台文件选择尚待真机验证，可直接粘贴 JSON 或 CSV。</text>
  <WPSegmentedButton :model-value="format" :options="formats" label="课程文本格式" @update:model-value="format=$event as 'json'|'csv'|'markdown';preview=null"/>
  <textarea class="course-textarea" :value="input" :maxlength="2097152" :auto-height="false" aria-label="课程 JSON 或 CSV 文本" placeholder="粘贴课程文本，不包含学习备份或个人信息" @input="updateText(($event as any).detail.value)" @drop="drop" @dragover.prevent/>
  <text class="small muted block">{{fileLabel||'文本入口'}} · {{input.length}} 字符</text>
  <view class="course-metadata"><view><text class="small muted block">课程 ID</text><input v-model="meta.courseId" aria-label="导入课程 ID" class="spelling-input"/></view><view><text class="small muted block">课程名称</text><input v-model="meta.title" aria-label="导入课程名称" class="spelling-input"/></view><view><text class="small muted block">内容版本</text><input v-model="meta.contentVersion" aria-label="导入内容版本" class="spelling-input" placeholder="1.0.0"/></view></view>
  <WPSegmentedButton :model-value="meta.route" :options="routes" label="课程路线" @update:model-value="meta.route=$event as typeof meta.route;preview=null"/>
  <WPSegmentedButton :model-value="meta.level" :options="levels" label="起点能力" :scrollable="true" @update:model-value="meta.level=$event;preview=null"/>
  <view v-if="meta.route==='textbook'" class="course-metadata"><input v-model="meta.publisher" aria-label="教材出版社" class="spelling-input" placeholder="出版社"/><input v-model="meta.edition" aria-label="教材版次名称" class="spelling-input" placeholder="版次名称（年份不明时填写待核对）"/><picker :range="startGrades" range-key="name" :value="Math.max(0,startGrades.findIndex(item=>item.id===meta.startGrade))" aria-label="教材起始年级" @change="meta.startGrade=startGrades[+($event as any).detail.value].id"><view class="course-picker">{{startGrades.find(item=>item.id===meta.startGrade)?.name||'起点待核对'}} ⌄</view></picker><input v-model.number="meta.editionYear" aria-label="教材版本年份" type="number" class="spelling-input" placeholder="版本年份"/><input v-model.number="meta.grade" aria-label="教材年级" type="number" class="spelling-input" placeholder="1–9 年级"/><input v-model="meta.semester" aria-label="教材册次" class="spelling-input" placeholder="上册 / 下册"/></view>
  <text class="small muted block">来源说明（不填写真实姓名）</text><input v-model="meta.sourceNote" aria-label="课程来源说明" class="spelling-input"/>
  <WPActionTile class="course-check" :selected="meta.declared" :aria-pressed="meta.declared" @click="meta.declared=!meta.declared"><text aria-hidden="true">{{meta.declared?'✓':'○'}}</text><text>我确认有权在本机使用此内容；这不授予公开发布许可。</text></WPActionTile>
  <view v-if="format==='csv'" class="course-mapping"><text class="small muted block">字段映射（需要时填写：原表头=标准字段，每行一项）</text><textarea class="mapping-textarea" v-model="mappingText" aria-label="CSV 字段映射" :maxlength="2000" placeholder="英文=word&#10;中文=meaning&#10;phonetic=ipa"/></view>
  <WPButton :loading="busy" :disabled="!input.trim()" @click="prepare">清洗并预览</WPButton>
  <view v-if="preview" class="import-preview" role="status"><text class="strong">导入预览</text><text class="block">{{preview.pack?.title||'需要修正输入'}}</text><text class="small block">新增 {{preview.newCount}} · 可复用 {{Object.keys(preview.reuse).length}} · 重复 {{preview.duplicates}}</text><text class="small muted block">缺音频 {{preview.missingAudio}} · 缺图片 {{preview.missingImages}} · 缺拼读 {{preview.missingPhonics}}。不具备条件的活动会关闭。</text><text v-for="(issue,i) in preview.issues" :key="i" class="notice" :class="{error:issue.severity==='error'}">第 {{issue.line}} 行 · {{issue.field}}：{{issue.message}} {{issue.fix}}</text><WPActionTile v-if="Object.keys(preview.reuse).length" class="course-check" :selected="reuseConfirmed" :aria-pressed="reuseConfirmed" @click="reuseConfirmed=!reuseConfirmed"><text aria-hidden="true">{{reuseConfirmed?'✓':'○'}}</text><text>确认复用这些同义词的已有记忆，不重复创建词卡。</text></WPActionTile><view class="button-row"><WPButton :loading="busy" :disabled="!canInstall" @click="install">确认安装课程</WPButton><WPButton kind="quiet" @click="copyErrors">复制修正清单</WPButton></view></view>
  <text v-if="message" class="notice" role="status">{{message}}</text>
  <DBMigrationSheet :open="migrationOpen" @close="migrationOpen=false"/>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted} from 'vue'
import {strFromU8} from 'fflate'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import WPSegmentedButton from '../button/WPSegmentedButton.vue'
import DBMigrationSheet from './DBMigrationSheet.vue'
import {useCourseStore} from '../../stores/course'
import {courseNeedsReview} from '../../services/course/CourseSelection'
import {openCourseGallery} from '../../services/navigation'
import {useProfileStore} from '../../stores/profile'
import {courseRegistry,archiveStatus,wordById,resourceStatus,isCourseInstalled} from '../../services/content/ContentRegistry'
import {installationLabel} from '../../services/content/CourseDirectory'
import {defaultImportMetadata,previewImport,csvTemplate,type ImportPreview} from '../../services/course-import/ImportWizard'
import {installTextCourse,installMediaCourse,setArchived,rollbackCourse,exportCourse} from '../../services/content/StorageRepository'
import {readZip,makeZip} from '../../services/course-import/ZipImporter'
import {pickCourseFile,canPickCourseFile,downloadLocalFile,type PickedCourseFile} from '../../services/course-import/FilePicker'
const course=useCourseStore(),profile=useProfileStore(),packs=computed(()=>Object.values(courseRegistry)),input=ref(''),format=ref<'json'|'csv'|'markdown'>('csv'),meta=ref(defaultImportMetadata()),preview=ref<ImportPreview|null>(null),reuseConfirmed=ref(false),message=ref(''),busy=ref(false),fileLabel=ref(''),mappingText=ref(''),canPick=canPickCourseFile(),migrationOpen=ref(false)
let mediaFiles:Record<string,Uint8Array>|undefined
watch([meta,mappingText],()=>{preview.value=null;reuseConfirmed.value=false},{deep:true,flush:'sync'})
const startGrades=[{id:null,name:'起点待核对'},{id:1 as const,name:'1 年级起点'},{id:3 as const,name:'3 年级起点'}]
const formats=[{id:'csv',name:'CSV 词表'},{id:'json',name:'JSON 课程'},{id:'markdown',name:'Markdown 表格'}],routes=[{id:'theme',name:'主题词表'},{id:'phonics',name:'拼读路线'},{id:'textbook',name:'教材同步'}],levels=['L1','L2','L3','L4','L5'].map(id=>({id,name:id}))
const canInstall=computed(()=>!!preview.value?.pack&&!preview.value.issues.some(i=>i.severity==='error')&&meta.value.declared&&(!Object.keys(preview.value.reuse).length||reuseConfirmed.value)&&profile.db.version===2)
onMounted(()=>{
 // #ifdef H5
 document.querySelector('.course-textarea textarea')?.setAttribute('aria-label','课程 JSON 或 CSV 文本')
 document.querySelector('.mapping-textarea textarea')?.setAttribute('aria-label','CSV 字段映射')
 // #endif
})
function useTemplate(){format.value='csv';input.value=csvTemplate;mediaFiles=undefined;preview.value=null;fileLabel.value='CSV 模板'}
function updateText(value:string){if(input.value!==value){input.value=value;preview.value=null}}
function prepare(){message.value='';preview.value=previewImport(input.value,format.value,meta.value,wordById,Object.fromEntries(mappingText.value.split(/\r?\n/).map(line=>line.split('=').map(v=>v.trim())).filter(pair=>pair.length===2&&pair[0]&&pair[1])));reuseConfirmed.value=false}
async function receive(file:PickedCourseFile){fileLabel.value=file.name.replace(/^.*[\\/]/,'');mediaFiles=undefined;if(/\.zip$/i.test(file.name)){const parsed=readZip(file.bytes);input.value=JSON.stringify(parsed.pack,null,2);format.value='json';mediaFiles=parsed.files}else if(/\.(json|csv|md)$/i.test(file.name)){if(file.bytes.length>2*1024*1024)throw new Error('课程文本超过 2 MiB。');input.value=strFromU8(file.bytes);format.value=/\.json$/i.test(file.name)?'json':/\.md$/i.test(file.name)?'markdown':'csv'}else throw new Error('请选择 JSON、CSV 或 ZIP。');prepare()}
async function chooseFile(){busy.value=true;try{const file=await pickCourseFile();if(file)await receive(file);else message.value='已取消选择，可以继续粘贴词表。'}catch(error){message.value=(error as Error).message}finally{busy.value=false}}
async function drop(event:any){
 // #ifdef H5
 event.preventDefault();const file=event.dataTransfer?.files?.[0];if(file){try{await receive({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())})}catch(error){message.value=(error as Error).message}}
 // #endif
}
async function install(){if(!canInstall.value)return;busy.value=true;try{const pack=preview.value!.pack!,aliases=preview.value!.reuse;if(pack.assets.length){if(!mediaFiles)throw new Error('媒体尚未导入，请选择带资源的 ZIP。');await installMediaCourse(pack,mediaFiles,aliases,(done,total)=>message.value='保存资源 '+done+' / '+total+'，完成读回校验后才安装。')}else await installTextCourse(pack,aliases);message.value='课程安装完成。选择课程后开始学习；已有学习记录和奖励未改变。';preview.value=null}catch(error){message.value=(error as Error).message}finally{busy.value=false}}
function selectCourse(id:string){if(!isCourseInstalled(id)){openCourseGallery(id);return}if(courseRegistry[id]?.route==='textbook'&&courseNeedsReview(courseRegistry[id])){openCourseGallery(id);return}const result=course.applyCourseSelection(id);message.value=result.message||'';if(!result.ok&&(result.reason==='db-version-mismatch'||result.reason==='db-readonly'))migrationOpen.value=true}
function archive(id:string){try{if(id===course.currentId&&profile.db.session&&!profile.db.session.completedAt)throw new Error('先完成当前学习，再归档当前课程。');setArchived(id,!archiveStatus[id]);if(archiveStatus[id]&&id===course.currentId)course.choose('starter');message.value='课程状态已更新，已学词继续参加到期复习。'}catch(error){message.value=(error as Error).message}}
async function rollback(id:string){try{await rollbackCourse(id);message.value='内容已回退，最新学习记录保持。'}catch(error){message.value=(error as Error).message}}
async function exportPack(id:string){try{const {pack,files}=await exportCourse(id);if(!await downloadLocalFile(pack.courseId+'.zip',makeZip(pack,files)))message.value='此平台暂不能保存文件。';else message.value='课程包已保存至本机应用文件区，不包含个人学习记录。'}catch(error){message.value=(error as Error).message}}
function copyErrors(){if(preview.value)uni.setClipboardData({data:preview.value.issues.map(i=>'第 '+i.line+' 行 '+i.field+'：'+i.message+' '+i.fix).join('\n')||'校验通过，无修正项。'})}
</script>
