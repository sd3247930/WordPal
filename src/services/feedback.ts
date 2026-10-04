import {readFeedbackSettings} from '../stores/feedback'
export function successHaptic(reducedMotion:boolean){
 if(reducedMotion||!readFeedbackSettings().haptics)return
 // #ifndef H5
 try{uni.vibrateShort({type:'light',fail:()=>{}})}catch{}
 // #endif
}
