import {reactive} from 'vue'

// Transient presentation state only; never stored in the learning profile.
export const studyInput=reactive({keyboardRaised:false,overlap:0})
