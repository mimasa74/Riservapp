// src/components/OfflineBanner.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
  });

  it('mostra "mai" se non c è lastSyncAt', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.textContent).toContain('Sei offline');
    expect(container.textContent).toContain('mai');
  });

  it('formatta lastSyncAt in italiano gg mese, hh:mm', () => {
    // 15 gennaio 2026 14:30 UTC — verifichiamo la presenza di indicatori it-IT
    localStorage.setItem('lastSyncAt', String(new Date('2026-01-15T14:30:00Z').getTime()));
    const { container } = render(<OfflineBanner />);
    // data formattata con Intl it-IT: deve contenere "gen" (gennaio abbreviato)
    expect(container.textContent?.toLowerCase()).toMatch(/gen/);
  });

  it('resta montato quando online (maxHeight 0)', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    render(<OfflineBanner />);
    const banner = screen.getByText(/Sei offline/i, { exact: false });
    expect(banner).toBeTruthy(); // DOM presente, CSS maxHeight 0 nasconde
  });
});
