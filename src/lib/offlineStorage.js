const CACHE_PREFIX = 'fs_cache_';
const QUEUE_KEY = 'fs_offline_queue';

export function cacheData(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

export function getCachedData(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch {
    return null;
  }
}

export function queueChange(change) {
  const queue = getQueue();
  queue.push({ ...change, id: Date.now() + '_' + Math.random().toString(36).slice(2) });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeFromQueue(id) {
  const queue = getQueue().filter(q => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}