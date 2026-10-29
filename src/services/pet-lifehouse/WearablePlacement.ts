/** Full transparent artboard remains intact; only its UI placement is calibrated. */
export interface WearablePlacement { scale: number; offsetX: number; offsetY: number; rotation: number }
export const identityWearablePlacement: WearablePlacement = { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 }
export function validWearablePlacement(value: unknown): value is WearablePlacement {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return false
 const p = value as WearablePlacement
 return Object.keys(p).length === 4 && [p.scale, p.offsetX, p.offsetY, p.rotation].every(Number.isFinite)
  && p.scale >= .05 && p.scale <= 2 && Math.abs(p.offsetX) <= 360 && Math.abs(p.offsetY) <= 480 && Math.abs(p.rotation) <= 60
}
export function placedWearablePoint(point: readonly [number, number], p: WearablePlacement): [number, number] {
 const angle = p.rotation * Math.PI / 180, x = (point[0] - 180) * p.scale, y = (point[1] - 240) * p.scale
 return [180 + x * Math.cos(angle) - y * Math.sin(angle) + p.offsetX, 240 + x * Math.sin(angle) + y * Math.cos(angle) + p.offsetY]
}
export function wearablePlacementAt(source: readonly [number, number], target: readonly [number, number], scale: number, rotation = 0): WearablePlacement {
 const p = { scale, offsetX: 0, offsetY: 0, rotation }, current = placedWearablePoint(source, p)
 return { ...p, offsetX: target[0] - current[0], offsetY: target[1] - current[1] }
}
export function wearablePlacementStyle(p?: WearablePlacement, frameWidth=360, frameHeight=480) {
 if(!p||!validWearablePlacement(p)||!(frameWidth>0&&frameHeight>0&&Number.isFinite(frameWidth)&&Number.isFinite(frameHeight)))return
 // aspectFit may letterbox a portrait inside a square/landscape UI box.
 const artWidth=Math.min(frameWidth,frameHeight*.75),artHeight=artWidth/ .75
 return { transform: `translate(-50%,-50%) translate(${p.offsetX / 3.6*artWidth/frameWidth}%,${p.offsetY / 4.8*artHeight/frameHeight}%) rotate(${p.rotation}deg) scale(${p.scale})` }
}
