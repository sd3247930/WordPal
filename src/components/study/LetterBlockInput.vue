<template>
 <view class="letter-block-input" :class="{answered:disabled,'blocks-correct':correct===true,'blocks-incorrect':correct===false,'compact-blocks':compact}" :data-block-mode="inputMode">
  <view class="block-input-heading"><text class="strong">{{mode==='dictation'?'听音写词':'看中文，拼单词'}}</text><text v-if="inputMode==='tiles'" class="block-aid-label">字母积木辅助</text></view>
  <template v-if="inputMode==='tiles'&&challenge.supported">
   <view class="block-groups" role="group" aria-label="分组字母槽位">
    <view v-for="group in groups" :key="group.id" class="block-word-group" :class="{'hyphen-group':group.hyphen}">
     <scroll-view scroll-x :show-scrollbar="true" :scroll-into-view="group.active?activeSlotId:undefined" class="block-word-scroll"><view class="block-word-row">
      <template v-for="unit in group.units" :key="unit.id"><WPButton v-if="unit.kind==='letter'" :id="slotId(unit.letterIndex!)" kind="quiet" class="block-slot" :class="{filled:!!draft.assignments[unit.letterIndex!],current:unit.letterIndex===firstEmpty}" :disabled="disabled||!draft.assignments[unit.letterIndex!]" :label="'第 '+(unit.letterIndex!+1)+' 个字母，'+(letterAt(unit.letterIndex!)?'已填写 '+letterAt(unit.letterIndex!)+'，点击退回':'未填写')" @click="remove(unit.letterIndex!)"><text>{{letterAt(unit.letterIndex!)||' '}}</text><view class="slot-underline" aria-hidden="true"/></WPButton><text v-else class="block-fixed" :aria-label="'固定标点 '+unit.char">{{unit.char}}</text></template>
     </view></scroll-view>
    </view>
   </view>
   <view class="letter-bank" :class="{'short-bank':visibleTiles.length<=6}" role="group" aria-label="可选择的字母积木"><WPButton v-for="(tile,index) in visibleTiles" :key="tile.id" kind="secondary" class="letter-tile" :class="'tile-color-'+index%6" :data-tile-id="tile.id" :data-letter="tile.char" :disabled="disabled||draft.assignments.includes(tile.id)" :label="'选择字母 '+tile.char+'，第 '+(challenge.tiles.indexOf(tile)+1)+' 块'" @click="add(tile.id)">{{tile.char}}</WPButton></view>
   <text v-if="challenge.tiles.length>24" class="small muted block">长短语分组拼装，当前字母池对应第 {{activeGroup+1}} 组。</text>
   <view class="block-edit-tools"><WPButton kind="quiet" :disabled="disabled||!draft.history.length" @click="undo">退一格</WPButton><WPButton kind="quiet" :disabled="disabled||!draft.assignments.some(Boolean)" @click="clear">重新拼</WPButton><WPButton kind="quiet" :disabled="disabled" @click="switchInput('keyboard')">键盘输入</WPButton></view>
   <text v-if="!compact||challenge.units.some(unit=>unit.kind!=='letter')" class="block-help">空格与标点会自动处理，点已填字母可以退回。</text>
   <text v-if="conversionNotice" class="notice" role="status">{{conversionNotice}}</text>
  </template>
  <template v-else>
   <text v-if="!challenge.supported" class="small muted block">{{challenge.reason}}</text>
   <WordSlotInput :model-value="modelValue" :mode="mode" :disabled="disabled" :question-key="questionKey" :show-instruction="false" @update:model-value="typed" @confirm="$emit('confirm')"/>
   <WPButton v-if="challenge.supported" kind="quiet" :disabled="disabled" @click="switchInput('tiles')">用字母积木辅助</WPButton>
  </template>
  <text v-if="inputPreference.storageError" class="small muted block" role="status">{{inputPreference.storageError}}</text>
 </view>
