/**
 * StorageProvider — punto único de elección del proveedor de persistencia.
 * HU02: activo → LocalStorageProvider.
 * HU14: cambiar a IndexedDBProvider.
 *
 * Uso:
 *   await StorageProvider.get(STG_KEYS.PRODUCTS)
 *   await StorageProvider.save(STG_KEYS.PRODUCTS, list)
 *   await StorageProvider.remove(STG_KEYS.PRODUCTS)
 *   await StorageProvider.clear()              // claves STG_KEYS
 *   await StorageProvider.clear(["products"])  // solo esas
 *   await StorageProvider.exists(STG_KEYS.PRODUCTS)
 *
 * Alias corto (opcional): Storage === StorageProvider
 */
const StorageProvider = LocalStorageProvider;

/** Alias corto; mismo objeto que StorageProvider */
const Storage = StorageProvider;
