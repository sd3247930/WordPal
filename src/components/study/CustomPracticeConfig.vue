<template>
 <WPCard class="custom-config">
  <view v-if="custom.recoverable&&custom.session" class="custom-recovery-entry">
   <image class="custom-recovery-icon" :src="customPracticeArtwork.resume" mode="aspectFit" aria-hidden="true"/>
   <view class="custom-recovery-copy"><text class="strong block">继续上次</text><text class="small muted block">{{custom.session.courseTitle}} · {{custom.session.scopeLabel}} · {{CUSTOM_MODE_NAMES[custom.mode]}} {{custom.session.results[custom.mode].completedWordIds.length}}/{{custom.session.wordIds.length}}</text></view>
   <WPButton v-if="!custom.resumeProblem" kind="secondary" label="继续上次自定义练习" @click="custom.resume()">继续 ›</WPButton><WPButton v-else kind="secondary" @click="custom.openConfig()">重新设置</WPButton>
   <text v-if="custom.resumeProblem" class="notice error custom-recovery-problem" role="alert">{{custom.resumeProblem}} 请重新设置后开始练习。</text>
  </view>
   <view class="custom-config-section custom-book-section"><text class="section-title">① 选择教材</text><view class="custom-book-summary"><image class="custom-book-icon" :src="customPracticeArtwork.course" mode="aspectFit" aria-hidden="true"/><view class="custom-book-copy"><text class="strong block">{{custom.pack?.title||'暂无可用教材'}}</text><text class="small muted block">{{bookTotal}} 词 · {{custom.units.length}} 单元</text></view><WPButton kind="secondary" :disabled="!custom.installed.length" @click="pickerOpen=!pickerOpen" :aria-expanded="pickerOpen">更换教材</WPButton></view>
    <view v-if="pickerOpen" class="custom-book-picker" role="group" aria-label="选择练习教材"><WPActionTile v-for="book in custom.installed" :key="book.courseId" toggle-highlight :selected="custom.courseId===book.courseId" class="custom-book-option" @click="choose(book.courseId)" @cancel="pickerOpen=false"><text>{{book.title}}</text><text class="small muted">{{practiceWordIds(book.courseId,wholeBook()).length}} 词</text></WPActionTile></view>
    <WPButton v-if="!custom.installed.length" kind="secondary" @click="navigate('course')">查看教材</WPButton>
   </view>
   <view class="custom-config-section custom-scope-section"><view class="custom-scope-row"><text class="section-title">② 选择范围</text><view class="custom-scope-options" role="group" aria-label="练习范围"><WPActionTile toggle-highlight :selected="custom.scope.type==='whole-book'" @click="custom.chooseScope('whole-book')">整本教材</WPActionTile><WPActionTile toggle-highlight :selected="custom.scope.type==='units'" :disabled="!custom.units.length" @click="custom.chooseScope('units')">指定单元</WPActionTile></view></view><view v-if="custom.scope.type==='units'" class="custom-unit-options" role="group" aria-label="选择练习单元"><WPActionTile v-for="unit in custom.units" :key="unit.id" toggle-highlight :selected="custom.scope.unitIds.includes(unit.id)" @click="custom.toggleUnit(unit.id)" @cancel="custom.toggleUnit(unit.id)">{{unit.title}}</WPActionTile></view><text class="small muted block custom-scope-summary">{{custom.total}}词 · 按教材顺序</text></view>
   <view class="custom-config-section custom-count-section"><text class="section-title">③ 本次练习词数</text><view class="custom-count-controls"><view class="custom-count-options" role="group" aria-label="快捷练习词数"><WPActionTile v-for="value in quickCounts" :key="value" toggle-highlight :disabled="value>custom.total" :selected="custom.count===String(value)" :aria-label="value+' 词'+(value>custom.total?'，超出当前范围':'')" @click="setCount(value)" @cancel="setCount('')">{{value}} 词</WPActionTile><WPActionTile toggle-highlight :disabled="!custom.total" :selected="!!custom.total&&custom.count===String(custom.total)" @click="setCount(custom.total)" @cancel="setCount('')">全部 {{custom.total}} 词</WPActionTile></view><view class="custom-count-counter"><view class="custom-count-stepper"><WPButton kind="secondary" label="减少练习词数" :disabled="custom.total===0||Number(custom.count)<=1" @click="custom.step(-1)">－</WPButton><input class="custom-count-input" type="text" inputmode="numeric" aria-label="本次练习词数" :aria-invalid="!!custom.countError" :value="custom.count" :maxlength="12" :adjust-position="true" :cursor-spacing="150" @input="changeCount"/><WPButton kind="secondary" label="增加练习词数" :disabled="custom.total===0||Number(custom.count)>=custom.total" @click="custom.step(1)">＋</WPButton></view><text class="small muted block">最多 {{custom.total}} 词</text></view></view><text v-if="custom.countError" class="notice error" role="alert">{{custom.countError}}</text><text v-if="custom.notice" class="small muted block" role="status">{{custom.notice}}</text></view>
   <view class="custom-config-section custom-mode-section"><text class="section-title">④ 练习模式</text><StudyModeSelector :selected-modes="custom.selectedModes" :icon-sources="customPracticeArtwork.modes" :options="modeOptions" @update:model-value="custom.toggleMode" @clear="custom.toggleMode"/><WPActionTile class="custom-continuous" toggle-highlight :selected="custom.continuous" @click="custom.continuous=true" @cancel="custom.continuous=false"><view><text class="strong block">五项连续练习</text><text class="small muted block">同一组词，按顺序完成五种练习</text></view><view class="custom-switch" :class="{on:custom.continuous}" aria-hidden="true"><view/></view></WPActionTile><text class="small muted block custom-mode-status" role="status">{{custom.selectedModes.length?'可多选 · '+custom.selectedModes.map(mode=>CUSTOM_MODE_NAMES[mode]).join('→'):'请选择至少一种练习方式'}}</text><text v-if="custom.startProblem&&!custom.countError" class="notice" role="status">{{custom.startProblem}}</text></view>
 </WPCard>
</template>
<script setup lang="ts">
import {computed,ref} from 'vue'
import {useCustomPracticeStore} from '../../stores/custom-practice'
import WPCard from '../wp-card/WPCard.vue'
import WPButton from '../wp-button/WPButton.vue'
import WPActionTile from '../button/WPActionTile.vue'
import StudyModeSelector from './StudyModeSelector.vue'
import {customPracticeArtwork} from '../../services/custom-practice-artwork'
import {CUSTOM_MODES,CUSTOM_MODE_NAMES,practiceWordIds,wholeBook} from '../../services/learning/CustomPractice'
import {navigate} from '../../services/navigation'
const custom=useCustomPracticeStore(),pickerOpen=ref(false)
const bookTotal=computed(()=>practiceWordIds(custom.courseId,wholeBook()).length)
const quickCounts=[5,10,20,50,100]
const descriptions={flash:'看单词，回想词义',connect:'分组连接单词与词义',listen:'听发音，选择单词',spell:'看词义，写出英文',dictation:'听发音，写出英文'}
const modeOptions=computed(()=>CUSTOM_MODES.map(id=>({id,name:CUSTOM_MODE_NAMES[id],description:descriptions[id]+(custom.problems[id]?'，'+custom.problems[id]:''),disabled:!!custom.problems[id]&&!custom.selectedModes.includes(id)})))
function choose(id:string){custom.chooseCourse(id);pickerOpen.value=false}
function setCount(value:number|string){custom.count=String(value);custom.notice=''}
function changeCount(event:any){setCount(event.detail?.value??event.target?.value??'')}
</script>