</template>
<script setup lang="ts">
import {computed,getCurrentInstance,ref,watch} from 'vue'
import {normalizeSpellingWord,makeBlockDraft,validBlockDraft,placeLetter,removeLetter,composeBlockAnswer,blocksComplete,type LetterBlockDraft,type SpellingInputChange} from '../../../packages/phonics/letter-blocks'
import WordSlotInput from './WordSlotInput.vue'
import WPButton from '../wp-button/WPButton.vue'
import {useSpellingInputStore} from '../../stores/spelling-input'
const props=withDefaults(defineProps<{word:{id:string;word:string};modelValue:string;mode:string;questionKey:string;letterDraft?:LetterBlockDraft;compact?:boolean;defaultTiles?:boolean;disabled?:boolean;correct?:boolean}>(),{defaultTiles:false,disabled:false,correct:undefined})
const emit=defineEmits<{(event:'change',value:SpellingInputChange):void;(event:'ready',value:boolean):void;(event:'confirm'):void}>()
const inputPreference=useSpellingInputStore()
const challenge=computed(()=>normalizeSpellingWord(props.word.word,props.questionKey)),local=ref<LetterBlockDraft>(),conversionNotice=ref(''),uid=getCurrentInstance()!.uid
const draft=computed(()=>local.value||makeBlockDraft(challenge.value,props.word.id,props.questionKey,props.modelValue,inputPreference.preferred(props.defaultTiles)))
const inputMode=computed(()=>challenge.value.supported?draft.value.inputMode:'keyboard'),firstEmpty=computed(()=>draft.value.assignments.indexOf(null)),slotId=(index:number)=>'letter-slot-'+uid+'-'+index,activeSlotId=computed(()=>firstEmpty.value<0?'':slotId(firstEmpty.value))
const activeGroup=computed(()=>(firstEmpty.value<0?challenge.value.slots[challenge.value.slots.length-1]:challenge.value.slots[firstEmpty.value])?.group||0)
const groups=computed(()=>[...new Set(challenge.value.units.filter(unit=>unit.kind!=='space').map(unit=>unit.group))].map(id=>({id,units:challenge.value.units.filter(unit=>unit.group===id&&unit.kind!=='space'),active:activeGroup.value===id,hyphen:id>0&&challenge.value.units.some(unit=>unit.group===id-1&&/[-‐‑]/u.test(unit.char))})))
const visibleTiles=computed(()=>challenge.value.tiles.filter(tile=>challenge.value.tiles.length<=24||tile.group===activeGroup.value))
const letters=computed(()=>new Map(challenge.value.tiles.map(tile=>[tile.id,tile.char])))
function letterAt(index:number){return letters.value.get(draft.value.assignments[index]||'')||''}
function send(next:LetterBlockDraft,input=composeBlockAnswer(challenge.value,next)){local.value=next;emit('change',{input,letterDraft:next,...(next.inputMode==='tiles'?{inputAssistance:'tiles' as const}:{})})}
function add(id:string){if(props.disabled)return;const next=placeLetter(challenge.value,draft.value,id);if(next!==draft.value){inputPreference.select('tiles');conversionNotice.value='';send(next)}}
function remove(index:number){if(!props.disabled)send(removeLetter(draft.value,index))}
function undo(){const index=draft.value.history[draft.value.history.length-1];if(index!==undefined)remove(index)}
function clear(){send(makeBlockDraft(challenge.value,props.word.id,props.questionKey,'','tiles'))}
function typed(input:string){if(props.disabled)return;if(challenge.value.supported)inputPreference.select('keyboard');send({...draft.value,inputMode:'keyboard'},input)}
function switchInput(mode:'tiles'|'keyboard'){
 if(props.disabled)return
 inputPreference.select(mode)
 if(mode==='keyboard'){send({...draft.value,inputMode:mode},props.modelValue);return}
 const next=makeBlockDraft(challenge.value,props.word.id,props.questionKey,props.modelValue,mode)
 if(props.modelValue&&composeBlockAnswer(challenge.value,next)!==props.modelValue.toLowerCase())conversionNotice.value='可继续拼装；原有文字也可以切回键盘编辑。'
 send(next,props.modelValue)
}
watch(()=>props.questionKey+'\u001f'+props.word.id+'\u001f'+props.word.word,()=>{
 if(!inputPreference.mode&&validBlockDraft(challenge.value,props.letterDraft,props.word.id,props.questionKey))inputPreference.select(props.letterDraft.inputMode)
 const restored=validBlockDraft(challenge.value,props.letterDraft,props.word.id,props.questionKey)?props.letterDraft:makeBlockDraft(challenge.value,props.word.id,props.questionKey,props.modelValue,inputPreference.preferred(props.defaultTiles))
 local.value={...restored,assignments:[...restored.assignments],history:[...restored.history]};conversionNotice.value=''
 // Seeing the letter pool counts as assistance even when the child later uses a keyboard.
 if(inputMode.value==='tiles'&&!props.disabled)emit('change',{input:props.modelValue,letterDraft:local.value,inputAssistance:'tiles'})
},{immediate:true})
watch(()=>[props.modelValue,props.letterDraft],()=>{if(validBlockDraft(challenge.value,props.letterDraft,props.word.id,props.questionKey))local.value=props.letterDraft;else if(!props.modelValue&&!props.letterDraft)local.value=makeBlockDraft(challenge.value,props.word.id,props.questionKey,'',draft.value.inputMode)})
watch(()=>[inputMode.value,props.modelValue,draft.value,props.disabled],()=>emit('ready',!props.disabled&&(inputMode.value==='tiles'?blocksComplete(challenge.value,draft.value):!!props.modelValue.trim())),{immediate:true})
</script>
<style scoped>
.letter-block-input{min-width:0;width:100%;margin-top:18px;container-type:inline-size}
.block-input-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:var(--wp-font-body);line-height:1.5;margin-bottom:16px}
.block-aid-label{font-size:var(--wp-font-caption);color:var(--wp-muted-foreground);padding:4px 9px;border:1px solid var(--wp-border);border-radius:var(--wp-radius-chip)}
.block-groups{display:flex;gap:18px 20px;flex-wrap:wrap;align-items:center;justify-content:center;margin-bottom:20px;min-width:0}
.block-word-group{max-width:100%;min-width:0;flex:0 1 auto}.block-word-scroll{max-width:100%;width:max-content}.block-word-row{display:inline-flex;align-items:center;gap:4px;padding:3px 2px 6px;white-space:nowrap}
.block-slot.wp-button{display:flex;flex-direction:column;gap:3px;flex-shrink:0;box-sizing:border-box;min-width:48px;width:48px;min-height:58px;padding:4px 0!important;border:1px solid var(--wp-border);border-bottom-width:3px;border-radius:14px;background:var(--wp-surface-tonal);color:var(--wp-foreground);opacity:1;font-family:var(--wp-font-family);font-size:max(26px,var(--wp-font-section));font-weight:700;line-height:1.1;box-shadow:inset 0 2px 3px rgba(85,54,29,.05)}
.block-slot.current{border-color:var(--wp-primary)}.block-slot.filled{background:var(--wp-surface)}.block-slot[disabled]{color:var(--wp-foreground)!important;opacity:1!important}.slot-underline{height:3px;width:22px;max-width:65%;background:var(--wp-muted-foreground);border-radius:4px;opacity:.55}.block-fixed{font-size:var(--wp-font-section);font-weight:700;color:var(--wp-foreground);padding-inline:1px;line-height:1.2}
.letter-bank{display:grid;grid-template-columns:repeat(auto-fit,minmax(48px,1fr));gap:10px;padding:16px 12px;border:1px solid var(--wp-border);border-radius:22px;background:var(--wp-surface);max-width:620px;margin:auto}
.letter-tile.wp-button{min-width:48px;min-height:58px;width:100%;max-width:74px;justify-self:center;margin:0;padding:6px!important;font-family:var(--wp-font-family);font-size:max(28px,var(--wp-font-section));font-weight:750;line-height:1.2;border-radius:15px;user-select:none;color:var(--wp-foreground);border:1px solid var(--wp-border);background:var(--wp-surface-tonal);box-shadow:inset 0 2px 2px rgba(255,255,255,.35),0 4px 0 var(--wp-border)}
.letter-tile[disabled]{opacity:.28!important;box-shadow:none!important}.block-edit-tools{display:flex;justify-content:center;gap:4px;flex-wrap:wrap;margin-top:12px}.block-edit-tools>.wp-button{min-height:48px;padding:8px 12px!important;font-size:var(--wp-font-small)}.block-help{display:block;font-size:var(--wp-font-small);color:var(--wp-muted-foreground);line-height:1.6;text-align:center;margin-top:8px}
.letter-bank.short-bank{grid-template-columns:repeat(6,minmax(48px,1fr));gap:6px;padding:12px 8px}@container(max-width:337px){.letter-bank.short-bank{grid-template-columns:repeat(3,minmax(48px,1fr))}}
.blocks-correct .block-slot{border-color:var(--wp-success)}.blocks-incorrect .block-slot{border-color:var(--wp-danger)}
.theme-clay .tile-color-0{background:linear-gradient(145deg,#ffe8ef,#f5aac5);color:#633441}.theme-clay .tile-color-1{background:linear-gradient(145deg,#fff6c9,#f5d56c);color:#61471d}.theme-clay .tile-color-2{background:linear-gradient(145deg,#def5ff,#93d2ef);color:#27465c}.theme-clay .tile-color-3{background:linear-gradient(145deg,#e3f7d8,#a5d991);color:#315137}.theme-clay .tile-color-4{background:linear-gradient(145deg,#f3e6ff,#c7a4e9);color:#50345f}.theme-clay .tile-color-5{background:linear-gradient(145deg,#ffe8d9,#f5b38c);color:#633c2c}
@media(prefers-reduced-motion:no-preference){.wp-app:not(.reduce-motion) .block-slot.filled{animation:block-place 180ms ease-out}@keyframes block-place{from{transform:translateY(3px) scale(.96)}to{transform:translateY(0) scale(1)}}}
@media(max-width:359px){.letter-bank{gap:8px;padding:12px 8px}.block-groups{gap:14px}.block-slot.wp-button{min-height:54px}.block-input-heading{gap:6px}}
.compact-blocks.letter-block-input{margin-top:0}
.compact-blocks .block-input-heading{margin-bottom:6px;gap:4px 8px}.compact-blocks .block-aid-label{padding:1px 6px}
.compact-blocks .block-groups{gap:6px 12px;margin-bottom:6px}.compact-blocks .block-slot.wp-button{min-height:52px}
.compact-blocks .letter-bank{gap:6px;padding:8px 6px;border-radius:var(--wp-radius)}.compact-blocks .letter-tile.wp-button{min-height:52px}
.compact-blocks .letter-bank.short-bank{grid-template-columns:repeat(6,minmax(48px,1fr));gap:4px;padding:6px 4px}
@container(max-width:317px){.compact-blocks .letter-bank.short-bank{grid-template-columns:repeat(3,minmax(48px,1fr))}}
.compact-blocks .block-edit-tools{margin-top:6px;gap:4px}.compact-blocks .block-edit-tools>.wp-button{flex:1;padding:6px!important;min-height:48px;white-space:normal}
.compact-blocks .block-help{margin-top:4px;font-size:var(--wp-font-caption);line-height:1.4;text-align:left}
.compact-blocks :deep(.word-slot-input){margin-top:0}.compact-blocks :deep(.slot-help){margin-top:4px;font-size:var(--wp-font-caption)}
</style>
