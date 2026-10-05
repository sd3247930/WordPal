<script setup lang="ts">
import {onLaunch,onShow,onHide} from '@dcloudio/uni-app'
import {stopAudio} from './services/audio'
import {startWindowService} from './services/window'
import {useReviewStore} from './stores/review'
import {useProfileStore} from './stores/profile'
import {hydrateMedia} from './services/content/StorageRepository'
import catalog from './content/local-courses/catalog.json'
import {configureLocalCourses} from './services/content/ContentRegistry'
import type {CoursePack} from '../packages/content_schema/course'
import {useActivitiesStore} from './stores/activities'
configureLocalCourses(import.meta.env.VITE_WORDPAL_LOCAL_CONTENT==='1'||import.meta.env.DEV&&import.meta.env.VITE_WORDPAL_LOCAL_CONTENT!=='0'?catalog as CoursePack[]:[])
onLaunch(()=>{startWindowService();useProfileStore();void hydrateMedia()})
onShow(()=>useReviewStore().refresh())
onHide(()=>{stopAudio();useActivitiesStore().pauseTimer()})
</script>
<style lang="scss">@use './styles/tokens.scss';@use './styles/app.scss';@use './styles/study-wordbook.scss';@use './styles/accessibility.scss';@use './styles/controls.scss';@use './styles/courses.scss';@use './styles/phonics.scss';</style>
