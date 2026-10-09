import {readFileSync} from 'node:fs'
import {BOOKS} from './generate'
import {validateBundles} from './validate'
import type {CoursePack} from '../../packages/content_schema/course'
const args=process.argv.slice(2)
if(args.includes('--help')){console.log('本机词表校验：npm run fltrp:validate -- --local-use；公开 CI 使用合成六册，不包含用户词表。');process.exit(0)}
if(!args.includes('--local-use'))throw new Error('待核对词表仅供本机学习，请显式传入 --local-use。')
const packs=BOOKS.map(book=>JSON.parse(readFileSync('private/course-import/fltrp/courses/fltrp-3start-'+book.key+'.json','utf8')) as CoursePack)
const errors=validateBundles(packs)
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('六册 schema、跨册 ID、词义、课节大小、来源和资源边界校验通过。')
