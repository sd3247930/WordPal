<template>
 <view class="custom-config">
  <view class="custom-config-column">
   <WPCard class="custom-config-section"><text class="section-title">① 选择教材</text><view class="custom-book-summary"><view aria-hidden="true" class="custom-book-symbol"><WPNavIcon name="review" variant="friendly" :size="40"/></view><view><text class="strong block">{{custom.pack?.title||'暂无可用教材'}}</text><text class="small muted block">{{custom.pack?.contentVersion||''}} · {{bookTotal}} 词</text></view><WPButton kind="secondary" @click="pickerOpen=!pickerOpen" :aria-expanded="pickerOpen">更换教材</WPButton></view>
    <view v-if="pickerOpen" class="custom-book-picker" role="group" aria-label="选择练习教材"><WPActionTile v-for="book in custom.installed" :key="book.courseId" toggle-highlight :selected="custom.courseId===book.courseId" class="custom-book-option" @click="choose(book.courseId)" @cancel="pickerOpen=false"><text>{{book.title}}</text><text class="small muted">{{book.vocabulary.length}} 词</text></WPActionTile></view>
    <WPButton v-if="!custom.installed.length" kind="secondary" @click="navigate('course')">查看教材</WPButton>
   </WPCard>
   <WPCard class="custom-config-section"><text class="section-title">② 选择范围</text><view class="custom-scope-options" role="group" aria-label="练习范围"><WPActionTile toggle-highlight :selected="custom.scope.type==='whole-book'" @click="custom.chooseScope('whole-book')">整本教材</WPActionTile><WPActionTile toggle-highlight :selected="custom.scope.type==='units'" @click="custom.chooseScope('units')">指定单元</WPActionTile></view><view v-if="custom.scope.type==='units'" class="custom-unit-options" role="group" aria-label="选择练习单元"><WPActionTile v-for="unit in custom.units" :key="unit.id" toggle-highlight :selected="custom.scope.unitIds.includes(unit.id)" @click="custom.toggleUnit(unit.id)" @cancel="custom.toggleUnit(unit.id)">{{unit.title}}</WPActionTile></view><text class="small muted block">本范围 {{custom.total}} 个不同词条，按教材顺序练习。</text></WPCard>
   <WPCard class="custom-config-section"><text class="section-title">③ 本次练习词数</text><view class="custom-count-options" role="group" aria-label="快捷练习词数"><WPActionTile v-for="value in quickCounts" :key="value" toggle-highlight :selected="custom.count===String(value)" @click="custom.count=String(value)" @cancel="custom.count=''">{{value}} 词</WPActionTile><WPActionTile v-if="custom.total" toggle-highlight :selected="custom.count===String(custom.total)" @click="custom.count=String(custom.total)" @cancel="custom.count=''">全部 {{custom.total}} 词</WPActionTile></view><view class="custom-count-stepper"><WPButton kind="secondary" label="减少练习词数" :disabled="custom.total===0||Number(custom.count)<=1" @click="custom.step(-1)">－</WPButton><input class="custom-count-input" type="text" inputmode="numeric" aria-label="本次练习词数" :aria-invalid="!!custom.countError" :value="custom.count" :maxlength="12" :adjust-position="true" :cursor-spacing="150" @input="changeCount"/><WPButton kind="secondary" label="增加练习词数" :disabled="custom.total===0||Number(custom.count)>=custom.total" @click="custom.step(1)">＋</WPButton><text class="small muted">最多 {{custom.total}} 词</text></view><text v-if="custom.countError" class="notice error" role="alert">{{custom.countError}}</text><text v-if="custom.notice" class="small muted block" role="status">{{custom.notice}}</text></WPCard>
  </view>
  <view class="custom-config-column">
   <WPCard class="custom-config-section"><text class="section-title">④ 练习模式</text><StudyModeSelector :model-value="custom.singleMode" :selected-modes="custom.continuous?CUSTOM_MODES:undefined" :options="modeOptions" @update:model-value="chooseMode" @clear="clearMode"/><WPActionTile class="custom-continuous" toggle-highlight :selected="custom.continuous" @click="custom.continuous=true" @cancel="custom.continuous=false"><view><text class="strong block">五项连续练习</text><text class="small muted block">同一组词，依次完成五种练习</text></view><view class="custom-switch" :class="{on:custom.continuous}" aria-hidden="true"><view/></view></WPActionTile><text class="small muted block">{{custom.continuous?'闪现 → 连接 → 听音 → 拼写 → 听写':'选择一项，按教材顺序完成本轮。'}}</text><text v-if="custom.startProblem&&!custom.countError" class="notice" role="status">{{custom.startProblem}}</text></WPCard>
   <view class="custom-companion-note"><WPPetAvatar :element="pet.current.element" :size="56"/><view><text class="strong block">和{{pet.info.name}}一起，多练一点点</text><text class="small muted block">从第一词开始，不跳词、不重复凑数。</text></view></view>
  </view>
 </view>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import {useCustomPracticeStore} from '../../stores/custom-practice'
import {usePetStore} from '../../stores/pet'
import WPCard from '../wp-card/WPCard.vue'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import StudyModeSelector from './StudyModeSelector.vue'
import WPPetAvatar from '../wp-pet-avatar/WPPetAvatar.vue'
import WPNavIcon from '../wp-nav-icon/WPNavIcon.vue'
import {CUSTOM_MODES,CUSTOM_MODE_NAMES,practiceWordIds,wholeBook} from '../../services/learning/CustomPractice'
import type {LearningMode} from '../../../packages/core_learning'
import {navigate} from '../../services/navigation'
const custom=useCustomPracticeStore(),pet=usePetStore(),pickerOpen=ref(false)
const bookTotal=computed(()=>practiceWordIds(custom.courseId,wholeBook()).length)
const quickCounts=computed(()=>[5,10,20,50,100].filter(count=>count<custom.total))
const descriptions={flash:'看单词，回想词义',connect:'分组连接单词与词义',listen:'听发音，选择单词',spell:'看词义，写出英文',dictation:'听发音，写出英文'}
const modeOptions=computed(()=>CUSTOM_MODES.map(id=>({id,name:CUSTOM_MODE_NAMES[id],description:descriptions[id],disabled:!!custom.problems[id]})))
function choose(id:string){custom.chooseCourse(id);pickerOpen.value=false}
function chooseMode(mode:LearningMode){custom.continuous=false;custom.singleMode=mode}
function clearMode(mode:LearningMode){if(custom.continuous){custom.continuous=false;custom.singleMode=mode}else custom.singleMode=undefined}
function changeCount(event:any){custom.count=String(event.detail?.value??event.target?.value??'');custom.notice=''}
</script>
