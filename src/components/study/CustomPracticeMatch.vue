<template>
 <view v-if="custom.session&&custom.matchGroup" class="custom-match" aria-label="分组连接练习"><text class="small muted block">第 {{custom.matchGroup.groupNumber}} / {{custom.matchGroup.totalGroups}} 组 · 为高亮单词选择词义</text><view class="custom-match-grid"><view class="custom-match-words"><view v-for="id in custom.matchGroup.wordIds" :key="id" class="custom-match-word" :class="{current:custom.current?.id===id,done:custom.session.results.connect.completedWordIds.includes(id)}"><text class="strong">{{custom.session.wordSnapshot[id].word}}</text><text class="small muted">{{custom.session.results.connect.completedWordIds.includes(id)?'已连接':custom.current?.id===id?'当前单词':'接下来'}}</text></view></view><view class="custom-match-meanings" role="group" aria-label="选择配对词义"><WPActionTile v-for="word in custom.matchGroup.choices" :key="word.id" toggle-highlight class="answer-choice custom-match-choice" :selected="custom.session.selected===word.id" :disabled="!!custom.session.answer" :data-word-id="word.id" @click="custom.patch({selected:word.id})" @cancel="custom.patch({selected:''})">{{word.meaning}}</WPActionTile></view></view></view>
</template>
<script setup lang="ts">
import {useCustomPracticeStore} from '../../stores/custom-practice'
import WPActionTile from '../button/WPActionTile.vue'
const custom=useCustomPracticeStore()
</script>
