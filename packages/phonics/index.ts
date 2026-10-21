import type { Word } from '../core_learning'
import {canonicalSpelling} from './letter-blocks'
export * from './types'
export * from './chunks'
export * from './timeline'
export function segments(word: Word) {
  return word.phonics.map((letters, i) => ({ letters, sound: word.phonemes[i] || '' }))
}
export const normalizeSpelling = (input: string) => canonicalSpelling(input).toLowerCase()
export const isCorrectSpelling = (input: string, word: Word) => [word.word,...(word.acceptedSpellings||[])].some(value=>normalizeSpelling(input)===normalizeSpelling(value))
