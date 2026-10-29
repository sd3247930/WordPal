import type { PetState } from '../../../packages/pet_engine'
import type { ItemDesign } from './VisualInventory'

export type DesignDressUnlockPolicy = 'pet-levels' | 'house-levels'
/** New designs unlock for free at companion levels 2, 4 and 8. */
export const designDressUnlockPolicy: DesignDressUnlockPolicy | null = 'pet-levels'

export function designDressRequirement(item: ItemDesign, policy: DesignDressUnlockPolicy | null = designDressUnlockPolicy): { level: number; label: string } | undefined {
  if (item.module !== 'dress' || !policy) return
  const level = policy === 'pet-levels' ? [2, 2, 4, 4, 8, 8][item.designTier] : item.designTier
  return { level, label: (policy === 'pet-levels' ? '宠物' : '房屋') + ' Lv.' + level + ' 解锁' }
}
export function designDressUnlocked(item: ItemDesign, pet: PetState, houseLevel: number | undefined, policy: DesignDressUnlockPolicy | null = designDressUnlockPolicy): boolean {
  if (item.element !== pet.element) return false
  const requirement = designDressRequirement(item, policy)
  if (!requirement) return false
  return (policy === 'pet-levels' ? pet.level : houseLevel ?? -1) >= requirement.level
}
