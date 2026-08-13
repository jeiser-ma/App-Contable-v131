/**
 * Inventory repository (HU09) — conteos de inventario.
 *
 * Clave: STG_KEYS.INVENTORY → CACHE → Storage
 * Schema: SCHEMAS.inventory
 *
 * Uso:
 *   await getInventoryByDate(date);
 *   await getInventoryByProductAndDate(productId, date);
 *   const inv = createInventoryCount({ productId, date, storeQuantity: 10 });
 *   await saveInventoryCount(inv);
 */
const inventoryRepository = createRepository({ key: STG_KEYS.INVENTORY });

/** @returns {Promise<Object[]>} */
async function getAllInventory() {
  return inventoryRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getInventoryById(id) {
  return inventoryRepository.getById(id);
}

/**
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Object[]>}
 */
async function getInventoryByDate(date, storeId) {
  if (!date) return [];
  const all = await inventoryRepository.getAll();
  const target =
    storeId !== undefined
      ? storeId
      : typeof getCurrentStoreId === "function"
        ? getCurrentStoreId()
        : null;
  return all.filter((inv) => {
    if (!inv || inv.date !== date) return false;
    if (typeof belongsToCurrentStore === "function") {
      return belongsToCurrentStore(inv.storeId, target);
    }
    return !target || inv.storeId === target;
  });
}

/**
 * @param {string} productId
 * @returns {Promise<Object[]>}
 */
async function getInventoryByProductId(productId) {
  if (!productId) return [];
  const all = await inventoryRepository.getAll();
  return all.filter((inv) => inv && inv.productId === productId);
}

/**
 * Un conteo concreto producto + fecha (+ PV). El más reciente si hubiera varios.
 * @param {string} productId
 * @param {string} date
 * @param {string} [storeId]
 * @returns {Promise<Object|null>}
 */
async function getInventoryByProductAndDate(productId, date, storeId) {
  if (!productId || !date) return null;
  const all = await inventoryRepository.getAll();
  const target =
    storeId !== undefined
      ? storeId
      : typeof getCurrentStoreId === "function"
        ? getCurrentStoreId()
        : null;
  const matches = all.filter((inv) => {
    if (!inv || inv.productId !== productId || inv.date !== date) return false;
    if (typeof belongsToCurrentStore === "function") {
      return belongsToCurrentStore(inv.storeId, target);
    }
    return !target || inv.storeId === target;
  });
  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

/**
 * @param {string} storeId
 * @returns {Promise<Object[]>}
 */
async function getInventoryByStoreId(storeId) {
  if (!storeId) return [];
  const all = await inventoryRepository.getAll();
  return all.filter((inv) => inv && inv.storeId === storeId);
}

/**
 * Crea un conteo desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createInventoryCount(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.inventory
      ? structuredClone(SCHEMAS.inventory)
      : {
          id: null,
          storeId: null,
          productId: null,
          warehouseQuantity: null,
          storeQuantity: null,
          date: "",
          status: "CONFIRMED",
          createdAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const inv = { ...base, ...data };

  if (!inv.id) inv.id = crypto.randomUUID();
  if (!inv.createdAt) inv.createdAt = new Date().toISOString();
  if (!inv.status) inv.status = "CONFIRMED";
  if (inv.storeId == null && typeof getCurrentStoreId === "function") {
    inv.storeId = getCurrentStoreId();
  }

  return inv;
}

/**
 * @param {Object} inventoryCount
 * @returns {Promise<Object>}
 */
async function saveInventoryCount(inventoryCount) {
  if (!inventoryCount || !inventoryCount.id) {
    throw new Error(
      "[inventory.repository] saveInventoryCount: id es obligatorio"
    );
  }
  return inventoryRepository.upsert(inventoryCount);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllInventory(list) {
  return inventoryRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteInventoryCount(id) {
  return inventoryRepository.removeById(id);
}

/** @returns {Promise<void>} */
async function clearInventory() {
  return inventoryRepository.clear();
}
