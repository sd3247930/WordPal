<template>
 <view v-if="items.length" class="lh-design-gallery">
  <view class="lh-builder-heading"><text class="lh-strong">{{titles[module]}} · 六级款式</text><text class="lh-caption">点开看大图</text></view>
  <view class="lh-design-grid" role="group" :aria-label="titles[module]+'等级款式'">
   <WPActionTile v-for="item in items" :key="item.id" class="lh-design-card" :selected="selected?.id===item.id" :aria-label="'预览'+item.name+'，款式 Lv.'+item.designTier" :aria-pressed="selected?.id===item.id" @click="selected=item">
    <LifeHouseAsset class="lh-design-icon" :src="itemDesignImage(item.id)||''" :label="item.name"/>
    <text class="lh-design-name">{{item.name}}</text><text class="lh-caption">款式 Lv.{{item.designTier}}</text>
   </WPActionTile>
  </view>
  <text v-if="mode==='preview'" class="lh-caption lh-block lh-design-note">这里可以欣赏各级款式，查看不会消耗灵石。</text>
  <LifeHouseSheet :open="!!selected" :title="selected?.name||'款式预览'" @close="selected=null">
   <template v-if="selected"><LifeHouseAsset class="lh-design-preview" :key="selected.id" :src="itemDesignImage(selected.id,'preview')||''" :label="selected.name"/><text class="lh-caption lh-block">{{titles[module]}} · 款式 Lv.{{selected.designTier}}</text></template>
   <template #footer><WPButton v-if="mode==='choose'&&selected" class="lh-main-button" :disabled="choice.disabled" @click="choose">{{choice.label}}</WPButton><WPButton v-else kind="quiet" class="lh-wide-button" @click="selected=null">继续看看</WPButton></template>
  </LifeHouseSheet>
 </view>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {onBackPress,onHide} from '@dcloudio/uni-app'
import type {Element} from '../../../../packages/pet_engine'
import {designsFor,itemDesignImage,type DesignModule,type ItemDesign} from '../../../services/pet-lifehouse/ItemVisualRegistry'
import LifeHouseAsset from './LifeHouseAsset.vue'
import LifeHouseSheet from './LifeHouseSheet.vue'
import WPActionTile from '../../button/WPActionTile.vue'
import WPButton from '../../wp-button/WPButton.vue'
const props=withDefaults(defineProps<{element:Element;module:DesignModule;mode?:'preview'|'choose';chooseLabel?:string;choiceStates?:Record<string,{label:string;disabled:boolean}>}>(),{mode:'preview',chooseLabel:'选这一款'})
const emit=defineEmits<{choose:[item:ItemDesign]}>()
const selected=ref<ItemDesign|null>(null)
const titles:Record<DesignModule,string>={feed:'四象点心',dress:'精灵装扮',furniture:'家具',decor:'装饰',courtyard:'庭院'}
const items=computed(()=>designsFor(props.element,props.module).filter(item=>!!itemDesignImage(item.id)))
const choice=computed(()=>(selected.value&&props.choiceStates?.[selected.value.id])||{label:props.chooseLabel,disabled:false})
watch(()=>[props.element,props.module],()=>{selected.value=null})
onHide(()=>{selected.value=null})
onBackPress(()=>{if(selected.value){selected.value=null;return true}return false})
function choose(){if(!choice.value.disabled&&selected.value&&selected.value.element===props.element&&itemDesignImage(selected.value.id)){emit('choose',selected.value);selected.value=null}}
</script>
<style scoped>
.lh-design-gallery{display:flex;flex-direction:column;gap:10px;min-width:0;margin-top:16px;padding-top:14px;border-top:1px solid var(--lh-line)}
.lh-design-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;min-width:0}
.lh-design-card{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;min-width:0;min-height:44px;padding:9px 5px;border:1px solid var(--lh-line);border-radius:16px;background:var(--lh-surface);color:var(--lh-ink);white-space:normal;text-align:center}
.lh-design-card[aria-pressed=true]{background:var(--lh-tint);border-color:var(--pet-accent)}
.lh-design-icon{width:72px;height:72px;max-width:100%}.lh-design-name{font-size:var(--wp-font-small);font-weight:600;overflow-wrap:anywhere}.lh-design-note{line-height:1.6}.lh-design-preview{height:260px;max-width:100%;margin:0 auto 12px}
@media(max-width:359px){.lh-design-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.large-text .lh-design-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
@media(prefers-reduced-motion:reduce){.lh-design-card{transition:none}}
</style>
