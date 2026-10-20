<template>
 <view class="page-heading home-heading"><view><text class="page-title">{{greeting}}，小探险家！</text><text class="home-date small muted">{{dateLabel}}</text><text class="page-subtitle">每天一点，探索更大的单词世界。</text></view></view>
 <HomeStatsRow v-if="theme.settings.themeId==='clay'" :streak="streak" :due="learning.due.length" :planned="learning.planProblem?null:learning.todayPlan?.wordIds.length||0" :unavailable="profile.readOnly||!!profile.bootError"/>
 <view v-else class="hero-counts home-stats" aria-label="今日学习概览">
  <view><text class="small muted">连续学习</text><text class="metric">{{streak}} <text class="small">天</text></text></view>
  <view><text class="small muted">今日复习</text><text class="metric">{{learning.due.length}} <text class="small">个</text></text></view>
  <view><text class="small muted">今日新词</text><text class="metric">{{learning.todayPlan?.wordIds.length||0}} <text class="small">个</text></text></view>
 </view>
 <view class="home-grid">
  <HomePetCompanionCard v-if="theme.settings.themeId==='clay'" :pet="profile.db.pets[profile.db.companion]" :scene="scene" :message="companionGreeting[pet.current.element]||'每天一点，一起成长。'" :unavailable="profile.readOnly||!!profile.bootError" @open="navigate('pet')"/>
  <WPCard v-else class="home-companion home-companion-legacy" level="feature" :class="{'companion-dark':dark}" :style="houseStyle" :data-scene="house.sceneId">
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
  <HomeTodayTasks v-if="theme.settings.themeId==='clay'" :tasks="tasks" :note="taskNote" :action-label="taskActionLabel" :unavailable="taskUnavailable" :unreadable="profile.readOnly||!!profile.bootError" :busy="taskOpening" @start="begin"/>
  <WPCard v-else class="home-today task-list-card"><view class="section-heading"><text>今日任务</text><WPChip>{{completedTasks}} / 4</WPChip></view>
   <WPButton class="hero-cta" :spread="true" @click="begin">{{learning.session&&!learning.session.completedAt?'继续今日学习':'开始今日学习'}} <text aria-hidden="true">→</text></WPButton>
   <WPTaskCard v-for="task in tasks" :key="task.title" :icon="task.icon" :title="task.title" :detail="task.detail" :value="task.value" :element="task.element" :completed="task.done" action="去学习" @click="beginMode(task.mode)"/>
   <text class="small muted block">{{learning.todayPlan?.completedAt?'今天的六环节已完成，下一学习日继续下一批。':learning.todayPlan&&learning.todayPlan.date!==localDate()?'待续学：先完成上次的固定词表。':'按教材顺序完成六环节，每一步都算数。'}}</text>
  </WPCard>
  <HomeWordList v-if="theme.settings.themeId==='clay'" :today="localDate(new Date(now))"/>
  <WPCard v-else class="home-word-list"><view class="section-heading"><text>今天认识的单词</text><WPChip :element="pet.current.element">{{learning.lesson.name}}</WPChip></view><view class="today-words"><WPActionTile role="button" tabindex="0" v-for="word in todayWords" :key="word.id" toggle-highlight class="today-word" :aria-label="word.audio?'听'+word.word+'的发音':word.word+'暂无音频'" :disabled="!word.audio" @click="listen(word)" @cancel="stopAudio()"><text class="word-mini">{{word.word}}</text><text class="small muted">{{word.meaning}}</text><WPControlIcon v-if="word.audio"/><text v-else class="small muted">暂无音频</text></WPActionTile></view><text class="small muted block">{{learning.needsConsolidation?'这课再熟悉一下，下次会更有把握。':'点一点，听听标准发音。'}}</text></WPCard>
  <view class="home-insights">
   <WPCard class="home-data"><view class="section-heading"><text>学习数据</text><text class="small muted">真实记录</text></view><view class="data-ring" role="progressbar" aria-label="今日正确率" :aria-valuenow="accuracy" aria-valuemin="0" aria-valuemax="100" :style="{background:'conic-gradient(var(--wp-primary) '+accuracy*3.6+'deg,var(--wp-secondary) 0)'}"><view class="data-ring-inner"><text class="progress-number">{{accuracy}}<text class="small">%</text></text><text class="small muted">今日正确率</text></view></view><view class="mini-stats"><view><text class="metric">{{learning.newToday}}</text><text class="small muted">新学单词</text></view><view><text class="metric">{{reviewsToday}}</text><text class="small muted">复习次数</text></view><view><text class="metric">{{learning.todayAnswers.length}}</text><text class="small muted">有效学习</text></view></view></WPCard>
   <HomeReviewPriority v-if="theme.settings.themeId==='clay'" :counts="priorityCounts" :unavailable="profile.readOnly||!!profile.bootError" @open="openPriority"/><WPCard v-else class="home-priority"><view class="section-heading"><text>复习优先级</text><text class="muted" aria-hidden="true">▥</text></view><WPActionTile role="button" tabindex="0" class="priority-row" :disabled="profile.readOnly||!!profile.bootError" @click="openPriority('due')"><text class="status-dot due"/><text>到期复习</text><text class="strong">{{profile.readOnly||profile.bootError?'—':priorityCounts.due}} 个 →</text></WPActionTile><WPActionTile role="button" tabindex="0" class="priority-row" :disabled="profile.readOnly||!!profile.bootError" @click="openPriority('weak')"><text class="status-dot weak"/><text>重点巩固</text><text class="strong">{{profile.readOnly||profile.bootError?'—':priorityCounts.weak}} 个 →</text></WPActionTile><WPActionTile role="button" tabindex="0" class="priority-row" :disabled="profile.readOnly||!!profile.bootError" @click="openPriority('known')"><text class="status-dot known"/><text>已经认识</text><text class="strong">{{profile.readOnly||profile.bootError?'—':priorityCounts.known}} 个 →</text></WPActionTile></WPCard>
  </view>
 </view><text v-if="audioError" class="notice error" role="status">{{audioError}}</text>
