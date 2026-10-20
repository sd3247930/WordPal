<template>
 <WPCard class="home-companion home-companion-lite" level="feature" role="group" :class="{'companion-stacked':stacked,'companion-tight':!stacked&&width<300,'companion-dark':theme.mode==='dark'}" :style="appearance" :data-scene="scene.id" :data-element="identity?pet?.element:undefined" :data-form="form" :aria-label="identity?identity.name+'的陪伴卡':'伙伴资料暂不可用'">
  <view class="home-companion-layout">
   <view class="companion-art">
    <image v-if="!backdropFailed" :key="scene.sceneAsset" class="companion-backdrop" :src="scene.sceneAsset" mode="aspectFill" aria-hidden="true" @error="backdropFailed=true"/>
    <view class="companion-portrait" :aria-hidden="identity&&!portraitFailed?true:undefined">
     <PetHousePetArt v-if="identity&&!portraitFailed&&pet" :key="pet.element+':'+form" :element="pet.element" :badge="false" fit="portrait" @error="portraitFailed=true"/>
     <view v-else class="companion-portrait-fallback" role="img" :aria-label="identity?identity.name+'配图暂不可用':'伙伴资料暂不可用'"><text>{{identity?'配图暂不可用':'伙伴资料暂不可用'}}</text><WPButton v-if="identity" kind="quiet" @click="portraitFailed=false">重试配图</WPButton></view>
    </view>
   </view>
   <view class="companion-copy">
    <text class="companion-label">{{identity?'当前陪伴 · '+identity.elementName+'精灵':'当前陪伴 · 资料待恢复'}}</text>
    <view class="companion-identity"><text class="companion-name">{{identity?.name||'伙伴资料暂不可用'}}</text><text v-if="identity" class="companion-level">Lv.{{level}}</text></view>
    <text class="companion-message">{{identity?message:'请先恢复学习档案，再查看伙伴状态。'}}</text>
    <view v-if="identity" class="companion-status"><view class="companion-mood"><view class="companion-smile" aria-hidden="true"><view/><view/><view/></view><text>{{mood}}</text></view><view class="companion-affection"><view class="companion-heart-wrap" aria-hidden="true"><view class="companion-heart"/></view><text>亲密度 {{affection}}</text></view></view>
    <WPButton class="companion-open" kind="secondary" :disabled="!identity||opening" label="看看伙伴" @click="open"><view class="companion-paw" aria-hidden="true"><view/><view/><view/><view/><view/></view><text>看看伙伴</text></WPButton>
   </view>
  </view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref,watch,onMounted,onUnmounted,nextTick,getCurrentInstance} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {petInfo,type PetState} from '../../../packages/pet_engine'
