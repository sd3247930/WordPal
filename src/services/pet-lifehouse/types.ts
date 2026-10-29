import type {Element} from '../../../packages/pet_engine'

export type HouseLevel=0|1|2|3|4|5
export type FurnitureCategory='rest'|'function'|'activity'|'decor'
export type SlotId='left'|'right'|'center'|'wall'|'light'|'plant'|'garden'|'activity'|'extra'|'balcony'
export type FurnitureKind='bed'|'shelf'|'rug'|'lamp'|'window'|'plant'|'garden'|'table'|'chime'
export interface FurnitureDefinition {id:string;name:string;element:Element|'all';kind:FurnitureKind;category:FurnitureCategory;price:number;level:HouseLevel;asset:string;gift?:boolean;response:string}
export interface OwnedFurniture {instanceId:string;furnitureId:string;paidGems:number;acquiredAt:string;origin:'purchase'|'level-gift'}
export interface ElementHouse {level:HouseLevel;owned:OwnedFurniture[];slots:Partial<Record<SlotId,string>>;lastUpgradeAt:string|null}
export interface HouseSnapshot {level:HouseLevel;items:{slotId:SlotId;furnitureId:string}[];form:1|2|3|4;cosmetic:string|null;cosmetics?:string[];assetVersion:1|2|3;scene?:{revision:1|2|3;zoneId:'room'|'garden'|'gallery'|'courtyard';actorAnchor:{x:number;y:number};cameraPresetId:'zone';actorAnchorId:string;actorVariant:string;fitRevision:number}}
export interface HouseMemoryEvent {id:string;element:Element;type:'upgrade'|'first-place';at:string;category?:FurnitureCategory;title:string;snapshot:HouseSnapshot}
export type HouseCommandKind='upgrade'|'place'|'store'|'return'
export interface HouseCommand {requestId:string;expectedRevision:number;catalogVersion:1;element:Element;kind:HouseCommandKind;targetLevel?:number;furnitureId?:string;slotId?:SlotId;instanceId?:string;replaceMode?:'store'|'return'}
export interface HouseReceipt {id:string;signature:string;revision:number;element:Element;kind:HouseCommandKind;at:string;paid:number;refunded:number}
export interface LifeHouseDomain {schemaVersion:1|2|3|4;revision:number;housesByElement:Record<Element,ElementHouse>;recentReceipts:HouseReceipt[];memoryEvents:HouseMemoryEvent[]}
export interface HouseAccount {gems:number;lifeHouse?:unknown}
export interface HouseContext {at:string;form?:1|2|3|4;cosmetic?:string|null;cosmetics?:string[];assetVersion?:1|2|3;actorVariant?:string;fitRevision?:number;sceneRevision?:1|2|3}
export type HouseError='protected'|'invalid-command'|'stale'|'catalog-changed'|'replay-mismatch'|'locked'|'max-level'|'insufficient'|'missing-item'|'incompatible-slot'|'already-placed'|'gift-return'|'overflow'|'scene-unavailable'
export interface HouseFailure {ok:false;error:HouseError;needed?:number}
export interface HouseSuccess {ok:true;gems:number;domain:LifeHouseDomain;receipt:HouseReceipt;replayed:boolean;response:string}
export type HouseResult=HouseSuccess|HouseFailure
