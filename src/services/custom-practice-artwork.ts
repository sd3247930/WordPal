import type {LearningMode} from '../../packages/core_learning'

const resultRoot='/static/icons/custom-practice/results/'
export const customResultArtwork={
 heading:resultRoot+'heading.png',course:resultRoot+'course.png',complete:resultRoot+'complete.png',overview:resultRoot+'overview.png',
 completed:resultRoot+'completed.png',accuracy:resultRoot+'accuracy.png',repeat:resultRoot+'repeat.png',
 modes:Object.fromEntries(['flash','connect','listen','spell','dictation'].map(mode=>[mode,resultRoot+mode+'.png'])) as Record<LearningMode,string>
}

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
