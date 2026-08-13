/**
 * Expenses repository (HU08) — acceso a datos de gastos.
 *
 * Clave: STG_KEYS.EXPENSES → CACHE → Storage
 * Schema: SCHEMAS.expense
 *
 * Uso:
 *   await getAllExpenses();
 *   await getExpensesByDate(date);
 *   const e = createExpense({ concept, amount, date });
 *   await saveExpense(e);
 */
const expensesRepository = createRepository({ key: STG_KEYS.EXPENSES });

/** @returns {Promise<Object[]>} */
async function getAllExpenses() {
  return expensesRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getExpenseById(id) {
  return expensesRepository.getById(id);
}

/**
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Object[]>}
 */
async function getExpensesByDate(date, storeId) {
  if (!date) return [];
  const all = await expensesRepository.getAll();
  const target =
    storeId !== undefined
      ? storeId
      : typeof getCurrentStoreId === "function"
        ? getCurrentStoreId()
        : null;
  return all.filter((e) => {
    if (!e || e.date !== date) return false;
    if (typeof belongsToCurrentStore === "function") {
      return belongsToCurrentStore(e.storeId, target);
    }
    return !target || e.storeId === target;
  });
}

/**
 * @param {string} storeId
 * @returns {Promise<Object[]>}
 */
async function getExpensesByStoreId(storeId) {
  if (!storeId) return [];
  const all = await expensesRepository.getAll();
  return all.filter((e) => e && e.storeId === storeId);
}

/**
 * Crea un gasto desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createExpense(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.expense
      ? structuredClone(SCHEMAS.expense)
      : {
          id: null,
          storeId: null,
          concept: "",
          date: "",
          amount: 0,
          note: "",
          createdAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const expense = { ...base, ...data };

  if (!expense.id) expense.id = crypto.randomUUID();
  if (!expense.createdAt) expense.createdAt = new Date().toISOString();
  if (
    expense.storeId == null &&
    typeof getCurrentStoreId === "function"
  ) {
    expense.storeId = getCurrentStoreId();
  }

  return expense;
}

/**
 * @param {Object} expense
 * @returns {Promise<Object>}
 */
async function saveExpense(expense) {
  if (!expense || !expense.id) {
    throw new Error("[expenses.repository] saveExpense: expense.id es obligatorio");
  }
  return expensesRepository.upsert(expense);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllExpenses(list) {
  return expensesRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteExpense(id) {
  return expensesRepository.removeById(id);
}

/** @returns {Promise<void>} */
async function clearExpenses() {
  return expensesRepository.clear();
}
