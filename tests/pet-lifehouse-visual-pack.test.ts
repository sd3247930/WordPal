import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import baseline from '../src/static/pet-house/lifehouse/manifest.json'
import { elements, createPet } from '../packages/pet_engine'
import { designLevels, designModules, itemDesigns, visualSources, visualOutputs, wearableLayers } from '../src/services/pet-lifehouse/VisualInventory'
import { designsFor, itemDesignImage, designWearable } from '../src/services/pet-lifehouse/ItemVisualRegistry'
import { activeVisualVersion, isVisualPackReady } from '../src/services/pet-lifehouse/VisualPack'
import { legacyVisualBinding, roomVisual, furnitureVisual } from '../src/services/pet-lifehouse/SceneVisualRegistry'
import { furnitureAsset, furnitureRegistry } from '../src/services/pet-lifehouse/HouseRegistry'
import { executeHouseCommand } from '../src/services/pet-lifehouse/HouseCommands'
import { validLifeHouse } from '../src/services/pet-lifehouse/HouseValidation'
import { designDressUnlockPolicy, designDressRequirement, designDressUnlocked } from '../src/services/pet-lifehouse/DesignWearables'
import {identityWearablePlacement,wearablePlacementAt,placedWearablePoint,validWearablePlacement,wearablePlacementStyle} from '../src/services/pet-lifehouse/WearablePlacement'

const sha = (text: string) => createHash('sha256').update(text).digest('base64')
function completeManifest() {
  return {
    schemaVersion: 1, assetVersion: 2, status: 'ready', metadataClean: true, reviewedSourceCount: visualSources.length,
    sources: visualSources.map(source => ({ id: source.id, sha256Base64: sha('source:' + source.id) })),
    bodySources: baseline.companionSources.map(({ element, form, sha256Base64 }) => ({ element, form, sha256Base64 })),
    wearableFits: itemDesigns.filter(item=>item.module==='dress').flatMap(item=>[1,2,3,4].map(form=>({key:`${item.id}-f${form}`,front:{...identityWearablePlacement},...(wearableLayers(item).includes('back')?{back:{...identityWearablePlacement}}:{})}))),
    files: visualOutputs.map(spec => ({ ...spec, bytes: 1234, sha256Base64: sha('file:' + spec.key) }))
  }
}

test('四象五模块六级完整，图标、场景和穿戴层有互不混用的资源身份', () => {
  assert.equal(itemDesigns.length, 120)
  for (const element of elements) for (const module of designModules) for (const tier of designLevels) {
    const matches = designsFor(element, module, tier)
    assert.equal(matches.length, 1); assert.equal(matches[0].id, `${element}-${module}-l${tier}-v1`)
  }
  assert.equal(visualSources.filter(source => source.kind === 'room').length, 24)
  assert.equal(visualSources.filter(source => source.kind === 'shared').length, 4)
  assert.equal(visualSources.filter(source => source.kind === 'wearable').length, 176)
  assert.equal(visualSources.length, 324); assert.equal(visualOutputs.length, 472)
  for (const item of itemDesigns.filter(item => item.module === 'dress')) assert.deepEqual(wearableLayers(item), item.designTier === 4 ? ['front'] : ['back', 'front'])
  assert.equal(new Set(visualSources.map(source => source.id)).size, visualSources.length)
  assert.equal(new Set(visualOutputs.map(spec => spec.path)).size, visualOutputs.length)
})

