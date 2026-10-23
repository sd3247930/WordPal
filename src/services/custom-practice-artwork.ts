import type {LearningMode} from '../../packages/core_learning'

// User-provided artwork, re-encoded without source metadata. Existing mode assets remain available.
export const customPracticeArtwork={
 title:'/static/icons/custom-practice/title.png',
 resume:'/static/icons/custom-practice/resume.png',
 course:'/static/icons/custom-practice/course.png',
 modes:{
  flash:'/static/icons/custom-practice/flash.png',
  connect:'/static/icons/custom-practice/connect.png',
  listen:'/static/icons/custom-practice/listen.png',
  spell:'/static/icons/custom-practice/spell.png',
  dictation:'/static/icons/custom-practice/dictation.png'
 } satisfies Record<LearningMode,string>
}
