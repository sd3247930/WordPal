<template>
 <WPButton kind="secondary" class="study-practice-entry-button" label="自定义练习，不计今日任务" @click="$emit('click')"><image class="custom-practice-entry-icon" :src="customPracticeIcon" mode="aspectFit" aria-hidden="true"/><text class="custom-practice-entry-label">自定义练习</text><text class="custom-practice-entry-arrow" aria-hidden="true">›</text></WPButton>
</template>
<script setup lang="ts">
import WPButton from '../wp-button/WPButton.vue'
import {customPracticeIcon} from '../../services/study-mode-icons'
defineEmits<{click:[]}>()
</script>
<style scoped>
.study-practice-entry-button.wp-button.secondary{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;gap:5px;min-height:48px;max-width:100%;margin:0;padding:4px 8px;font-size:var(--wp-font-small);line-height:1.35;white-space:normal}
.custom-practice-entry-icon{display:block;width:30px;height:30px;flex-shrink:0;pointer-events:none}
.custom-practice-entry-label{white-space:nowrap}.custom-practice-entry-arrow{flex-shrink:0;line-height:1}
</style>
