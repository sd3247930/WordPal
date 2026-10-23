import type {LearningMode} from '../../packages/core_learning'

/** Keep the existing connect mode ID; its approved asset is named match. */
export const studyModeIcons:Record<LearningMode,{src:string;fallback:string}>={
 flash:{src:'/static/icons/study-modes/wordpal_study_flash_256.png',fallback:'↯'},
 connect:{src:'/static/icons/study-modes/wordpal_study_match_256.png',fallback:'↔'},
 listen:{src:'/static/icons/study-modes/wordpal_study_listen_256.png',fallback:'♫'},
 spell:{src:'/static/icons/study-modes/wordpal_study_spell_256.png',fallback:'Aa'},
 dictation:{src:'/static/icons/study-modes/wordpal_study_dictation_256.png',fallback:'✎'}
}

// User-provided, metadata-free practice artwork; the existing five mode icons stay shared.
export const practiceSpeaker='/static/icons/easy-practice/speaker.png'
export const practiceBadge='/static/icons/easy-practice/sprout-book.png'
export const customPracticeIcon='/static/icons/easy-practice/custom-practice.png'
