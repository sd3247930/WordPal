<template>
 <view class="page-heading home-heading"><view><text class="page-title">{{greeting}}，小探险家</text><text class="home-date small muted">{{dateLabel}}</text><text class="page-subtitle">每天一点，探索更大的单词世界。</text></view></view>
 <view class="hero-counts home-stats" aria-label="今日学习概览">
  <view><text class="small muted">连续学习</text><text class="metric">{{streak}} <text class="small">天</text></text></view>
  <view><text class="small muted">今日复习</text><text class="metric">{{review.due.length}} <text class="small">个</text></text></view>
  <view><text class="small muted">今日新词</text><text class="metric">{{learning.newWords.length}} <text class="small">个</text></text></view>
 </view>
 <view class="home-grid">
  <WPCard class="home-companion" level="feature" :class="'element-'+pet.current.element">
   <view class="companion-scene"><WPPetAsset :element="pet.current.element" :variant="petVariant" :size="petSize" :stage="pet.current.evolutionStage" :cosmetic="pet.current.equippedCosmetics[0]"/><view class="companion-bubble"><text class="companion-label small muted">当前陪伴 · {{pet.info.elementName}}精灵</text><text class="section-title">{{pet.info.name}} <text class="small muted">Lv.{{pet.current.level}}</text></text><text class="small">{{companionGreeting[pet.current.element]}}</text><text class="small muted">{{moods[pet.current.mood]}} · 亲密度 {{pet.current.affection}}</text><button role="button" tabindex="0" class="companion-link" @click="navigate('pet')">看看伙伴 <text aria-hidden="true">→</text></button></view></view>
  </WPCard>
  <WPCard class="home-today task-list-card"><view class="section-heading"><text>今日任务</text><WPChip>{{completedTasks}} / 4</WPChip></view>
   <button role="button" tabindex="0" class="hero-cta" @click="begin">{{learning.session&&!learning.session.completedAt?'继续今日学习':'开始今日学习'}} <text aria-hidden="true">→</text></button>
   <WPTaskCard v-for="task in tasks" :key="task.title" :icon="task.icon" :title="task.title" :detail="task.detail" :value="task.value" :element="task.element" :completed="task.done" action="去学习" @click="beginMode(task.mode)"/>
   <text class="small muted block">到期复习优先，每一步都算数。</text>
  </WPCard>
  <WPCard class="home-word-list"><view class="section-heading"><text>今天认识的单词</text><WPChip :element="pet.current.element">{{learning.lesson.name}}</WPChip></view><view class="today-words"><button role="button" tabindex="0" v-for="word in todayWords" :key="word.id" class="today-word" :aria-label="'听'+word.word+'的发音'" @click="listen(word)"><text class="word-mini">{{word.word}}</text><text class="small muted">{{word.meaning}}</text><text class="audio-symbol" aria-hidden="true">◖))</text></button></view><text class="small muted block">{{learning.needsConsolidation?'这课再熟悉一下，下次会更有把握。':'点一点，听听标准发音。'}}</text></WPCard>
  <view class="home-insights">
   <WPCard class="home-data"><view class="section-heading"><text>学习数据</text><text class="small muted">真实记录</text></view><view class="data-ring" role="progressbar" aria-label="今日正确率" :aria-valuenow="accuracy" aria-valuemin="0" aria-valuemax="100" :style="{background:'conic-gradient(var(--wp-primary) '+accuracy*3.6+'deg,var(--wp-secondary) 0)'}"><view class="data-ring-inner"><text class="progress-number">{{accuracy}}<text class="small">%</text></text><text class="small muted">今日正确率</text></view></view><view class="mini-stats"><view><text class="metric">{{learning.newToday}}</text><text class="small muted">新学单词</text></view><view><text class="metric">{{reviewsToday}}</text><text class="small muted">复习次数</text></view><view><text class="metric">{{learning.todayAnswers.length}}</text><text class="small muted">有效学习</text></view></view></WPCard>
   <WPCard class="home-priority"><view class="section-heading"><text>复习优先级</text><text class="muted" aria-hidden="true">▥</text></view><button role="button" tabindex="0" class="priority-row" @click="navigate('review')"><text class="status-dot due"/><text>到期复习</text><text class="strong">{{review.due.length}} 个 →</text></button><button role="button" tabindex="0" class="priority-row" @click="navigate('review')"><text class="status-dot weak"/><text>重点巩固</text><text class="strong">{{review.weak.length}} 个 →</text></button><button role="button" tabindex="0" class="priority-row" @click="navigate('review')"><text class="status-dot known"/><text>已经认识</text><text class="strong">{{learning.learnedCount}} 个 →</text></button></WPCard>
  </view>
 </view><text v-if="audioError" class="notice error" role="status">{{audioError}}</text>
