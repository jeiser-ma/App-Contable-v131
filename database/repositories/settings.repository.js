/**
 * Settings repository — configuración global (no es un módulo de lista).
 *
 * No usa BaseRepository: las claves no son colecciones de entidades con id
 * (salvo arrays de strings). Habla solo con Storage (provider).
 *
 * Claves:
 *   STG_KEYS.UNITS
 *   STG_KEYS.CURRENCIES
 *   STG_KEYS.EXPENSE_CONCEPTS
 *   STG_KEYS.CURRENT_STORE_ID
 *
 * Deprecados (no exponer API nueva; migrar fuera):
 *   STG_KEYS.SALARY_PERCENTAGE → SCHEMAS.store.salaryPercentage / stores repo
 *   STG_KEYS.SALES_POINT → stores + currentStoreId
 *
 * Uso:
 *   const currencies = await getCurrencies();
 *   await saveCurrencies(["CUP", "USD"]);
 *   await getCurrentStoreIdSetting();
 */

/**
 * Lee una clave de settings; si no existe, defaultValue.
 * @param {string} key - STG_KEYS.*
 * @param {any} defaultValue
 * @returns {Promise<any>}
 */
async function getSetting(key, defaultValue) {
  const raw = await Storage.get(key);
  if (raw === null || raw === undefined) return defaultValue;
  return raw;
}

/**
 * Guarda una clave de settings.
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
async function saveSetting(key, value) {
  await Storage.save(key, value);
}

/** @returns {Promise<string[]>} */
async function getUnits() {
  const list = await getSetting(STG_KEYS.UNITS, []);
  return Array.isArray(list) ? list : [];
}

/**
 * @param {string[]} units
 * @returns {Promise<void>}
 */
async function saveUnits(units) {
  await saveSetting(STG_KEYS.UNITS, Array.isArray(units) ? units : []);
}

/** @returns {Promise<string[]>} catálogo; si no hay datos, persiste defaults */
async function getCurrencies() {
  await ensureCurrenciesDefaults();
  const list = await getSetting(STG_KEYS.CURRENCIES, null);
  if (!Array.isArray(list) || list.length === 0) {
    return typeof DEFAULT_CURRENCIES !== "undefined"
      ? [...DEFAULT_CURRENCIES]
      : ["CUP", "USD"];
  }
  return list;
}

/**
 * @param {string[]} currencies
 * @returns {Promise<void>}
 */
async function saveCurrencies(currencies) {
  await saveSetting(
    STG_KEYS.CURRENCIES,
    Array.isArray(currencies) ? currencies : []
  );
}

/**
 * Si no hay monedas (o lista vacía), persiste DEFAULT_CURRENCIES.
 * @returns {Promise<string[]>} catálogo resultante
 */
async function ensureCurrenciesDefaults() {
  const raw = await Storage.get(STG_KEYS.CURRENCIES);
  if (!Array.isArray(raw) || raw.length === 0) {
    const defaults =
      typeof DEFAULT_CURRENCIES !== "undefined"
        ? [...DEFAULT_CURRENCIES]
        : ["CUP", "USD"];
    await saveCurrencies(defaults);
    return defaults;
  }
  return raw;
}

/** @returns {Promise<string[]>} */
async function getExpenseConcepts() {
  const list = await getSetting(STG_KEYS.EXPENSE_CONCEPTS, []);
  return Array.isArray(list) ? list : [];
}

/**
 * @param {string[]} concepts
 * @returns {Promise<void>}
 */
async function saveExpenseConcepts(concepts) {
  await saveSetting(
    STG_KEYS.EXPENSE_CONCEPTS,
    Array.isArray(concepts) ? concepts : []
  );
}

/**
 * Id del PV seleccionado (contexto global).
 * Nota: getCurrentStoreId() en current-store.js es la API sync de UI;
 * esta función es la vía async vía Storage (repos / migración).
 * @returns {Promise<string|null>}
 */
async function getCurrentStoreIdSetting() {
  const raw = await getSetting(STG_KEYS.CURRENT_STORE_ID, null);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/**
 * @param {string|null} storeId
 * @returns {Promise<void>}
 */
async function saveCurrentStoreIdSetting(storeId) {
  if (!storeId) {
    await Storage.remove(STG_KEYS.CURRENT_STORE_ID);
    return;
  }
  await saveSetting(STG_KEYS.CURRENT_STORE_ID, String(storeId));
}
