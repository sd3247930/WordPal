import book from '../../src/content/starter.json'
import type { Word, Lesson } from '../core_learning'
export const words = book.words as Word[]
export const lessons = book.lessons as Lesson[]
export const wordById = Object.fromEntries(words.map(word => [word.id, word])) as Record<string, Word>
export function validateRelations(content: { words: Word[]; lessons: Lesson[] }) {
  const ids = content.words.map(w=>w.id)
  if(new Set(ids).size !== ids.length) throw new Error('重复的单词 ID')
  for(const word of content.words) {
    if(word.phonics.length !== word.phonemes.length) throw new Error('拼读片段不匹配')
    if(word.distractors.includes(word.word) || new Set(word.distractors).size !== word.distractors.length) throw new Error('干扰答案不合法')
  }
  for(const lesson of content.lessons) if(lesson.wordIds.some(id=>!ids.includes(id))) throw new Error('课程引用不存在的单词')
}
validateRelations({words, lessons})
