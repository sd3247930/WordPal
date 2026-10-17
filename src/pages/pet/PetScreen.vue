<template>
 <view class="page-heading"><view><text class="page-title">我的精灵小伙伴</text><text class="page-subtitle">四种精灵主题随心切换，打造专属陪伴。</text></view></view>
 <view class="pet-house pet-workspace" :class="{'pet-house-dark':dark,'pet-house-reduced':theme.reduced}" :style="houseStyle">
  <view class="pet-house-hero"><PetScene :scene="scene" :current="pet.current" :pets="pet.all" :panorama="windowLayout.width>=840" :reduced="theme.reduced" :dark="dark" :high-contrast="theme.settings.highContrast" @choose="choose"/><CurrentPetHero class="pet-current-hero" :pet="pet.current" :unavailable="profile.readOnly" @action="openAction"/></view>
  <WPCard class="pet-theme-switch"><view class="section-heading"><text>主题切换</text><text class="small muted">只改变陪伴空间</text></view><view class="pet-theme-grid"><WPActionTile v-for="id in elements" :key="id" role="button" tabindex="0" class="pet-theme-choice" :class="{selected:house.sceneId===id}" :aria-label="petHouseThemes[id].title" :aria-pressed="house.sceneId===id" @click="house.setScene(id)"><image class="pet-theme-thumbnail" :src="petHouseThemes[id].sceneAsset" mode="aspectFill" aria-hidden="true"/><view class="pet-theme-copy"><text class="strong">{{petHouseThemes[id].title}} <text v-if="house.sceneId===id" class="theme-check" aria-hidden="true">✓</text></text><text class="small muted">{{petHouseThemes[id].subtitle}}</text></view></WPActionTile></view><text v-if="house.error" class="notice" role="status">{{house.error}}</text></WPCard>
  <view class="pet-selection"><WPPetCard v-for="p in pet.all" :key="p.element" :pet="p" :selected="pet.current.element===p.element" @choose="choose"/></view>
  <view id="pet-details" class="pet-action-workspace"><view class="pet-action-menu" role="group" aria-label="宠物屋功能"><WPActionTile v-for="item in actions" :key="item.id" role="button" tabindex="0" class="pet-action-tab" :class="{selected:action===item.id}" :aria-label="item.label" :aria-pressed="action===item.id" @click="openAction(item.id)"><view class="pet-action-icon" aria-hidden="true"><PetActionIcon :name="item.id"/><text v-if="action===item.id" class="pet-action-check">✓</text></view><text class="pet-action-label">{{item.label}}</text></WPActionTile></view>
  <view class="pet-action-panel">
   <WPCard v-if="action==='home'" class="pet-home-panel">
    <text class="section-title">精灵家园</text><text class="muted block">四个伙伴都在这里，选一位陪你探索单词。</text>
    <view class="pet-home-learning-grid" role="group" aria-label="家园学习任务">
     <view class="pet-home-learning-card" data-task="practice" role="group" aria-label="认真练习统计">
      <PetHomeLearningIcon name="practice"/><text class="pet-home-learning-title">认真练习</text><text class="pet-home-learning-note">3 次有效学习</text>
      <text class="pet-home-learning-count">今日 {{homeProgress.practiceCount}} / 3</text><WPProgress :value="homeProgress.practiceCount" :total="3" label="认真练习今日进度"/>
      <text class="pet-home-learning-status" :class="{done:homeProgress.practiceDone}">{{homeProgress.practiceDone?'✓ 已完成':'继续加油'}}</text>
     </view>
     <view class="pet-home-learning-card" data-task="complete" role="group" aria-label="完成学习统计">
      <PetHomeLearningIcon name="complete"/><text class="pet-home-learning-title">完成学习</text><text class="pet-home-learning-note">5 次有效学习</text>
      <text class="pet-home-learning-count">今日 {{homeProgress.learningCount}} / 5</text><WPProgress :value="homeProgress.learningCount" :total="5" label="完成学习今日进度"/>
      <text class="pet-home-learning-status" :class="{done:homeProgress.learningDone}">{{homeProgress.rewarded?'✓ 已获 10 经验':homeProgress.learningDone?'✓ 已完成':'额外 10 经验'}}</text>
     </view>
     <WPActionTile class="pet-home-learning-card pet-home-learning-link" data-task="spelling" aria-label="试一试拼写或听写" @click="openStudyPractice">
      <PetHomeLearningIcon name="spelling"/><text class="pet-home-learning-title"><text class="pet-home-learning-line">试一试</text><text class="pet-home-learning-line">拼写或听写</text></text><text class="pet-home-learning-note">在学习页选择</text>
      <text class="pet-home-learning-status" :class="{done:homeProgress.spellingDone}">{{homeProgress.spellingDone?'✓ 今日已尝试':'等你来试试'}}</text><text class="pet-home-learning-link-label" aria-hidden="true">去练习 →</text>
     </WPActionTile>
     <WPActionTile class="pet-home-learning-card pet-home-learning-link" data-task="together" aria-label="一起去学习 →" @click="navigate('learn')">
      <PetHomeLearningIcon name="together"/><text class="pet-home-learning-title">一起去学习</text><text class="pet-home-learning-note">继续当前教材</text><text class="pet-home-learning-link-label" aria-hidden="true">继续学习 →</text>
     </WPActionTile>
    </view>
   </WPCard>
   <WPCard v-if="action==='feed'" class="pet-growth pet-feed-panel">
    <view class="section-heading"><text>喂养{{pet.info.name}}</text><text class="small">◇ {{profile.db.gems}} 灵石</text></view>
    <text class="small muted block">{{petMoods[pet.current.mood]}} · 亲密度 {{pet.current.affection}} / 100</text>
    <view class="food-grid" role="group" aria-label="选择分享小点心">
     <WPActionTile v-for="food in foods" :key="food.id" role="button" tabindex="0" class="food-choice" :class="{selected:foodId===food.id}" :aria-label="food.name" :aria-describedby="'pet-food-price-'+food.id" :aria-pressed="foodId===food.id" @click="selectFood(food.id)">
      <PetFoodIcon :name="food.id"/>
      <text class="food-choice-name">{{food.name}}</text>
      <text :id="'pet-food-price-'+food.id" class="food-choice-price">5 灵石 / 份</text>
      <text class="food-choice-state" :class="{chosen:foodId===food.id}" aria-hidden="true">{{foodId===food.id?'✓ 已选':'点击预览'}}</text>
     </WPActionTile>
    </view>
    <text class="small muted block">可分享 {{Math.floor(profile.db.gems/5)}} 份小点心 · 每个伙伴每天一份</text>
    <view v-if="preview" class="feed-preview" role="region" aria-label="分享预览"><text class="strong block">把{{selectedFood.name}}分享给{{pet.info.name}}</text><text class="small block">消耗 5 灵石 · 亲密度最多 +5 · 经验不变</text><view class="feed-confirm-actions"><WPButton class="confirm-feed" :disabled="!canFeed" @click="confirmFeed">确认分享 · 5 灵石</WPButton><WPButton kind="quiet" @click="preview=null">取消</WPButton></view></view>
    <WPButton v-else :disabled="!canFeed" @click="preview={element:pet.current.element,foodId}">{{pet.current.lastFedDate===today?'✓ 今天已分享':profile.db.gems<5?'学习后收获灵石':'预览分享小点心'}}</WPButton><text class="small muted block">成长经验来自学习，点心只增加亲密度。</text>
   </WPCard>
   <WPCard v-if="action==='growth'" class="pet-growth-panel"><view class="section-heading"><text class="growth-section-title">成长记录</text><text class="strong">{{pet.info.name}}</text></view><PetGrowthDashboard :pet="pet.current" :history="profile.db.history" :curriculum="curriculum" :unavailable="profile.readOnly"/><text class="small muted block">学习会渐渐点亮精灵，解锁后全彩展示。已解锁形态可自由切换，默认幼年期。</text><PetGrowthStages :pet="pet.current" :curriculum="curriculum"/></WPCard>
   <WPCard v-if="action==='dress'" class="pet-dress-panel"><text class="section-title">小小装扮</text><PetDressPreview :pet="pet.current" :scene="scene" :dark="dark"/><text class="small muted block">点一下穿戴，再点一下取下，每次可穿戴一件。装扮不影响学习奖励或成长速度。</text><PetDressCards :pet="pet.current" @equip="equip"/></WPCard>
   <WPCard v-if="action==='album'" class="pet-album-panel"><text class="section-title">成长相册</text><text class="small muted block">{{pet.info.name}}的阶段解锁图鉴 · 随学习成长</text><PetGrowthStages :pet="pet.current" :curriculum="curriculum" variant="album"/><text class="small muted block">成年与进化分别在 Lv.4、Lv.8 解锁；完成全部已安装教材学习后，即可选择全彩未知形态。</text></WPCard>
  </view></view><text v-if="message" class="notice pet-house-notice" role="status">{{message}}</text>
 </view>
