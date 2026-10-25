<template><AppShell page="parent" :parent-tools-open="toolsOpen" @close-parent-tools="toolsOpen=false"><ParentScreen v-model:tools-open="toolsOpen"/></AppShell></template>
<script setup lang="ts">import {ref} from 'vue';import AppShell from '../../layouts/AppShell.vue';import ParentScreen from './ParentScreen.vue';const toolsOpen=ref(false)</script>
