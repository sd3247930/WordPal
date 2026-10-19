import type {EntryLevel} from '../../packages/parent_settings'

const filenames:Record<EntryLevel,string>={
 1:'wordpal_level_l1_beginner.png',
 2:'wordpal_level_l2_foundation.png',
 3:'wordpal_level_l3_growth.png',
 4:'wordpal_level_l4_training.png',
 5:'wordpal_level_l5_challenge.png'
}
export const learningLevelIconSource=(level:EntryLevel)=>`/static/icons/learning-levels/${filenames[level]}`