</template>
<script setup lang="ts">
import {computed,ref,onUnmounted} from 'vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPChip from '../../components/wp-chip/WPChip.vue'
import WPProgress from '../../components/wp-progress/WPProgress.vue'
import WPTaskCard from '../../components/wp-task-card/WPTaskCard.vue'
import WPPetAsset from '../../components/WPPetAsset.vue'
import {useLearningStore} from '../../stores/learning'
import {useReviewStore} from '../../stores/review'
import {useProfileStore} from '../../stores/profile'
import {usePetStore} from '../../stores/pet'
import {navigate} from '../../services/navigation'
import {formatHomeDate} from '../../services/date'
import {playWord,stopAudio} from '../../services/audio'
import {themePacks} from '../../styles/themes'
import {useThemeStore} from '../../stores/theme'
import {localDate,type LearningMode,type Word} from '../../../packages/core_learning'
import {wordById} from '../../../packages/content_schema'
import type {Element} from '../../../packages/pet_engine'
const learning=useLearningStore(),review=useReviewStore(),profile=useProfileStore(),pet=usePetStore(),audioError=ref('')
const dateLabel=formatHomeDate(),hour=new Date().getHours(),greeting=hour<11?'早上好':hour<18?'你好':'晚上好'
const moods={calm:'平静',happy:'开心',excited:'兴奋',curious:'好奇'}
const companionGreeting={water:'我们一起，慢慢记住新单词。',fire:'一起试一试，收获新的勇气。',earth:'每天一点点，小进步会长大。',wind:'一起发现更多有趣的小世界。'}
const theme=useThemeStore()
const pack=computed(()=>themePacks[theme.settings.themeId])
const petSize=computed(()=>parseInt(pack.value[theme.mode==='dark'?'buildDark':'buildLight']().tokens['pet-size']))
const petVariant=computed(()=>pack.value.petRenderer==='avatar'?'avatar':'portrait')
const streak=computed(()=>{let count=0;const day=new Date();if(!profile.db.streakDates.includes(localDate(day)))day.setDate(day.getDate()-1);while(profile.db.streakDates.includes(localDate(day))){count++;day.setDate(day.getDate()-1)}return count})
const todayWords=computed(()=>learning.lesson.wordIds.map(id=>wordById[id]))
const reviewsToday=computed(()=>learning.todayAnswers.filter(a=>a.source==='review_due').length)
const accuracy=computed(()=>learning.todayAnswers.length?Math.round(learning.todayAnswers.filter(a=>a.correct).length/learning.todayAnswers.length*100):0)
const tasks=computed(()=>{
 const listen=learning.todayAnswers.filter(a=>a.mode==='listen').length,spell=learning.todayAnswers.filter(a=>a.mode==='spell'||a.mode==='dictation').length
 const goal=Math.min(3,profile.db.dailyLimit),reviewGoal=reviewsToday.value+review.due.length
 return [
  {title:'新学单词',detail:'每天一点新发现',icon:'Aa',value:learning.newToday+' / '+profile.db.dailyLimit,done:learning.newToday>=profile.db.dailyLimit,element:'earth' as Element,mode:'flash' as LearningMode},
  {title:'听音辨义',detail:'听一听，找到它',icon:'◖))',value:Math.min(goal,listen)+' / '+goal,done:listen>=goal,element:'fire' as Element,mode:'listen' as LearningMode},
  {title:'拼写练习',detail:'让字母排好队',icon:'▤',value:Math.min(goal,spell)+' / '+goal,done:spell>=goal,element:'wind' as Element,mode:'spell' as LearningMode},
  {title:'复习巩固',detail:reviewGoal?'和老朋友再见一面':'今天暂无到期单词',icon:'↻',value:reviewsToday.value+' / '+reviewGoal,done:review.due.length===0,element:'water' as Element,mode:'flash' as LearningMode}
 ]})
const completedTasks=computed(()=>tasks.value.filter(t=>t.done).length)
function begin(){learning.start();navigate('learn')}
function beginMode(mode:LearningMode){const active=learning.session&&!learning.session.completedAt;learning.start(learning.newWords.length||review.due.length?undefined:learning.lesson.wordIds);if(!active)learning.setMode(mode);navigate('learn')}
function listen(word:Word){audioError.value='';playWord(word,m=>audioError.value=m)}
onUnmounted(stopAudio)
</script>
