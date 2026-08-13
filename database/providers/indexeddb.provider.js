/**
 * IndexedDBProvider — persistencia sobre IndexedDB (HU14).
 *
 * Mismo contrato que LocalStorageProvider:
 *   get(key)           -> Promise<any|null>
 *   save(key, data)    -> Promise<void>
 *   remove(key)        -> Promise<void>
 *   clear(keys?)       -> Promise<void>  // sin args: claves STG_KEYS; con args: solo esas
 *   exists(key)        -> Promise<boolean>
 *   ready()            -> Promise<void>  // abre la DB (idempotente)
 *
 * Modelo: un solo object store clave→valor (como LS).
 *   DB: app-contable
 *   store: kv  →  { key: string, value: any }
 *
 * El provider NO conoce entidades. Los repos siguen guardando
 * colecciones enteras (arrays) o escalares (settings).
 *
 * HU15: copiar LS → IDB y apuntar StorageProvider aquí.
 *
 * Nota: IndexedDB guarda structured clone (objetos nativos), no JSON string.
 * get() devuelve null si la clave no existe (repos ponen default).
 */
const IDB_DB_NAME = "app-contable";
const IDB_DB_VERSION = 1;
const IDB_STORE_NAME = "kv";

/** Promesa de IDBDatabase (una conexión reutilizada) */
let idbDbPromise = null;

/**
 * Abre (o reutiliza) la base IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
function openIndexedDb() {
  if (idbDbPromise) return idbDbPromise;

  if (typeof indexedDB === "undefined" || !indexedDB) {
    return Promise.reject(
      new Error("[IndexedDBProvider] IndexedDB no está disponible en este navegador")
    );
  }

  idbDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: "key" });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        idbDbPromise = null;
      };
      db.onclose = () => {
        idbDbPromise = null;
      };
      resolve(db);
    };

    req.onerror = () => {
      idbDbPromise = null;
      reject(req.error || new Error("[IndexedDBProvider] no se pudo abrir IndexedDB"));
    };

    req.onblocked = () => {
      console.warn(
        "[IndexedDBProvider] open bloqueado (otra pestaña usa una versión vieja de la DB)"
      );
    };
  });

  return idbDbPromise;
}

/**
 * Ejecuta una transacción sobre el store kv.
 * @param {"readonly"|"readwrite"} mode
 * @param {(store: IDBObjectStore) => IDBRequest|void} run
 * @returns {Promise<any>}
 */
function idbTx(mode, run) {
  return openIndexedDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        let req;
        try {
          const tx = db.transaction(IDB_STORE_NAME, mode);
          const store = tx.objectStore(IDB_STORE_NAME);
          req = run(store);
          tx.oncomplete = () => {
            resolve(req ? req.result : undefined);
          };
          tx.onerror = () => {
            reject(tx.error || (req && req.error));
          };
          tx.onabort = () => {
            reject(tx.error || new Error("[IndexedDBProvider] transacción abortada"));
          };
        } catch (err) {
          reject(err);
        }
      })
  );
}

const IndexedDBProvider = {
  /** @type {string} */
  name: "indexedDB",

  /**
   * Asegura que la DB esté abierta (útil al boot / HU15).
   * @returns {Promise<void>}
   */
  async ready() {
    await openIndexedDb();
  },

  /**
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    if (!key) return null;
    const row = await idbTx("readonly", (store) => store.get(key));
    if (!row || !Object.prototype.hasOwnProperty.call(row, "value")) return null;
    return row.value;
  },

  /**
   * @param {string} key
   * @param {any} data
   * @returns {Promise<void>}
   */
  async save(key, data) {
    if (!key) return;
    await idbTx("readwrite", (store) => store.put({ key, value: data }));
  },

  /**
   * @param {string} key
   * @returns {Promise<void>}
   */
  async remove(key) {
    if (!key) return;
    await idbTx("readwrite", (store) => store.delete(key));
  },

  /**
   * Elimina varias claves.
   * - Sin argumentos: todas las claves de STG_KEYS (datos de la app).
   * - Con array: solo esas claves.
   * No borra credentials/logged si no están en STG_KEYS (auth sigue en LS).
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

    await idbTx("readwrite", (store) => {
      list.forEach((k) => {
        if (k) store.delete(k);
      });
    });
  },

  /**
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    if (!key) return false;
    const row = await idbTx("readonly", (store) => store.get(key));
    return !!(row && Object.prototype.hasOwnProperty.call(row, "value"));
  },
};
