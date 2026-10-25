<template>
 <view class="parent-page" :class="{'parent-page-locked':!gate.unlocked,'parent-settings-page':gate.unlocked,'parent-tools-page':gate.unlocked&&toolsOpen}">
 <view class="page-heading parent-heading" :class="{'parent-settings-heading':gate.unlocked}"><view class="parent-heading-copy"><WPButton v-if="gate.unlocked&&toolsOpen" class="tools-back" kind="quiet" @click="toolsOpen=false">返回家长设置</WPButton><text class="page-title"><template v-if="gate.unlocked&&toolsOpen"><text class="parent-heading-phrase">教材与</text><text class="parent-heading-phrase">数据工具</text></template><template v-else-if="gate.unlocked"><text class="parent-heading-phrase">陪孩子，</text><text class="parent-heading-phrase">慢慢学会</text></template><template v-else>家长验证</template></text><text class="page-subtitle">{{gate.unlocked?toolsOpen?'管理教材与学习数据':'学习数据保存在本机':'保护学习设置与重要操作'}}</text></view><CourseToolsArtwork v-if="gate.unlocked&&toolsOpen" name="heading"/><ParentSettingsArtwork v-else-if="gate.unlocked" name="heading"/><ParentGateArtwork v-else name="heading"/></view>
 <WPCard v-if="!gate.unlocked" class="parent-verify-card">
  <view class="parent-gate" aria-label="家长验证">
   <view class="parent-gate-intro"><ParentGateArtwork name="question"/><view class="parent-gate-copy"><text class="section-title block">请家长完成验证</text><text class="small muted block">回答一道九九乘法题后继续。</text></view></view>
   <view class="parent-question-surface"><text v-if="gate.state.question" class="parent-math-question" :aria-label="`请回答：${gate.state.question.left} 乘以 ${gate.state.question.right} 等于多少`">{{gate.state.question.left}} × {{gate.state.question.right}} = ?</text></view>
   <view class="parent-answer-wrap" :class="{'parent-answer-error':gate.state.status==='incorrect'}"><input class="spelling-input parent-answer" type="number" :value="gate.state.input" :maxlength="2" confirm-type="done" :adjust-position="true" :cursor-spacing="100" aria-label="家长验证答案" :aria-invalid="gate.state.status==='incorrect'" placeholder="输入答案" placeholder-class="parent-answer-placeholder" @input="inputAnswer" @confirm="verify"/><ParentGateArtwork name="answer"/></view>
   <text v-if="gateMessage" class="notice parent-gate-message" :class="{error:gate.state.status==='incorrect'}" role="status" aria-live="polite">{{gateMessage}}</text>
   <WPButton class="parent-verify-submit" :disabled="!gate.state.input" :loading="gate.state.status==='checking'" @click="verify">{{gate.state.status==='checking'?'正在验证…':'验证并打开'}}</WPButton>
   <view class="parent-gate-tools"><WPButton class="parent-change-question" kind="quiet" label="换一题" @click="changeQuestion"><ParentGateArtwork name="refresh"/><text>换一题</text></WPButton><view class="parent-gate-note"><ParentGateArtwork name="guard"/><text class="small muted">每次进入生成新题，防止误操作。</text></view></view>
  </view>
 </WPCard>
 <WPButton v-if="!gate.unlocked" class="parent-return-settings" kind="quiet" @click="navigate('settings')">返回设置</WPButton>
 <text v-if="gate.unlocked&&gateMessage" class="notice parent-gate-message parent-verified-announcement" role="status" aria-live="polite">{{gateMessage}}</text>
 <ParentDashboard v-if="gate.unlocked" v-model:tools-open="toolsOpen" @reverify="reverify"/>
 </view>
</template>
<script setup lang="ts">
import {ref,onUnmounted,onDeactivated,onActivated,watch} from 'vue'
import {onShow,onHide,onUnload} from '@dcloudio/uni-app'
import ParentDashboard from '../../components/parent/ParentDashboard.vue'
import CourseToolsArtwork from '../../components/course/CourseToolsArtwork.vue'
import ParentSettingsArtwork from '../../components/parent/ParentSettingsArtwork.vue'
import ParentGateArtwork from '../../components/parent/ParentGateArtwork.vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import {useParentGateStore} from '../../stores/parent-gate'
import {navigate} from '../../services/navigation'
const gate=useParentGateStore(),visit={},gateMessage=ref('')
const toolsOpen=defineModel<boolean>('toolsOpen',{default:false})
watch(()=>gate.unlocked,unlocked=>{if(!unlocked)toolsOpen.value=false})
gate.beginVisit(visit)
function resume(){const wasCurrent=gate.isCurrentVisit(visit);gate.resumeVisit(visit);if(!wasCurrent)gateMessage.value=''}
onShow(resume);onActivated(resume)
function leave(){uni.hideKeyboard();gate.leaveVisit(visit);gateMessage.value=''}
onHide(()=>{const pages=getCurrentPages();if(pages[pages.length-1]?.route!=='pages/parent/index')leave()})
onUnload(leave);onUnmounted(leave);onDeactivated(leave)
function reverify(){gate.beginVisit(visit);gateMessage.value=''}
function inputAnswer(event:any){const value=gate.setInput(event.detail.value);gateMessage.value=String(event.detail.value).trim()&&!value?'请输入整数答案。':'';return value}
function changeQuestion(){if(gate.changeQuestion(visit))gateMessage.value='已换一道题，请重新作答。'}
async function verify(){const result=await gate.verify();gateMessage.value=result==='correct'?'回答正确，已打开家长设置。':result==='replaced'?'已为你换一道题，请重新作答。':result==='incorrect'?'答案不正确，请再试一次。':gateMessage.value;if(result==='correct')uni.hideKeyboard()}
</script>
