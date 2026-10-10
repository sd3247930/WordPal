import {createSSRApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import {installUIKit} from '../packages/ui_kit'
import {installParentGateNavigation} from './services/parent/ParentGateNavigation'
export function createApp(){const app=createSSRApp(App);app.use(createPinia());installUIKit(app);installParentGateNavigation();return {app}}
