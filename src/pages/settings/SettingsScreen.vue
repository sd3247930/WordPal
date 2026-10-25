<template>
 <view class="settings-page">
  <view class="page-heading settings-heading"><view class="settings-heading-copy"><text class="page-title">设置</text><text class="page-subtitle">调整你的学习体验</text></view><image class="settings-heading-illustration" :src="settingsHeaderArtwork" mode="aspectFit" aria-hidden="true"/></view>
  <view class="settings-workspace"><view class="settings-main">
   <WPCard class="settings-card settings-appearance">
    <view class="settings-section-heading"><SettingsArtwork name="appearance"/><text class="section-title">外观</text></view>
    <view class="appearance-theme theme-choice-grid" role="group" aria-label="外观主题">
     <WPActionTile v-for="option in appearanceChoices" :key="option.id" class="theme-choice" :class="{selected:theme.settings.themeId===option.id}" :selected="theme.settings.themeId===option.id" :data-theme-choice="option.id" :aria-label="option.name" :aria-current="theme.settings.themeId===option.id?'true':undefined" :aria-describedby="'theme-status-'+option.id" @click="theme.settings.themeId=option.id">
      <WPThemePreview :name="option.name" :theme-id="option.id" :theme-style="option.style" :image-src="settingsThemePreviews[option.id]"/>
      <text class="settings-theme-name strong">{{option.name}}</text><text v-if="theme.settings.themeId===option.id" class="settings-theme-selected" aria-hidden="true">已选</text>
      <text :id="'theme-status-'+option.id" class="settings-sr-only">{{option.description}}</text>
     </WPActionTile>
    </view>
    <text v-if="theme.storageError" class="notice error block" role="status">{{theme.storageError}}</text>
    <text class="setting-label">明暗模式</text><WPSegmentedButton :model-value="theme.settings.colorMode" :options="colorModes" :toggle-highlight="false" label="明暗模式" @update:model-value="theme.settings.colorMode=$event as ColorMode"/>
    <view class="settings-toggle-list">
     <SettingsToggleRow v-for="item in preferences" :key="item.key" :name="item.name" :icon="item.icon" :checked="theme.settings[item.key]" :description="item.description" :data-setting="item.key" @change="toggle(item.key,$event)"/>
    </view>
   </WPCard>
   <WPCard class="settings-card settings-learning" density="compact">
    <view class="settings-section-heading"><SettingsArtwork name="learning"/><text class="section-title">学习</text></view>
    <view class="settings-learning-row"><SettingsArtwork name="level"/><view class="settings-row-copy"><text class="strong settings-learning-value">学习等级 L{{parent.settings.entryLevel}} · 每批{{parent.settings.dailyNewWordLimit}}词</text><text v-if="parent.difficultyPending" class="small muted block">新等级将在下一批任务生效。</text><text v-else-if="!parent.persisted" class="small muted block">等级设置待保存，请进入家长设置。</text></view><WPButton kind="quiet" @click="navigate('parent')">家长设置</WPButton></view>
   </WPCard>
   <WPCard class="settings-card settings-feedback" density="compact">
    <view class="settings-section-heading"><SettingsArtwork name="feedback"/><text class="section-title">声音与触感</text></view>
    <SettingsToggleRow name="学习发音" icon="sound" :checked="feedback.settings.sound" description="播放内置单词标准发音。" @change="toggleFeedback('sound',$event)"/>
    <SettingsToggleRow name="正确回答轻震动" icon="haptics" :checked="feedback.settings.haptics" description="减少动效开启时不震动，触感偏好单独保留。" :note="theme.reduced&&feedback.settings.haptics?'减少动效已开启，暂不震动。':undefined" @change="toggleFeedback('haptics',$event)"/>
    <WPAudioButton class="settings-preview-audio" :url="feedback.settings.sound?(previewWord?.audio||''):''" :icon-src="settingsArtworkSrc('sound')" text="试听发音" label="试听发音" @click="previewAudio"/>
    <text v-if="!feedback.settings.sound||!previewWord?.audio" class="small muted block settings-audio-note">{{!feedback.settings.sound?'学习发音已关闭，开启后可试听。':'当前教材暂无可试听的发音。'}}</text>
    <text v-if="audioMessage" class="small muted block" role="status">{{audioMessage}}</text>
    <text v-if="feedback.storageError" class="notice error block" role="status">{{feedback.storageError}}</text>
   </WPCard>
   <WPCard class="settings-card settings-privacy" density="compact"><view class="settings-short-row"><view class="settings-short-copy"><view class="settings-section-heading"><SettingsArtwork name="privacy"/><text class="section-title">数据与隐私</text></view><text class="small muted block">管理学习数据、教材与备份。</text></view><WPButton class="settings-manage-data" kind="quiet" label="家长验证与数据管理" @click="navigate('parent')">管理数据</WPButton></view></WPCard>
   <WPCard class="settings-card settings-about" density="compact"><view class="settings-section-heading"><SettingsArtwork name="about"/><view><text class="section-title block">关于 WordPal</text><text class="small muted block settings-version">单词小搭子 · v{{versionName}}</text></view></view></WPCard>
  </view></view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,onUnmounted} from 'vue'
