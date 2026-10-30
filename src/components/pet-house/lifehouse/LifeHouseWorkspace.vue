<template>
 <view class="pet-house lh-workspace" :class="{'pet-house-reduced':theme.reduced,'lh-dark':dark,'lh-dressing':action==='dress'}" :style="palette">
  <view class="lh-companions" role="group" aria-label="选择四象精灵"><WPActionTile v-for="id in elements" :key="id" class="lh-companion" :selected="pet.current.element===id" :aria-label="'选择'+petInfo[id].name" :aria-pressed="pet.current.element===id" :disabled="profile.readOnly||life.busy" @click="choose(id)"><SceneActorArt class="lh-companion-art" :element="id" :form="forms.stage(id)" :allow-q="liveChibiEnabled"/><text class="lh-companion-name">{{petInfo[id].name}}</text><text class="lh-companion-level">{{life.protectedHouse?'档案保护中':'家 Lv.'+life.domain.housesByElement[id].level}}</text><text v-if="pet.current.element===id" class="lh-companion-current" aria-hidden="true">当前</text></WPActionTile></view>
  <view v-if="life.protectionMessage" class="lh-hint" role="alert">{{life.protectionMessage}}</view>
  <view class="lh-workspace-layout">
   <view class="lh-stage-column"><LifeHouseStage ref="stage" :dress-preview="action==='dress'" :active="action==='home'&&!upgradeOpen&&!helpOpen&&!manageId" @appearance="life.noteAppearance(pet.current.element,$event)" :pet="pet.current" :house="currentHouse" :preview="action==='home'?preview:null" :protected-house="life.protectedHouse" :dark="dark" :reduced="theme.reduced" :motion="motion" :speech="speech" @interact="interact" @upgrade="openUpgrade" @album="openAction('album')" @help="helpOpen=true" @manage="manage" @slot="chooseSlot"/></view>
   <view class="lh-controls-column"><view class="pet-action-menu lh-tabs" role="group" aria-label="宠物屋功能"><WPActionTile v-for="item in actions" :key="item.id" class="pet-action-tab lh-tab" :disabled="life.busy" :selected="action===item.id" :aria-label="item.label" :aria-pressed="action===item.id" @click="openAction(item.id)"><LifeHouseAsset class="lh-tab-icon" :src="lifeHouseIcon(item.id)" decorative/><text>{{item.label}}</text></WPActionTile></view>
    <view class="lh-action-panel">
     <template v-if="action==='home'"><HouseBuilderPanel :element="pet.current.element" :house="currentHouse" v-model:preview="preview" :manage-id="manageId" @close-manage="manageId=null" @manage="manage" @zone="stage?.changeZone($event)" @upgrade="openUpgrade" @learn="goLearn" @feedback="react"/><WPActionTile class="lh-learning-toggle" :aria-expanded="learningOpen" aria-controls="lh-learning-details" @click="learningOpen=!learningOpen"><LifeHouseAsset :src="lifeHouseIcon('book')" decorative/><view><text class="lh-strong lh-block">学习让小屋慢慢长大</text><text class="lh-caption">今日 {{homeProgress.learningCount}} / 5 次有效学习 · {{learningOpen?'收起':'查看任务'}}</text></view></WPActionTile><view v-if="learningOpen" id="lh-learning-details" class="lh-home-learning"><view class="lh-learning-counts"><view><text class="lh-strong lh-block">认真练习</text><text>今日 {{homeProgress.practiceCount}} / 3</text><WPProgress :value="homeProgress.practiceCount" :total="3" label="认真练习今日进度"/><text class="lh-caption">{{homeProgress.practiceDone?'已完成':'继续加油'}}</text></view><view><text class="lh-strong lh-block">完成学习</text><text>今日 {{homeProgress.learningCount}} / 5</text><WPProgress :value="homeProgress.learningCount" :total="5" label="完成学习今日进度"/><text class="lh-caption">{{homeProgress.rewarded?'已获 10 经验':'完成后额外 10 经验'}}</text></view></view><view class="lh-learning-links"><WPButton v-if="!learning.isSessionLocked" kind="quiet" @click="openStudyPractice">试一试拼写或听写</WPButton><WPButton class="lh-main-button" @click="goLearn">一起去学习</WPButton></view></view></template>
     <view v-else-if="action==='feed'" class="pet-feed-panel lh-panel-content"><view class="lh-builder-heading"><text class="lh-section-title">分享一份小点心</text><text class="lh-caption">亲密度 {{pet.current.affection}} / 100</text></view><ItemDesignGallery v-if="activeVisualVersion===2" :element="pet.current.element" module="feed" mode="choose" choose-label="选这份点心 · 5 灵石" @choose="selectDesignFood"/><view v-else class="food-grid" role="group" aria-label="选择分享小点心"><WPActionTile v-for="food in foods" :key="food.id" class="food-choice" :selected="foodId===food.id" :aria-label="food.name" :aria-pressed="foodId===food.id" @click="selectFood(food.id)"><PetFoodIcon :name="food.id"/><text class="food-choice-name">{{food.name}}</text><text class="lh-caption">5 灵石 / 份</text></WPActionTile></view><text class="lh-hint lh-block">每个伙伴每天一份，亲密度最多 +5，经验不变。</text><view v-if="feedPreview" class="feed-preview"><text class="lh-strong lh-block">把{{selectedFood?.name}}分享给{{pet.info.name}}？</text><text class="lh-caption lh-block">消耗 5 灵石，余额 {{Math.max(0,profile.db.gems-5)}}</text><view class="feed-confirm-actions"><WPButton class="lh-main-button confirm-feed" :disabled="!canFeed" @click="confirmFeed">确认分享 · 5 灵石</WPButton><WPButton kind="quiet" @click="feedPreview=false">取消</WPButton></view></view><WPButton v-else class="lh-main-button" :disabled="!canFeed" @click="feedPreview=true">{{pet.current.lastFedDate===today?'今天已分享':profile.db.gems<5?'灵石还不够':'预览分享小点心'}}</WPButton><WPButton v-if="profile.db.gems<5" kind="quiet" @click="goLearn">一起去学习</WPButton></view>
     <view v-else-if="action==='growth'" class="pet-growth-panel lh-panel-content"><view class="lh-builder-heading"><text class="lh-section-title">每一点成长，都算数</text><text class="lh-caption">Lv.{{pet.current.level}}</text></view><PetGrowthStages :pet="pet.current" :curriculum="curriculum"/><WPActionTile class="lh-learning-toggle" :aria-expanded="growthDetails" @click="growthDetails=!growthDetails"><LifeHouseAsset :src="lifeHouseIcon('experience')" decorative/><text class="lh-strong">{{growthDetails?'收起成长记录':'查看经验、亲密与本机学习记录'}}</text></WPActionTile><PetGrowthDashboard v-if="growthDetails" :pet="pet.current" :history="profile.db.history" :curriculum="curriculum" :unavailable="profile.readOnly"/></view>
     <view v-else-if="action==='dress'" class="pet-dress-panel lh-panel-content"><PetDressCards :pet="pet.current" :form="forms.stage(pet.current.element)" :read-only="profile.readOnly" :unavailable="unavailableDress" @equip="equip"/></view>
     <view v-else class="pet-album-panel lh-panel-content"><view class="lh-builder-heading"><text class="lh-section-title">我们的小小回忆</text><text class="lh-caption">保存在本机</text></view><view class="lh-filter-row" role="group" aria-label="相册分类"><WPActionTile :selected="albumMode==='home'" @click="albumMode='home'">家园留影</WPActionTile><WPActionTile :selected="albumMode==='forms'" @click="albumMode='forms'">成长图鉴</WPActionTile></view><HouseMemoryCards v-if="albumMode==='home'" :events="memories"/><PetGrowthStages v-else :pet="pet.current" :curriculum="curriculum" variant="album"/></view>
    </view>
    <text v-if="message||life.message" class="lh-feedback" role="status">{{life.busy?'正在保存小屋，请稍等一下。':message||life.message}}</text>
   </view>
  </view>
  <HouseUpgradeSheet :element="pet.current.element" :open="upgradeOpen" :house="currentHouse" :gems="profile.db.gems" :unavailable="life.unavailable" :busy="life.busy" @close="upgradeOpen=false" @upgrade="upgrade" @learn="goLearn"/>
  <LifeHouseSheet :open="helpOpen" title="和伙伴，一起把日子过成糖" @close="helpOpen=false"><view class="lh-help"><text class="lh-strong lh-block">四象各有一间家，共用学习灵石。</text><text class="lh-block">房屋逐级升级，费用为 300、800、1500、2500、4000 灵石。Lv.1 赠基础床，Lv.2 赠书架和窗。</text><text class="lh-block">先选物品、再选位置、最后确认。收纳保留物品，放回免费；退回会失去物品并返还实付的一半，赠礼不退回。</text><text class="lh-block">答对正式题目获得 2 灵石；每天第 5 次正式有效答题另获 1 灵石。查看、布置和互动不会增加奖励。</text><text class="lh-block">成长来自学习，小点心只增加亲密度。原有精灵、装扮与成长条件都保持一致。</text><text class="lh-caption lh-block">家园与学习档案一起保存在本机。可在家长区的教材与数据工具中导出备份。</text></view></LifeHouseSheet>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,toRaw} from 'vue'
