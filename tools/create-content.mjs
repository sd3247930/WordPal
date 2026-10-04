import { mkdirSync, writeFileSync } from 'node:fs'
const entries = [
 ['cat','/kæt/','猫','c|a|t','/k/|/æ/|/t/','cat','The cat is on the mat.'],
 ['dog','/dɒɡ/','狗','d|o|g','/d/|/ɒ/|/ɡ/','dog','I play with my dog.'],
 ['fish','/fɪʃ/','鱼','f|i|sh','/f/|/ɪ/|/ʃ/','fish','The fish is in the water.'],
 ['bird','/bɜːd/','鸟','b|ir|d','/b/|/ɜː/|/d/','bird','A bird can fly.'],
 ['duck','/dʌk/','鸭子','d|u|ck','/d/|/ʌ/|/k/','duck','The duck can swim.'],
 ['apple','/ˈæp.əl/','苹果','a|pp|le','/æ/|/p/|/əl/','ap|ple','I eat an apple.'],
 ['egg','/eɡ/','鸡蛋','e|gg','/e/|/ɡ/','egg','I have an egg.'],
 ['milk','/mɪlk/','牛奶','m|i|l|k','/m/|/ɪ/|/l/|/k/','milk','I drink milk.'],
 ['bread','/bred/','面包','b|r|ea|d','/b/|/r/|/e/|/d/','bread','This bread is soft.'],
 ['cake','/keɪk/','蛋糕','c|a|ke','/k/|/eɪ/|/k/','cake','I like this cake.'],
 ['sun','/sʌn/','太阳','s|u|n','/s/|/ʌ/|/n/','sun','The sun is warm.'],
 ['rain','/reɪn/','雨','r|ai|n','/r/|/eɪ/|/n/','rain','I can hear the rain.'],
 ['tree','/triː/','树','t|r|ee','/t/|/r/|/iː/','tree','The tree is tall.'],
 ['leaf','/liːf/','叶子','l|ea|f','/l/|/iː/|/f/','leaf','This leaf is green.'],
 ['wind','/wɪnd/','风','w|i|n|d','/w/|/ɪ/|/n/|/d/','wind','The wind is gentle.'],
 ['book','/bʊk/','书','b|oo|k','/b/|/ʊ/|/k/','book','I read a book.'],
 ['pen','/pen/','钢笔','p|e|n','/p/|/e/|/n/','pen','This is my pen.'],
 ['bag','/bæɡ/','书包','b|a|g','/b/|/æ/|/ɡ/','bag','My book is in the bag.'],
 ['desk','/desk/','课桌','d|e|s|k','/d/|/e/|/s/|/k/','desk','The pen is on the desk.'],
 ['pencil','/ˈpen.səl/','铅笔','p|e|n|c|i|l','/p/|/e/|/n/|/s/|/ə/|/l/','pen|cil','I draw with a pencil.']
]
const names=['动物朋友','我的早餐','自然小世界','我的书包']
const words=entries.map((e,i)=>({id:e[0],word:e[0],ipa:e[1],meaning:e[2],pos:'n.',phonics:e[3].split('|'),phonemes:e[4].split('|'),syllables:e[5].split('|'),audio:`/static/audio/${e[0]}.wav`,image:'',example:e[6],unit:i<10?'探索单元 1':'探索单元 2',lesson:`lesson-${Math.floor(i/5)+1}`,difficulty:1,distractors:entries.filter(x=>x!==e).slice(i%3,i%3+3).map(x=>x[0])}))
const lessons=names.map((name,i)=>({id:`lesson-${i+1}`,name,unit:i<2?'探索单元 1':'探索单元 2',wordIds:words.slice(i*5,i*5+5).map(w=>w.id)}))
mkdirSync('src/content',{recursive:true})
writeFileSync('src/content/starter.json',JSON.stringify({version:1,license:'原创教学示例；非特定出版社教材，可在本项目中使用。',words,lessons},null,2)+'\n')
