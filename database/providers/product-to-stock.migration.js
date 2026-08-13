/**
 * HU16 — Migración productos → catálogo + stock (una sola vez).
 *
 * Corre DESPUÉS de HU15 (LS → IndexedDB) dentro de initAppPersistence.
 *
 * Flujo:
 *   1) Resolver storeId (currentStoreId o primer PV)
 *   2) Por cada producto sin fila (storeId, productId), crear SCHEMAS.stock
 *      copiando um, quantity, umbrales y prices desde el producto
 *   3) Marcar flag en LS (no es dato de negocio)
 *
 * No borra quantity/price/um del producto (siguen como fallback de UI).
 *
 * Flag: localStorage["appContable.stockMigrated"] = "1"
 * No forma parte de STG_KEYS.
 *
 * Idempotente: si ya existe la fila de stock, no la pisa.
 */

const LS_STOCK_MIGRATED_FLAG = "appContable.stockMigrated";

/**
 * PV destino del backfill: currentStoreId o primer store activo.
 * @returns {Promise<string|null>}
 */
async function resolveStoreIdForStockMigration() {
  let storeId =
    typeof getCurrentStoreId === "function" ? getCurrentStoreId() : null;
  if (!storeId && typeof ensureCurrentStoreId === "function") {
    storeId = await ensureCurrentStoreId();
  }
  return storeId || null;
}

/**
 * Crea filas de stock faltantes desde campos del producto. Idempotente.
 * Pensado para el one-shot HU16 y para import de backups viejos (sin flag).
 *
 * @param {string} [storeId]
 * @returns {Promise<{ created: number, skipped: number, storeId: string|null }>}
 */
async function backfillMissingStockFromProducts(storeId) {
  const resolved =
    storeId || (await resolveStoreIdForStockMigration());
  if (!resolved) {
    return { created: 0, skipped: 0, storeId: null };
  }
  if (typeof getAllProducts !== "function" || typeof upsertStockForProduct !== "function") {
    return { created: 0, skipped: 0, storeId: resolved };
  }

  const products = await getAllProducts();
  let created = 0;
  let skipped = 0;

  for (const product of products) {
    if (!product || !product.id) continue;
    const existing =
      typeof getStockByStoreAndProduct === "function"
        ? await getStockByStoreAndProduct(resolved, product.id)
        : null;
    if (existing && existing.id) {
      skipped++;
      continue;
    }
    const saved = await upsertStockForProduct(product, resolved);
    if (saved) created++;
  }

  return { created, skipped, storeId: resolved };
}

/**
 * Copia campos de stock del producto a STG_KEYS.STOCK una sola vez.
 * Si hay productos pero aún no hay PV, no marca el flag (reintenta al próximo boot).
 *
 * @returns {Promise<{ migrated: boolean, created: number }>}
 */
async function migrateProductsToCatalogAndStock() {
  if (localStorage.getItem(LS_STOCK_MIGRATED_FLAG) === "1") {
    return { migrated: false, created: 0 };
  }

  if (typeof Storage !== "undefined" && Storage && typeof Storage.ready === "function") {
    await Storage.ready();
  }

  const products =
    typeof getAllProducts === "function" ? await getAllProducts() : [];
  const storeId = await resolveStoreIdForStockMigration();

  if (!storeId) {
    if (!Array.isArray(products) || products.length === 0) {
      localStorage.setItem(LS_STOCK_MIGRATED_FLAG, "1");
      console.info("[HU16] Sin productos ni PV; flag stockMigrated=1");
      return { migrated: true, created: 0 };
    }
    console.warn(
      "[HU16] Hay productos pero no hay PV; se reintenta en el próximo arranque"
    );
    return { migrated: false, created: 0 };
  }

  const result = await backfillMissingStockFromProducts(storeId);
  localStorage.setItem(LS_STOCK_MIGRATED_FLAG, "1");
  console.info(
    "[HU16] Migración catálogo + stock lista. Filas creadas:",
    result.created,
    "omitidas:",
    result.skipped
  );
  return { migrated: true, created: result.created };
}

/**
 * HU19 — Quita campos operativos del catálogo products (one-shot).
 * Corre DESPUÉS de HU16. No borra ni modifica las migraciones HU15/HU16.
 *
 * Flag: localStorage["appContable.catalogCleaned"] = "1"
 */
const LS_CATALOG_CLEANED_FLAG = "appContable.catalogCleaned";

/** Campos que ya no deben vivir en products */
const PRODUCT_LEGACY_FIELD_KEYS = [
  "quantity",
  "price",
  "prices",
  "um",
  "lowStockThreshold",
  "criticalStockThreshold",
  "code",
  "stockId",
  "storeId",
];

/**
 * @param {Object} product
 * @returns {boolean}
 */
function productHasLegacyOperationalFields(product) {
  if (!product) return false;
  return PRODUCT_LEGACY_FIELD_KEYS.some((k) =>
    Object.prototype.hasOwnProperty.call(product, k)
  );
}

/**
 * Idempotente: deja products solo con id/name/codes/createdAt.
 * Requiere HU16 hecha (stock ya backfilleado) para no perder qty/precio.
 *
 * @returns {Promise<{ cleaned: boolean, updated: number }>}
 */