import {onShow,onHide,onBackPress} from '@dcloudio/uni-app'
import {elements,petInfo,type Element} from '../../../../packages/pet_engine'
import {localDate} from '../../../../packages/core_learning'
import {usePetStore} from '../../../stores/pet'
import {useProfileStore} from '../../../stores/profile'
import {useLearningStore} from '../../../stores/learning'
import {usePetLifeHouseStore} from '../../../stores/pet-lifehouse'
import {useThemeStore} from '../../../stores/theme'
import {usePetFormsStore} from '../../../stores/pet-forms'
import SceneActorArt from './SceneActorArt.vue'
import {allCourseLearningProgress} from '../../../services/pet-growth'
import {petHomeLearningProgress} from '../../../services/pet-home-learning'
import {navigate,openStudyPractice} from '../../../services/navigation'
import {lifeHousePalette} from '../../../services/pet-lifehouse/LifeHouseTheme'
import {lifeHouseIcon} from '../../../services/pet-lifehouse/LifeHouseAssets'
import type {SlotId} from '../../../services/pet-lifehouse/types'
import type {PetFoodIconName} from '../../../services/pet-food-icons'
import type {PetActionIconName} from '../../../services/pet-action-icons'
import WPActionTile from '../../button/WPActionTile.vue'
import WPButton from '../../wp-button/WPButton.vue'
import WPProgress from '../../wp-progress/WPProgress.vue'
import PetFoodIcon from '../PetFoodIcon.vue'
import PetDressCards from '../PetDressCards.vue'
import PetGrowthStages from '../PetGrowthStages.vue'
import PetGrowthDashboard from '../PetGrowthDashboard.vue'
import LifeHouseAsset from './LifeHouseAsset.vue'
import LifeHouseStage from './LifeHouseStage.vue'
import LifeHouseSheet from './LifeHouseSheet.vue'
import HouseBuilderPanel from './HouseBuilderPanel.vue'
import HouseUpgradeSheet from './HouseUpgradeSheet.vue'
import ItemDesignGallery from './ItemDesignGallery.vue'
import {liveChibiEnabled} from '../../../services/pet-lifehouse/SceneVisualPack'
import {activeVisualVersion} from '../../../services/pet-lifehouse/VisualPack'
import {equipmentLayers} from '../../../services/pet-lifehouse/DressRenderer'
import {loadSceneImage} from '../../../services/pet-lifehouse/SceneAssetLoader'
import {itemDesign,type ItemDesign} from '../../../services/pet-lifehouse/ItemVisualRegistry'
import HouseMemoryCards from './HouseMemoryCards.vue'
const stage=ref<InstanceType<typeof LifeHouseStage>|null>(null),forms=usePetFormsStore()
const pet=usePetStore(),profile=useProfileStore(),life=usePetLifeHouseStore(),theme=useThemeStore(),learning=useLearningStore()
const action=ref<PetActionIconName>('home'),preview=ref<{furnitureId:string;slotId?:SlotId}|null>(null),manageId=ref<string|null>(null),upgradeOpen=ref(false),helpOpen=ref(false),growthDetails=ref(false),learningOpen=ref(false),albumMode=ref<'home'|'forms'>('home'),foodId=ref<PetFoodIconName>('water'),feedPreview=ref(false),message=ref(''),speech=ref(''),motion=ref<'idle'|'react'|'celebrate'>('idle'),today=ref(localDate())
const dark=computed(()=>theme.mode==='dark'),palette=computed(()=>lifeHousePalette(pet.current.element,dark.value,theme.settings.highContrast)),currentHouse=computed(()=>life.domain.housesByElement[pet.current.element]),curriculum=computed(()=>allCourseLearningProgress(profile.db)),memories=computed(()=>life.domain.memoryEvents.filter(e=>e.element===pet.current.element).slice().reverse()),homeProgress=computed(()=>petHomeLearningProgress(toRaw(profile.db.history),toRaw(profile.db.rewardIds),today.value,toRaw(profile.db.practiceAnswers||[])))
const actions:{id:PetActionIconName;label:string}[]=[{id:'home',label:'家园'},{id:'feed',label:'喂食'},{id:'growth',label:'成长'},{id:'dress',label:'装扮'},{id:'album',label:'相册'}],foods:{id:PetFoodIconName;name:string}[]=[{id:'water',name:'水滴果'},{id:'pearl',name:'星光珍珠'},{id:'leaf',name:'月光树叶'},{id:'feather',name:'风之羽'}]
const selectedDesignFood=ref<string|null>(null)
const selectedFood=computed(()=>selectedDesignFood.value?itemDesign(selectedDesignFood.value):foods.find(f=>f.id===foodId.value)),canFeed=computed(()=>!profile.readOnly&&profile.db.gems>=5&&pet.current.lastFedDate!==today.value)
let dayTimer:ReturnType<typeof setInterval>|undefined,reactionTimer:ReturnType<typeof setTimeout>|undefined
function clearReaction(){stage.value?.cancel();clearTimeout(reactionTimer);reactionTimer=undefined;motion.value='idle';speech.value=''}
function react(text:string,celebrate=false){clearReaction();message.value=text;speech.value=text;motion.value=theme.reduced?'idle':celebrate?'celebrate':'react';reactionTimer=setTimeout(()=>{speech.value='';motion.value='idle';reactionTimer=undefined},5000)}
function interact(){react('有你在，今天也是亮晶晶的一天。')}
function choose(element:Element){if(life.busy)return;if(pet.current.element!==element&&!pet.choose(element))message.value='伙伴暂未切换，请稍后重试。'}
function openAction(id:PetActionIconName){if(life.busy)return;action.value=id;preview.value=null;manageId.value=null;feedPreview.value=false;message.value='';life.message=''}
function chooseSlot(slot:SlotId){if(preview.value)preview.value={...preview.value,slotId:slot}}
function manage(id:string){action.value='home';preview.value=null;manageId.value=id}
function openUpgrade(){preview.value=null;manageId.value=null;upgradeOpen.value=true}
async function upgrade(level:number){const result=await life.submit(life.makeCommand(pet.current.element,{kind:'upgrade',targetLevel:level}));if(result?.ok){upgradeOpen.value=false;react(result.response,true)}}
function selectDesignFood(item:ItemDesign){if(item.element!==pet.current.element||item.module!=='feed')return;selectedDesignFood.value=item.id;feedPreview.value=true;message.value=''}
function selectFood(id:PetFoodIconName){selectedDesignFood.value=null;foodId.value=id;feedPreview.value=true;message.value=''}
function confirmFeed(){if(!feedPreview.value||!canFeed.value)return;const name=selectedFood.value?.name;feedPreview.value=false;if(pet.feed())react(name+'已分享，亲密度最多 +5。');else message.value='今天已经分享过，或档案暂未保存。'}
const unavailableDress=ref<string[]>([])
let dressGeneration=0,dressQueue=Promise.resolve()
function equip(id:string){
 const element=pet.current.element,form=forms.stage(element),generation=dressGeneration
 // Preserve every intentional tap, while cancelling requests from a previous actor/form.
 dressQueue=dressQueue.then(async()=>{
  if(generation!==dressGeneration||pet.current.element!==element||forms.stage(element)!==form)return
  if(!pet.current.equippedCosmetics.includes(id)){
   message.value='正在准备这件装扮。'
   const layers=equipmentLayers(element,form,[id],liveChibiEnabled?'chibi':'original-fallback')
   const ready=layers.length&&await Promise.all([...new Set(layers.map(layer=>layer.src))].map(loadSceneImage)).then(results=>results.every(Boolean))
   if(generation!==dressGeneration||pet.current.element!==element||forms.stage(element)!==form)return
   if(!ready){unavailableDress.value=[...new Set([...unavailableDress.value,id])];message.value='这件装扮图片暂不可用，原来的装扮已保留。';return}
  }
  if(!pet.equip(id)){message.value='装扮暂未保存，请稍后重试。';return}
  react(pet.current.equippedCosmetics.includes(id)?'穿戴好了，伙伴也换上啦。':'已经取下，其他装扮继续保留。')
 }).catch(()=>{message.value='装扮暂未保存，原来的装扮已保留。'})
}
function goLearn(){upgradeOpen.value=false;helpOpen.value=false;navigate('learn')}
function start(){today.value=localDate();if(!dayTimer)dayTimer=setInterval(()=>today.value=localDate(),30000)}
function stop(){clearInterval(dayTimer);dayTimer=undefined;clearReaction();upgradeOpen.value=false;helpOpen.value=false;manageId.value=null;preview.value=null;feedPreview.value=false}
watch(()=>pet.current.element,()=>{selectedDesignFood.value=null;preview.value=null;manageId.value=null;upgradeOpen.value=false;feedPreview.value=false;message.value='';life.message='';clearReaction()})
watch(()=>[pet.current.element,forms.stage(pet.current.element),action.value],()=>{dressGeneration++;unavailableDress.value=[]})
onUnmounted(()=>dressGeneration++)
onMounted(start);onShow(start);onHide(stop);onUnmounted(stop)
onBackPress(()=>{if(upgradeOpen.value){upgradeOpen.value=false;return true}if(helpOpen.value){helpOpen.value=false;return true}if(manageId.value){manageId.value=null;return true}if(preview.value){preview.value=null;return true}if(feedPreview.value){feedPreview.value=false;return true}return false})
</script>
<style scoped>
.lh-dressing:not(.lh-dark) :deep(.lh-tab[aria-pressed=true]){background:var(--lh-selection);border-color:var(--lh-selection-line);color:var(--lh-selection-ink)}
</style>
