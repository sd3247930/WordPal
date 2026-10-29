import type { Element } from '../../../packages/pet_engine'
import { furnitureAsset, furnitureRegistry, roomAsset } from './HouseRegistry'
import { activeVisualVersion, releasedVisual, type VisualVersion } from './VisualPack'
import type { DesignModule } from './VisualInventory'

export const normalizedHouseLevel = (level: number) => Number.isFinite(level) ? Math.min(5, Math.max(0, Math.floor(level))) : 0

export function roomVisual(element: Element, level: number, version: VisualVersion = activeVisualVersion) {
  const safeLevel = normalizedHouseLevel(level)
  const source = version === 2 && releasedVisual(`room-${element}-l${safeLevel}:stage`)
  const thumbnail = version === 2 && releasedVisual(`room-${element}-l${safeLevel}:thumbnail`)
  return source && thumbnail
    ? { source, thumbnail, version: 2 as const, motif: false, available: true }
    : version === 2
      ? { source: '', thumbnail: '', version: 2 as const, motif: false, available: false }
      : { source: roomAsset(safeLevel), thumbnail: `/static/pet-house/lifehouse/rooms/room-${safeLevel}-256.jpg`, version: 1 as const, motif: true, available: true }
}

/** Only furniture with the same function receives a new look; ownership IDs stay stable. */
export function legacyVisualBinding(id: string, element: Element): string | undefined {
  const item = furnitureRegistry[id]
  if (!item || item.element !== 'all' && item.element !== element) return
  if (id === 'starter-window') return `shared-${element}-window`
  const bindings: Partial<Record<typeof item.kind, [DesignModule, number]>> = {
    bed: ['furniture', 1], shelf: ['furniture', 2], rug: ['decor', 0], lamp: ['decor', 2],
    table: ['furniture', 3], chime: ['decor', 3], plant: ['courtyard', 0], garden: ['courtyard', 2]
  }
  const binding = bindings[item.kind]
  return binding ? `${element}-${binding[0]}-l${binding[1]}-v1` : undefined
}

export function furnitureVisual(id: string, element: Element, size: 'icon' | 'stage' = 'icon', version: VisualVersion = activeVisualVersion): string {
  const item = furnitureRegistry[id]
  if (!item || item.element !== 'all' && item.element !== element) return ''
  const binding = legacyVisualBinding(id, element)
  const source = version === 2 && binding && releasedVisual(binding + (size === 'icon' ? ':icon' : ':preview'))
  return version === 2 ? source || '' : furnitureAsset(id, size)
}
