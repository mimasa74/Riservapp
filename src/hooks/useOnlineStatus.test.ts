import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  });

  it('restituisce online=true quando navigator.onLine è true', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.online).toBe(true);
  });

  it('reagisce all evento offline/online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.online).toBe(true);
  });

  it('legge lastSyncAt da localStorage al mount', () => {
    localStorage.setItem('lastSyncAt', '1700000000000');
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.lastSyncAt).toBe(1700000000000);
  });

  it('aggiorna lastSyncAt al dispatch evento lastSyncAt', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.lastSyncAt).toBe(null);

    act(() => {
      localStorage.setItem('lastSyncAt', '1800000000000');
      window.dispatchEvent(new Event('lastSyncAt'));
    });
    expect(result.current.lastSyncAt).toBe(1800000000000);
  });
});
