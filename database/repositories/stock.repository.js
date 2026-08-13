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
 *   await upsertStockForProduct(product, storeId); // dual-write HU16
 *   await deleteStockByProductId(productId);
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

/**
 * Elimina todas las filas de stock de un producto (baja de catálogo).
 * @param {string} productId
 * @returns {Promise<number>} cantidad de filas eliminadas
 */
async function deleteStockByProductId(productId) {
  if (!productId) return 0;
  const all = await getAllStock();
  const keep = all.filter((s) => !s || s.productId !== productId);
  const removed = all.length - keep.length;
  if (removed > 0) await saveAllStock(keep);
  return removed;
}

/** @returns {Promise<void>} */
async function clearStock() {
  return stockRepository.clear();
}

/**
 * Código de moneda por defecto (catálogo o CUP).
 * @returns {string}
 */
function getDefaultCurrencyCode() {
  if (typeof DEFAULT_CURRENCIES !== "undefined" && DEFAULT_CURRENCIES[0]) {
    return String(DEFAULT_CURRENCIES[0]).toUpperCase();
  }
  return "CUP";
}

/**
 * Arma `stock.prices` desde el producto legado (`price` numérico y/o `prices`).
 * No pisa otras monedas ya cargadas; actualiza la primera / default con `price`.
 * @param {Object} [product]
 * @returns {Object}
 */
function pricesFromProduct(product) {
  const next = {};
  if (product && product.prices && typeof product.prices === "object") {
    Object.keys(product.prices).forEach((code) => {
      const n = Number(product.prices[code]);
      if (Number.isFinite(n)) next[String(code).toUpperCase()] = n;
    });
  }
  const price = Number(product && product.price);
  if (Number.isFinite(price)) {
    const keys = Object.keys(next);
    const code = keys[0] || getDefaultCurrencyCode();
    next[code] = price;
  }
  return next;
}

/**
 * Crea o actualiza la fila de stock del PV para un producto (HU16+).
 * Con catálogo puro (HU18): overrides / fila existente tienen prioridad sobre el producto.
 *
 * @param {Object} product
 * @param {string} [storeId]
 * @param {Object} [overrides={}] quantity, um, prices, umbrales
 * @returns {Promise<Object|null>} fila guardada, o null si falta product/store
 */
async function upsertStockForProduct(product, storeId, overrides) {
  if (!product || !product.id) return null;

  let resolvedStoreId = storeId;
  if (!resolvedStoreId && typeof getCurrentStoreId === "function") {
    resolvedStoreId = getCurrentStoreId();
  }
  if (!resolvedStoreId) return null;

  const extra = overrides && typeof overrides === "object" ? overrides : {};
  const existing = await getStockByStoreAndProduct(resolvedStoreId, product.id);

  const pickUm = () => {
    if (extra.um != null) return extra.um;
    if (product.um != null && String(product.um) !== "") return product.um;
    if (existing && existing.um != null) return existing.um;
    return "";
  };
  const pickQty = () => {
    if (extra.quantity != null) return Number(extra.quantity) || 0;
    if (product.quantity != null && product.quantity !== "") {
      return Number(product.quantity) || 0;
    }
    if (existing) return Number(existing.quantity) || 0;
    return 0;
  };
  const pickThreshold = (key) => {
    if (extra[key] != null) return Number(extra[key]) || 0;
    if (product[key] != null && product[key] !== "") {
      return Number(product[key]) || 0;
    }
    if (existing && existing[key] != null) return Number(existing[key]) || 0;
    return 0;
  };
  const pickPrices = () => {
    if (extra.prices && typeof extra.prices === "object") return extra.prices;
    const fromProduct = pricesFromProduct(product);
    if (fromProduct && Object.keys(fromProduct).length) return fromProduct;
    if (existing && existing.prices && typeof existing.prices === "object") {
      return existing.prices;
    }
    return {};
  };

  const payload = {
    storeId: resolvedStoreId,
    productId: product.id,
    um: pickUm(),
    quantity: pickQty(),
    lowStockThreshold: pickThreshold("lowStockThreshold"),
    criticalStockThreshold: pickThreshold("criticalStockThreshold"),
    prices: pickPrices(),
  };

  if (existing && existing.id) {
    return saveStock({ ...existing, ...payload, id: existing.id });
  }
  return saveStock(createStock(payload));
}

/**
 * Precio principal para UI (primera moneda de stock.prices, o product.price).
 * @param {Object|null} stock
 * @param {Object|null} [product]
 * @returns {number}
 */
