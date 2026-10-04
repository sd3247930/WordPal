import {createSSRApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import {installUIKit} from '../packages/ui_kit'
export function createApp(){const app=createSSRApp(App);app.use(createPinia());installUIKit(app);return {app}}
