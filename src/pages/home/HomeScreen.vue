<template>
 <view class="page-heading home-heading"><view><text class="page-title">{{greeting}}，小探险家！</text><text class="home-date small muted">{{dateLabel}}</text><text class="page-subtitle">每天一点，探索更大的单词世界。</text></view></view>
 <view class="hero-counts home-stats" aria-label="今日学习概览">
  <view><text class="small muted">连续学习</text><text class="metric">{{streak}} <text class="small">天</text></text></view>
  <view><text class="small muted">今日复习</text><text class="metric">{{learning.due.length}} <text class="small">个</text></text></view>
  <view><text class="small muted">今日新词</text><text class="metric">{{learning.studyWords.length}} <text class="small">个</text></text></view>
 </view>
 <view class="home-grid">
  <WPCard class="home-companion" level="feature" :class="{'companion-dark':dark}" :style="houseStyle" :data-scene="house.sceneId">
   <view class="companion-scene">
    <view class="companion-art">
     <image :key="scene.id" class="companion-backdrop" :src="scene.sceneAsset" mode="aspectFill" aria-hidden="true"/>
     <view class="companion-portrait"><PetHousePetArt :element="pet.current.element" :badge="false"/></view>
    </view>
    <view class="companion-bubble">
     <text class="companion-label">当前陪伴 · {{pet.info.elementName}}精灵</text>
     <view class="companion-identity"><text class="companion-name">{{pet.info.name}}</text><text class="companion-level">Lv.{{pet.current.level}}</text></view>
     <text class="companion-message">{{companionGreeting[pet.current.element]}}</text>
     <view class="companion-status"><text>{{moods[pet.current.mood]}}</text><text>亲密度 {{pet.current.affection}}</text></view>
     <WPActionTile class="companion-open" @click="navigate('pet')"><text>看看伙伴</text><text aria-hidden="true">→</text></WPActionTile>
    </view>
   </view>
  </WPCard>
  <WPCard class="home-today task-list-card"><view class="section-heading"><text>今日任务</text><WPChip>{{completedTasks}} / 4</WPChip></view>
   <WPButton class="hero-cta" :spread="true" @click="begin">{{learning.session&&!learning.session.completedAt?'继续今日学习':'开始今日学习'}} <text aria-hidden="true">→</text></WPButton>
   <WPTaskCard v-for="task in tasks" :key="task.title" :icon="task.icon" :title="task.title" :detail="task.detail" :value="task.value" :element="task.element" :completed="task.done" action="去学习" @click="beginMode(task.mode)"/>
   <text class="small muted block">按教材顺序学习，每一步都算数。</text>
  </WPCard>
  <WPCard class="home-word-list"><view class="section-heading"><text>今天认识的单词</text><WPChip :element="pet.current.element">{{learning.lesson.name}}</WPChip></view><view class="today-words"><WPActionTile role="button" tabindex="0" v-for="word in todayWords" :key="word.id" class="today-word" :aria-label="word.audio?'听'+word.word+'的发音':word.word+'暂无音频'" :disabled="!word.audio" @click="listen(word)"><text class="word-mini">{{word.word}}</text><text class="small muted">{{word.meaning}}</text><WPControlIcon v-if="word.audio"/><text v-else class="small muted">暂无音频</text></WPActionTile></view><text class="small muted block">{{learning.needsConsolidation?'这课再熟悉一下，下次会更有把握。':'点一点，听听标准发音。'}}</text></WPCard>
  <view class="home-insights">
   <WPCard class="home-data"><view class="section-heading"><text>学习数据</text><text class="small muted">真实记录</text></view><view class="data-ring" role="progressbar" aria-label="今日正确率" :aria-valuenow="accuracy" aria-valuemin="0" aria-valuemax="100" :style="{background:'conic-gradient(var(--wp-primary) '+accuracy*3.6+'deg,var(--wp-secondary) 0)'}"><view class="data-ring-inner"><text class="progress-number">{{accuracy}}<text class="small">%</text></text><text class="small muted">今日正确率</text></view></view><view class="mini-stats"><view><text class="metric">{{learning.newToday}}</text><text class="small muted">新学单词</text></view><view><text class="metric">{{reviewsToday}}</text><text class="small muted">复习次数</text></view><view><text class="metric">{{learning.todayAnswers.length}}</text><text class="small muted">有效学习</text></view></view></WPCard>
   <WPCard class="home-priority"><view class="section-heading"><text>复习优先级</text><text class="muted" aria-hidden="true">▥</text></view><WPActionTile role="button" tabindex="0" class="priority-row" @click="navigate('review')"><text class="status-dot due"/><text>到期复习</text><text class="strong">{{learning.due.length}} 个 →</text></WPActionTile><WPActionTile role="button" tabindex="0" class="priority-row" @click="navigate('review')"><text class="status-dot weak"/><text>重点巩固</text><text class="strong">{{review.weak.length}} 个 →</text></WPActionTile><WPActionTile role="button" tabindex="0" class="priority-row" @click="navigate('review')"><text class="status-dot known"/><text>已经认识</text><text class="strong">{{learning.learnedCount}} 个 →</text></WPActionTile></WPCard>
  </view>
 </view><text v-if="audioError" class="notice error" role="status">{{audioError}}</text>
