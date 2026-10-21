<template><view v-if="theme.settings.themeId==='clay'" class="practice-companion-cue"><text class="cue-bubble">{{correct===true?'你做到了！':correct===false?'再认识一次吧':mode==='dictation'?'认真听哦！':'你可以的！'}}</text><view class="cue-art" aria-hidden="true"><PetHousePetArt :element="pet.current.element" :stage="forms.stage(pet.current.element)" :badge="false" fit="portrait"/></view></view></template>
<script setup lang="ts">
import PetHousePetArt from '../pet-house/PetHousePetArt.vue'
import {usePetStore} from '../../stores/pet'
import {usePetFormsStore} from '../../stores/pet-forms'
import {useThemeStore} from '../../stores/theme'
withDefaults(defineProps<{mode:string;correct?:boolean}>(),{correct:undefined})
const pet=usePetStore(),forms=usePetFormsStore(),theme=useThemeStore()
</script>
<style scoped>
.practice-companion-cue{flex:0 0 94px;display:flex;flex-direction:column;align-items:center;gap:2px;max-width:110px}.cue-art{width:82px;height:86px;overflow:hidden}.cue-bubble{max-width:100%;padding:5px 9px;font-size:var(--wp-font-caption);line-height:1.4;border:1px solid var(--wp-border);border-radius:14px;background:var(--wp-surface);color:var(--wp-primary);text-align:center}
@media(max-width:359px){.practice-companion-cue{flex-basis:78px}.cue-art{width:70px;height:74px}}
</style>
