/**
 * StorageProvider — punto único de elección del proveedor de persistencia.
 *
 * HU15: activo → IndexedDBProvider.
 * Fallback a LocalStorage si IndexedDB no está disponible.
 *
 * Uso:
 *   await Storage.ready()
 *   await Storage.get(STG_KEYS.PRODUCTS)
 *   await Storage.save(STG_KEYS.PRODUCTS, list)
 *
 * Alias: Storage === StorageProvider
 */
const STORAGE_BACKEND = "indexedDB";

function resolveStorageProvider() {
  if (STORAGE_BACKEND === "indexedDB") {
    const idbOk =
      typeof IndexedDBProvider !== "undefined" &&
      typeof indexedDB !== "undefined" &&
      indexedDB;
    if (!idbOk) {
      console.warn(
        "[StorageProvider] IndexedDB no disponible; usando LocalStorage"
      );
      return LocalStorageProvider;
    }
    return IndexedDBProvider;
  }
  return LocalStorageProvider;
}

const StorageProvider = resolveStorageProvider();

/** Alias corto; mismo objeto que StorageProvider */
const Storage = StorageProvider;
