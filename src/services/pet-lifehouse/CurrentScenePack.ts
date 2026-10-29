import published from '../../static/pet-house/lifehouse/v6/manifest.json'
import type {Element} from '../../../packages/pet_engine'
import type {PetForm} from '../pet-growth'
export type ActorPose='idle'|'sit'|'sleep'
export interface CurrentFile {id:string;path:string;width:number;height:number;sha256Base64:string;bytes:number}
export interface PoseArt {element:Element;form:PetForm;pose:'sit'|'sleep';fileId:string;support:{x:number;y:number};bounds:{left:number;top:number;right:number;bottom:number};anchors:{head:{x:number;y:number;width:number;rotation:number};neck:{x:number;y:number;width:number;rotation:number};badge:{x:number;y:number;width:number;rotation:number}}}
export const currentScenePack=published as {schemaVersion:number;assetVersion:number;status:string;metadataClean:boolean;files:CurrentFile[];poses:PoseArt[]}
export const currentSceneReady=currentScenePack.status==='ready'&&currentScenePack.metadataClean&&currentScenePack.files.filter(f=>f.id.startsWith('v6-room-')).length===24&&currentScenePack.poses.length===32
const files=new Map(currentScenePack.files.map(f=>[f.id,f]))
export function currentSceneAsset(id:string){const file=files.get(id);return currentSceneReady&&file?'/static/pet-house/lifehouse/v6/'+file.path:undefined}
export function poseArt(element:Element,form:PetForm,pose:ActorPose){return currentSceneReady&&pose!=='idle'?currentScenePack.poses.find(p=>p.element===element&&p.form===form&&p.pose===pose):undefined}