</template>
<script setup lang="ts">
import PetHousePetArt from '../../components/pet-house/PetHousePetArt.vue'
import HomeStatsRow from '../../components/home/HomeStatsRow.vue'
import HomePetCompanionCard from '../../components/home/HomePetCompanionCard.vue'
import HomeTodayTasks from '../../components/home/HomeTodayTasks.vue'
import HomeReviewPriority from '../../components/home/HomeReviewPriority.vue'
import {useWordbookStore} from '../../stores/wordbook'
import HomeWordList from '../../components/home/HomeWordList.vue'
import WPButton from "../../components/wp-button/WPButton.vue"
import WPActionTile from "../../components/button/WPActionTile.vue"
import WPControlIcon from '../../components/button/WPControlIcon.vue'
import {useCourseStore} from '../../stores/course'
import {useActivitiesStore} from '../../stores/activities'
import {getCourseWord} from '../../services/content/ContentRegistry'

import {onShow,onHide} from '@dcloudio/uni-app'
import {computed,ref,onMounted,onUnmounted} from 'vue'
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
import type {HomeReviewPriority as HomePriorityKind} from '../../services/home-review-priority'
import {navigate,openHomePriority} from '../../services/navigation'
import {formatHomeDate,consecutiveLearningDays} from '../../services/date'
import {playWord,stopAudio} from '../../services/audio'
import {localDate,type LearningMode,type Word} from '../../../packages/core_learning'
import {wordById} from '../../../packages/content_schema'
import type {Element} from '../../../packages/pet_engine'
const learning=useLearningStore(),review=useReviewStore(),profile=useProfileStore(),pet=usePetStore(),audioError=ref(''),course=useCourseStore(),activities=useActivitiesStore()
const house=usePetHouseStore(),theme=useThemeStore(),book=useWordbookStore()
const priorityCounts=computed(()=>({due:book.priority('due').items.length,weak:book.priority('weak').items.length,known:book.priority('known').items.length}))
let priorityOpening=false,priorityRelease:ReturnType<typeof setTimeout>|undefined
function openPriority(kind:HomePriorityKind){if(priorityOpening||profile.readOnly||profile.bootError)return;priorityOpening=true;openHomePriority(kind);priorityRelease=setTimeout(()=>priorityOpening=false,650)}
onUnmounted(()=>clearTimeout(priorityRelease))
const scene=computed(()=>petHouseThemes[house.sceneId]),dark=computed(()=>theme.mode==='dark')
const houseStyle=computed(()=>petHouseStyle(house.sceneId,dark.value,theme.settings.highContrast,theme.settings.themeId,theme.tokens))
const now=ref(Date.now()),dateLabel=computed(()=>formatHomeDate(now.value)),greeting=computed(()=>{const hour=new Date(now.value).getHours();return hour<11?'早上好':hour<18?'下午好':'晚上好'})
const moods={calm:'平静',happy:'开心',excited:'兴奋',curious:'好奇'}
const companionGreeting={water:'我们一起，慢慢记住新单词。',fire:'一起试一试，收获新的勇气。',earth:'每天一点点，小进步会长大。',wind:'一起发现更多有趣的小世界。'}
const streak=computed(()=>consecutiveLearningDays(profile.db.streakDates,new Date(now.value)))
let statsTimer:ReturnType<typeof setInterval>|undefined,visible=true
function refreshStats(){now.value=Date.now();review.refresh();learning.prepareDaily()}
function pauseStats(){clearInterval(statsTimer);statsTimer=undefined}
function resumeStats(){visible=true;refreshStats();pauseStats();statsTimer=setInterval(refreshStats,30000)}
onShow(resumeStats);onHide(()=>{visible=false;pauseStats()});onMounted(resumeStats);onUnmounted(pauseStats)
// #ifdef H5
function foregroundStats(){if(!visible)return;if(document.visibilityState==='hidden')pauseStats();else resumeStats()}
onMounted(()=>{document.addEventListener('visibilitychange',foregroundStats);window.addEventListener('focus',foregroundStats)})
onUnmounted(()=>{document.removeEventListener('visibilitychange',foregroundStats);window.removeEventListener('focus',foregroundStats)})
// #endif
const todayWords=computed(()=>(learning.todayPlan?.wordIds||learning.lesson.wordIds).flatMap(id=>{const word=getCourseWord(course.currentId,id);return word?[word]:[]}))
const reviewsToday=computed(()=>learning.todayAnswers.filter(a=>a.source==='review_due').length)
const accuracy=computed(()=>learning.todayAnswers.length?Math.round(learning.todayAnswers.filter(a=>a.correct).length/learning.todayAnswers.length*100):0)
const tasks=computed(()=>[
 {title:'新学单词',detail:'闪现 · 认识今天的单词',icon:'new',element:'earth',mode:'flash'},
 {title:'听音辨义',detail:'连接 → 听音',icon:'listen',element:'fire',mode:'connect'},
 {title:'拼写练习',detail:'拼写 → 听写',icon:'spell',element:'wind',mode:'spell'},
 {title:'复习巩固',detail:'完成今天全部单词的巩固',icon:'review',element:'water',mode:'flash'}
].map((task,index)=>({...task,icon:task.icon as TaskIconName,element:task.element as Element,mode:task.mode as LearningMode,value:learning.tasks[index].done+' / '+learning.tasks[index].total,done:learning.tasks[index].complete})))
const completedTasks=computed(()=>tasks.value.filter(t=>t.done).length)
const taskNote=computed(()=>learning.todayPlan?.completedAt?'今天的六环节已完成，下一学习日继续下一批。':learning.todayPlan&&learning.todayPlan.date!==localDate()?'待续学：先完成上次的固定词表。':'按教材顺序完成六环节，每一步都算数。')
const taskActionLabel=computed(()=>learning.todayPlan?.completedAt?'查看今日成果':learning.todayPlan?.flow?.begunAt?'继续今日学习':'开始今日学习')
const taskUnavailable=computed(()=>profile.readOnly||profile.bootError?'学习档案暂不可用，请先在设置中恢复档案。':course.pendingCourse?'':learning.planProblem||(!learning.todayPlan?.wordIds.length?'当前教材暂无今日任务，可前往学习页查看课程。':''))
const taskOpening=ref(false)
let taskReleaseTimer:ReturnType<typeof setTimeout>|undefined
onShow(()=>taskOpening.value=false);onUnmounted(()=>clearTimeout(taskReleaseTimer))
function begin(){if(theme.settings.themeId==='clay'){if(taskOpening.value||taskUnavailable.value)return;taskOpening.value=true;taskReleaseTimer=setTimeout(()=>taskOpening.value=false,650)}course.applyPending();if(learning.start())navigate('learn');else if(learning.planProblem)uni.showToast?.({title:learning.planProblem,icon:'none'});else navigate('learn')}
function beginMode(_mode:LearningMode){begin()}
function listen(word:Word){audioError.value='';playWord(word,m=>audioError.value=m)}
onUnmounted(stopAudio)
</script>
<style scoped>
.home-companion-legacy.card-feature{background:var(--pet-surface)!important;border:1px solid var(--pet-border);box-shadow:var(--pet-shadow);overflow:hidden}
.home-companion-legacy .companion-scene{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);align-items:center;gap:16px}
.home-companion-legacy .companion-art{position:relative;width:100%;max-width:180px;aspect-ratio:3/4;justify-self:center;border-radius:var(--wp-radius-sm);background:var(--pet-tonal);overflow:hidden}
.home-companion-legacy .companion-backdrop{position:absolute;inset:0;width:100%;height:100%}
.home-companion-legacy.companion-dark .companion-backdrop{filter:brightness(.6) saturate(.7)}
.home-companion-legacy .companion-portrait{position:relative;display:block;width:100%;height:100%}
.home-companion-legacy .companion-bubble{display:flex;flex-direction:column;gap:8px;min-width:0}
.home-companion-legacy .companion-label{display:block;font-size:var(--wp-font-caption);line-height:1.5;letter-spacing:0;color:var(--wp-muted-foreground)}
.home-companion-legacy .companion-identity{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.home-companion-legacy .companion-name{font-size:24px;line-height:1.25;font-weight:700;color:var(--wp-foreground)}
.home-companion-legacy .companion-level{padding:2px 7px;border-radius:var(--wp-radius-chip);background:var(--pet-tonal);color:var(--pet-accent);font-size:var(--wp-font-caption);line-height:1.5;font-weight:600;white-space:nowrap}
.home-companion-legacy .companion-message{font-size:var(--wp-font-small);line-height:1.6;color:var(--wp-foreground)}
.home-companion-legacy .companion-status{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground)}
.home-companion-legacy .companion-status>text{white-space:nowrap}
.home-companion-legacy .companion-open{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;width:100%;margin:4px 0 0;padding:8px 12px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-sm);background:var(--wp-secondary);color:var(--wp-primary);font-size:var(--wp-font-small);line-height:1.5;font-weight:600;text-align:left}
@media(min-width:600px){.home-companion-legacy .companion-scene{grid-template-columns:minmax(0,1fr)}.home-companion-legacy .companion-art{max-width:168px}.home-companion-legacy .companion-bubble{min-width:0}}
@media(min-width:1400px){.home-companion-legacy .companion-scene{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:14px}.home-companion-legacy .companion-art{max-width:180px}}
@media(max-width:359px){.home-companion-legacy .companion-scene{gap:12px}.home-companion-legacy .companion-bubble{gap:6px}.home-companion-legacy .companion-name{font-size:22px}.home-companion-legacy .companion-open{padding:8px 10px}}
.large-text .home-companion-legacy .companion-name{font-size:var(--wp-font-section)}
.home-companion-legacy .companion-open{min-height:48px}
.large-text .home-companion-legacy .companion-open{min-height:56px}
@media(max-width:599px){.large-text .home-companion-legacy .companion-scene{grid-template-columns:minmax(0,1fr)}.large-text .home-companion-legacy .companion-art{max-width:150px}}
</style>
