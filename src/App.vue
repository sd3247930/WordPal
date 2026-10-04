<script setup lang="ts">
import {onLaunch,onShow,onHide} from '@dcloudio/uni-app'
import {stopAudio} from './services/audio'
import {startWindowService} from './services/window'
import {useReviewStore} from './stores/review'
import {useProfileStore} from './stores/profile'
import {hydrateMedia} from './services/content/StorageRepository'
onLaunch(()=>{startWindowService();useProfileStore();void hydrateMedia()})
onShow(()=>useReviewStore().refresh())
onHide(stopAudio)
</script>
<style lang="scss">@use './styles/tokens.scss';@use './styles/app.scss';@use './styles/study-wordbook.scss';@use './styles/accessibility.scss';@use './styles/controls.scss';@use './styles/courses.scss';</style>
