<template>
 <view class="lh-builder" :data-section="section">
  <HouseSegments class="lh-build-tools" :model-value="section" :items="houseBuilderSections" label="家园布置工具" :disabled="store.busy" @update:model-value="chooseSection"/>
  <view class="lh-builder-heading lh-builder-title"><text class="lh-strong">{{builderTitles[section]}}</text><text class="lh-caption">{{section==='owned'?'再次放置免费':section==='room'?'慢慢长大就好':'先预览，再确认'}}</text></view>
  <HouseRoomOverview v-if="section==='room'" :element="element" :house="house" :form="forms.stage(element)" :equipment="pets.current.equippedCosmetics" :unavailable="store.unavailable" @upgrade="$emit('upgrade')" @zone="$emit('zone',$event)"/>
  <template v-else>
   <HouseSegments v-if="section==='furniture'" class="lh-furniture-filters" :model-value="category" :items="furnitureFilters" label="家具分类" variant="filter" :disabled="store.busy" @update:model-value="chooseCategory"/>
   <view v-if="section==='garden'&&gardenLocked" class="lh-builder-empty"><LifeHouseAsset class="lh-empty-image" :src="lifeHouseIcon('home')" decorative/><text class="lh-strong">房屋 Lv.{{outdoorLevel}}，花园就会开放</text><text class="lh-caption">先给伙伴一间温暖的小屋，再来布置小庭院。</text><WPButton class="lh-main-button" :disabled="store.unavailable" @click="$emit('upgrade')">看看小屋怎么长大</WPButton></view>
   <template v-else>
    <text v-if="house.level===0&&section!=='owned'" class="lh-builder-note">房屋 Lv.1 后开始布置，建造还会送一张基础床。</text>
    <view v-if="items.length" class="lh-catalog" role="group" :aria-label="section==='owned'?'已拥有的物品':'可布置物品'">
     <WPActionTile v-for="item in items" :key="element+item.id" class="lh-product" :class="'lh-product-'+state(item).kind" :selected="preview?.furnitureId===item.id" :disabled="store.busy" :aria-label="item.name+'，'+state(item).label" :data-category="item.category" @click="select(item.id)"><LifeHouseAsset class="lh-product-image" :src="furnitureVisual(item.id,element)" :label="item.name" @error="iconFailures.add(item.id)" @load="iconFailures.delete(item.id)"/><text class="lh-product-name">{{item.name}}</text><view class="lh-product-cost"><image v-if="state(item).kind==='purchase'" class="lh-price-stone" :src="spiritStoneAsset()" mode="aspectFit" aria-hidden="true"/><text>{{state(item).kind==='purchase'?item.price:state(item).label}}</text></view></WPActionTile>
    </view>
    <view v-else class="lh-builder-empty"><LifeHouseAsset class="lh-empty-image" :src="lifeHouseIcon('home')" decorative/><text class="lh-strong">{{section==='owned'?'收藏，从一件小喜欢开始':'这里还没有小家具'}}</text><text class="lh-caption">{{section==='owned'?'已有和已摆放的物品，都会收在这里。':'换个分类，看看其他小心意。'}}</text><WPButton kind="quiet" @click="chooseSection('furniture');chooseCategory('all')">去家具看看</WPButton></view>
   </template>
   <template v-if="activeVisualVersion===2&&section!=='owned'"><WPActionTile class="lh-design-toggle" :aria-expanded="designsOpen" @click="designsOpen=!designsOpen">{{designsOpen?'收起款式图鉴':'更多款式图鉴 · 仅欣赏'}}</WPActionTile><ItemDesignGallery v-if="designsOpen" :element="element" :module="designModule"/></template>
  </template>
  <view v-if="selectedItem" class="lh-placement-panel" aria-label="家具摆放预览">
   <view class="lh-builder-heading"><text class="lh-strong">{{selectedItem.name}}</text><WPActionTile class="lh-text-button" aria-label="取消摆放预览" @click="cancel">取消</WPActionTile></view>
   <text v-if="selectedItem.level>house.level" class="lh-block">房屋 Lv.{{selectedItem.level}} 解锁。先让小屋长大一点吧。</text>
   <template v-else><text class="lh-caption lh-block">选择上方舞台或下方的位置，取消预览不会扣费。</text><text v-if="!selectedAssetReady||iconFailures.has(selectedItem.id)" class="lh-hint">{{unavailableAssets.has(selectedItem.id)||iconFailures.has(selectedItem.id)?'图片暂不可用，物品和灵石都没有改变。':'正在准备预览图片…'}}</text><WPActionTile v-if="unavailableAssets.has(selectedItem.id)" class="lh-text-button" aria-label="重试家具预览图片" @click="preparePreview">重试图片</WPActionTile><view class="lh-slot-options"><WPActionTile v-for="slot in slots" :key="slot" :selected="preview?.slotId===slot" :aria-pressed="preview?.slotId===slot" :disabled="store.busy" @click="setSlot(slot)">{{slotDefinitions[slot].name}}</WPActionTile></view>
    <view v-if="replaced" class="lh-replace-options"><text class="lh-block">这里已有{{furnitureRegistry[replaced.furnitureId].name}}</text><WPActionTile :selected="replaceMode==='store'" :disabled="store.busy" @click="setReplace('store')">收纳原物品 · 保留所有权</WPActionTile><WPActionTile v-if="replaced.origin==='purchase'" :selected="replaceMode==='return'" :disabled="store.busy" @click="setReplace('return')">退回原物品 · 返 {{Math.floor(replaced.paidGems*.5)}} 灵石</WPActionTile></view>
    <text v-if="quote?.ok" class="lh-quote lh-block">{{quote.receipt.paid?'购买 '+quote.receipt.paid+' 灵石':'已拥有 · 放置免费'}}{{quote.receipt.refunded?'，退回返 '+quote.receipt.refunded+' 灵石':''}} · 确认后余额 {{quote.gems}}</text>
    <text v-else-if="quote&&!quote.ok" class="lh-hint">{{houseErrorText(quote)}}</text>
    <WPButton v-if="quote&&!quote.ok&&quote.error==='insufficient'" class="lh-main-button" @click="$emit('learn')">去学习收获灵石</WPButton><WPButton v-else class="lh-main-button" :disabled="!quote?.ok||store.unavailable||!selectedAssetReady||iconFailures.has(selectedItem.id)" :loading="store.busy" @click="confirmPlacement">{{ownedSelected?'确认放置 · 免费':'确认购买并放置'}}</WPButton>
   </template>
  </view>
  <LifeHouseSheet :open="!!managed" title="照顾好每一件小物品" @close="closeManage"><template v-if="managed"><LifeHouseAsset class="lh-managed-image" :src="furnitureVisual(managed.furnitureId,element,'stage')" :label="furnitureRegistry[managed.furnitureId].name"/><text class="lh-sheet-title lh-block">{{furnitureRegistry[managed.furnitureId].name}}</text><text class="lh-caption lh-block">{{managed.origin==='level-gift'?'升级赠礼 · 可收纳和免费放回':'实付 '+managed.paidGems+' 灵石 · 收纳后仍然属于你'}}</text><view class="lh-manage-actions"><WPButton class="lh-main-button" :disabled="store.unavailable||store.busy" :loading="store.busy" @click="storeManaged">收纳 · 不返灵石</WPButton><WPButton v-if="managed.origin==='purchase'&&!returnConfirm" kind="quiet" @click="returnConfirm=true">退回物品</WPButton></view><view v-if="returnConfirm" class="lh-return-confirm" role="alert"><text class="lh-block">退回后将不再拥有此物品，返还实付的 50%：{{Math.floor(managed.paidGems*.5)}} 灵石。以后可重新购买。</text><WPButton class="lh-main-button" :disabled="store.unavailable||store.busy" :loading="store.busy" @click="returnManaged">确认退回 · 返 {{Math.floor(managed.paidGems*.5)}} 灵石</WPButton><WPButton kind="quiet" @click="returnConfirm=false">保留物品</WPButton></view></template></LifeHouseSheet>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue'
