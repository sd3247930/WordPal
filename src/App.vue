<script setup lang="ts">
import {onLaunch,onShow} from '@dcloudio/uni-app'
import {startWindowService} from './services/window'
import {useReviewStore} from './stores/review'
onLaunch(()=>startWindowService())
onShow(()=>useReviewStore().refresh())
</script>
<style lang="scss">@use './styles/tokens.scss';@use './styles/app.scss';@use './styles/study-wordbook.scss';@use './styles/accessibility.scss';</style>
