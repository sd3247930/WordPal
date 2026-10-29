/** Common sound and shape confusions, not a one-to-one letter-to-phoneme rule. */
export const ConfusingLettersMap:Readonly<Record<string,readonly string[]>>={
 a:['e','u','o','i'],b:['p','d','q'],c:['k','g','s'],d:['b','t','p'],e:['a','i','o'],f:['v','t','s'],
 g:['j','c','q'],h:['n','k','r'],i:['e','y','l'],j:['g','i','y'],k:['c','g','q'],l:['i','r','t'],
 m:['n','w','h'],n:['m','h','r'],o:['a','u','e'],p:['b','q','d'],q:['p','g','k'],r:['l','n','h'],
 s:['z','c','f'],t:['d','f','l'],u:['v','o','a'],v:['u','f','w'],w:['v','m','u'],x:['s','z','k'],y:['i','j','v'],z:['s','x','c']
}
/** Cover several letters before taking another candidate from the first letter. */
export function confusingLetters(letters:readonly string[]):string[]{
 if(!letters.length)return []
 const count=Math.min(5,3+Math.floor((letters.length-1)/4)),present=new Set(letters.map(letter=>letter.toLowerCase()))
 const bases=[...new Set(letters.map(letter=>letter.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))]
 const candidates:string[]=[]
 for(let offset=0;offset<4;offset++)for(const letter of bases){const candidate=ConfusingLettersMap[letter]?.[offset];if(candidate&&!candidates.includes(candidate))candidates.push(candidate)}
 const alphabet=Object.keys(ConfusingLettersMap)
 return [...new Set([...candidates.filter(letter=>!present.has(letter)),...alphabet.filter(letter=>!present.has(letter)),...candidates,...alphabet])].slice(0,count)
}
