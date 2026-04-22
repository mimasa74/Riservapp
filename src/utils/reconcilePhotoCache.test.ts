import { describe, it, expect, vi } from 'vitest';
import { collectValidUrls, reconcilePhotoCache } from './reconcilePhotoCache';
import type { Post, AppData } from '../types';

describe('collectValidUrls', () => {
  it('raccoglie foto_url e pdf_url dai post', () => {
    const posts: Post[] = [
      { id: '1', tipo: 'normale', testo: 'a', data: 1, foto_url: 'https://fb/foto1.jpg', pdf_url: null },
      { id: '2', tipo: 'avviso', testo: 'b', data: 2, foto_url: null, pdf_url: 'https://fb/doc.pdf' },
      { id: '3', tipo: 'alert', testo: 'c', data: 3 },
    ];
    const urls = collectValidUrls(posts, {}, undefined);
    expect(urls.has('https://fb/foto1.jpg')).toBe(true);
    expect(urls.has('https://fb/doc.pdf')).toBe(true);
    expect(urls.size).toBe(2);
  });

  it('include foto ruote e regolamento', () => {
    const appData = {
      capriolo: { ruota: { foto: ['https://fb/ruota1.jpg', 'https://fb/ruota2.jpg'] } },
    } as unknown as AppData;
    const urls = collectValidUrls([], appData, 'https://fb/reg.pdf');
    expect(urls.has('https://fb/ruota1.jpg')).toBe(true);
    expect(urls.has('https://fb/ruota2.jpg')).toBe(true);
    expect(urls.has('https://fb/reg.pdf')).toBe(true);
    expect(urls.size).toBe(3);
  });
});

describe('reconcilePhotoCache', () => {
  it('cancella solo entry non in validUrls', async () => {
    const keep = new Request('https://fb/keep.jpg');
    const del = new Request('https://fb/del.jpg');
    const deleteMock = vi.fn().mockResolvedValue(true);
    const mockCache = {
      keys: vi.fn().mockResolvedValue([keep, del]),
      delete: deleteMock,
    };
    const mockCaches = { open: vi.fn().mockResolvedValue(mockCache) };

    await reconcilePhotoCache(new Set(['https://fb/keep.jpg']), mockCaches as unknown as CacheStorage);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(del);
  });

  it('no-op se tutte le entry sono valide', async () => {
    const a = new Request('https://fb/a.jpg');
    const deleteMock = vi.fn();
    const mockCache = { keys: vi.fn().mockResolvedValue([a]), delete: deleteMock };
    const mockCaches = { open: vi.fn().mockResolvedValue(mockCache) };

    await reconcilePhotoCache(new Set(['https://fb/a.jpg']), mockCaches as unknown as CacheStorage);

    expect(deleteMock).not.toHaveBeenCalled();
  });
});
