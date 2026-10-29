import release from '../../static/pet-house/lifehouse/v2/manifest.json'
import previous from '../../static/pet-house/lifehouse/manifest.json'
import { visualSources, visualOutputs, visualPackRoot, itemDesigns, spiritForms, wearableLayers } from './VisualInventory'
import { validWearablePlacement, type WearablePlacement } from './WearablePlacement'

export type VisualVersion = 1 | 2
export interface PublishedVisualFile {
  key: string
  path: string
  width: number
  height: number
  bytes: number
  sha256Base64: string
}
export interface PublishedWearableFit { key: string; front: WearablePlacement; back?: WearablePlacement }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const digest = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(value)

/** An incomplete pack stays inactive as a whole, including apparently finished fragments. */
export function isVisualPackReady(value: unknown): boolean {
  if (!record(value) || value.schemaVersion !== 1 || value.assetVersion !== 2 || value.status !== 'ready' || value.metadataClean !== true || value.reviewedSourceCount !== visualSources.length) return false
  if (!Array.isArray(value.sources) || value.sources.length !== visualSources.length || !Array.isArray(value.files) || value.files.length !== visualOutputs.length || !Array.isArray(value.bodySources) || value.bodySources.length !== 16) return false
  const sources = new Map(visualSources.map(source => [source.id, source]))
  const seenSources = new Set<string>(), seenSourceHashes = new Set<string>()
  for (const source of value.sources) {
    if (!record(source) || typeof source.id !== 'string' || !sources.has(source.id) || seenSources.has(source.id) || !digest(source.sha256Base64) || seenSourceHashes.has(source.sha256Base64)) return false
    seenSources.add(source.id); seenSourceHashes.add(source.sha256Base64)
  }
  const expected = new Map(visualOutputs.map(output => [output.key, output]))
  const seen = new Set<string>(), hashes = new Set<string>()
  for (const file of value.files) {
    if (!record(file) || typeof file.key !== 'string' || seen.has(file.key)) return false
    const spec = expected.get(file.key)
    if (!spec || file.path !== spec.path || file.width !== spec.width || file.height !== spec.height || !Number.isSafeInteger(file.bytes) || Number(file.bytes) <= 0 || !digest(file.sha256Base64) || hashes.has(file.sha256Base64)) return false
    seen.add(file.key); hashes.add(file.sha256Base64)
  }
  const bodies = new Map(previous.companionSources.map(source => [source.element + ':' + source.form, source.sha256Base64]))
  const seenBodies = new Set<string>()
  for (const source of value.bodySources) {
    if (!record(source) || typeof source.element !== 'string' || !Number.isInteger(source.form)) return false
    const key = source.element + ':' + source.form
    if (seenBodies.has(key) || !bodies.has(key) || bodies.get(key) !== source.sha256Base64) return false
    seenBodies.add(key)
  }
  const expectedFits = new Map<string, boolean>(itemDesigns.filter(item => item.module === 'dress').flatMap(item => spiritForms.map(form => [`${item.id}-f${form}`, wearableLayers(item).includes('back')] as const)))
  if (!Array.isArray(value.wearableFits) || value.wearableFits.length !== expectedFits.size) return false
  const seenFits = new Set<string>()
  for (const fit of value.wearableFits) {
    if (!record(fit) || typeof fit.key !== 'string' || !expectedFits.has(fit.key) || seenFits.has(fit.key) || !validWearablePlacement(fit.front)) return false
    if (expectedFits.get(fit.key) ? !validWearablePlacement(fit.back) : fit.back !== undefined) return false
    seenFits.add(fit.key)
  }
  return true
}

export const activeVisualVersion: VisualVersion = isVisualPackReady(release) ? 2 : 1
const files = new Map<string, PublishedVisualFile>(activeVisualVersion === 2 ? (release.files as PublishedVisualFile[]).map(file => [file.key, file]) : [])
const fits = new Map<string, PublishedWearableFit>(activeVisualVersion === 2 ? ((release as unknown as { wearableFits: PublishedWearableFit[] }).wearableFits).map(fit => [fit.key, fit]) : [])
export function releasedWearableFit(key: string) { return fits.get(key) }
export function releasedVisual(key: string): string | undefined {
  const file = files.get(key)
  return file ? visualPackRoot + file.path : undefined
}