async function stripLegacyFieldsFromProducts() {
  if (localStorage.getItem(LS_CATALOG_CLEANED_FLAG) === "1") {
    return { cleaned: false, updated: 0 };
  }

  // Esperar a que HU16 haya corrido (o no haya productos)
  if (localStorage.getItem(LS_STOCK_MIGRATED_FLAG) !== "1") {
    console.warn("[HU19] Esperando HU16 (stockMigrated) antes de limpiar catálogo");
    return { cleaned: false, updated: 0 };
  }

  if (typeof getAllProducts !== "function") {
    return { cleaned: false, updated: 0 };
  }

  const products = await getAllProducts();
  if (!Array.isArray(products)) {
    return { cleaned: false, updated: 0 };
  }

  const needsClean = products.some(productHasLegacyOperationalFields);
  if (!needsClean) {
    localStorage.setItem(LS_CATALOG_CLEANED_FLAG, "1");
    console.info("[HU19] Catálogo ya limpio; flag catalogCleaned=1");
    return { cleaned: true, updated: 0 };
  }

  if (typeof saveAllProductsAsCatalog === "function") {
    await saveAllProductsAsCatalog(products);
  } else if (typeof toCatalogProduct === "function" && typeof saveAllProducts === "function") {
    await saveAllProducts(products.map((p) => toCatalogProduct(p)).filter(Boolean));
  } else {
    return { cleaned: false, updated: 0 };
  }

  if (typeof loadCacheAsync === "function" && typeof STG_KEYS !== "undefined") {
    await loadCacheAsync(STG_KEYS.PRODUCTS, { force: true });
  }

  localStorage.setItem(LS_CATALOG_CLEANED_FLAG, "1");
  const updated = products.filter(productHasLegacyOperationalFields).length;
  console.info("[HU19] Catálogo limpio. Productos normalizados:", updated);
  return { cleaned: true, updated };
}

/**
 * HU20/HU23 — Asigna storeId faltante en colecciones operativas al PV actual.
 * Flag: localStorage["appContable.storeIdBackfilled"] = "1"
 */
const LS_STOREID_BACKFILLED_FLAG = "appContable.storeIdBackfilled";

/**
 * @param {Object[]} list
 * @param {string} storeId
 * @returns {{ list: Object[], changed: number }}
 */
function assignMissingStoreIds(list, storeId) {
  if (!Array.isArray(list) || !storeId) return { list: list || [], changed: 0 };
  let changed = 0;
  const next = list.map((item) => {
    if (!item || item.storeId) return item;
    changed++;
    return { ...item, storeId };
  });
  return { list: next, changed };
}

/**
 * One-shot: movements, expenses, inventory, accounting sin storeId → PV actual.
 * @returns {Promise<{ migrated: boolean, updated: number }>}
 */
async function backfillMissingStoreIdsOnRecords() {
  if (localStorage.getItem(LS_STOREID_BACKFILLED_FLAG) === "1") {
    return { migrated: false, updated: 0 };
  }

  let storeId =
    typeof getCurrentStoreId === "function" ? getCurrentStoreId() : null;
  if (!storeId && typeof ensureCurrentStoreId === "function") {
    storeId = await ensureCurrentStoreId();
  }
  if (!storeId) {
    console.warn("[HU20] Sin PV; storeId backfill se reintenta luego");
    return { migrated: false, updated: 0 };
  }

  let updated = 0;

  if (typeof getAllMovements === "function" && typeof saveAllMovements === "function") {
    const r = assignMissingStoreIds(await getAllMovements(), storeId);
    if (r.changed) {
      await saveAllMovements(r.list);
      updated += r.changed;
    }
  }
  if (typeof getAllExpenses === "function" && typeof saveAllExpenses === "function") {
    const r = assignMissingStoreIds(await getAllExpenses(), storeId);
    if (r.changed) {
      await saveAllExpenses(r.list);
      updated += r.changed;
    }
  }
  if (typeof getAllInventory === "function" && typeof saveAllInventory === "function") {
    const r = assignMissingStoreIds(await getAllInventory(), storeId);
    if (r.changed) {
      await saveAllInventory(r.list);
      updated += r.changed;
    }
  }
  if (typeof getAllAccounting === "function" && typeof saveAllAccounting === "function") {
    const r = assignMissingStoreIds(await getAllAccounting(), storeId);
    if (r.changed) {
      await saveAllAccounting(r.list);
      updated += r.changed;
    }
  }

  localStorage.setItem(LS_STOREID_BACKFILLED_FLAG, "1");
  console.info("[HU20] storeId backfill listo. Filas actualizadas:", updated);
  return { migrated: true, updated };
}

/**
 * HU23 — Tras import: stock faltante en todos los PV + storeId nulos.
 * @returns {Promise<void>}
 */
async function reconcileCatalogStockAfterImport() {
  if (typeof getAllStores === "function" && typeof backfillMissingStockFromProducts === "function") {
    const stores = await getAllStores();
    if (Array.isArray(stores) && stores.length) {
      for (const store of stores) {
        if (!store?.id) continue;
        await backfillMissingStockFromProducts(store.id);
        if (typeof ensureStockRowsForCurrentStore === "function") {
          await ensureStockRowsForCurrentStore(store.id);
        }
      }
    } else if (typeof getCurrentStoreId === "function") {
      await backfillMissingStockFromProducts(getCurrentStoreId());
    }
  }
  // Permitir re-backfill de storeId tras import de datos viejos
  localStorage.removeItem(LS_STOREID_BACKFILLED_FLAG);
  if (typeof backfillMissingStoreIdsOnRecords === "function") {
    await backfillMissingStoreIdsOnRecords();
  }
}