test('完整清单才可激活：缺图、串象路径、重复内容、未审素材、改动精灵本体均拒绝', () => {
  assert.equal(isVisualPackReady(completeManifest()), true)
  const mutations = [
    (pack: ReturnType<typeof completeManifest>) => { pack.files.pop() },
    (pack: ReturnType<typeof completeManifest>) => { pack.files[0].path = pack.files[0].path.replace('water', 'fire') },
    (pack: ReturnType<typeof completeManifest>) => { pack.files[0].path = '../outside.png' },
    (pack: ReturnType<typeof completeManifest>) => { pack.files[0].sha256Base64 = pack.files[1].sha256Base64 },
    (pack: ReturnType<typeof completeManifest>) => { pack.sources[0].sha256Base64 = pack.sources[1].sha256Base64 },
    (pack: ReturnType<typeof completeManifest>) => { pack.reviewedSourceCount-- },
    (pack: ReturnType<typeof completeManifest>) => { pack.metadataClean = false },
    (pack: ReturnType<typeof completeManifest>) => { pack.bodySources[0].sha256Base64 = sha('redrawn-spirit') },
    (pack: ReturnType<typeof completeManifest>) => { pack.bodySources[0] = pack.bodySources[1] },
    (pack: ReturnType<typeof completeManifest>) => { pack.wearableFits.pop() },
    (pack: ReturnType<typeof completeManifest>) => { pack.wearableFits[0].front.scale=NaN },
    (pack: ReturnType<typeof completeManifest>) => { delete pack.wearableFits[0].back },
    (pack: ReturnType<typeof completeManifest>) => { pack.wearableFits[0].key='other-element-f1' },
    (pack: ReturnType<typeof completeManifest>) => { pack.wearableFits[0]=pack.wearableFits[1] }
  ]
  for (const mutate of mutations) { const pack = completeManifest(); mutate(pack); assert.equal(isVisualPackReady(pack), false) }
  for (const value of [null, [], {}, { status: 'ready' }]) assert.equal(isVisualPackReady(value), false)
})

test('穿戴校准映射原画坐标而不裁边，旋转缩放后锚点仍落在指定身体位置',()=>{
 for(const source of [[224,204],[180,240],[100,80]] as const)for(const target of [[205,164],[157,282],[230,110]] as const)for(const rotation of [-22,0,16]){
  const fit=wearablePlacementAt(source,target,.7,rotation),actual=placedWearablePoint(source,fit)
  assert.ok(Math.abs(actual[0]-target[0])<1e-9&&Math.abs(actual[1]-target[1])<1e-9)
  assert.equal(validWearablePlacement(fit),true);assert.match(wearablePlacementStyle(fit)!.transform,/translate\(-50%,-50%\)/)
 }
 assert.deepEqual(placedWearablePoint([205,164],identityWearablePlacement),[205,164])
 assert.equal(wearablePlacementStyle(undefined),undefined)
 for(const patch of [{scale:0},{scale:Infinity},{offsetX:361},{offsetY:481},{rotation:61},{other:1}])assert.equal(validWearablePlacement({...identityWearablePlacement,...patch}),false)
})

test('正方形和横向容器中的留白不改变穿戴定位，平移量使用实际3:4画面而非外框',()=>{
 const p={scale:1,offsetX:36,offsetY:48,rotation:0}
 assert.match(wearablePlacementStyle(p,320,320)!.transform,/translate\(7.5%,10%\)/)
 assert.match(wearablePlacementStyle(p,180,480)!.transform,/translate\(10%,5%\)/)
 assert.equal(wearablePlacementStyle(p,0,320),undefined)
 assert.equal(wearablePlacementStyle(p,Infinity,320),undefined)
})

test('显式版本解析保留旧留影，新装扮仅在完整资源包启用后可用', () => {
  for (const element of elements) for (const level of designLevels) {
    assert.equal(roomVisual(element, level).version, activeVisualVersion)
    assert.equal(roomVisual(element, level, 1).source, `/static/pet-house/lifehouse/rooms/room-${level}.jpg`)
  }
  for (const item of itemDesigns) assert.equal(!!itemDesignImage(item.id), activeVisualVersion === 2)
  assert.equal(!!designWearable('water-dress-l5-v1', 'water', 1), activeVisualVersion === 2)
  assert.equal(designWearable('water-dress-l5-v1', 'fire', 1), undefined)
  assert.equal(roomVisual('water', Number.NaN).source, roomVisual('water', 0).source)
  if(activeVisualVersion===1){assert.equal(roomVisual('water',0,2).available,false);assert.equal(roomVisual('water',0,2).source,'');assert.equal(furnitureVisual('water-bed','water','icon',2),'')}
})

