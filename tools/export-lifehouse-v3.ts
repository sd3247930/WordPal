import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { itemDesigns, visualSources, visualOutputs, type VisualSourceSpec } from '../src/services/pet-lifehouse/VisualInventory'
import { isVisualPackReady } from '../src/services/pet-lifehouse/VisualPack'
import { validWearablePlacement, type WearablePlacement } from '../src/services/pet-lifehouse/WearablePlacement'
import baseline from '../src/static/pet-house/lifehouse/manifest.json'

async function main() {
const input = 'private/lifehouse-v3'
const output = 'src/static/pet-house/lifehouse/v2'
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('base64')
const exporting = process.argv.includes('--export')
if (process.argv.slice(2).some(arg => !['--check', '--export'].includes(arg))) throw Error('Use --check or --export.')
interface Review { sha256Base64: string; passed: boolean; privacyCleared: boolean }
interface FitReview { passed: boolean; frontSha256Base64: string; backSha256Base64?: string; bodySha256Base64: string; front: WearablePlacement; back?: WearablePlacement }
interface Reviews { sources: Record<string, Review>; fits: Record<string, FitReview> }
const reviews: Reviews = JSON.parse(await fs.readFile(input + '/reviews.json', 'utf8').catch(() => '{"sources":{},"fits":{}}'))
const issues: { id: string; reason: string }[] = []
const originals = new Map<string, { spec: VisualSourceSpec; bytes: Buffer }>()
const hashes = new Set<string>()
for (const spec of visualSources) {
  const bytes = await fs.readFile(input + '/originals/' + spec.file).catch(() => undefined)
  if (!bytes) { issues.push({ id: spec.id, reason: 'missing-original' }); continue }
  const hash = sha(bytes), review = reviews.sources?.[spec.id]
  if (hashes.has(hash)) { issues.push({ id: spec.id, reason: 'duplicate-original' }); continue }
  hashes.add(hash)
  if (!review?.passed || !review.privacyCleared || review.sha256Base64 !== hash) { issues.push({ id: spec.id, reason: 'unreviewed-or-changed-original' }); continue }
  try {
    const image = sharp(bytes, { failOn: 'warning' }), meta = await image.metadata()
    await image.raw().toBuffer()
    if (meta.format !== 'png' || !meta.width || !meta.height || Math.min(meta.width, meta.height) < 1024) throw Error('native-HD-PNG-required')
    if (spec.kind === 'room') {
      if (Math.abs(meta.width / meta.height - 1.5) > .025 || meta.width < 1536) throw Error('landscape-3-by-2-required')
    } else {
      const stats = await sharp(bytes).stats()
      if (!meta.hasAlpha || stats.isOpaque || stats.channels[3].max === 0) throw Error('real-transparency-required')
      if (spec.kind === 'wearable' && Math.abs(meta.width / meta.height - .75) > .015) throw Error('uncropped-portrait-3-by-4-required')
    }
    originals.set(spec.id, { spec, bytes })
  } catch (error) { issues.push({ id: spec.id, reason: error instanceof Error && /^[a-zA-Z0-9-]+$/.test(error.message) ? error.message : 'invalid-image' }) }
}

const bodySources: { element: string; form: number; sha256Base64: string }[] = []
for (const body of baseline.companionSources) {
  const formName = ['juvenile', 'growing', 'evolved', 'unknown'][body.form - 1]
  const bytes = await fs.readFile(`src/static/pet-house/growth/${body.element}-${formName}.png`)
  if (sha(bytes) !== body.sha256Base64) issues.push({ id: body.element + '-f' + body.form, reason: 'original-spirit-changed' })
  bodySources.push({ element: body.element, form: body.form, sha256Base64: sha(bytes) })
}
for (const item of itemDesigns.filter(item => item.module === 'dress')) for (let form = 1; form <= 4; form++) {
  const key = item.id + '-f' + form, review = reviews.fits?.[key]
  const front = originals.get(key + '-front'), back = originals.get(key + '-back')
  const body = bodySources.find(body => body.element === item.element && body.form === form)!
  if (!review?.passed || !validWearablePlacement(review.front) || (item.designTier !== 4 ? !validWearablePlacement(review.back) : review.back !== undefined) || !front || review.frontSha256Base64 !== sha(front.bytes) || (item.designTier !== 4 && (!back || review.backSha256Base64 !== sha(back.bytes))) || review.bodySha256Base64 !== body.sha256Base64) issues.push({ id: key, reason: 'fit-or-occlusion-not-reviewed' })
}
if (issues.length) {
  await fs.writeFile(input + '/export-check.json', JSON.stringify({ status: 'incomplete', issues }, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'incomplete', expectedOriginals: visualSources.length, validOriginals: originals.size, expectedRuntimeImages: visualOutputs.length, issueCount: issues.length, issues: issues.slice(0, 8) }, null, 2))
  process.exitCode = 1
} else if (!exporting) {
  console.log(JSON.stringify({ status: 'inputs-verified', originals: originals.size, expectedRuntimeImages: visualOutputs.length, spiritFormsUnchanged: bodySources.length }))
} else {
  const root = await fs.realpath('.'), target = path.resolve(output)
  const staging = path.resolve('dist/lifehouse-v3-export-' + Date.now())
  const backup = path.resolve(input, 'runtime-backups', String(Date.now()))
  function within(base: string, candidate: string) {
    const relative = path.relative(base, candidate)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Unsafe export target.')
  }
  within(root, target); within(path.resolve('src/static/pet-house/lifehouse'), target)
  within(root, staging); within(path.resolve('dist'), staging)
  within(root, backup); within(path.resolve(input), backup)
  if ((await fs.lstat(target).catch(() => undefined))?.isSymbolicLink()) throw Error('Runtime export target must not be a symlink.')
  const existing = await fs.readFile(target + '/manifest.json', 'utf8').then(JSON.parse).catch(() => undefined)
  if (existing?.status === 'ready') throw Error('Published asset versions are immutable; create a new version for revisions.')
  const manifest = {
    schemaVersion: 1, assetVersion: 2, status: 'ready', metadataClean: true,
    reviewedSourceCount: originals.size,
    sources: [...originals].map(([id, value]) => ({ id, sha256Base64: sha(value.bytes) })),
    bodySources,
    wearableFits: itemDesigns.filter(item => item.module === 'dress').flatMap(item => [1,2,3,4].map(form => {const key=`${item.id}-f${form}`,fit=reviews.fits[key];return {key,front:fit.front,...(fit.back?{back:fit.back}:{})}})),
    files: [] as { key: string; path: string; width: number; height: number; bytes: number; sha256Base64: string }[]
  }
  await fs.mkdir(staging, { recursive: true })
  async function contentBounds(bytes: Buffer) {
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let left = info.width, top = info.height, right = -1, bottom = -1
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y)
    }
    if (right < left || bottom < top) throw Error('Empty artwork.')
    return { left, top, width: right - left + 1, height: bottom - top + 1 }
  }
  for (const spec of visualOutputs) {
    const source = originals.get(spec.sourceId)!
    let image = sharp(source.bytes)
    if (source.spec.kind === 'room') {
      image = image.flatten({ background: '#FFFAF0' }).resize(spec.width, spec.height, { fit: 'cover', withoutEnlargement: true })
    } else if (source.spec.kind === 'wearable') {
      // Wearables retain the entire portrait plane, including empty margins and fitted anchor positions.
      image = image.resize(spec.width, spec.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true })
    } else {
      const pad = Math.round(spec.width * .12), inner = spec.width - 2 * pad
      image = image.extract(await contentBounds(source.bytes)).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true }).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    }
    const bytes = await (spec.transparent ? image.png({ compressionLevel: 9 }) : image.jpeg({ quality: 90, mozjpeg: true })).toBuffer()
    const meta = await sharp(bytes).metadata()
    if (meta.width !== spec.width || meta.height !== spec.height || meta.exif || meta.xmp || meta.iptc || bytes.includes(Buffer.from('caBX'))) throw Error('Runtime validation failed: ' + spec.key)
    if (spec.transparent && (!meta.hasAlpha || (await sharp(bytes).stats()).isOpaque)) throw Error('Runtime transparency failed: ' + spec.key)
    const filename = path.join(staging, spec.path); within(staging, filename)
    await fs.mkdir(path.dirname(filename), { recursive: true }); await fs.writeFile(filename, bytes)
    manifest.files.push({ key: spec.key, path: spec.path, width: meta.width!, height: meta.height!, bytes: bytes.length, sha256Base64: sha(bytes) })
  }
  if (!isVisualPackReady(manifest)) throw Error('Candidate pack failed activation validation.')
  await fs.writeFile(staging + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
  await fs.mkdir(path.dirname(backup), { recursive: true })
  await fs.rename(target, backup)
  try { await fs.rename(staging, target) } catch (error) { await fs.rename(backup, target); throw error }
  console.log(JSON.stringify({ status: 'exported', originals: originals.size, runtimeImages: manifest.files.length, spiritFormsUnchanged: bodySources.length, metadata: 'clean' }))
}
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Asset export failed.'); process.exitCode = 1 })
