import type { Post, AppData } from '../types';
import { PHOTO_CACHE } from '../constants/cacheNames';

export function collectValidUrls(posts: Post[], appData: AppData, regolamentoUrl?: string | null): Set<string> {
  const urls = new Set<string>();
  for (const p of posts) {
    if (p.foto_url) urls.add(p.foto_url);
    if (p.pdf_url) urls.add(p.pdf_url);
  }
  for (const specie of Object.values(appData)) {
    specie?.ruota?.foto?.forEach((u) => u && urls.add(u));
  }
  if (regolamentoUrl) urls.add(regolamentoUrl);
  return urls;
}

export async function reconcilePhotoCache(
  validUrls: Set<string>,
  cacheStorage: CacheStorage = caches,
  cacheName: string = PHOTO_CACHE,
): Promise<void> {
  const cache = await cacheStorage.open(cacheName);
  const keys = await cache.keys();
  for (const req of keys) {
    if (!validUrls.has(req.url)) {
      await cache.delete(req);
    }
  }
}
