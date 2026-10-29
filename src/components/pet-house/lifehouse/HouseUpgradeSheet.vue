<template>
 <LifeHouseSheet :open="open" title="让家，一点点长大" variant="upgrade" @close="$emit('close')">
  <view class="lh-house-identity"><text class="lh-house-brand">{{identity.title}}</text><text class="lh-house-traits">{{identity.traits}}</text><text class="lh-house-signs">{{identity.signs}}</text></view>
  <view class="lh-upgrade-status" aria-label="家园升级状态"><view><text>当前</text><text class="lh-strong">{{unavailable?'待恢复':'Lv.'+house.level}}</text></view><view><WPSpiritStoneIcon/><text>灵石</text><text class="lh-strong">{{unavailable?'待恢复':gems}}</text></view><view><text>{{house.level===5?'已满级':'下级'}}</text><template v-if="house.level<5"><WPSpiritStoneIcon/><text class="lh-strong">{{housePrices[house.level+1]}}</text></template><text v-else class="lh-strong">Lv.5</text></view></view>
  <view class="lh-upgrade-list" role="group" aria-label="六级家园预览">
   <WPActionTile v-for="(name,i) in identity.levels" :key="element+'-'+i" class="lh-level-card" :class="{'lh-level-current':!unavailable&&house.level===i,'lh-level-next':!unavailable&&i===house.level+1}" :selected="selected===i" :disabled="busy" :aria-label="'预览房屋 Lv.'+i+' '+name" @click="selected=i">
    <view class="lh-level-art"><HouseLevelThumbnail :element="element" :level="i" :form="forms.stage(element)"/><text v-if="!unavailable&&i===house.level" class="lh-level-state">当前</text><text v-else-if="selected===i" class="lh-level-state lh-level-preview">预览</text></view>
    <text class="lh-level-name">Lv.{{i}} {{name}}</text><view class="lh-level-bottom"><text class="lh-level-note">{{houseLevelBrief[i]}}</text><view class="lh-level-price"><template v-if="i>house.level"><WPSpiritStoneIcon/><text>{{housePrices[i]}}</text></template><text v-else>{{unavailable?'预览':i===house.level?'住在这里':'已解锁'}}</text></view></view>
   </WPActionTile>
  </view>
  <view class="lh-upgrade-detail"><HouseLevelThumbnail :element="element" :level="selected" :form="forms.stage(element)"/><view class="lh-upgrade-detail-copy"><text class="lh-strong lh-block">{{houseLevelName(element,selected)}}</text><text class="lh-caption lh-block">{{houseLevelAdditions(selected as HouseLevel).join(' · ')}}</text><text class="lh-caption lh-block">{{selected>house.level?'升级 '+housePrices[selected]+' 灵石 · 物品保留':'喜欢的小物件，慢慢布置就好。'}}</text><text v-if="selected===house.level+1&&assetState!=='ready'" class="lh-caption lh-block" role="status">{{assetState==='failed'?'图片未准备好，请重试。':'正在准备新家…'}}</text><WPActionTile v-if="selected===house.level+1&&assetState==='failed'" class="lh-text-button" aria-label="重试新家图片" @click="prepareUpgrade">重试图片</WPActionTile></view></view>
  <template #footer><WPButton class="lh-main-button lh-upgrade-primary" :disabled="primaryDisabled" :loading="busy" @click="primary"><WPSpiritStoneIcon v-if="selected===house.level+1" size="large"/><text>{{primaryLabel}}</text></WPButton></template>
 </LifeHouseSheet>
