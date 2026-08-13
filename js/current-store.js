// ===============================
// Punto de venta actual (contexto global)
// UI + persistencia. Aún no filtra pantallas ni cálculos.
// Stores: repositorio. currentStoreId: Storage (IDB) + memoria sync.
// ===============================

const ID_CURRENT_STORE_SELECT = "currentStoreSelect";

/** Copia en memoria para lecturas sync (getCurrentStoreId). Hidratar al boot. */
let currentStoreIdMem = null;

/**
 * Normaliza un id de PV a string o null
 * @param {any} id
 * @returns {string|null}
 */
function normalizeCurrentStoreId(id) {
  if (id == null || id === "") return null;
  const s = String(id).trim();
  return s || null;
}

/**
 * Hidrata currentStoreIdMem desde Storage (llamar en initAppPersistence)
 * @returns {Promise<string|null>}
 */
async function hydrateCurrentStoreIdFromStorage() {
  if (typeof getCurrentStoreIdSetting === "function") {
    currentStoreIdMem = normalizeCurrentStoreId(await getCurrentStoreIdSetting());
    return currentStoreIdMem;
  }
  currentStoreIdMem = null;
  return null;
}

/**
 * Obtiene el id del punto de venta seleccionado (sync, UI)
 * @returns {string|null}
 */
function getCurrentStoreId() {
  return currentStoreIdMem;
}

/**
 * Guarda el id del punto de venta seleccionado (memoria + Storage)
 * @param {string|null|undefined} id
 * @returns {void}
 */
function setCurrentStoreId(id) {
  currentStoreIdMem = normalizeCurrentStoreId(id);
  if (typeof saveCurrentStoreIdSetting === "function") {
    void saveCurrentStoreIdSetting(currentStoreIdMem).catch((err) =>
      console.error("[current-store] saveCurrentStoreIdSetting", err)
    );
  }
}

/**
 * Devuelve el store actual (objeto) o null
 * @returns {Promise<Object|null>}
 */
async function getCurrentStore() {
  const id = getCurrentStoreId();
  if (!id) return null;
  const store = await getStoreById(id);
  return store?.id ? store : null;
}

/**
 * Asegura un currentStoreId válido (activo si es posible).
 * Si el guardado no existe o está vacío, elige el primer store activo (o el primero).
 * @returns {Promise<string|null>}
 */
async function ensureCurrentStoreId() {
  const stores = await getAllStores();
  if (!Array.isArray(stores) || stores.length === 0) {
    setCurrentStoreId(null);
    return null;
  }

  const currentId = getCurrentStoreId();
  const current = currentId ? stores.find((s) => s.id === currentId) : null;
  if (current) return current.id;

  const firstActive = stores.find((s) => s.active !== false);
  const fallback = firstActive || stores[0];
  setCurrentStoreId(fallback.id);
  return fallback.id;
}

/**
 * Opciones del selector: activos + el actual si está inactivo
 * @returns {Promise<Array<Object>>}
 */
async function getStoresForSelector() {
  const stores = await getAllStores();
  if (!Array.isArray(stores)) return [];

  const currentId = getCurrentStoreId();
  const sorted = [...stores].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    })
  );

  return sorted.filter(
    (s) => s.active !== false || (currentId && s.id === currentId)
  );
}

/**
 * Rellena el <select> del navbar según stores y currentStoreId
 * @returns {Promise<void>}
 */
async function refreshCurrentStoreSelector() {
  const select = document.getElementById(ID_CURRENT_STORE_SELECT);
  if (!select) return;

  const selectedId = await ensureCurrentStoreId();
  const options = await getStoresForSelector();

  select.replaceChildren();

  if (options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Sin PV";
    select.appendChild(opt);
    select.disabled = true;
    select.value = "";
    return;
  }

  select.disabled = false;
  options.forEach((store) => {
    const opt = document.createElement("option");
    opt.value = store.id;
    const inactive = store.active === false ? " (inactivo)" : "";
    opt.textContent = (store.name || "Sin nombre") + inactive;
    select.appendChild(opt);
  });

  if (selectedId && options.some((s) => s.id === selectedId)) {
    select.value = selectedId;
  } else {
    select.value = options[0].id;
    setCurrentStoreId(options[0].id);
  }
}

