/**
 * Movements repository (HU07) — acceso a datos de movimientos.
 *
 * Clave: STG_KEYS.MOVEMENTS → CACHE → Storage
 * Schema: SCHEMAS.movement
 *
 * Uso:
 *   await getAllMovements();
 *   await getMovementsByDate("2026-07-30");
 *   await getMovementsByProductId(productId);
 *   const m = createMovement({ productId, type: "IN", quantity: 10, date });
 *   await saveMovement(m);
 */
const movementsRepository = createRepository({ key: STG_KEYS.MOVEMENTS });

/** @returns {Promise<Object[]>} */
async function getAllMovements() {
  return movementsRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getMovementById(id) {
  return movementsRepository.getById(id);
}

/**
 * Movimientos de una fecha operativa (YYYY-MM-DD).
 * @param {string} date
 * @returns {Promise<Object[]>}
 */
async function getMovementsByDate(date, storeId) {
  if (!date) return [];
  const all = await movementsRepository.getAll();
  const target =
    storeId !== undefined
      ? storeId
      : typeof getCurrentStoreId === "function"
        ? getCurrentStoreId()
        : null;
  return all.filter((m) => {
    if (!m || m.date !== date) return false;
    if (typeof belongsToCurrentStore === "function") {
      return belongsToCurrentStore(m.storeId, target);
    }
    return !target || m.storeId === target;
  });
}

/**
 * Movimientos de un producto.
 * @param {string} productId
 * @returns {Promise<Object[]>}
 */
async function getMovementsByProductId(productId) {
  if (!productId) return [];
  const all = await movementsRepository.getAll();
  return all.filter((m) => m && m.productId === productId);
}

/**
 * Movimientos de un punto de venta (multi-PV).
 * @param {string} storeId
 * @returns {Promise<Object[]>}
 */
async function getMovementsByStoreId(storeId) {
  if (!storeId) return [];
  const all = await movementsRepository.getAll();
  return all.filter((m) => m && m.storeId === storeId);
}

/**
 * Crea un movimiento desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createMovement(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.movement
      ? structuredClone(SCHEMAS.movement)
      : {
          id: null,
          storeId: null,
          productId: null,
          type: "",
          quantity: 0,
          date: "",
          note: "",
          createdAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const movement = { ...base, ...data };

  if (!movement.id) movement.id = crypto.randomUUID();
  if (!movement.createdAt) movement.createdAt = new Date().toISOString();
  if (
    movement.storeId == null &&
    typeof getCurrentStoreId === "function"
  ) {
    movement.storeId = getCurrentStoreId();
  }

  return movement;
}

/**
 * @param {Object} movement
 * @returns {Promise<Object>}
 */
async function saveMovement(movement) {
  if (!movement || !movement.id) {
    throw new Error("[movements.repository] saveMovement: movement.id es obligatorio");
  }
  return movementsRepository.upsert(movement);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllMovements(list) {
  return movementsRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteMovement(id) {
  return movementsRepository.removeById(id);
}

/** @returns {Promise<void>} */
async function clearMovements() {
  return movementsRepository.clear();
}
