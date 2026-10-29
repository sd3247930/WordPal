import type {Element} from '../../../packages/pet_engine'
import type {PetForm} from '../pet-growth'
import type {DressSlot} from './DressCatalog'
import qPack from '../../static/pet-house/lifehouse/v3/manifest.json'
import {petWearableFits} from '../pet-wearables'

export type ActorArtMode='chibi'|'original-fallback'
export interface DressAnchor {x:number;y:number;width:number;rotation:number}
interface Fit {head:DressAnchor;neck:DressAnchor;badge:DressAnchor;badgeOnNeck:DressAnchor}
const anchor=(x:number,y:number,width:number,rotation=0):DressAnchor=>({x,y,width,rotation})
// Local coordinates refer to the visible body bounds, not transparent PNG margins.
// Side head anchors leave the pearl, flame crown, antlers and wind star unobscured.
const q:Record<Element,Record<PetForm,Fit>>={
 water:{
  1:{head:anchor(.29,.18,.21,-14),neck:anchor(.575,.414,.155,9),badge:anchor(.627,.487,.069,7),badgeOnNeck:anchor(.627,.45,.062,7)},
  2:{head:anchor(.29,.15,.20,-10),neck:anchor(.565,.419,.155,5),badge:anchor(.62,.495,.068,4),badgeOnNeck:anchor(.62,.455,.061,4)},
  3:{head:anchor(.32,.13,.18,-11),neck:anchor(.59,.371,.135,7),badge:anchor(.632,.433,.063,6),badgeOnNeck:anchor(.635,.401,.057,6)},
  4:{head:anchor(.34,.20,.17,-9),neck:anchor(.625,.431,.13,8),badge:anchor(.663,.49,.06,8),badgeOnNeck:anchor(.667,.462,.055,8)}},
 fire:{
  1:{head:anchor(.285,.303,.19,-20),neck:anchor(.58,.509,.23,-7),badge:anchor(.61,.584,.088,-7),badgeOnNeck:anchor(.64,.55,.078,-7)},
  2:{head:anchor(.28,.293,.19,-16),neck:anchor(.57,.49,.22,-4),badge:anchor(.608,.565,.084,-4),badgeOnNeck:anchor(.626,.53,.075,-4)},
  3:{head:anchor(.32,.289,.18,-18),neck:anchor(.565,.473,.205,-5),badge:anchor(.60,.542,.08,-5),badgeOnNeck:anchor(.62,.51,.073,-5)},
  4:{head:anchor(.295,.325,.18,-16),neck:anchor(.535,.499,.205,3),badge:anchor(.58,.565,.079,3),badgeOnNeck:anchor(.592,.538,.072,3)}},
 earth:{
  1:{head:anchor(.258,.333,.18,-20),neck:anchor(.407,.628,.215,8),badge:anchor(.43,.717,.088,9),badgeOnNeck:anchor(.458,.67,.078,9)},
  2:{head:anchor(.26,.35,.175,-16),neck:anchor(.405,.625,.20,7),badge:anchor(.432,.705,.083,8),badgeOnNeck:anchor(.455,.665,.075,8)},
  3:{head:anchor(.265,.338,.16,-17),neck:anchor(.38,.6,.18,10),badge:anchor(.408,.674,.077,10),badgeOnNeck:anchor(.426,.638,.07,10)},
  4:{head:anchor(.285,.326,.155,-14),neck:anchor(.377,.598,.175,8),badge:anchor(.404,.668,.075,8),badgeOnNeck:anchor(.422,.632,.067,8)}},
 wind:{
  1:{head:anchor(.282,.377,.18,-20),neck:anchor(.50,.632,.17,3),badge:anchor(.56,.716,.075,4),badgeOnNeck:anchor(.545,.665,.066,4)},
  2:{head:anchor(.26,.372,.175,-18),neck:anchor(.48,.64,.17,5),badge:anchor(.54,.72,.074,6),badgeOnNeck:anchor(.527,.673,.065,6)},
  3:{head:anchor(.28,.375,.16,-17),neck:anchor(.48,.604,.16,6),badge:anchor(.535,.68,.07,6),badgeOnNeck:anchor(.524,.638,.063,6)},
  4:{head:anchor(.282,.376,.15,-15),neck:anchor(.49,.61,.155,4),badge:anchor(.54,.681,.068,4),badgeOnNeck:anchor(.532,.641,.061,4)}}
}
export function actorBounds(element:Element,form:PetForm,mode:ActorArtMode){
 if(mode==='chibi')return qPack.actors.find(actor=>actor.element===element&&actor.form===form)!.bounds
 return originalBounds[element][form-1]
}
// Original-art bounds are captured by the A0 alpha audit in the 360 × 480 plane.
const originalBounds:Record<Element,{left:number;top:number;right:number;bottom:number}[]>={
 "water": [
  {
   "left": 0.070833,
   "top": 0.025781,
   "right": 0.928125,
   "bottom": 0.974219
  },
  {
   "left": 0.035417,
   "top": 0.025,
   "right": 0.964583,
   "bottom": 0.973437
  },
  {
   "left": 0.033333,
   "top": 0.034375,
   "right": 0.966667,
   "bottom": 0.965625
  },
  {
   "left": 0.034375,
   "top": 0.034375,
   "right": 0.966667,
   "bottom": 0.964844
  }
 ],
 "fire": [
  {
   "left": 0.0375,
   "top": 0.026562,
   "right": 0.9625,
   "bottom": 0.973437
  },
  {
   "left": 0.034375,
   "top": 0.033594,
   "right": 0.963542,
   "bottom": 0.965625
  },
  {
   "left": 0.0375,
   "top": 0.039844,
   "right": 0.964583,
   "bottom": 0.960938
  },
  {
   "left": 0.034375,
   "top": 0.027344,
   "right": 0.965625,
   "bottom": 0.973437
  }
 ],
 "earth": [
  {
   "left": 0.048958,
   "top": 0.025781,
   "right": 0.95,
   "bottom": 0.974219
  },
  {
   "left": 0.039583,
   "top": 0.025781,
   "right": 0.960417,
   "bottom": 0.974219
  },
  {
   "left": 0.033333,
   "top": 0.0375,
   "right": 0.963542,
   "bottom": 0.961719
  },
  {
   "left": 0.0375,
   "top": 0.038281,
   "right": 0.964583,
   "bottom": 0.960938
  }
 ],
 "wind": [
  {
   "left": 0.034375,
   "top": 0.05,
   "right": 0.965625,
   "bottom": 0.950781
  },
  {
   "left": 0.036458,
   "top": 0.039844,
   "right": 0.963542,
   "bottom": 0.960156
  },
  {
   "left": 0.034375,
   "top": 0.032813,
   "right": 0.964583,
   "bottom": 0.965625
  },
  {
   "left": 0.034375,
   "top": 0.032813,
   "right": 0.966667,
   "bottom": 0.966406
  }
 ]
}
const originalHeads:Record<Element,readonly (readonly [number,number,number,number])[]>={water:[[.38,.16,.17,-12],[.36,.15,.16,-9],[.40,.12,.15,-13],[.46,.15,.14,-8]],fire:[[.35,.31,.20,-18],[.35,.27,.19,-16],[.38,.26,.18,-15],[.38,.29,.17,-12]],earth:[[.29,.39,.19,-15],[.28,.34,.18,-13],[.30,.31,.16,-15],[.30,.32,.15,-11]],wind:[[.31,.34,.17,-17],[.33,.34,.17,-16],[.34,.29,.16,-14],[.34,.31,.15,-12]]}
export function dressAnchor(element:Element,form:PetForm,slot:DressSlot,mode:ActorArtMode,onNeck=false):DressAnchor{
 const bounds=actorBounds(element,form,mode),bw=bounds.right-bounds.left,bh=bounds.bottom-bounds.top
 let fit:DressAnchor
 if(mode==='chibi')fit=q[element][form][slot==='badge'&&onNeck?'badgeOnNeck':slot]
 else{
  const old=petWearableFits[element][form],h=originalHeads[element][form-1]
  fit=slot==='head'?anchor(...h):slot==='neck'?anchor((old.neck[0]/360-bounds.left)/bw,(old.neck[1]/480-bounds.top)/bh,old.width/360/bw,old.angle):anchor((old.pin[0]/360-bounds.left)/bw,(old.pin[1]/480-bounds.top)/bh,old.pinSize/360/bw,old.angle)
  if(slot==='badge'&&onNeck)fit={...fit,x:fit.x+.02,y:fit.y-.025,width:fit.width*.9}
 }
 return{x:bounds.left+fit.x*bw,y:bounds.top+fit.y*bh,width:fit.width*bw,rotation:fit.rotation}
}
