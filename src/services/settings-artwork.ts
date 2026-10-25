export const settingsArtwork={
 heading:'heading',appearance:'appearance',motion:'motion',text:'text',reader:'reader',
 learning:'learning',level:'level',feedback:'feedback',sound:'sound',haptics:'haptics',privacy:'privacy',about:'about'
} as const
export type SettingsArtworkName=keyof typeof settingsArtwork
export function settingsArtworkSrc(name:SettingsArtworkName){return '/static/icons/settings/'+settingsArtwork[name]+'.png'}
export const settingsHeaderArtwork='/static/icons/settings/header-books.png'
export const settingsThemePreviews:Partial<Record<import('../styles/themes').ThemeId,string>>={
 swiss:'/static/icons/settings/preview-swiss.png',clay:'/static/icons/settings/preview-clay.png'
}
