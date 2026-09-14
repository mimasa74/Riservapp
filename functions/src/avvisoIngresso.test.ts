import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ db: {} as any, send: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => mocks.db }));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ send: mocks.send }) }));
import { avvisaIngresso, PRESENZA_MS } from './avvisoIngresso';

const now = Date.parse('2026-09-10T07:12:00Z');
function point(id: string, ms = now, deviceId = 'socio') {
  const data: any = { nome: 'Mario Rossi', deviceId, timestamp: { toMillis: () => ms } };
  return { id, ref: { id }, exists: true, data: () => data,
    createTime: { seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1000000 } };
}
let points: ReturnType<typeof point>[];
let recipient: any;
beforeEach(() => {
  mocks.send.mockReset().mockResolvedValue('ok');
  points = [];
  recipient = { uid: 'google-michele', token: 'private-token', deviceId: 'rettore', sessionId: 'session' };
  mocks.db.doc = (id: string) => ({ id });
  mocks.db.collection = (id: string) => {
    if (id !== 'user_locations') throw Error('Must never read public tokens');
    return { where: (_field: string, _op: string, deviceId: string) => ({ query: true, deviceId }) };
  };
  // Serialize as Firestore does when transactions share a claim document.
  let queue = Promise.resolve();
  mocks.db.runTransaction = (fn: any) => {
    const task = queue.then(() => fn({
      get: async (ref: any) => ref.query
        ? { docs: points.filter(p => p.data().deviceId === ref.deviceId) }
        : ref.id === 'config/rettore_push' ? { data: () => recipient }
        : points.find(p => p.id === ref.id) ?? { exists: false },
      update: (ref: any, fields: any) => Object.assign(points.find(p => p.id === ref.id)!.data(), fields),
    }));
    queue = task.catch(() => {});
    return task;
  };
});

describe('avviso al solo Rettore', () => {
  it('invia la notifica solo al token privato del Rettore', async () => {
    const p = point('first'); points.push(p);
    await avvisaIngresso(p as any, now);
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      token: 'private-token', data: expect.objectContaining({ title: 'MAPPA', rettoreSession: 'session' }),
    }));
    expect(mocks.send.mock.calls[0][0]).not.toHaveProperty('notification');
  });
  it('non invia se il Rettore non è registrato', async () => {
    recipient = undefined; const p = point('first'); points.push(p);
    await avvisaIngresso(p as any, now); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('non ripete finché esiste un punto recente', async () => {
    const p = point('new'); points.push(point('old', now - 15 * 60000), p);
    await avvisaIngresso(p as any, now); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('riavvisa dopo 35 minuti anche se la pulizia non ha ancora cancellato il vecchio punto', async () => {
    const p = point('new'); points.push(point('old', now - PRESENZA_MS), p);
    await avvisaIngresso(p as any, now); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('due primi punti simultanei producono un solo avviso anche con trigger invertiti', async () => {
    const a = point('a'), b = point('b'); points.push(a, b);
    await Promise.all([avvisaIngresso(b as any, now), avvisaIngresso(a as any, now)]);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('la riconsegna concorrente dello stesso evento non duplica la push', async () => {
    const p = point('first'); points.push(p);
    await Promise.all([avvisaIngresso(p as any, now), avvisaIngresso(p as any, now)]);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('ignora un evento scaduto o già cancellato', async () => {
    const p = point('expired', now - PRESENZA_MS); points.push(p);
    await avvisaIngresso(p as any, now);
    await avvisaIngresso(point('deleted') as any, now);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('un altro socio non impedisce il primo avviso', async () => {
    const p = point('first'); points.push(point('other', now - 1000, 'altro'), p);
    await avvisaIngresso(p as any, now); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('non ritenta un invio fallito dall’esito incerto', async () => {
    const p = point('first'); points.push(p); mocks.send.mockRejectedValueOnce(Error('FCM unavailable'));
    await expect(avvisaIngresso(p as any, now)).rejects.toThrow('FCM unavailable');
    await avvisaIngresso(p as any, now); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('la notifica dice solo MAPPA: niente nome ne ora addosso al telefono', async () => {
    const p = point('first'); points.push(p);
    await avvisaIngresso(p as any, now);
    const data = mocks.send.mock.calls[0][0].data;
    expect(data.title).toBe('MAPPA');
    expect(data.body).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('Mario');
  });
});