</template>
<script setup lang="ts">
import WPActionTile from "../../components/button/WPActionTile.vue"

import {computed,ref,watch,nextTick,onMounted,onUnmounted} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import WPButton from '../../components/wp-button/WPButton.vue'
import WPCard from '../../components/wp-card/WPCard.vue'
import WPProgress from '../../components/wp-progress/WPProgress.vue'
import WPPetCard from '../../components/wp-pet-card/WPPetCard.vue'
import PetScene from '../../components/pet-house/PetScene.vue'
import CurrentPetHero from '../../components/pet-house/CurrentPetHero.vue'
import PetDressPreview from '../../components/pet-house/PetDressPreview.vue'
import PetActionIcon from '../../components/pet-house/PetActionIcon.vue'
import PetDressCards from '../../components/pet-house/PetDressCards.vue'
import PetFoodIcon from '../../components/pet-house/PetFoodIcon.vue'
import PetGrowthStages from '../../components/pet-house/PetGrowthStages.vue'
import PetGrowthDashboard from '../../components/pet-house/PetGrowthDashboard.vue'
import {allCourseLearningProgress} from '../../services/pet-growth'
import PetHomeLearningIcon from '../../components/pet-house/PetHomeLearningIcon.vue'
import {petHomeLearningProgress} from '../../services/pet-home-learning'
import type {PetFoodIconName} from '../../services/pet-food-icons'
import type {PetActionIconName} from '../../services/pet-action-icons'
import {usePetStore} from '../../stores/pet'
import {usePetHouseStore} from '../../stores/pet-house'
import {useProfileStore} from '../../stores/profile'
import {useLearningStore} from '../../stores/learning'
import {localDate} from '../../../packages/core_learning'
import {elements,type Element} from '../../../packages/pet_engine'
import {windowLayout} from '../../services/window'
import {navigate,openStudyPractice} from '../../services/navigation'
import {useThemeStore} from '../../stores/theme'
import {petHouseThemes,petHouseStyle,petMoods} from '../../styles/pet-house'
type Action=PetActionIconName
const pet=usePetStore(),profile=useProfileStore(),learning=useLearningStore(),house=usePetHouseStore(),theme=useThemeStore()
const message=ref(''),foodId=ref<PetFoodIconName>('water'),action=ref<Action>('home'),preview=ref<{element:Element;foodId:PetFoodIconName}|null>(null)
const foods:{id:PetFoodIconName;name:string}[]=[{id:'water',name:'水滴果'},{id:'pearl',name:'星光珍珠'},{id:'leaf',name:'月光树叶'},{id:'feather',name:'风之羽'}]
const actions:{id:Action;label:string}[]=[{id:'home',label:'家园'},{id:'feed',label:'喂食'},{id:'growth',label:'成长'},{id:'dress',label:'装扮'},{id:'album',label:'相册'}]
const scene=computed(()=>petHouseThemes[house.sceneId]),dark=computed(()=>theme.mode==='dark'),houseStyle=computed(()=>petHouseStyle(house.sceneId,dark.value,theme.settings.highContrast))
const today=ref(localDate()),canFeed=computed(()=>profile.db.gems>=5&&pet.current.lastFedDate!==today.value),selectedFood=computed(()=>foods.find(f=>f.id===foodId.value)!)
const curriculum=computed(()=>allCourseLearningProgress(profile.db))
const homeProgress=computed(()=>petHomeLearningProgress(profile.db.history,profile.db.rewardIds,today.value))
let dayTimer:ReturnType<typeof setInterval>|undefined
function stopDayTimer(){if(dayTimer){clearInterval(dayTimer);dayTimer=undefined}}
function refreshDay(){today.value=localDate()}
function startDayTimer(){refreshDay();if(!dayTimer)dayTimer=setInterval(refreshDay,30000)}
onMounted(startDayTimer);onShow(startDayTimer);onHide(stopDayTimer);onUnmounted(stopDayTimer)
watch(()=>pet.current.element,()=>{preview.value=null;message.value=''})
function choose(element:Element){pet.choose(element)}
function openAction(id:Action){action.value=id;message.value='';if(windowLayout.width<600)nextTick(()=>uni.pageScrollTo({selector:'#pet-details',duration:theme.reduced?0:180}))}
function selectFood(id:PetFoodIconName){foodId.value=id;preview.value={element:pet.current.element,foodId:id};message.value=''}
function confirmFeed(){if(!preview.value||preview.value.element!==pet.current.element||preview.value.foodId!==foodId.value)return;const name=selectedFood.value.name;message.value=pet.feed()?'✓ '+name+'已分享，亲密度最多 +5。':'今天已经分享过，或灵石还不够。';preview.value=null}
function equip(id:string){if(!pet.equip(id)){message.value='装扮未保存，请稍后重试。';return}message.value=pet.current.equippedCosmetics.includes(id)?'✓ 装扮已穿戴。':'装扮已取下。'}
</script>
<style src="../../styles/pet-house.scss" lang="scss"></style>