</template>
<script setup lang="ts">
import PetHousePetArt from '../../components/pet-house/PetHousePetArt.vue'
import WPButton from "../../components/wp-button/WPButton.vue"
import WPActionTile from "../../components/button/WPActionTile.vue"
import WPControlIcon from '../../components/button/WPControlIcon.vue'
import {useCourseStore} from '../../stores/course'
import {useActivitiesStore} from '../../stores/activities'
import {getCourseWord} from '../../services/content/ContentRegistry'

import {computed,ref,onUnmounted} from 'vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPChip from '../../components/wp-chip/WPChip.vue'
import WPProgress from '../../components/wp-progress/WPProgress.vue'
import WPTaskCard from '../../components/wp-task-card/WPTaskCard.vue'
import type {TaskIconName} from '../../services/task-icons'
import {useLearningStore} from '../../stores/learning'
import {useReviewStore} from '../../stores/review'
import {useProfileStore} from '../../stores/profile'
import {usePetStore} from '../../stores/pet'
import {usePetHouseStore} from '../../stores/pet-house'
import {useThemeStore} from '../../stores/theme'
import {petHouseThemes,petHouseStyle} from '../../styles/pet-house'
import {navigate} from '../../services/navigation'
import {formatHomeDate} from '../../services/date'
import {playWord,stopAudio} from '../../services/audio'
import {localDate,type LearningMode,type Word} from '../../../packages/core_learning'
import {wordById} from '../../../packages/content_schema'
import type {Element} from '../../../packages/pet_engine'
const learning=useLearningStore(),review=useReviewStore(),profile=useProfileStore(),pet=usePetStore(),audioError=ref(''),course=useCourseStore(),activities=useActivitiesStore()
const house=usePetHouseStore(),theme=useThemeStore()
const scene=computed(()=>petHouseThemes[house.sceneId]),dark=computed(()=>theme.mode==='dark')
const houseStyle=computed(()=>petHouseStyle(house.sceneId,dark.value,theme.settings.highContrast))
const dateLabel=formatHomeDate(),hour=new Date().getHours(),greeting=hour<11?'早上好':hour<18?'下午好':'晚上好'
const moods={calm:'平静',happy:'开心',excited:'兴奋',curious:'好奇'}
const companionGreeting={water:'我们一起，慢慢记住新单词。',fire:'一起试一试，收获新的勇气。',earth:'每天一点点，小进步会长大。',wind:'一起发现更多有趣的小世界。'}
const streak=computed(()=>{let count=0;const day=new Date();if(!profile.db.streakDates.includes(localDate(day)))day.setDate(day.getDate()-1);while(profile.db.streakDates.includes(localDate(day))){count++;day.setDate(day.getDate()-1)}return count})
const todayWords=computed(()=>learning.lesson.wordIds.map(id=>getCourseWord(course.currentId,id)).filter(Boolean))
const reviewsToday=computed(()=>learning.todayAnswers.filter(a=>a.source==='review_due').length)
const accuracy=computed(()=>learning.todayAnswers.length?Math.round(learning.todayAnswers.filter(a=>a.correct).length/learning.todayAnswers.length*100):0)
const tasks=computed(()=>{
 const audible=todayWords.value.some(w=>w.audio),listen=learning.todayAnswers.filter(a=>a.mode===(audible?'listen':'connect')).length,spell=learning.todayAnswers.filter(a=>a.mode==='spell'||a.mode==='dictation').length
 const goal=Math.min(3,profile.db.dailyLimit),reviewGoal=reviewsToday.value+learning.due.length
 return [
  {title:'新学单词',detail:'每天一点新发现',icon:'new' as TaskIconName,value:learning.newToday+' / '+profile.db.dailyLimit,done:learning.newToday>=profile.db.dailyLimit,element:'earth' as Element,mode:'flash' as LearningMode},
  {title:audible?'听音辨义':'词义配对',detail:audible?'听一听，找到它':'连一连，认识词义',icon:'listen' as TaskIconName,value:Math.min(goal,listen)+' / '+goal,done:listen>=goal,element:'fire' as Element,mode:(audible?'listen':'connect') as LearningMode},
  {title:'拼写练习',detail:'让字母排好队',icon:'spell' as TaskIconName,value:Math.min(goal,spell)+' / '+goal,done:spell>=goal,element:'wind' as Element,mode:'spell' as LearningMode},
  {title:'复习巩固',detail:reviewGoal?'和老朋友再见一面':'今天暂无到期单词',icon:'review' as TaskIconName,value:reviewsToday.value+' / '+reviewGoal,done:learning.due.length===0,element:'water' as Element,mode:'flash' as LearningMode}
 ]})
