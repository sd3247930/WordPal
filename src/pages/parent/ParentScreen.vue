<template>
 <view class="page-heading"><view><view class="eyebrow">GROW AT THEIR OWN PACE</view><text class="page-title">陪孩子，慢慢学会</text><text class="page-subtitle">数据只保存在这台设备上。没有广告，也没有公开排名。</text></view></view>
 <WPCard v-if="!gate.unlocked" class="parent-verify-card">
  <view class="parent-gate" aria-label="家长验证">
   <text class="section-title">家长验证</text><text class="muted block">请家长完成一道九九乘法题，防止孩子误操作。</text>
   <text v-if="gate.state.question" class="parent-math-question" :aria-label="`请回答：${gate.state.question.left} 乘以 ${gate.state.question.right} 等于多少`">{{gate.state.question.left}} × {{gate.state.question.right}} = ?</text>
   <input class="spelling-input parent-answer" type="number" :value="gate.state.input" :maxlength="2" confirm-type="done" :adjust-position="true" :cursor-spacing="100" aria-label="家长验证答案" placeholder="输入答案" @input="inputAnswer" @confirm="verify"/>
   <WPButton :disabled="!gate.state.input" :loading="gate.state.status==='checking'" @click="verify">{{gate.state.status==='checking'?'正在验证…':'验证并打开'}}</WPButton>
   <text class="small muted block">每次进入都需要回答一道新题。</text>
   <WPButton kind="quiet" @click="navigate('settings')">返回设置</WPButton>
  </view>
 </WPCard>
 <text v-if="gateMessage" class="notice parent-gate-message" :class="{error:gate.state.status==='incorrect'}" role="status" aria-live="polite">{{gateMessage}}</text>
 <template v-if="gate.unlocked">
  <view class="parent-grid">
   <WPCard><text class="section-title">最近 7 天</text><view class="weekly-chart" role="img" :aria-label="weekly.map(d=>`${d.label}学习${d.count}次`).join('，')"><view v-for="day in weekly" :key="day.date" class="chart-column"><text class="small strong">{{day.count}}</text><view class="chart-track"><view class="chart-bar" :style="{height:(day.count?Math.max(8,day.count/max*100):0)+'%'}"/></view><text class="small muted">{{day.label}}</text></view></view><view class="mini-stats"><view><text class="metric">{{profile.db.history.length}}</text><text class="small muted">累计有效学习</text></view><view><text class="metric">{{accuracy}}%</text><text class="small muted">累计正确率</text></view><view><text class="metric">{{review.weak.length}}</text><text class="small muted">需要再熟悉</text></view></view><text class="small muted block">正确率是练习反馈，不是对孩子的评价。建议先听音、再回想、最后拼写。</text></WPCard>
   <WPCard><text class="section-title">家长设置</text><ParentLearningSettings/><text v-if="activities.recommendation" class="notice">{{activities.recommendation}}</text><view class="notice">默认完全离线；不使用账号、定位、相机或云同步。跟读仅在主动录音时使用麦克风，录音不上传。</view><text class="section-title">删除学习数据</text><text class="muted block">会清除本设备的单词、进度、灵石与宠物成长。此操作无法撤销。</text><checkbox-group @change="keepCourses=($event as any).detail.value.includes('keep')"><label class="course-check"><checkbox value="keep" :checked="keepCourses"/><text>保留已安装课程内容</text></label></checkbox-group><input class="spelling-input" v-model="deleteText" aria-label="输入删除确认文字" placeholder="输入：删除学习数据"/><WPButton kind="danger" :disabled="deleteText!=='删除学习数据'" @click="erase">删除本设备学习数据</WPButton><text v-if="message" class="notice" role="status">{{message}}</text></WPCard>
  </view>
  <view class="parent-course-stack"><WPCard><CourseManagement/></WPCard><WPCard><LearningBackupPanel/></WPCard></view>
 </template>
