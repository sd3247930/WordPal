import type {FamiliarityLevel} from './content/FamiliaritySelector'

/** Presentation assets retain the existing familiarity IDs and classification rules. */
export const familiarityIcons:Record<FamiliarityLevel,{src:string;fallback:string}>={
 unseen:{src:'/static/icons/familiarity/wordpal_status_unlearned_256.png',fallback:'○'},
 introduced:{src:'/static/icons/familiarity/wordpal_status_beginner_256.png',fallback:'芽'},
 practicing:{src:'/static/icons/familiarity/wordpal_status_practicing_256.png',fallback:'↻'},
 familiar:{src:'/static/icons/familiarity/wordpal_status_familiar_256.png',fallback:'★'},
 mastered:{src:'/static/icons/familiarity/wordpal_status_mastered_256.png',fallback:'✓'},
 unrated:{src:'/static/icons/familiarity/wordpal_status_pending_256.png',fallback:'?'}
}
