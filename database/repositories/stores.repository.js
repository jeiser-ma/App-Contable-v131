/**
 * Stores repository (HU11) — puntos de venta.
 *
 * Clave: STG_KEYS.STORES → CACHE → Storage
 * Schema: SCHEMAS.store (incluye salaryPercentage por PV)
 *
 * Uso:
 *   await getActiveStores();
 *   const s = createStore({ name: "Paradero", salaryPercentage: 2 });
 *   await saveStore(s);
 */
const storesRepository = createRepository({ key: STG_KEYS.STORES });

/** @returns {Promise<Object[]>} */
async function getAllStores() {
  return storesRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getStoreById(id) {
  return storesRepository.getById(id) || {};
}

/**
 * Solo stores con active !== false.
 * @returns {Promise<Object[]>}
 */
async function getActiveStores() {
  const all = await storesRepository.getAll();
  return all.filter((s) => s && s.active !== false);
}

/**
 * Crea un store desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createStore(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.store
      ? structuredClone(SCHEMAS.store)
      : {
          id: null,
          name: "",
          active: true,
          salaryPercentage: 1.7,
          createdAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const store = { ...base, ...data };

  if (!store.id) store.id = crypto.randomUUID();
  if (!store.createdAt) store.createdAt = new Date().toISOString();
  if (typeof store.active !== "boolean") store.active = true;
  if (
    store.salaryPercentage == null ||
    Number.isNaN(Number(store.salaryPercentage))
  ) {
    store.salaryPercentage = 1.7;
  }

  return store;
}

/**
 * @param {Object} store
 * @returns {Promise<Object>}
 */
async function saveStore(store) {
  if (!store || !store.id) {
    throw new Error("[stores.repository] saveStore: store.id es obligatorio");
  }
  return storesRepository.upsert(store);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllStores(list) {
  return storesRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteStore(id) {
  return storesRepository.removeById(id);
}

/** @returns {Promise<void>} */
async function clearStores() {
  return storesRepository.clear();
}