test('外观绑定保持旧商品身份、价格、解锁等级和赠礼规则，不把不同功能互换', () => {
  const before = JSON.stringify(furnitureRegistry)
  for (const element of elements) {
    assert.equal(legacyVisualBinding(element + '-bed', element), element + '-furniture-l1-v1')
    assert.equal(legacyVisualBinding(element + '-shelf', element), element + '-furniture-l2-v1')
    assert.equal(legacyVisualBinding('common-table', element), element + '-furniture-l3-v1')
    assert.equal(legacyVisualBinding('starter-window', element), 'shared-' + element + '-window')
    assert.equal(furnitureVisual(element + '-bed', element, 'icon', 1), furnitureAsset(element + '-bed'))
  }
  assert.equal(legacyVisualBinding('water-bed', 'fire'), undefined)
  assert.equal(furnitureVisual('water-bed', 'fire'), '')
  assert.equal(legacyVisualBinding('missing-item', 'water'), undefined)
  assert.equal(JSON.stringify(furnitureRegistry), before)
})

test('新留影保存外观版本2，旧留影不改写；新配饰必须属于对应元素', () => {
  const command = { requestId: 'v3-snapshot', element: 'water' as const, expectedRevision: 0, catalogVersion: 1 as const, kind: 'upgrade' as const, targetLevel: 1 }
  const context = { at: '2026-10-27T04:00:00Z', cosmetic: 'water-dress-l5-v1', assetVersion: 2 as const }
  const result = executeHouseCommand({ gems: 1000 }, command, context)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.gems, 700); assert.equal(validLifeHouse(result.domain), true)
  for (const memory of result.domain.memoryEvents) assert.equal(memory.snapshot.assetVersion, 2)
  assert.equal(executeHouseCommand({ gems: 1000 }, command, { ...context, cosmetic: 'fire-dress-l5-v1' }).ok, false)
  assert.equal(executeHouseCommand({ gems: 1000 }, command, { ...context, assetVersion: 1 }).ok, false)
  assert.equal(executeHouseCommand({ gems: 1000 }, command, { at: context.at }).ok, true)
})

test('新装扮必须有已确认解锁策略，宠物等级与房屋等级互不混用', () => {
  const crown = itemDesigns.find(item => item.id === 'water-dress-l5-v1')!
  const pet = { ...createPet('water'), level: 4 }
  assert.equal(designDressUnlocked(crown, pet, 5, null), false)
  assert.equal(designDressRequirement(crown, 'pet-levels')?.level, 8)
  assert.equal(designDressUnlocked(crown, pet, 5, 'pet-levels'), false)
  assert.equal(designDressUnlocked(crown, { ...pet, level: 8 }, 0, 'pet-levels'), true)
  assert.equal(designDressUnlocked(crown, pet, 5, 'house-levels'), true)
  assert.equal(designDressUnlocked(crown, { ...pet, level: 8 }, undefined, 'house-levels'), false)
  assert.equal(designDressUnlocked(crown, createPet('fire'), 5, 'house-levels'), false)
})

test('24款新装扮默认按宠物Lv.2/4/8解锁，房屋等级和缺少家园不影响资格', () => {
  assert.equal(designDressUnlockPolicy, 'pet-levels')
  const dresses = itemDesigns.filter(item => item.module === 'dress')
  assert.equal(dresses.length, 24)
  for (const item of dresses) {
    const required = item.designTier <= 1 ? 2 : item.designTier <= 3 ? 4 : 8
    assert.deepEqual(designDressRequirement(item), { level: required, label: '宠物 Lv.' + required + ' 解锁' })
    for (const level of [1, 2, 3, 4, 7, 8, 9]) for (const houseLevel of [undefined, 0, 5]) {
      assert.equal(designDressUnlocked(item, { ...createPet(item.element), level }, houseLevel), level >= required, item.id + ' at pet level ' + level)
    }
  }
})