</template>
<script setup lang="ts">
import {computed,ref,watch,onUnmounted} from 'vue'
import {onHide} from '@dcloudio/uni-app'
import type {Element} from '../../../../packages/pet_engine'
import type {ElementHouse,HouseLevel} from '../../../services/pet-lifehouse/types'
import {housePrices} from '../../../services/pet-lifehouse/HouseRegistry'
import {houseIdentity,houseLevelName,houseLevelBrief,houseLevelAdditions} from '../../../services/pet-lifehouse/HouseIdentity'
import {sceneDefinition} from '../../../services/pet-lifehouse/SceneConfig'
import {sceneAsset} from '../../../services/pet-lifehouse/SceneVisualPack'
import {loadSceneImage} from '../../../services/pet-lifehouse/SceneAssetLoader'
import {usePetFormsStore} from '../../../stores/pet-forms'
import LifeHouseSheet from './LifeHouseSheet.vue'
import HouseLevelThumbnail from './HouseLevelThumbnail.vue'
import WPSpiritStoneIcon from '../../brand/WPSpiritStoneIcon.vue'
import WPActionTile from '../../button/WPActionTile.vue'
import WPButton from '../../wp-button/WPButton.vue'
const props=defineProps<{element:Element;open:boolean;house:ElementHouse;gems:number;unavailable:boolean;busy:boolean}>(),emit=defineEmits<{close:[];upgrade:[level:number];learn:[]}>()
const forms=usePetFormsStore(),selected=ref(0),identity=computed(()=>houseIdentity[props.element]),assetState=ref<'loading'|'ready'|'failed'>('loading');let assetGeneration=0
const next=computed(()=>selected.value===props.house.level+1),deficit=computed(()=>Math.max(0,housePrices[selected.value]-props.gems))
const primaryLabel=computed(()=>props.unavailable?'家园待恢复':next.value?deficit.value?'还差 '+deficit.value+' 灵石 · 去学习':'使用 '+housePrices[selected.value]+' 灵石升级':selected.value>props.house.level+1?'先解锁 Lv.'+(props.house.level+1):selected.value===props.house.level?'当前家园':'回到当前家园')
const primaryDisabled=computed(()=>props.unavailable||props.busy||selected.value===props.house.level||selected.value>props.house.level+1||next.value&&!deficit.value&&assetState.value!=='ready')
function primary(){if(primaryDisabled.value)return;if(next.value)deficit.value?emit('learn'):emit('upgrade',selected.value);else emit('close')}
async function prepareUpgrade(){const token=++assetGeneration;assetState.value='loading';if(!props.open||!next.value)return;const scene=sceneDefinition(props.element,selected.value as HouseLevel),sources=[...new Set(scene.zones.flatMap(z=>z.nodes.map(n=>sceneAsset(n.assetId)||'')))],ok=sources.length>0&&(await Promise.all(sources.map(loadSceneImage))).every(Boolean);if(token===assetGeneration&&props.open)assetState.value=ok?'ready':'failed'}
watch(()=>[props.open,props.element] as const,([open])=>{if(open)selected.value=Math.min(5,props.house.level+1)},{immediate:true})
watch(()=>[props.open,props.element,selected.value,props.house.level],()=>{void prepareUpgrade()},{immediate:true})
onHide(()=>assetGeneration++);onUnmounted(()=>assetGeneration++)
</script>
<style scoped>
.lh-house-identity{padding:0 2px 9px;display:flex;flex-wrap:wrap;align-items:center;gap:3px 10px}.lh-house-brand{font-size:18px;font-weight:750;flex-basis:100%;color:var(--lh-ink)}.lh-house-traits,.lh-house-signs{font-size:12px;color:var(--lh-muted)}.lh-house-signs{margin-left:auto}.lh-upgrade-status{display:grid;grid-template-columns:.86fr 1.16fr 1fr;gap:5px;margin-bottom:10px}.lh-upgrade-status>view{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:3px;padding:6px 3px;border-radius:14px;background:var(--lh-tint);font-size:12px;min-height:40px}.lh-upgrade-status .lh-strong{font-size:16px}.lh-upgrade-status :deep(.wp-blue-diamond){width:19px;height:24px}.lh-upgrade-list{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px}.lh-level-card.lh-level-card{border:1px solid var(--lh-line);border-radius:18px;gap:4px;padding:5px;background:var(--lh-tint);min-width:0}.lh-level-card.lh-level-card[aria-pressed=true]{border:2px solid #e5ad3f;padding:4px;background:var(--lh-surface);box-shadow:0 0 0 2px #f7d88c66}.lh-level-art{position:relative;width:100%}.lh-level-state{position:absolute;right:4px;top:4px;padding:3px 8px;border-radius:12px;background:var(--lh-ink);color:var(--lh-surface);font-size:12px;font-weight:700}.lh-level-preview{background:#ffe8a7;color:#62420d}.lh-level-name{font-size:14px;font-weight:750;line-height:1.4;padding:0 3px;color:var(--lh-ink)}.lh-level-bottom{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:2px;width:100%;padding:0 3px 3px}.lh-level-note{font-size:11px;line-height:1.4}.lh-level-price{display:flex;align-items:center;gap:1px;font-size:13px;color:var(--lh-ink);font-weight:700;margin-left:auto}.lh-level-price :deep(.wp-blue-diamond){width:20px;height:24px}.lh-upgrade-detail{display:grid;grid-template-columns:30% minmax(0,1fr);align-items:center;gap:10px;padding:9px;margin-top:10px;border:1px solid var(--lh-line);border-radius:18px;background:var(--lh-tint);line-height:1.5}.lh-upgrade-detail-copy{min-width:0}.lh-upgrade-detail .lh-caption{font-size:12px}.lh-upgrade-primary :deep(.wp-blue-diamond){width:32px;height:36px;margin-right:6px}.lh-upgrade-primary{display:flex;align-items:center;justify-content:center;min-height:52px!important;font-size:16px!important;font-weight:750}.large-text .lh-house-signs,.scaled-text .lh-house-signs{display:none}.large-text .lh-level-bottom,.scaled-text .lh-level-bottom{flex-direction:column;align-items:flex-start}.large-text .lh-level-name,.scaled-text .lh-level-name{font-size:var(--wp-font-small)}@media(max-width:340px){.lh-house-signs{display:none}.lh-level-name{font-size:13px}.lh-level-note{font-size:11px}.lh-upgrade-detail{grid-template-columns:26% minmax(0,1fr)}}
</style>

