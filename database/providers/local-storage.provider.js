/**
 * LocalStorageProvider — persistencia sobre localStorage.
 * HU02: implementación activa.
 *
 * Contrato (async, mismo que IndexedDBProvider en HU14):
 *   get(key)           -> Promise<any|null>
 *   save(key, data)    -> Promise<void>
 *   remove(key)        -> Promise<void>
 *   clear(keys?)       -> Promise<void>  // sin args: claves STG_KEYS; con args: solo esas
 *   exists(key)        -> Promise<boolean>
 *
 * Nota: get() devuelve null si la clave no existe (no asume []).
 * Los repositorios definen el default (lista vacía, etc.).
 */
const LocalStorageProvider = {
  /** @type {string} */
  name: "localStorage",

  /**
   * No-op: localStorage no requiere abrir conexión.
   * @returns {Promise<void>}
   */
  async ready() {},

  /**
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      // Dato corrupto o no-JSON: no tumbar la app
      console.warn("[LocalStorageProvider.get] JSON inválido para clave:", key);
      return null;
    }
  },

  /**
   * @param {string} key
   * @param {any} data
   * @returns {Promise<void>}
   */
  async save(key, data) {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(data));
  },

  /**
   * Elimina una clave.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async remove(key) {
    if (!key) return;
    localStorage.removeItem(key);
  },

  /**
   * Elimina varias claves.
   * - Sin argumentos: todas las claves de STG_KEYS (datos de la app).
   * - Con array: solo esas claves.
   * No hace localStorage.clear() a ciegas (evitar borrar cosas ajenas).
   * @param {string[]} [keys]
   * @returns {Promise<void>}
   */
  async clear(keys) {
    const list =
      Array.isArray(keys) && keys.length > 0
        ? keys
        : typeof STG_KEYS !== "undefined"
          ? Object.values(STG_KEYS)
          : [];

    for (const key of list) {
      if (key) localStorage.removeItem(key);
    }
  },

  /**
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    if (!key) return false;
    return localStorage.getItem(key) !== null;
  },
};