const completedTasks=computed(()=>tasks.value.filter(t=>t.done).length)
function begin(){course.applyPending();if(!learning.start()&&learning.lesson.wordIds.every(id=>profile.db.cards[id]))activities.start('check');navigate('learn')}
function beginMode(mode:LearningMode){const active=learning.session&&!learning.session.completedAt;learning.start(learning.studyWords.length||learning.due.length?undefined:learning.lesson.wordIds);if(!active)learning.setMode(mode);navigate('learn')}
function listen(word:Word){audioError.value='';playWord(word,m=>audioError.value=m)}
onUnmounted(stopAudio)
</script>
<style scoped>
.home-companion.card-feature{background:var(--pet-surface)!important;border:1px solid var(--pet-border);box-shadow:var(--pet-shadow);overflow:hidden}
.home-companion .companion-scene{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);align-items:center;gap:16px}
.home-companion .companion-art{position:relative;width:100%;max-width:180px;aspect-ratio:3/4;justify-self:center;border-radius:var(--wp-radius-sm);background:var(--pet-tonal);overflow:hidden}
.home-companion .companion-backdrop{position:absolute;inset:0;width:100%;height:100%}
.home-companion.companion-dark .companion-backdrop{filter:brightness(.6) saturate(.7)}
.home-companion .companion-portrait{position:relative;display:block;width:100%;height:100%}
.home-companion .companion-bubble{display:flex;flex-direction:column;gap:8px;min-width:0}
.home-companion .companion-label{display:block;font-size:var(--wp-font-caption);line-height:1.5;letter-spacing:0;color:var(--wp-muted-foreground)}
.home-companion .companion-identity{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.home-companion .companion-name{font-size:24px;line-height:1.25;font-weight:700;color:var(--wp-foreground)}
.home-companion .companion-level{padding:2px 7px;border-radius:var(--wp-radius-chip);background:var(--pet-tonal);color:var(--pet-accent);font-size:var(--wp-font-caption);line-height:1.5;font-weight:600;white-space:nowrap}
.home-companion .companion-message{font-size:var(--wp-font-small);line-height:1.6;color:var(--wp-foreground)}
.home-companion .companion-status{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground)}
.home-companion .companion-status>text{white-space:nowrap}
.home-companion .companion-open{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;width:100%;margin:4px 0 0;padding:8px 12px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-secondary);color:var(--wp-primary);font-size:var(--wp-font-small);line-height:1.5;font-weight:600;text-align:left}
@media(min-width:600px){.home-companion .companion-scene{grid-template-columns:minmax(0,1fr)}.home-companion .companion-art{max-width:168px}.home-companion .companion-bubble{min-width:0}}
@media(min-width:1400px){.home-companion .companion-scene{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:14px}.home-companion .companion-art{max-width:180px}}
@media(max-width:359px){.home-companion .companion-scene{gap:12px}.home-companion .companion-bubble{gap:6px}.home-companion .companion-name{font-size:22px}.home-companion .companion-open{padding:8px 10px}}
.large-text .home-companion .companion-name{font-size:var(--wp-font-section)}
@media(max-width:599px){.large-text .home-companion .companion-scene{grid-template-columns:minmax(0,1fr)}.large-text .home-companion .companion-art{max-width:150px}}
</style>
