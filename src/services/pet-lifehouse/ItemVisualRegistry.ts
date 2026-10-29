import type { Element } from '../../../packages/pet_engine'
import type { PetForm } from '../pet-growth'
import { itemDesigns, wearableLayers, type DesignModule, type ItemDesign } from './VisualInventory'
import { releasedVisual, releasedWearableFit } from './VisualPack'
import type { WearablePlacement } from './WearablePlacement'

export { itemDesigns, designLevels, designModules } from './VisualInventory'
export type { ItemDesign, DesignModule } from './VisualInventory'
const byId = new Map(itemDesigns.map(item => [item.id, item]))
export function itemDesign(id: string): ItemDesign | undefined { return byId.get(id) }
export function designsFor(element: Element, module: DesignModule, tier?: number): readonly ItemDesign[] {
  return itemDesigns.filter(item => item.element === element && item.module === module && (tier === undefined || item.designTier === tier))
}
/** Undefined means unavailable; a different element's picture is never substituted. */
export function itemDesignImage(id: string, usage: 'icon' | 'preview' = 'icon'): string | undefined {
  return byId.has(id) ? releasedVisual(id + ':' + usage) : undefined
}
export function designWearable(id: string, element: Element, form: PetForm): { name: string; front: string; back?: string; frontPlacement: WearablePlacement; backPlacement?: WearablePlacement } | undefined {
  const item = byId.get(id)
  if (!item || item.module !== 'dress' || item.element !== element || ![1, 2, 3, 4].includes(form)) return
  const front = releasedVisual(`${id}-f${form}-front`)
  const back = releasedVisual(`${id}-f${form}-back`)
  const fit = releasedWearableFit(`${id}-f${form}`)
  if (!front || !fit || wearableLayers(item).includes('back') && !back) return
  return { name: item.name, front, back, frontPlacement: fit.front, backPlacement: fit.back }
}
