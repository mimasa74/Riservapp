/**
 * Returns true if online. If offline, shows an italian alert and returns false.
 * Use: `if (!requireOnline()) return;` at the top of any Firestore-write handler.
 */
export function requireOnline(): boolean {
  if (!navigator.onLine) {
    alert('Sei offline. Riprova quando torni online.');
    return false;
  }
  return true;
}
