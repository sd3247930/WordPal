<template>
 <view class="page-heading"><view><text class="page-title">设置</text><text class="page-subtitle">调整你的学习体验</text></view></view>
 <view class="settings-workspace"><view class="settings-main">
  <WPCard class="settings-appearance"><view class="section-heading"><text>外观</text><text class="small muted">专注学习</text></view>
   <view class="appearance-theme" role="group" aria-label="当前外观主题">
    <WPThemePreview :name="appearance.name" :theme-id="appearance.id" :theme-style="theme.style"/>
    <view class="appearance-theme-copy"><text class="strong">{{appearance.name}}</text><text class="small muted">{{appearance.description}} · 让内容成为焦点</text><text class="appearance-theme-status small">✓ 已启用</text></view>
   </view>
   <text class="setting-label">明暗模式</text><WPSegmentedButton :model-value="theme.settings.colorMode" :options="colorModes" label="明暗模式" @update:model-value="theme.settings.colorMode=$event as ColorMode"/>
   <view v-for="item in preferences" :key="item.key" class="preference-row"><view><text class="strong">{{item.name}}</text><text class="small muted block">{{item.description}}</text></view><switch :checked="theme.settings[item.key]" :aria-label="item.name" @change="toggle(item.key,$event)"/></view>
   <view class="preference-row"><view><text class="strong">动态色</text><text class="small muted block">{{theme.dynamicSupported?'跟随 Android 壁纸主色。':'当前平台不提供壁纸配色。'}}</text></view><switch :checked="theme.settings.dynamicColor" :disabled="!theme.dynamicSupported" aria-label="动态色" @change="toggle('dynamicColor',$event)"/></view>
  </WPCard>
  <WPCard density="compact"><text class="section-title">学习</text><view class="preference-row"><view><text class="strong">每日新词 {{profile.db.dailyLimit}} 个</text><text class="small muted block">到期复习优先，先巩固再探索。</text></view><WPButton kind="quiet" @click="navigate('parent')">家长设置</WPButton></view></WPCard>
  <WPCard density="compact"><text class="section-title">声音与触感</text><view class="preference-row"><view><text class="strong">学习发音</text><text class="small muted block">播放内置单词标准发音。</text></view><switch :checked="feedback.settings.sound" aria-label="学习发音" @change="toggleFeedback('sound',$event)"/></view><view class="preference-row"><view><text class="strong">正确回答轻震动</text><text class="small muted block">减少动效开启时不震动。</text></view><switch :checked="feedback.settings.haptics" aria-label="正确回答轻震动" @change="toggleFeedback('haptics',$event)"/></view><WPAudioButton :url="feedback.settings.sound?(getCourseWord(course.currentId,learning.lesson.wordIds[0])?.audio||''):''" text="试听发音" @click="previewAudio"/><text v-if="audioMessage" class="small muted block" role="status">{{audioMessage}}</text></WPCard>
  <PetCompanionCard class="settings-pet" variant="settings" :pet="pet.current" :title="pet.info.name" eyebrow="宠物 · 当前陪伴" note="成长来自真实学习，休息不会失去伙伴。"><WPButton kind="quiet" @click="navigate('pet')">查看精灵小伙伴</WPButton></PetCompanionCard>
  <WPCard density="compact"><text class="section-title">数据与隐私</text><text class="muted block">学习数据保存在本设备，不使用广告、账号或云同步。跟读仅在你点击录音时申请麦克风权限，录音不上传。</text><WPButton kind="quiet" @click="navigate('parent')">家长验证与数据删除</WPButton></WPCard>
  <WPCard density="compact"><text class="section-title">关于 WordPal</text><text class="muted block">单词小搭子 · v1.2.0</text><text class="small muted block">原创启蒙词表 · 科学复习 · 四象伙伴</text><text class="small muted block">每次只学一点点，让新知识变成老朋友。</text></WPCard>
 </view><PetCompanionCard class="settings-summary" variant="summary" :pet="pet.current" :title="pet.info.name" eyebrow="你的学习小世界" note="主题只改变外观，进度和伙伴都会保留。"><text>{{themePacks[theme.settings.themeId].name}}</text><text class="small muted">{{themePacks[theme.settings.themeId].description}}</text><WPButton kind="quiet" @click="navigate('home')">回到首页</WPButton></PetCompanionCard></view>
</template>
<script setup lang="ts">
import WPSegmentedButton from "../../components/button/WPSegmentedButton.vue"
import WPAudioButton from "../../components/button/WPAudioButton.vue"

import {ref,onUnmounted} from 'vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import PetCompanionCard from '../../components/pet-house/PetCompanionCard.vue'
import WPThemePreview from '../../components/wp-theme-preview/WPThemePreview.vue'
import {useThemeStore} from '../../stores/theme'
import {useFeedbackStore} from '../../stores/feedback'
import {themePacks,type ColorMode} from '../../styles/themes'
import {usePetStore} from '../../stores/pet'
import {useProfileStore} from '../../stores/profile'
import {useLearningStore} from '../../stores/learning'
import {getCourseWord} from '../../services/content/ContentRegistry'
import {useCourseStore} from '../../stores/course'
import {playWord,stopAudio} from '../../services/audio'
import {navigate} from '../../services/navigation'
const theme=useThemeStore(),feedback=useFeedbackStore(),pet=usePetStore(),profile=useProfileStore(),learning=useLearningStore(),course=useCourseStore(),audioMessage=ref('')
const appearance=themePacks.swiss
const colorModes:{id:ColorMode;name:string}[]=[{id:'system',name:'跟随系统'},{id:'light',name:'浅色'},{id:'dark',name:'深色'}]
const preferences=[
 {key:'reducedMotion' as const,name:'减少动效',description:'关闭移动和缩放，保留静态反馈。'},
 {key:'largeText' as const,name:'大字体',description:'放大文字，自动调整卡片空间。'},
 {key:'highContrast' as const,name:'高对比度',description:'增强辅助文字、边界和状态。'},
 {key:'screenReaderLabels' as const,name:'屏幕阅读器提示',description:'为控件提供完整语义，核心标签始终保留。'}
]
function switchValue(event:Event){return (event as unknown as {detail:{value:boolean}}).detail.value}
function toggle(key:'reducedMotion'|'largeText'|'highContrast'|'screenReaderLabels'|'dynamicColor',event:Event){theme.settings[key]=switchValue(event)}
function toggleFeedback(key:'sound'|'haptics',event:Event){feedback.settings[key]=switchValue(event)}
function previewAudio(){audioMessage.value='';playWord(getCourseWord(course.currentId,learning.lesson.wordIds[0]),message=>audioMessage.value=message)}
onUnmounted(stopAudio)
</script>
