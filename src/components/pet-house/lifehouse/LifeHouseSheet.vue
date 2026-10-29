<template><view v-if="open" class="lh-modal-mask" data-lh-sheet @click.self="$emit('close')"><view :class="['lh-sheet',variant&&'lh-sheet-'+variant]" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1"><view class="lh-sheet-heading"><text class="lh-sheet-title">{{title}}</text><WPActionTile class="lh-sheet-close" aria-label="关闭弹层" @click="$emit('close')">关闭</WPActionTile></view><scroll-view scroll-y class="lh-sheet-scroll"><slot/></scroll-view><view v-if="$slots.footer" class="lh-sheet-footer"><slot name="footer"/></view></view></view></template>
<script setup lang="ts">
import {watch,nextTick,onUnmounted} from 'vue'
import WPActionTile from '../../button/WPActionTile.vue'
const props=defineProps<{open:boolean;title:string;variant?:'upgrade'}>(),emit=defineEmits<{close:[]}>()
// #ifdef H5
let previous:HTMLElement|null=null,release:(()=>void)|undefined
watch(()=>props.open,async open=>{release?.();release=undefined;if(!open){previous?.isConnected&&previous.focus();return}previous=document.activeElement as HTMLElement;await nextTick();if(!props.open)return;const dialog=document.querySelector<HTMLElement>('[data-lh-sheet] [role=dialog]');if(!dialog)return
 const keys=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();emit('close')}if(e.key!=='Tab')return;const focusable=Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex="0"]')).filter(n=>n.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(!first){e.preventDefault();dialog.focus()}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};document.addEventListener('keydown',keys);release=()=>document.removeEventListener('keydown',keys);(dialog.querySelector<HTMLElement>('[tabindex="0"]')||dialog).focus()
})
onUnmounted(()=>release?.())
// #endif
</script>
