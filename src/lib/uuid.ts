/**
 * Génère un UUID v4 RFC 4122.
 *
 * Pourquoi ce wrapper :
 *  - `crypto.randomUUID()` n'existe que dans les *secure contexts*
 *    (HTTPS ou localhost). En accès LAN HTTP (ex: tablette terrain
 *    via IP du dev server, ou prévisualisation interne PNUD non TLS),
 *    elle est `undefined` → crash runtime.
 *  - `crypto.getRandomValues()` est disponible partout (HTTP inclus).
 *
 * Fallback ultime sur Math.random pour les environnements rarissimes
 * sans `crypto` (jsdom anciens, certains workers).
 */

export function uuid(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Pose les bits version (4) et variant (10xx) — RFC 4122 §4.4.
      bytes[6] = (bytes[6]! & 0x0f) | 0x40;
      bytes[8] = (bytes[8]! & 0x3f) | 0x80;
      const hex: string[] = [];
      for (let i = 0; i < 16; i += 1) {
        hex.push(bytes[i]!.toString(16).padStart(2, '0'));
      }
      return (
        `${hex.slice(0, 4).join('')}-` +
        `${hex.slice(4, 6).join('')}-` +
        `${hex.slice(6, 8).join('')}-` +
        `${hex.slice(8, 10).join('')}-` +
        `${hex.slice(10, 16).join('')}`
      );
    }
  }
  // Fallback non-cryptographique. Jamais censé tomber ici en navigateur moderne.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
