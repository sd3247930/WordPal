<template>
 <view v-if="custom.session&&custom.matchGroup" class="custom-match" aria-label="分组连接练习"><text class="small muted block">第 {{custom.matchGroup.groupNumber}} / {{custom.matchGroup.totalGroups}} 组 · 为高亮单词选择词义</text><view class="custom-match-grid compact-match-grid"><view class="custom-match-words compact-match-queue" aria-label="本组词条进度"><view v-for="id in custom.matchGroup.wordIds" :key="id" class="custom-match-word" :class="{current:custom.current?.id===id,done:custom.session.results.connect.completedWordIds.includes(id)}"><text class="strong">{{custom.session.wordSnapshot[id].word}}</text><text class="small muted">{{custom.session.results.connect.completedWordIds.includes(id)?'已连接':custom.current?.id===id?'当前单词':'接下来'}}</text></view></view><view class="custom-match-meanings study-choice-options" :class="{'choice-locked':choiceLocked,'long-choices':longChoices}" role="group" aria-label="选择配对词义"><WPActionTile v-for="word in custom.matchGroup.choices" :key="word.id" toggle-highlight class="answer-choice custom-match-choice" :selected="custom.session.selected===word.id" :disabled="!!custom.session.answer||choiceLocked" :data-word-id="word.id" @click="guardChoice(()=>custom.patch({selected:word.id}))" @cancel="guardChoice(()=>custom.patch({selected:''}))">{{word.meaning}}</WPActionTile></view></view></view>
</template>
<script setup lang="ts">
import {useCustomPracticeStore} from '../../stores/custom-practice'
import WPActionTile from '../button/WPActionTile.vue'
import {useChoiceGuard} from '../../composables/useChoiceGuard'
import {computed} from 'vue'
const custom=useCustomPracticeStore()
const longChoices=computed(()=>custom.matchGroup?.choices.some(word=>Array.from(word.meaning).length>12))
const {locked:choiceLocked,choose:guardChoice}=useChoiceGuard(()=>custom.token)
</script>
