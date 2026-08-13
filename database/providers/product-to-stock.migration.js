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
