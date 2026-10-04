export type NavIconName = 'home' | 'learn' | 'pet' | 'review' | 'settings'
const spark = '<path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7Z" stroke-width="1.7"/>'
export function navIconSvg(name: NavIconName, active = false): string {
 const bodies: Record<NavIconName, string> = {
  home: '<path d="m3 11 8-7 8 7M5 10v10h12V10M9 20v-6h4v6"/>' + spark,
  learn: '<path d="M12 8c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V10M12 8v13M6 11h3M6 14h3M15 14h3"/>' + spark,
  pet: '<path d="m2 10 10-8 10 8M4 9v12h16V9"/><path d="M9 17c-1 2 1 3 3 2 2 1 4 0 3-2l-2-2c-.5-.5-1.5-.5-2 0Z" stroke-width="1.7"/><circle cx="8" cy="13" r=".8"/><circle cx="11" cy="11.5" r=".8"/><circle cx="14" cy="11.5" r=".8"/><circle cx="16.5" cy="13" r=".8"/>',
  review: '<path d="M7 5V3h14v16h-2M3 7h14v14H3ZM6 17l2-6 2 6M7 14h2M12 14c3-1 3 3 0 3-2 0-2-3 0-3Z" stroke-width="1.8"/>',
  settings: '<path d="m9 3 .7-1h4.6l.7 3 2.5 1.5 2.9-.9 2.3 4-2.2 2v2.8l2.2 2-2.3 4-2.9-.9L15 21l-.7 1H9.7L9 19l-2.5-1.5-2.9.9-2.3-4 2.2-2V9.6l-2.2-2 2.3-4 2.9.9Z" transform="translate(0 1) scale(1 .9)"/>' + (active ? '<path d="m12 8 1.1 2.7 2.9.3-2.2 1.9.7 2.9-2.5-1.5-2.5 1.5.7-2.9L8 11l2.9-.3Z" stroke-width="1.7"/>' : '<circle cx="12" cy="12" r="3"/>')
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${bodies[name]}</svg>`
}