import {petHouseStyle,petMoods,type PetHouseTheme} from '../../styles/pet-house'
import {usePetFormsStore} from '../../stores/pet-forms'
import {useThemeStore} from '../../stores/theme'
import {windowLayout as layout} from '../../services/window'
import WPCard from '../wp-card/WPCard.vue'
import WPButton from '../wp-button/WPButton.vue'
import PetHousePetArt from '../pet-house/PetHousePetArt.vue'
const props=defineProps<{pet?:PetState;scene:PetHouseTheme;message:string;unavailable?:boolean}>(),emit=defineEmits<{open:[]}>(),theme=useThemeStore(),forms=usePetFormsStore()
const identity=computed(()=>!props.unavailable&&props.pet?petInfo[props.pet.element]:undefined),form=computed(()=>identity.value&&props.pet?forms.stage(props.pet.element):undefined)
const number=(value:unknown,min=0)=>typeof value==='number'&&Number.isFinite(value)&&value>=min?String(value):'—'
const level=computed(()=>number(props.pet?.level,1)),affection=computed(()=>number(props.pet?.affection)),mood=computed(()=>props.pet?petMoods[props.pet.mood]||'状态待更新':'状态待更新')
const appearance=computed(()=>({...petHouseStyle(props.scene.id,theme.mode==='dark',theme.settings.highContrast,theme.settings.themeId,theme.tokens),'--companion-level-bg':props.pet?theme.tokens[props.pet.element+'-soft']:theme.tokens.muted,'--companion-level-fg':props.pet?theme.tokens['element-'+props.pet.element]:theme.tokens.foreground}))
const portraitFailed=ref(false),backdropFailed=ref(false),opening=ref(false),width=ref(340),instance=getCurrentInstance()
const stacked=computed(()=>width.value<270||Math.max(layout.fontScale,theme.settings.largeText?1.25:1)>=1.4)
let releaseTimer:ReturnType<typeof setTimeout>|undefined
function open(){if(opening.value||!identity.value)return;opening.value=true;emit('open');releaseTimer=setTimeout(()=>opening.value=false,650)}
function measure(){void nextTick(()=>{if(instance?.proxy)uni.createSelectorQuery().in(instance.proxy).select('.home-companion-layout').boundingClientRect(rect=>{if(rect&&!Array.isArray(rect)&&rect.width)width.value=rect.width}).exec()})}
watch(()=>[layout.width,layout.height,layout.fontScale,theme.settings.largeText],measure)
watch(()=>[props.pet?.element,form.value],()=>portraitFailed.value=false)
watch(()=>props.scene.sceneAsset,()=>backdropFailed.value=false)
onMounted(measure);onShow(()=>{opening.value=false;measure()});onUnmounted(()=>clearTimeout(releaseTimer))
// #ifdef H5
let observer:ResizeObserver|undefined
onMounted(()=>{const element=instance?.proxy?.$el as HTMLElement|undefined;if(element&&typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(measure);observer.observe(element)}})
onUnmounted(()=>observer?.disconnect())
// #endif
</script>
<style scoped>
.home-companion.home-companion-lite.wp-card{padding:18px;border-radius:var(--wp-radius-lg);background:var(--wp-surface)!important;border:1px solid var(--wp-border);box-shadow:0 5px 18px rgba(108,73,39,.06);overflow:hidden}
.home-companion-layout{display:grid;grid-template-columns:minmax(0,.45fr) minmax(0,.55fr);align-items:center;gap:16px;min-width:0;max-width:720px;margin:auto}
.companion-art{position:relative;min-width:0;width:100%;aspect-ratio:3/4;border-radius:var(--wp-radius-lg);background:var(--pet-tonal);overflow:hidden}
.companion-backdrop,.companion-portrait{position:absolute;inset:0;display:block;width:100%;height:100%}
.companion-dark .companion-backdrop{filter:brightness(.6) saturate(.7)}
.companion-copy{display:flex;flex-direction:column;align-items:stretch;gap:10px;min-width:0;overflow-wrap:anywhere}
.companion-label{font-size:var(--wp-font-caption);line-height:1.5;color:var(--wp-muted-foreground);letter-spacing:0}
.companion-identity{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;min-width:0}
.companion-name{font-size:calc(var(--wp-font-body)*1.75);line-height:1.25;font-weight:700;color:var(--wp-foreground);overflow-wrap:anywhere}
.companion-level{display:flex;align-items:center;justify-content:center;max-width:100%;padding:3px 10px;border-radius:var(--wp-radius-chip);font-size:var(--wp-font-small);line-height:1.4;font-weight:600;background:var(--companion-level-bg);color:var(--companion-level-fg);overflow-wrap:anywhere}
.companion-message{font-size:var(--wp-font-body);line-height:1.55;color:var(--wp-foreground)}
.companion-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:var(--wp-font-small);line-height:1.5;color:var(--wp-muted-foreground)}
.companion-mood,.companion-affection{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;overflow-wrap:anywhere}
.companion-affection{border-left:1px solid var(--wp-divider);padding-left:10px}
.companion-tight .companion-affection{border-left:0;padding-left:0}
.home-companion-lite .companion-open.wp-button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;margin:2px 0 0;padding:10px 12px;border-radius:var(--wp-radius-chip);background:var(--wp-secondary);border:1px solid var(--wp-border);color:var(--wp-primary);font-size:var(--wp-font-body);font-weight:600;line-height:1.5;white-space:normal;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 4px rgba(108,73,39,.06)}
.companion-paw{position:relative;flex:0 0 22px;width:22px;height:22px;color:inherit}
.companion-paw>view{position:absolute;background:currentColor;border-radius:50%}
.companion-paw>view:nth-child(1){width:13px;height:10px;left:4.5px;bottom:0;border-radius:55% 55% 40% 40%}
.companion-paw>view:nth-child(2){width:5px;height:7px;left:0;top:5px;transform:rotate(-22deg)}
.companion-paw>view:nth-child(3){width:5px;height:7px;left:6px;top:0}
.companion-paw>view:nth-child(4){width:5px;height:7px;right:5px;top:0}
.companion-paw>view:nth-child(5){width:5px;height:7px;right:0;top:5px;transform:rotate(22deg)}
.companion-smile{position:relative;flex:0 0 20px;width:20px;height:20px;border-radius:50%;background:var(--wp-secondary);color:var(--wp-primary)}
.companion-smile>view:nth-child(1),.companion-smile>view:nth-child(2){position:absolute;top:6px;width:2.5px;height:2.5px;border-radius:50%;background:currentColor}
.companion-smile>view:nth-child(1){left:5px}.companion-smile>view:nth-child(2){right:5px}
.companion-smile>view:nth-child(3){position:absolute;left:6px;top:10px;width:8px;height:5px;border-bottom:2px solid currentColor;border-radius:0 0 8px 8px}
.companion-heart-wrap{display:flex;align-items:center;justify-content:center;flex:0 0 20px;width:20px;height:20px}
.companion-heart{position:relative;width:11px;height:11px;transform:rotate(-45deg);background:var(--wp-danger);opacity:.65}
.companion-heart::before,.companion-heart::after{content:'';position:absolute;width:11px;height:11px;border-radius:50%;background:inherit}
.companion-heart::before{top:-5px;left:0}.companion-heart::after{top:0;left:5px}
.companion-portrait-fallback{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;padding:10px;text-align:center;background:var(--wp-surface-tonal);color:var(--wp-foreground);font-size:var(--wp-font-small);overflow-wrap:anywhere}
.companion-portrait-fallback .wp-button{min-height:48px;margin:0;padding:6px;font-size:var(--wp-font-small)}
.companion-stacked .home-companion-layout{grid-template-columns:minmax(0,1fr)}
.companion-stacked .companion-art{max-width:220px;justify-self:center}
.companion-stacked .companion-copy{width:100%}
.companion-dark.home-companion-lite.wp-card{box-shadow:none}
.high-contrast .home-companion-lite.wp-card{box-shadow:none;border-width:2px}
.high-contrast .companion-open.wp-button{box-shadow:none}
@media(max-width:599px){.home-companion.home-companion-lite.wp-card{padding:16px}.home-companion-layout{gap:12px}}
</style>
