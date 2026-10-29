import catalog from './ItemVisualCatalog.json'
import { elements, type Element } from '../../../packages/pet_engine'
import type { HouseLevel } from './types'

export type DesignModule = 'feed' | 'dress' | 'furniture' | 'decor' | 'courtyard'
export type WearableLayer = 'front' | 'back'
export interface ItemDesign {
  readonly id: string
  readonly element: Element
  readonly module: DesignModule
  readonly designTier: HouseLevel
  readonly name: string
}
export const designModules: readonly DesignModule[] = ['feed', 'dress', 'furniture', 'decor', 'courtyard']
export const itemDesigns: readonly ItemDesign[] = Object.freeze(catalog.map(item => Object.freeze({ ...item } as ItemDesign)))
export const designLevels: readonly HouseLevel[] = [0, 1, 2, 3, 4, 5]
export const spiritForms = [1, 2, 3, 4] as const
export function isElementDressDesign(id: unknown, element: Element): id is string {
  return typeof id === 'string' && itemDesigns.some(item => item.id === id && item.element === element && item.module === 'dress')
}
export const visualPackRoot = '/static/pet-house/lifehouse/v2/'

export interface VisualSourceSpec {
  readonly id: string
  readonly file: string
  readonly kind: 'item' | 'room' | 'shared' | 'wearable'
  readonly element: Element
  readonly itemId?: string
  readonly form?: 1 | 2 | 3 | 4
  readonly layer?: WearableLayer
}
export interface VisualOutputSpec {
  readonly key: string
  readonly path: string
  readonly sourceId: string
  readonly width: number
  readonly height: number
  readonly transparent: boolean
}

/** A brooch is a front-only accessory; fabric and crowns have separate rear layers. */
export function wearableLayers(item: ItemDesign): readonly WearableLayer[] {
  return item.module !== 'dress' ? [] : item.designTier === 4 ? ['front'] : ['back', 'front']
}

const sources: VisualSourceSpec[] = []
const outputs: VisualOutputSpec[] = []
for (const item of itemDesigns) {
  const folder = `items/${item.element}/${item.module}/l${item.designTier}/`
  sources.push({ id: item.id, file: folder + item.id + '.png', kind: 'item', element: item.element })
  for (const size of [256, 512]) outputs.push({ key: item.id + (size === 256 ? ':icon' : ':preview'), path: folder + item.id + '-' + size + '.png', sourceId: item.id, width: size, height: size, transparent: true })
  for (const form of spiritForms) for (const layer of wearableLayers(item)) {
    const id = `${item.id}-f${form}-${layer}`
    const file = `wearables/${item.element}/${item.id}/f${form}-${layer}.png`
    sources.push({ id, file, kind: 'wearable', element: item.element, itemId: item.id, form, layer })
    outputs.push({ key: id, path: file, sourceId: id, width: 960, height: 1280, transparent: true })
  }
}
for (const element of elements) {
  for (const level of designLevels) {
    const id = `room-${element}-l${level}`
    sources.push({ id, file: `rooms/${element}/l${level}.png`, kind: 'room', element })
    outputs.push({ key: id + ':stage', path: `rooms/${element}/l${level}.jpg`, sourceId: id, width: 1536, height: 1024, transparent: false })
    outputs.push({ key: id + ':thumbnail', path: `rooms/${element}/l${level}-384.jpg`, sourceId: id, width: 384, height: 256, transparent: false })
  }
  const id = `shared-${element}-window`
  sources.push({ id, file: `shared/${element}/window.png`, kind: 'shared', element })
  for (const size of [256, 512]) outputs.push({ key: id + (size === 256 ? ':icon' : ':preview'), path: `shared/${element}/window-${size}.png`, sourceId: id, width: size, height: size, transparent: true })
}
export const visualSources: readonly VisualSourceSpec[] = Object.freeze(sources.map(source => Object.freeze(source)))
export const visualOutputs: readonly VisualOutputSpec[] = Object.freeze(outputs.map(output => Object.freeze(output)))
