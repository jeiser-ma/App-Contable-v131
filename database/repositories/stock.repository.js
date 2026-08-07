/**
 * Stock repository — datos de producto por punto de venta.
 *
 * Clave: STG_KEYS.STOCK → CACHE → Storage
 * Schema: SCHEMAS.stock
 * Unicidad lógica: (storeId, productId)
 *
 * Uso:
 *   await getStockByStoreAndProduct(storeId, productId);
 *   const row = createStock({ storeId, productId, quantity: 10, prices: { CUP: 100 } });
 *   await saveStock(row);
 */
const stockRepository = createRepository({ key: STG_KEYS.STOCK });

/** @returns {Promise<Object[]>} */
async function getAllStock() {
  return stockRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getStockById(id) {
  return stockRepository.getById(id);
}

/**
 * @param {string} storeId
 * @returns {Promise<Object[]>}
 */
async function getStockByStoreId(storeId) {
  if (!storeId) return [];
  const all = await stockRepository.getAll();
  return all.filter((s) => s && s.storeId === storeId);
}

/**
 * @param {string} productId
 * @returns {Promise<Object[]>}
 */
async function getStockByProductId(productId) {
  if (!productId) return [];
  const all = await stockRepository.getAll();
  return all.filter((s) => s && s.productId === productId);
}

/**
 * Fila única por par (storeId, productId).
 * @param {string} storeId
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
async function getStockByStoreAndProduct(storeId, productId) {
  if (!storeId || !productId) return null;
  const all = await stockRepository.getAll();
  return (
    all.find(
      (s) => s && s.storeId === storeId && s.productId === productId
    ) || null
  );
}

/**
 * Crea una fila de stock desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createStock(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.stock
      ? structuredClone(SCHEMAS.stock)
      : {
          id: null,
          storeId: null,
          productId: null,
          um: "",
          quantity: 0,
          lowStockThreshold: 0,
          criticalStockThreshold: 0,
          prices: {},
          createdAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const stock = { ...base, ...data };

  if (!stock.id) stock.id = crypto.randomUUID();
  if (!stock.createdAt) stock.createdAt = new Date().toISOString();
  if (!stock.prices || typeof stock.prices !== "object") stock.prices = {};
  if (stock.storeId == null && typeof getCurrentStoreId === "function") {
    stock.storeId = getCurrentStoreId();
  }

  return stock;
}

/**
 * Inserta o actualiza por id.
 * Si ya existe otra fila con el mismo (storeId, productId) y distinto id,
 * se actualiza esa fila (respeta unicidad lógica).
 * @param {Object} stock
 * @returns {Promise<Object>}
 */
async function saveStock(stock) {
  if (!stock || !stock.id) {
    throw new Error("[stock.repository] saveStock: stock.id es obligatorio");
  }

  if (stock.storeId && stock.productId) {
    const existing = await getStockByStoreAndProduct(
      stock.storeId,
      stock.productId
    );
    if (existing && existing.id !== stock.id) {
      const merged = { ...existing, ...stock, id: existing.id };
      return stockRepository.upsert(merged);
    }
  }

  return stockRepository.upsert(stock);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllStock(list) {
  return stockRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteStock(id) {
  return stockRepository.removeById(id);
}

/** @returns {Promise<void>} */
async function clearStock() {
  return stockRepository.clear();
}