</template>
<script setup lang="ts">
import {computed,ref,onUnmounted,onDeactivated,onActivated} from 'vue'
import {onShow,onHide,onUnload,onBackPress} from '@dcloudio/uni-app'
import CourseManagement from '../../components/course/CourseManagement.vue'
import LearningBackupPanel from '../../components/course/LearningBackupPanel.vue'
import ParentLearningSettings from '../../components/parent/ParentLearningSettings.vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import {useParentGateStore} from '../../stores/parent-gate'
import {useActivitiesStore} from '../../stores/activities'
import {clearInstalledCourses} from '../../services/content/StorageRepository'
import {stopAudio} from '../../services/audio'
import {navigate} from '../../services/navigation'
import {useStudyPresentation} from '../../stores/study-presentation'
import {useWordbookStore} from '../../stores/wordbook'
import {useProfileStore} from '../../stores/profile'
import {useReviewStore} from '../../stores/review'
import {localDate} from '../../../packages/core_learning'
const gate=useParentGateStore(),visit={},profile=useProfileStore(),review=useReviewStore(),activities=useActivitiesStore()
const deleteText=ref(''),message=ref(''),gateMessage=ref(''),keepCourses=ref(true)
gate.beginVisit(visit)
function resume(){const wasCurrent=gate.isCurrentVisit(visit);gate.resumeVisit(visit);if(!wasCurrent){gateMessage.value='';deleteText.value=''}}
onShow(resume);onActivated(resume)
function leave(){uni.hideKeyboard();gate.leaveVisit(visit);deleteText.value='';gateMessage.value=''}
onHide(()=>{const pages=getCurrentPages();if(pages[pages.length-1]?.route!=='pages/parent/index')leave()})
onUnload(leave);onUnmounted(leave);onDeactivated(leave)
onBackPress(()=>{leave();navigate('settings');return true})
const weekly=computed(()=>Array.from({length:7},(_,i)=>{const day=new Date();day.setDate(day.getDate()-6+i);const date=localDate(day);return {date,label:`${day.getMonth()+1}/${day.getDate()}`,count:profile.db.history.filter(a=>localDate(new Date(a.at))===date).length}}))
const max=computed(()=>Math.max(1,...weekly.value.map(d=>d.count)))
const accuracy=computed(()=>profile.db.history.length?Math.round(profile.db.history.filter(a=>a.correct).length/profile.db.history.length*100):0)
function inputAnswer(event:any){gateMessage.value='';return gate.setInput(event.detail.value)}
async function verify(){const result=await gate.verify();gateMessage.value=result==='correct'?'✓ 回答正确，正在打开家长设置。':result==='replaced'?'已为你换一道题，请重新作答。':result==='incorrect'?'答案不正确，请再试一次。':gateMessage.value;if(result==='correct')uni.hideKeyboard()}
async function erase(){
 if(!gate.canAccess()||deleteText.value!=='删除学习数据')return
 try{stopAudio();profile.erase();const activitiesCleared=activities.reset();if(!keepCourses.value)await clearInstalledCourses();const presentationCleared=useStudyPresentation().reset();const marksCleared=useWordbookStore().reset();review.refresh();deleteText.value='';message.value=presentationCleared&&marksCleared&&activitiesCleared?'学习数据已删除，可以重新开始。':'学习数据已删除，界面标记未清除，请检查设备存储并重试。'}catch{message.value='删除失败，请检查设备存储。'}
}
</script>
<style lang="scss">
.wp-app .parent-verify-card{max-width:540px;margin:0 auto}
.wp-app .parent-gate{display:flex;flex-direction:column;gap:14px;margin:0}
.wp-app .parent-math-question{font-size:calc(28px * var(--wp-brand-font-scale,1));font-weight:600;line-height:1.4;padding:6px 0}
.wp-app .parent-answer{min-height:56px;font-size:var(--wp-font-body);width:100%;box-sizing:border-box}
.wp-app .parent-gate .wp-button{width:100%}
.wp-app .parent-gate-message{display:block;margin:16px auto;max-width:540px}
</style>
