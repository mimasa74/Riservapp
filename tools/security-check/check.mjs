import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Run npm test: a local emulator is required');
const env = await initializeTestEnvironment({
  projectId: 'demo-riservapp-private',
  firestore: { host: '127.0.0.1', port: 8089,
    rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
});
let count = 0;
async function check(name, action) { await action(); count++; console.log('PASS ' + name); }
const claims = { email: 'michele.bruni@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
const admin = env.authenticatedContext('michele-uid', claims).firestore();
const anonymous = env.authenticatedContext('socio-uid', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const target = db => doc(db, 'config', 'rettore_push');
const registration = { uid: 'michele-uid', deviceId: 'phone', token: 'private-token', sessionId: '12345678-1234-1234-1234-123456789012' };
try {
  await env.clearFirestore();
  await check('Michele Google verificato registra il destinatario', () => assertSucceeds(setDoc(target(admin), registration)));
  await check('Socio non può leggere il token privato', () => assertFails(getDoc(target(anonymous))));
  await check('Socio non può sostituire il destinatario', () => assertFails(setDoc(target(anonymous), registration)));
  await check('Socio non può revocare il destinatario', () => assertFails(deleteDoc(target(anonymous))));
  const other = env.authenticatedContext('other', { ...claims, email: 'altro@gmail.com' }).firestore();
  await check('Un altro account Google non può registrarsi', () => assertFails(setDoc(target(other), { ...registration, uid: 'other' })));
  const unverified = env.authenticatedContext('michele-uid', { ...claims, email_verified: false }).firestore();
  await check('Email non verificata negata', () => assertFails(setDoc(target(unverified), registration)));
  const password = env.authenticatedContext('michele-uid', { ...claims, firebase: { sign_in_provider: 'password' } }).firestore();
  await check('Provider diverso da Google negato', () => assertFails(setDoc(target(password), registration)));
  await check('UID diverso dall’identità autenticata negato', () => assertFails(setDoc(target(admin), { ...registration, uid: 'other' })));
  await check('Campi aggiuntivi non ammessi', () => assertFails(setDoc(target(admin), { ...registration, ruolo: 'rettore' })));
  await check('Michele può revocare prima del logout', () => assertSucceeds(deleteDoc(target(admin))));
  await check('Nome Michele Bruni non concede accesso al socio', () => assertFails(setDoc(target(anonymous), { ...registration, nome: 'Michele Bruni' })));
  const position = { deviceId: 'socio', nome: 'Mario Rossi', lat: 46.3, lng: 11, timestamp: serverTimestamp() };
  await check('Il socio crea un punto con l’ora server', () => assertSucceeds(setDoc(doc(anonymous, 'user_locations', 'point'), position)));
  await check('Non può creare un punto con ora futura', () => assertFails(setDoc(doc(anonymous, 'user_locations', 'future'), { ...position, timestamp: Timestamp.fromMillis(Date.now()+86400000) })));
  await check('Non può forgiare il marcatore anti-duplicati', () => assertFails(setDoc(doc(anonymous, 'user_locations', 'forged'), { ...position, avvisoRettoreGestito: true })));
  await check('Non può aggiornare il punto per silenziare il trigger', () => assertFails(updateDoc(doc(anonymous, 'user_locations', 'point'), { avvisoRettoreGestito: true })));
  await check('Non può leggere posizioni altrui', () => assertFails(getDoc(doc(anonymous, 'user_locations', 'point'))));
  // Esegue anche la funzione reale su transazioni Firestore reali. L'unico
  // confine sostituito è FCM: nessuna push viene spedita a telefoni.
  const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
  requireFunctions('firebase-admin/app').initializeApp({ projectId: 'demo-riservapp-private' });
  const adminDb = requireFunctions('firebase-admin/firestore').getFirestore();
  const { FieldValue } = requireFunctions('firebase-admin/firestore');
  const sent = [];
  requireFunctions('firebase-admin/messaging').getMessaging().send = async message => { sent.push(message); return 'mock-delivery'; };
  const { avvisaIngresso } = requireFunctions('./lib/avvisoIngresso.js');
  await env.clearFirestore();
  await adminDb.doc('config/rettore_push').set(registration);
  const a = adminDb.doc('user_locations/a');
  const b = adminDb.doc('user_locations/b');
  await Promise.all([a.set({ ...position, timestamp: FieldValue.serverTimestamp() }), b.set({ ...position, timestamp: FieldValue.serverTimestamp() })]);
  const [sa, sb] = await Promise.all([a.get(), b.get()]);
  await check('Transazioni reali: due punti e una riconsegna producono un solo invio', async () => {
    await Promise.all([avvisaIngresso(sb), avvisaIngresso(sa), avvisaIngresso(sa)]);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].token, 'private-token');
  });
  await check('Transazioni reali: un punto successivo resta silenzioso', async () => {
    const c = adminDb.doc('user_locations/c'); await c.set({ ...position, timestamp: FieldValue.serverTimestamp() });
    await avvisaIngresso(await c.get()); assert.equal(sent.length, 1);
  });
  await check('Transazioni reali: senza destinatario non parte nulla', async () => {
    await adminDb.doc('config/rettore_push').delete();
    const d = adminDb.doc('user_locations/d'); await d.set({ ...position, deviceId: 'nuovo-socio', timestamp: FieldValue.serverTimestamp() });
    await avvisaIngresso(await d.get()); assert.equal(sent.length, 1);
  });
  console.log(count + ' security checks passed on local emulator.');
} finally { await env.cleanup(); }
