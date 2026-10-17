<script setup lang="ts">
import {onLaunch,onShow,onHide} from '@dcloudio/uni-app'
import {stopAudio} from './services/audio'
import {startWindowService} from './services/window'
import {useReviewStore} from './stores/review'
import {useProfileStore} from './stores/profile'
import {hydrateMedia,retryCourseCleanup} from './services/content/StorageRepository'
import {loadDirectory} from './services/content/CourseDirectory'
import catalog from './content/local-courses/catalog.json'
import localStarter from './content/local-courses/starter.json'
import synthetic from './content/synthetic/course.json'
import syntheticArchived from './content/synthetic/archived-course.json'
import {syntheticTextbooks} from './content/synthetic/textbooks'
import {configureLocalCourses,configureStarterCourse} from './services/content/ContentRegistry'
import type {CoursePack} from '../packages/content_schema/course'
import {useActivitiesStore} from './stores/activities'
import {useCourseStore} from './stores/course'
const useLocalContent=import.meta.env.VITE_WORDPAL_LOCAL_CONTENT==='1'||import.meta.env.DEV&&import.meta.env.VITE_WORDPAL_LOCAL_CONTENT!=='0'
// Automated acceptance can opt into a public synthetic course without touching the real catalog.
const useSynthetic=import.meta.env.VITE_WORDPAL_SYNTHETIC==='1'||(()=>{try{return typeof localStorage!=='undefined'&&localStorage.getItem('wordpal.test.synthetic-course')==='1'}catch{return false}})()
const localPacks=useLocalContent?catalog as CoursePack[]:[]
configureStarterCourse(useLocalContent?localStarter as CoursePack|null:null)
const useSyntheticSeries=(()=>{try{return typeof localStorage!=='undefined'&&localStorage.getItem('wordpal.test.textbook-series')==='1'}catch{return false}})()
const activeLocalPacks=useSyntheticSeries?[...localPacks.filter(pack=>!syntheticTextbooks.some(test=>test.courseId===pack.courseId)),...syntheticTextbooks]:localPacks
configureLocalCourses(useSynthetic?[...activeLocalPacks,synthetic as CoursePack,syntheticArchived as CoursePack]:activeLocalPacks)
onLaunch(()=>{startWindowService();useProfileStore();loadDirectory();void hydrateMedia();void retryCourseCleanup().catch(()=>{})})
onShow(()=>{useReviewStore().refresh();useCourseStore().applyPending()})
onHide(()=>{stopAudio();useActivitiesStore().pauseTimer()})
</script>
<style lang="scss">@use './styles/tokens.scss';@use './styles/app.scss';@use './styles/study-wordbook.scss';@use './styles/accessibility.scss';@use './styles/controls.scss';@use './styles/courses.scss';@use './styles/phonics.scss';@use './styles/course-wordbook.scss';@use './styles/navigation.scss';</style>
