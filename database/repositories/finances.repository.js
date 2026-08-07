/**
 * Finances repository (HU12) — finanzas diarias (multi-PV en stores[]).
 *
 * Clave: STG_KEYS.FINANCES → CACHE → Storage
 * Schema: SCHEMAS.finance (+ financeStoreEntry, financeFlowItem)
 *
 * Uso:
 *   await getFinanceByDate(date);
 *   const f = createFinance({ date });
 *   await saveFinance(f);
 */
const financesRepository = createRepository({ key: STG_KEYS.FINANCES });

/** @returns {Promise<Object[]>} */
async function getAllFinances() {
  return financesRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getFinanceById(id) {
  return financesRepository.getById(id);
}

/**
 * Finanzas de una fecha (último si hay varios).
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Object|null>}
 */
async function getFinanceByDate(date) {
  if (!date) return null;
  const all = await financesRepository.getAll();
  const matches = all.filter((f) => f && f.date === date);
  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

/**
 * @param {string} date
 * @returns {Promise<Object[]>}
 */
async function getAllFinancesByDate(date) {
  if (!date) return [];
  const all = await financesRepository.getAll();
  return all.filter((f) => f && f.date === date);
}

/**
 * Crea un documento de finanzas desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createFinance(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.finance
      ? structuredClone(SCHEMAS.finance)
      : {
          id: null,
          date: "",
          stores: [],
          inputs: [],
          outputs: [],
          dailyTotals: {},
          generalTotals: {},
          createdAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const finance = { ...base, ...data };

  if (!finance.id) finance.id = crypto.randomUUID();
  if (!finance.createdAt) finance.createdAt = new Date().toISOString();
  if (!Array.isArray(finance.stores)) finance.stores = [];
  if (!Array.isArray(finance.inputs)) finance.inputs = [];
  if (!Array.isArray(finance.outputs)) finance.outputs = [];
  if (!finance.dailyTotals || typeof finance.dailyTotals !== "object") {
    finance.dailyTotals = {};
  }
  if (!finance.generalTotals || typeof finance.generalTotals !== "object") {
    finance.generalTotals = {};
  }

  return finance;
}

/**
 * @param {Object} finance
 * @returns {Promise<Object>}
 */
async function saveFinance(finance) {
  if (!finance || !finance.id) {
    throw new Error("[finances.repository] saveFinance: id es obligatorio");
  }
  return financesRepository.upsert(finance);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllFinances(list) {
  return financesRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteFinance(id) {
  return financesRepository.removeById(id);
}

/** @returns {Promise<void>} */
async function clearFinances() {
  return financesRepository.clear();
}
