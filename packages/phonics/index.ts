import type { Word } from '../core_learning'
export function segments(word: Word) {
  return word.phonics.map((letters, i) => ({ letters, sound: word.phonemes[i] || '' }))
}
export const normalizeSpelling = (input: string) => input.trim().toLowerCase().replace(/\s+/g, ' ')
export const isCorrectSpelling = (input: string, word: Word) => normalizeSpelling(input) === word.word.toLowerCase()