function primaryPriceFromStockOrProduct(stock, product) {
  if (stock && stock.prices && typeof stock.prices === "object") {
    const keys = Object.keys(stock.prices);
    if (keys.length) {
      const n = Number(stock.prices[keys[0]]);
      if (Number.isFinite(n)) return n;
    }
  }
  const legacy = Number(product && product.price);
  return Number.isFinite(legacy) ? legacy : 0;
}

/**
 * Vista UI: catálogo + fila de stock del PV (HU17).
 * Si no hay stock, usa quantity/price/um/umbrales del producto (fallback HU16).
 * @param {Object} product
 * @param {Object|null} [stock]
 * @returns {Object|null}
 */
function enrichProductWithStock(product, stock) {
  if (!product || !product.id) return null;

  const hasStock = !!(stock && stock.id);
  const quantity = hasStock
    ? Number(stock.quantity) || 0
    : Number(product.quantity) || 0;
  const um = hasStock
    ? stock.um != null && String(stock.um) !== ""
      ? stock.um
      : product.um || ""
    : product.um || "";
  const lowStockThreshold = hasStock
    ? Number(stock.lowStockThreshold) || 0
    : Number(product.lowStockThreshold) || 0;
  const criticalStockThreshold = hasStock
    ? Number(stock.criticalStockThreshold) || 0
    : Number(product.criticalStockThreshold) || 0;
  const prices =
    hasStock && stock.prices && typeof stock.prices === "object"
      ? stock.prices
      : product.prices && typeof product.prices === "object"
        ? product.prices
        : pricesFromProduct(product);
  const price = primaryPriceFromStockOrProduct(
    hasStock ? { prices } : null,
    product
  );

  return {
    ...product,
    quantity,
    um,
    lowStockThreshold,
    criticalStockThreshold,
    price,
    prices,
    stockId: hasStock ? stock.id : null,
    storeId: hasStock ? stock.storeId : null,
  };
}

/**
 * Productos del catálogo enriquecidos con stock del PV.
 * @param {string} [storeId]
 * @returns {Promise<Object[]>}
 */
async function getProductsWithStockForStore(storeId) {
  let resolved = storeId;
  if (!resolved && typeof getCurrentStoreId === "function") {
    resolved = getCurrentStoreId();
  }

  const products =
    typeof getAllProducts === "function" ? await getAllProducts() : [];
  if (!Array.isArray(products) || products.length === 0) return [];

  const stockList = resolved ? await getStockByStoreId(resolved) : [];
  const byProductId = new Map();
  (stockList || []).forEach((s) => {
    if (s && s.productId) byProductId.set(s.productId, s);
  });

  return products
    .map((p) => enrichProductWithStock(p, byProductId.get(p.id) || null))
    .filter(Boolean);
}

/**
 * Igual que getProductsWithStockForStore pero desde CACHE (sync).
 * Requiere products (+ stock si está cargado).
 * @param {string} [storeId]
 * @returns {Object[]}
 */
function getProductsWithStockFromCache(storeId) {
  let resolved = storeId;
  if (!resolved && typeof getCurrentStoreId === "function") {
    resolved = getCurrentStoreId();
  }

  const products =
    typeof CACHE !== "undefined" && Array.isArray(CACHE.products)
      ? CACHE.products
      : [];
  if (!products.length) return [];

  const stockAll =
    typeof CACHE !== "undefined" && Array.isArray(CACHE.stock)
      ? CACHE.stock
      : [];
  const stockList = resolved
    ? stockAll.filter((s) => s && s.storeId === resolved)
    : [];
  const byProductId = new Map();
  stockList.forEach((s) => {
    if (s && s.productId) byProductId.set(s.productId, s);
  });

  return products
    .map((p) => enrichProductWithStock(p, byProductId.get(p.id) || null))
    .filter(Boolean);
}

/**
 * Un producto enriquecido con stock del PV (async).
 * @param {string} productId
 * @param {string} [storeId]
 * @returns {Promise<Object|null>}
 */
async function getEnrichedProductById(productId, storeId) {
  if (!productId) return null;
  let product =
    typeof getProductFromCache === "function"
      ? getProductFromCache(productId)
      : null;
  if (!product && typeof getProductById === "function") {
    product = await getProductById(productId);
  }
  if (!product?.id) return null;

  let resolved = storeId;
  if (!resolved && typeof getCurrentStoreId === "function") {
    resolved = getCurrentStoreId();
  }
  const stock = resolved
    ? await getStockByStoreAndProduct(resolved, productId)
    : null;
  return enrichProductWithStock(product, stock);
}
