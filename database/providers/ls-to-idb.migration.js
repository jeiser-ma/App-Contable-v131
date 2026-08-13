/**
 * HU15 — Migración LocalStorage → IndexedDB (una sola vez).
 *
 * Flujo:
 *   1) await Storage.ready()
 *   2) Copiar cada STG_KEYS (excepto auth) de LS → IDB
 *   3) Marcar flag en LS (no es dato de negocio)
 *   4) Borrar esas claves de LS para no leer datos viejos
 *   5) Hidratar memoria sync (salary, currentStoreId) + caché de productos
 *   6) HU16: backfill catálogo + stock (después de HU15)
 *
 * Auth (credentials / logged) permanece en localStorage (index.html no carga IDB).
 *
 * Flag: localStorage["appContable.idbMigrated"] = "1"
 * No forma parte de STG_KEYS.
 */
const LS_IDB_MIGRATED_FLAG = "appContable.idbMigrated";

/** Claves de sesión/login: no van a IndexedDB */
const AUTH_STG_KEYS = new Set(
  typeof STG_KEYS !== "undefined"
    ? [STG_KEYS.CREDENTIALS, STG_KEYS.LOGGED].filter(Boolean)
    : ["credentials", "logged"]
);

/**
 * Claves de negocio a migrar (STG_KEYS menos auth).
 * @returns {string[]}
 */
function getMigratableStorageKeys() {
  if (typeof STG_KEYS === "undefined") return [];
  return Object.values(STG_KEYS).filter((k) => k && !AUTH_STG_KEYS.has(k));
}

/**
 * Lee una clave de localStorage con el mismo criterio que LocalStorageProvider.get.
 * @param {string} key
 * @returns {any|null} null si no existe o JSON inválido
 */
function readLocalStorageValue(key) {
  if (!key) return null;
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    console.warn("[HU15] JSON inválido en localStorage, se omite:", key);
    return null;
  }
}

/**
 * Copia LS → IDB una sola vez. Idempotente vía flag.
 * @returns {Promise<{ migrated: boolean, copied: number }>}
 */
async function migrateLocalStorageToIndexedDb() {
  if (typeof Storage === "undefined" || !Storage) {
    return { migrated: false, copied: 0 };
  }
  if (Storage.name !== "indexedDB") {
    return { migrated: false, copied: 0 };
  }

  if (localStorage.getItem(LS_IDB_MIGRATED_FLAG) === "1") {
    return { migrated: false, copied: 0 };
  }

  await Storage.ready();

  const keys = getMigratableStorageKeys();
  let copied = 0;

  for (const key of keys) {
    const value = readLocalStorageValue(key);
    if (value === null) continue;
    await Storage.save(key, value);
    copied++;
  }

  localStorage.setItem(LS_IDB_MIGRATED_FLAG, "1");

  for (const key of keys) {
    localStorage.removeItem(key);
  }

  console.info("[HU15] Migración LS → IndexedDB lista. Claves copiadas:", copied);
  return { migrated: true, copied };
}

/**
 * Boot de persistencia del layout: IDB + HU15 + hidratar lecturas sync + HU16.
 * Llamar antes de loadPage / repos.
 * @returns {Promise<void>}
 */
async function initAppPersistence() {
  if (typeof Storage === "undefined" || !Storage) return;

  await Storage.ready();
  await migrateLocalStorageToIndexedDb();

  if (typeof hydrateSalaryPercentageFromStorage === "function") {
    await hydrateSalaryPercentageFromStorage();
  }
  if (typeof hydrateCurrentStoreIdFromStorage === "function") {
    await hydrateCurrentStoreIdFromStorage();
  }
  if (typeof loadCacheAsync === "function" && typeof STG_KEYS !== "undefined") {
    await loadCacheAsync(STG_KEYS.PRODUCTS);
  }
  if (typeof migrateProductsToCatalogAndStock === "function") {
    await migrateProductsToCatalogAndStock();
  }
}