/** Página activa del layout (para recargar al cambiar PV). */
let CURRENT_LAYOUT_PAGE = null;

/**
 * Indica si un storeId pertenece al PV actual (tras backfill, comparación estricta).
 * Sin PV actual, no filtra.
 * @param {string|null|undefined} itemStoreId
 * @param {string|null|undefined} [targetStoreId]
 * @returns {boolean}
 */
function belongsToCurrentStore(itemStoreId, targetStoreId) {
  const target =
    targetStoreId !== undefined && targetStoreId !== null
      ? normalizeCurrentStoreId(targetStoreId)
      : getCurrentStoreId();
  if (!target) return true;
  const sid = normalizeCurrentStoreId(itemStoreId);
  if (!sid) return false;
  return sid === target;
}

/**
 * Filtra una lista por storeId del PV actual (o target).
 * @param {Object[]} list
 * @param {string|null|undefined} [targetStoreId]
 * @returns {Object[]}
 */
function filterByCurrentStore(list, targetStoreId) {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => belongsToCurrentStore(item && item.storeId, targetStoreId));
}

/**
 * Asegura filas de stock en el PV actual para todo el catálogo (qty 0 si faltan).
 * Copia um/precios/umbrales de otra fila del mismo producto si existe (HU21).
 * @param {string} [storeId]
 * @returns {Promise<number>} filas creadas
 */
async function ensureStockRowsForCurrentStore(storeId) {
  const resolved =
    normalizeCurrentStoreId(storeId) ||
    getCurrentStoreId() ||
    (typeof ensureCurrentStoreId === "function"
      ? await ensureCurrentStoreId()
      : null);
  if (!resolved || typeof getAllProducts !== "function") return 0;
  if (typeof upsertStockForProduct !== "function") return 0;

  const products = await getAllProducts();
  let created = 0;
  for (const product of products) {
    if (!product?.id) continue;
    const existing =
      typeof getStockByStoreAndProduct === "function"
        ? await getStockByStoreAndProduct(resolved, product.id)
        : null;
    if (existing?.id) continue;

    let template = null;
    if (typeof getStockByProductId === "function") {
      const rows = await getStockByProductId(product.id);
      template = (rows || []).find((s) => s && s.id) || null;
    }
    await upsertStockForProduct(product, resolved, {
      quantity: 0,
      um: template?.um || "",
      lowStockThreshold: template?.lowStockThreshold ?? 0,
      criticalStockThreshold: template?.criticalStockThreshold ?? 0,
      prices:
        template?.prices && typeof template.prices === "object"
          ? { ...template.prices }
          : {},
    });
    created++;
  }
  return created;
}

/**
 * Recarga stock/caché y la página activa tras cambiar de PV (HU21).
 * @returns {Promise<void>}
 */
async function onCurrentStoreChanged() {
  try {
    await ensureStockRowsForCurrentStore();
    if (typeof loadCacheAsync === "function" && typeof STG_KEYS !== "undefined") {
      await loadCacheAsync(STG_KEYS.STOCK, { force: true });
      await loadCacheAsync(STG_KEYS.PRODUCTS, { force: true });
    }
    const page = CURRENT_LAYOUT_PAGE || PAGE_HOME;
    if (typeof loadPage === "function") {
      await loadPage(page);
    }
  } catch (err) {
    console.error("[current-store] onCurrentStoreChanged", err);
  }
}

/**
 * Inicializa el selector del navbar (opciones + change)
 * @returns {Promise<void>}
 */
async function initCurrentStoreSelector() {
  const select = document.getElementById(ID_CURRENT_STORE_SELECT);
  if (!select) return;

  await refreshCurrentStoreSelector();

  select.onchange = () => {
    const id = select.value || null;
    setCurrentStoreId(id);
    void onCurrentStoreChanged();
  };
}
