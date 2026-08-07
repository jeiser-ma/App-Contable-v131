/**
 * Repositorio base (HU05) — contrato y implementación común.
 *
 * Propósito:
 * - Definir la API que compartirán products, movements, stores, etc.
 * - Hablar SOLO con Storage (provider) + CACHE.
 * - Nunca usar localStorage ni indexedDB directamente.
 *
 * Quién elige el medio de persistencia:
 *   database/providers/storage-provider.js
 *   → StorageProvider = LocalStorageProvider (hoy)
 *   → StorageProvider = IndexedDBProvider (HU14)
 *
 * Contrato (async):
 *   getAll()           → Promise<Object[]>
 *   getById(id)        → Promise<Object|null>
 *   saveAll(list)      → Promise<Object[]>   // reemplaza toda la colección
 *   upsert(item)       → Promise<Object>     // alta o update por item.id
 *   removeById(id)     → Promise<boolean>    // true si eliminó
 *   clear()            → Promise<void>       // colección vacía [] en storage+caché
 *
 * Flujo de lectura (getAll / getById):
 *   ¿CACHE_STATUS[cacheKey]?
 *     Sí  → devolver CACHE[cacheKey]
 *     No  → await Storage.get(storageKey) → replaceCache → devolver
 *
 * Flujo de escritura (saveAll / upsert / removeById / clear):
 *   1) asegurar lista en memoria (getAll si hace falta)
 *   2) await Storage.save(storageKey, list)
 *   3) actualizar CACHE (replaceCache / syncInCache / removeFromCache)
 *
 * Uso sin herencia (recomendado en esta app vanilla):
 *   const productsRepository = createRepository({ key: STG_KEYS.PRODUCTS });
 *   const all = await productsRepository.getAll();
 *
 * Uso con clase (si más adelante querés extender):
 *   class ProductsRepository extends BaseRepository {
 *     constructor() { super({ key: STG_KEYS.PRODUCTS }); }
 *   }
 *
 * Requiere (orden de scripts):
 *   storage.js → providers → cache.js → base.repository.js
 */

/**
 * @typedef {Object} RepositoryConfig
 * @property {string} [key] - Preferido: STG_KEYS.PRODUCTS (misma clave caché + storage)
 * @property {string} [cacheKey] - Alias de key (legado)
 * @property {string} [storageKey] - Si se omite, = key/cacheKey
 */

/**
 * Repositorio base tipado por colección.
 */
class BaseRepository {
  /**
   * @param {RepositoryConfig} config
   */
  constructor(config) {
    const key =
      (config && (config.key || config.cacheKey || config.storageKey)) || null;

    if (!key) {
      throw new Error(
        "[BaseRepository] config.key es obligatorio (usar STG_KEYS.*, ej. STG_KEYS.PRODUCTS)"
      );
    }

    /** @type {string} clave en CACHE / CACHE_STATUS (valor de STG_KEYS) */
    this.cacheKey = key;

    /** @type {string} clave en Storage (por defecto la misma) */
    this.storageKey = (config && config.storageKey) || key;
  }

  /**
   * Devuelve toda la colección.
   * Usa caché si ya está cargada; si no, lee Storage y rellena CACHE.
   * @returns {Promise<Object[]>}
   */
  async getAll() {
    if (typeof isCacheLoaded === "function" && isCacheLoaded(this.cacheKey)) {
      return (CACHE[this.cacheKey] || []).slice();
    }

    // Preferir loadCacheAsync (Storage); fallback sync si no estuviera disponible
    if (typeof loadCacheAsync === "function") {
      const list = await loadCacheAsync(this.cacheKey);
      return (list || []).slice();
    }

    const raw = await Storage.get(this.storageKey);
    const list = Array.isArray(raw) ? raw : [];
    if (typeof replaceCache === "function") {
      replaceCache(this.cacheKey, list);
    }
    return list.slice();
  }

  /**
   * Busca un elemento por id.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    if (!id) return null;
    const all = await this.getAll();
    return all.find((item) => item && item.id === id) || null;
  }

  /**
   * Reemplaza la colección completa en Storage y en CACHE.
   * @param {Object[]} list
   * @returns {Promise<Object[]>} lista guardada (copia)
   */
  async saveAll(list) {
    const normalized = Array.isArray(list) ? list.slice() : [];
    await Storage.save(this.storageKey, normalized);
    if (typeof replaceCache === "function") {
      replaceCache(this.cacheKey, normalized);
    }
    return normalized;
  }

  /**
   * Inserta o actualiza un ítem por id (merge superficial si ya existe).
   * Persiste la colección completa (modelo actual clave → array).
   * @param {Object} item - debe tener id
   * @returns {Promise<Object>} ítem resultante en la lista
   */
  async upsert(item) {
    if (!item || !item.id) {
      throw new Error("[BaseRepository.upsert] item.id es obligatorio");
    }

    const all = await this.getAll();
    const index = all.findIndex((x) => x && x.id === item.id);
    let saved;

    if (index >= 0) {
      saved = { ...all[index], ...item };
      all[index] = saved;
    } else {
      saved = { ...item };
      all.push(saved);
    }

    await this.saveAll(all);
    return saved;
  }

  /**
   * Elimina un ítem por id.
   * @param {string} id
   * @returns {Promise<boolean>} true si existía y se eliminó
   */
  async removeById(id) {
    if (!id) return false;

    const all = await this.getAll();
    const next = all.filter((item) => item && item.id !== id);
    if (next.length === all.length) return false;

    await this.saveAll(next);
    return true;
  }

  /**
   * Vacía la colección (guarda [] en Storage y CACHE).
   * @returns {Promise<void>}
   */
  async clear() {
    await this.saveAll([]);
  }
}

/**
 * Factory: crea un repositorio para una colección sin usar `new` en el caller.
 * Misma API que BaseRepository (getAll, getById, saveAll, upsert, removeById, clear).
 *
 * @param {RepositoryConfig} config
 * @returns {BaseRepository}
 *
 * @example
 * const storesRepository = createRepository({ key: STG_KEYS.STORES });
 * const stores = await storesRepository.getAll();
 */
function createRepository(config) {
  return new BaseRepository(config);
}
