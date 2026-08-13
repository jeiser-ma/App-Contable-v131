/**
 * Accounting repository (HU10) — contabilidad diaria.
 *
 * Clave: STG_KEYS.ACCOUNTING → CACHE → Storage
 * Schema: SCHEMAS.accounting (+ accountingProductLine, accountingExpenseLine)
 *
 * Uso:
 *   await getAccountingByDate(date);
 *   const acc = createAccounting({ date });
 *   await saveAccounting(acc);
 */
const accountingRepository = createRepository({ key: STG_KEYS.ACCOUNTING });

/** @returns {Promise<Object[]>} */
async function getAllAccounting() {
  return accountingRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getAccountingById(id) {
  return accountingRepository.getById(id);
}

/**
 * Contabilidad de una fecha para el PV (unicidad lógica date+storeId).
 * @param {string} date - YYYY-MM-DD
 * @param {string} [storeId]
 * @returns {Promise<Object|null>}
 */
async function getAccountingByDate(date, storeId) {
  if (!date) return null;
  const all = await accountingRepository.getAll();
  const target =
    storeId !== undefined
      ? storeId
      : typeof getCurrentStoreId === "function"
        ? getCurrentStoreId()
        : null;
  const matches = all.filter((a) => {
    if (!a || a.date !== date) return false;
    if (typeof belongsToCurrentStore === "function") {
      return belongsToCurrentStore(a.storeId, target);
    }
    return !target || a.storeId === target;
  });
  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

/**
 * Todos los registros de una fecha (por si hay más de uno).
 * @param {string} date
 * @returns {Promise<Object[]>}
 */
async function getAllAccountingByDate(date) {
  if (!date) return [];
  const all = await accountingRepository.getAll();
  return all.filter((a) => a && a.date === date);
}

/**
 * @param {string} storeId
 * @returns {Promise<Object[]>}
 */
async function getAccountingByStoreId(storeId) {
  if (!storeId) return [];
  const all = await accountingRepository.getAll();
  return all.filter((a) => a && a.storeId === storeId);
}

/**
 * Crea un registro de contabilidad desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createAccounting(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.accounting
      ? structuredClone(SCHEMAS.accounting)
      : {
          id: null,
          storeId: null,
          date: "",
          products: [],
          expenses: [],
          cashSales: 0,
          transferSales: 0,
          totalSales: 0,
          totalExpenses: 0,
          totalAmount: 0,
          difference: 0,
          salaryPercentage: 0,
          nominalSalary: 0,
          realSalary: 0,
          closed: false,
          createdAt: null,
          closedAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const accounting = { ...base, ...data };

  if (!accounting.id) accounting.id = crypto.randomUUID();
  if (!accounting.createdAt) accounting.createdAt = new Date().toISOString();
  if (!Array.isArray(accounting.products)) accounting.products = [];
  if (!Array.isArray(accounting.expenses)) accounting.expenses = [];
  if (
    accounting.storeId == null &&
    typeof getCurrentStoreId === "function"
  ) {
    accounting.storeId = getCurrentStoreId();
  }

  return accounting;
}

/**
 * @param {Object} accounting
 * @returns {Promise<Object>}
 */
async function saveAccounting(accounting) {
  if (!accounting || !accounting.id) {
    throw new Error(
      "[accounting.repository] saveAccounting: id es obligatorio"
    );
  }
  return accountingRepository.upsert(accounting);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllAccounting(list) {
  return accountingRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteAccounting(id) {
  return accountingRepository.removeById(id);
}

/** @returns {Promise<void>} */
async function clearAccounting() {
  return accountingRepository.clear();
}