import {onHide} from '@dcloudio/uni-app'
import WPActionTile from '../../components/button/WPActionTile.vue'
import WPSegmentedButton from '../../components/button/WPSegmentedButton.vue'
import WPAudioButton from '../../components/button/WPAudioButton.vue'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPThemePreview from '../../components/wp-theme-preview/WPThemePreview.vue'
import SettingsArtwork from '../../components/settings/SettingsArtwork.vue'
import SettingsToggleRow from '../../components/settings/SettingsToggleRow.vue'
import {settingsArtworkSrc,settingsHeaderArtwork,settingsThemePreviews,type SettingsArtworkName} from '../../services/settings-artwork'
import {useThemeStore} from '../../stores/theme'
import {useFeedbackStore} from '../../stores/feedback'
import {themePacks,tokenStyle,type ColorMode} from '../../styles/themes'
import {useParentSettingsStore} from '../../stores/parent-settings'
import {useLearningStore} from '../../stores/learning'
import {getCourseWord} from '../../services/content/ContentRegistry'
import {useCourseStore} from '../../stores/course'
import {playWord,stopAudio} from '../../services/audio'
import {navigate} from '../../services/navigation'
import {versionName} from '../../manifest.json'
const theme=useThemeStore(),feedback=useFeedbackStore(),learning=useLearningStore(),course=useCourseStore(),parent=useParentSettingsStore(),audioMessage=ref('')
const previewWord=computed(()=>getCourseWord(course.currentId,learning.lesson.wordIds[0]))
const appearanceChoices=computed(()=>Object.values(themePacks).map(pack=>({id:pack.id,name:pack.name,description:pack.description,style:tokenStyle(pack[theme.mode==='dark'?'buildDark':'buildLight']().tokens)})))
const colorModes:{id:ColorMode;name:string}[]=[{id:'system',name:'跟随系统'},{id:'light',name:'浅色'},{id:'dark',name:'深色'}]
type PreferenceKey='reducedMotion'|'largeText'|'screenReaderLabels'
const preferences:{key:PreferenceKey;name:string;description:string;icon?:SettingsArtworkName}[]=[
 {key:'reducedMotion',name:'减少动效',icon:'motion',description:'关闭移动和缩放，保留静态反馈。'},
 {key:'largeText',name:'大字体',icon:'text',description:'放大文字，自动调整卡片空间。'},
 {key:'screenReaderLabels',name:'屏幕阅读器提示',icon:'reader',description:'为控件提供完整语义，核心标签始终保留。'}
]
function toggle(key:PreferenceKey,value:boolean){theme.settings[key]=value}
function toggleFeedback(key:'sound'|'haptics',value:boolean){audioMessage.value='';feedback.settings[key]=value;if(key==='sound'&&!value)stopAudio()}
let previewRequest=0
function previewAudio(){const request=++previewRequest;audioMessage.value='';if(previewWord.value)void playWord(previewWord.value,message=>{if(request===previewRequest)audioMessage.value=message})}
function stopPreview(){previewRequest++;stopAudio()}
onHide(stopPreview);onUnmounted(stopPreview)
</script>
