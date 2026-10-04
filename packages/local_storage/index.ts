export function readStorage<T>(key: string, fallback: T): T {
  try { const raw = uni.getStorageSync(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
export function writeStorage<T>(key: string, value: T) {
  // Write one complete snapshot. Quota / disk errors abort the transaction.
  uni.setStorageSync(key, JSON.stringify(value))
}