import {spiritStoneAsset} from '../../../services/ui/SpiritStoneAsset'
import {onHide,onShow} from '@dcloudio/uni-app'
import type {Element} from '../../../../packages/pet_engine'
import {furnitureRegistry,slotDefinitions} from '../../../services/pet-lifehouse/HouseRegistry'
import {builderItems,builderSlots,builderTitles,furnitureFilters,furnitureState,houseBuilderSections,outdoorUnlockLevel,type HouseBuilderSection} from '../../../services/pet-lifehouse/HouseBuilderCatalog'
import {useProfileStore} from '../../../stores/profile'
import {usePetStore} from '../../../stores/pet'
import {usePetFormsStore} from '../../../stores/pet-forms'
import {lifeHouseIcon} from '../../../services/pet-lifehouse/LifeHouseAssets'
import {loadSceneImage} from '../../../services/pet-lifehouse/SceneAssetLoader'
import type {SceneZoneId} from '../../../services/pet-lifehouse/SceneConfig'
import {furnitureVisual} from '../../../services/pet-lifehouse/SceneVisualRegistry'
import ItemDesignGallery from './ItemDesignGallery.vue'
import {activeVisualVersion} from '../../../services/pet-lifehouse/VisualPack'
import type {DesignModule} from '../../../services/pet-lifehouse/VisualInventory'
import {houseErrorText} from '../../../services/pet-lifehouse/HouseCommands'
import type {ElementHouse,HouseCommand,SlotId,FurnitureCategory,FurnitureDefinition} from '../../../services/pet-lifehouse/types'
import HouseSegments from './HouseSegments.vue'
import HouseRoomOverview from './HouseRoomOverview.vue'
import {usePetLifeHouseStore} from '../../../stores/pet-lifehouse'
import LifeHouseAsset from './LifeHouseAsset.vue'
import LifeHouseSheet from './LifeHouseSheet.vue'
import WPButton from '../../wp-button/WPButton.vue'
import WPActionTile from '../../button/WPActionTile.vue'
const props=defineProps<{element:Element;house:ElementHouse;preview:{furnitureId:string;slotId?:SlotId}|null;manageId:string|null}>()
const emit=defineEmits<{'update:preview':[value:{furnitureId:string;slotId?:SlotId}|null];closeManage:[];upgrade:[];learn:[];feedback:[message:string];manage:[id:string];zone:[id:SceneZoneId]}>()
const store=usePetLifeHouseStore(),profile=useProfileStore(),pets=usePetStore(),forms=usePetFormsStore(),section=ref<HouseBuilderSection>('furniture'),category=ref<FurnitureCategory|'all'>('all'),replaceMode=ref<'store'|'return'>('store'),pending=ref<HouseCommand|null>(null),returnConfirm=ref(false),designsOpen=ref(false),unavailableAssets=ref(new Set<string>()),selectedAssetReady=ref(false),iconFailures=ref(new Set<string>())
let assetGeneration=0,alive=true,visible=true
const designModule=computed<DesignModule>(()=>section.value==='garden'?'courtyard':section.value==='decor'?'decor':'furniture')
const items=computed(()=>builderItems(props.element,props.house,section.value,category.value)),outdoorLevel=computed(()=>outdoorUnlockLevel(props.element)),gardenLocked=computed(()=>props.house.level<outdoorLevel.value)
const selectedItem=computed(()=>props.preview&&furnitureRegistry[props.preview.furnitureId]),ownedSelected=computed(()=>props.house.owned.find(o=>o.furnitureId===props.preview?.furnitureId)),slots=computed(()=>selectedItem.value?builderSlots(selectedItem.value,props.element,props.house.level,section.value):[])
const replaced=computed(()=>props.house.owned.find(o=>o.instanceId===props.house.slots[props.preview?.slotId as SlotId]&&o.furnitureId!==props.preview?.furnitureId)),quote=computed(()=>pending.value?store.preview(pending.value):null),managed=computed(()=>props.house.owned.find(o=>o.instanceId===props.manageId))
function state(item:FurnitureDefinition){return furnitureState(item,props.house,profile.db.gems,!!furnitureVisual(item.id,props.element)&&!!furnitureVisual(item.id,props.element,'stage')&&!unavailableAssets.value.has(item.id)&&!iconFailures.value.has(item.id))}
function command(){pending.value=props.preview?.slotId?store.makeCommand(props.element,{kind:'place',furnitureId:props.preview.furnitureId,slotId:props.preview.slotId,replaceMode:replaceMode.value}):null}
function chooseSection(value:string){if(store.busy||!houseBuilderSections.some(item=>item.id===value))return;cancel();closeManage();section.value=value as HouseBuilderSection;designsOpen.value=false}
function chooseCategory(value:string){if(store.busy||!furnitureFilters.some(item=>item.id===value))return;cancel();category.value=value as FurnitureCategory|'all'}
function select(id:string){if(store.busy)return;replaceMode.value='store';const item=furnitureRegistry[id],owned=props.house.owned.find(owned=>owned.furnitureId===id);if(owned&&Object.values(props.house.slots).includes(owned.instanceId)){emit('manage',owned.instanceId);return}emit('update:preview',{furnitureId:id,slotId:builderSlots(item,props.element,props.house.level,section.value)[0]})}
function setSlot(slot:SlotId){if(store.busy)return;if(props.preview){replaceMode.value='store';emit('update:preview',{...props.preview,slotId:slot})}}
function setReplace(value:'store'|'return'){if(store.busy)return;replaceMode.value=value;command()}
function cancel(){if(store.busy)return;assetGeneration++;selectedAssetReady.value=false;pending.value=null;emit('update:preview',null)}
function feedback(result:ReturnType<typeof store.commit>){if(result?.ok){if(alive&&visible)emit('feedback',result.response);return true}return false}
async function confirmPlacement(){if(!selectedAssetReady.value||!selectedItem.value||iconFailures.value.has(selectedItem.value.id)||store.busy)return;if(pending.value&&feedback(await store.submit(pending.value)))cancel()}
function closeManage(){if(store.busy)return;returnConfirm.value=false;emit('closeManage')}
async function storeManaged(){if(managed.value&&feedback(await store.submit(store.makeCommand(props.element,{kind:'store',instanceId:managed.value.instanceId}))))closeManage()}
async function returnManaged(){if(returnConfirm.value&&managed.value&&feedback(await store.submit(store.makeCommand(props.element,{kind:'return',instanceId:managed.value.instanceId}))))closeManage()}
async function preparePreview(){selectedAssetReady.value=false;const token=++assetGeneration,item=selectedItem.value,element=props.element;if(!item)return;const src=furnitureVisual(item.id,element,'stage'),ok=!!src&&await loadSceneImage(src);if(!alive||!visible||token!==assetGeneration||props.element!==element)return;selectedAssetReady.value=ok;if(ok)unavailableAssets.value.delete(item.id);else unavailableAssets.value.add(item.id)}
watch(()=>props.preview,()=>{replaceMode.value='store';command();void preparePreview()},{deep:true});watch(()=>props.element,()=>{cancel();closeManage();section.value='furniture';category.value='all';unavailableAssets.value=new Set();iconFailures.value=new Set();designsOpen.value=false});watch(()=>props.manageId,()=>{returnConfirm.value=false})
onShow(()=>visible=true);onHide(()=>{visible=false;assetGeneration++;if(!store.busy)cancel()});onUnmounted(()=>{alive=false;assetGeneration++})
</script>
<style lang="scss" src="../../../styles/pet-house-builder.scss"></style>
