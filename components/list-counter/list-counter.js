
/**
 * Configura y muestra los controles del módulo
 * @param {number} current - Cantidad actual
 * @param {number} total - Cantidad total
 * @param {string} label - Etiqueta del contador
 * @returns {void}
 */
function updateListCounter(current, total, moduleName) {
  // Obtener el label desde la configuración de la página
  let label = moduleName ? getModuleConfig(moduleName).title : "elementos";
  setLabelText(ID_CONTROL_LIST_COUNTER, `${current} de ${total} ${label}`);

}




// ===============================
// ELIMINAR
// ===============================

/**
 * Actualiza el contador del módulo desde los datos
 * @returns {Promise<void>}
 */
async function updateModuleCounterFromData() {
  if (!currentModule) return;
  const config = MODULES_CONFIG[currentModule];
  if (!config) return;

  const counter = document.getElementById(ID_CONTROL_LIST_COUNTER);
  if (!counter) return;

  // Obtener datos según el módulo
  let data = [];
  if (currentModule === PAGE_PRODUCTS) {
    data = CACHE.products || [];
  } else if (currentModule === PAGE_MOVEMENTS) {
    data = isCacheLoaded(STG_KEYS.MOVEMENTS)
      ? (CACHE.movements || [])
      : await getAllMovements();
  } else if (currentModule === PAGE_INVENTORY) {
    data = isCacheLoaded(STG_KEYS.INVENTORY)
      ? (CACHE.inventory || [])
      : await getAllInventory();
  } else if (currentModule === PAGE_EXPENSES) {
    data = isCacheLoaded(STG_KEYS.EXPENSES)
      ? (CACHE.expenses || [])
      : await getAllExpenses();
  } else if (currentModule === PAGE_STORES) {
    data = isCacheLoaded(STG_KEYS.STORES)
      ? (CACHE.stores || [])
      : await getAllStores();
  }

  // Por ahora mostrar total, luego se actualizará con el render
  counter.textContent = `0 de ${data.length} ${config.counterLabel}`;
}


/**
 * Actualiza el contador del módulo
 * @param {number} current - Cantidad actual
 * @param {number} total - Cantidad total
 * @returns {void}
 */
function updateListCounte111(current, total) {
  if (!currentModule) return;
  const config = MODULES_CONFIG[currentModule];
  if (!config) return;

  const counter = document.getElementById("moduleCounter");
  if (counter) {
    counter.textContent = `${current} de ${total} ${config.counterLabel}`;
  }
}
