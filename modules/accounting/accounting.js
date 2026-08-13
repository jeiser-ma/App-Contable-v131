// ===============================
// Accounting - App Contable
// ===============================

//#region Constants
// ids de listas de productos
const ID_ACCOUNTING_PRODUCTS_LIST = "accountingProductsList";
// ids de alerta de inventario faltante
const ID_ALERT_MISSING_INVENTORY = "alertMissingInventory";
const ID_BTN_GO_TO_INVENTORY = "btnGoToInventory";
// ids de template de productos
const ID_ACCOUNTING_PRODUCT_CARD_TEMPLATE = "accountingProductCardTemplate";
const CLASS_ACCOUNTING_PRODUCT_NAME = "accounting-product-name";
const CLASS_ACCOUNTING_PRODUCT_YESTERDAY_STOCK = "accounting-product-yesterday-stock";
const CLASS_ACCOUNTING_PRODUCT_YESTERDAY_ENTRIES = "accounting-product-yesterday-entries";
const CLASS_ACCOUNTING_PRODUCT_YESTERDAY_EXITS = "accounting-product-yesterday-exits";
const CLASS_ACCOUNTING_PRODUCT_TODAY_INVENTORY = "accounting-product-today-inventory";
const CLASS_ACCOUNTING_PRODUCT_EXITS = "accounting-product-exits";
const CLASS_ACCOUNTING_PRODUCT_INVENTORY = "accounting-product-inventory";
const CLASS_ACCOUNTING_PRODUCT_SALES = "accounting-product-sales";
const CLASS_ACCOUNTING_PRODUCT_MISSING_INVENTORY_WARNING = "missing-inventory-warning";
const CLASS_ACCOUNTING_PRODUCT_UNIT_PRICE = "accounting-product-unit-price";
const CLASS_ACCOUNTING_PRODUCT_TOTAL_AMOUNT = "accounting-product-total-amount";

// ids de listas de gastos
const ID_ACCOUNTING_EXPENSES_LIST = "accountingExpensesList";
// ids de alerta de gastos faltantes
const ID_ALERT_NO_EXPENSES = "alertNoExpenses";
const ID_BTN_GO_TO_EXPENSES = "btnGoToExpenses";
// ids de template de gastos
const ID_ACCOUNTING_EXPENSE_CARD_TEMPLATE = "accountingExpenseCardTemplate";
const CLASS_ACCOUNTING_EXPENSE_CONCEPT = "accounting-expense-concept";
const CLASS_ACCOUNTING_EXPENSE_AMOUNT = "accounting-expense-amount";

// ids de campos de la sección de ventas
const ID_CASH_SALES_AMOUNT = "cashSalesAmount";
const ID_TRANSFER_SALES_AMOUNT = "transferSalesAmount";
// ids de inputs de ventas en efectivo y transferencia
const ID_CASH_SALES_FORM = "cashSalesForm";
const ID_INPUT_CASH_SALES = "cashSalesInput";
const ID_TRANSFER_SALES_FORM = "transferSalesForm";
const ID_INPUT_TRANSFER_SALES = "transferSalesInput";
// ids de los campos de mensajes de validación de ventas en efectivo y transferencia
const ID_INVALID_FEEDBACK_CASH_SALES = "cashSalesInput-invalid-feedback";
const ID_INVALID_FEEDBACK_TRANSFER_SALES = "transferSalesInput-invalid-feedback";
// ids de botones de agregar ventas en efectivo y transferencia
const ID_BTN_ADD_CASH_SALES = "btnAddCashSales";
const ID_BTN_ADD_TRANSFER_SALES = "btnAddTransferSales";
// ids de botones de guardar ventas en efectivo y transferencia
const ID_BTN_SAVE_CASH_SALES = "btnSaveCashSales";
const ID_BTN_SAVE_TRANSFER_SALES = "btnSaveTransferSales";


// ids de botones de totales
const ID_BTN_TOTAL_AMOUNT = "btnTotalAmount";
const ID_BTN_TOTAL_EXPENSES = "btnTotalExpenses";
const ID_BTN_TOTAL_SALES = "btnTotalSales";


// ids de campos de la sección de cierre de caja
const ID_CLOSING_TOTAL_AMOUNT = "closingTotalAmount";
const ID_CLOSING_TOTAL_SALES = "closingTotalSales";
const ID_CLOSING_DIFFERENCE = "closingDifference";

// ids de campos de la sección de salarios
const ID_SALARY_PERCENTAGE = "salaryPercentage";
const ID_NOMINAL_SALARY = "nominalSalary";
const ID_SALARY_DIFFERENCE = "salaryDifference";
const ID_REAL_SALARY = "realSalary";


// id de botón de cierre de caja
const ID_BTN_CLOSE_ACCOUNTING = "btnCloseAccounting";
// id de botón de reabrir contabilidad
const ID_BTN_REOPEN_ACCOUNTING = "btnReopenAccounting";
// id de botón exportar contabilidad a CSV
const ID_BTN_EXPORT_ACCOUNTING = "btnExportAccounting";

//#endregion


// Estado de la pantalla de inventario (unificado)
const ACCOUNTING_STATE = {
  // not tiene texto de búsqueda (para el input de búsqueda)
  searchText: "",
  // filtro por fecha
  filterDate: null,
  // no tiene campo por el que se ordena
  orderBy: null,
  // no tiene dirección de ordenamiento
  orderDir: null,
  // notiene chips de filtro
  chipFiltered: null,
  // notiene ID del inventario que se va a editar
  elementToEdit: null,
  // notiene ID del inventario que se va a eliminar
  elementToDelete: null,
  // notiene tipo de inventario actual
  currentType: null,
};

// Exponer el estado globalmente para module-controls.js
window.ACCOUNTING_STATE = ACCOUNTING_STATE;

let currentAccounting = null;

/**
 * Hook que se ejecuta cuando se carga la página de contabilidad
 * @returns {void}
 */
async function onAccountingPageLoaded() {
  console.log("onAccountingPageLoaded execution");
  await loadProductsCache();

  // Cargar modales de agregar ventas
  // Cargar modal de ventas en efectivo
  await loadModal(MODAL_CASH_SALES, PAGE_ACCOUNTING);
  // Inicializar el modal de ventas en efectivo después de cargarlo
  initModalModule(MODAL_CASH_SALES);
  // Cargar modal de ventas en transferencia
  await loadModal(MODAL_TRANSFER_SALES, PAGE_ACCOUNTING);
  // Inicializar el modal después de cargarlo  
  initModalModule(MODAL_TRANSFER_SALES);

  // Configurar controles del módulo
  await setupAccountingControls();

  // Configurar botones FAB
  await setupAccountingFABs();

  // Configurar eventos de botones
  document.getElementById(ID_BTN_ADD_CASH_SALES).onclick = () => openCashSalesModal();
  document.getElementById(ID_BTN_ADD_TRANSFER_SALES).onclick = () => openTransferSalesModal();
  document.getElementById(ID_BTN_CLOSE_ACCOUNTING).onclick = () => confirmCloseAccounting();
  document.getElementById(ID_BTN_REOPEN_ACCOUNTING).onclick = () => confirmReopenAccounting();
  document.getElementById(ID_BTN_EXPORT_ACCOUNTING).onclick = () =>
    exportCurrentAccountingToCsv().catch((err) =>
      console.error("[accounting] exportCurrentAccountingToCsv", err)
    );

  // Renderizar la contabilidad
  await renderAccounting();
}

/**
 * Exporta la contabilidad del día visible a CSV
 * @returns {void}
 */
async function exportCurrentAccountingToCsv() {
  if (!currentAccounting) {
    showToast("No hay contabilidad cargada para exportar.", TOAST_COLORS.DANGER, 3);
    return;
  }

  const ok = await exportAccountingToCsv(currentAccounting, CACHE.products);
  if (ok) {
    showToast("Contabilidad exportada correctamente.", TOAST_COLORS.SUCCESS, 3);
  }
}



/**
 * Configura los controles del módulo de contabilidad
 * @returns {void}
 */
async function setupAccountingFABs() {
  // Limpiar el contenido de los botones FAB
  clearBtnFABs();

  // Configurar el botón de scroll hacia arriba
  setupBtnFAB(ID_CONTROL_BTN_FAB_UP, "bi-chevron-bar-up", "btn-primary", scrollPageTop);
  // Configurar el botón de scroll hacia abajo
  setupBtnFAB(ID_CONTROL_BTN_FAB_DOWN, "bi-chevron-bar-down", "btn-primary", scrollPageBottom);

  initializeScrollFABs(ID_CONTROL_BTN_FAB_UP, ID_CONTROL_BTN_FAB_DOWN);

}


/**
 * Configura los controles del módulo de contabilidad
 * @returns {void}
 */
async function setupAccountingControls() {
  // Limpiar el contenido de los controles del módulo
  clearModuleControlsContent();

  // Mostrar los controles del módulo
  showModuleControls();

  // Cargar el control de búsqueda
  await loadModuleControl(CONTROL_SEARCH_INPUT);
  // Configurar el control de búsqueda
  setupSearchInput(PAGE_ACCOUNTING, renderAccounting);

  // la contabilidad no tiene botón de agregar
  //await loadModuleControl(CONTROL_BTN_ADD);
  // Configurar el botón de agregar
  //setupBtnAdd(openAddAccountingModal);

  // Cargar el control de filtro de fecha
  // El filtro de fecha ya se configura en setupDateFilter con la fecha de hoy
  await loadModuleControl(CONTROL_DATE_FILTER);
  // Configurar el filtro de fecha
  setupDateFilter(PAGE_ACCOUNTING, renderAccounting);

  // la contabilidad no tiene campo de ordenamiento
  //await loadModuleControl(CONTROL_ORDER_BY);
  // Configurar el control de ordenamiento
  //setupOrderBy(PAGE_ACCOUNTING, renderAccounting);

  // cargar el control de chips filter
  await loadModuleControl(CONTROL_CHIPS_FILTER);
  // Configurar el control de chips filter
  await setupChipsFilter(PAGE_ACCOUNTING, renderAccounting);

  // Para los modulos con chips de fecha, inicializar el chip today por defecto al cargar la pagina
  //activateChip(PAGES_CONFIG[PAGE_ACCOUNTING].chips.find(chip => chip.value === "today").id, ACCOUNTING_STATE);
  await linkDateAndChipsFilters(PAGE_ACCOUNTING, CONTROL_DATE_FILTER);


  // la contabilidad no tiene control de contador de elementos
  //await loadModuleControl(CONTROL_LIST_COUNTER);
  // No es necesario configurarle comportamiento,
  // se actualizará automáticamente al renderizar la lista

  // cargar el control de limpiar filtros
  await loadModuleControl(CONTROL_BTN_CLEAR_FILTERS);
  // Configurar el control de limpiar filtros
  setupBtnClearFilters(PAGE_ACCOUNTING, renderAccounting);
}



/**
 * Renderiza la contabilidad
 * @returns {void}
 */
async function renderAccounting() {
  console.warn("renderAccounting execution, ACCOUNTING_STATE.filterDate>>>>>: " + ACCOUNTING_STATE.filterDate);

  // Cargar la contabilidad si no existe
  //if (!currentAccounting) {
  await loadAccounting();
  console.warn("accounting loaded, date>>>>>: " + currentAccounting.date);
  // }


  // Validar inventario
  const missingInventory = validateInventory();
  const alertMissingInventory = document.getElementById(ID_ALERT_MISSING_INVENTORY);
  if (alertMissingInventory) {
    alertMissingInventory.classList.toggle("d-none", !missingInventory);
    const btnGoToInv = document.getElementById(ID_BTN_GO_TO_INVENTORY);
    if (btnGoToInv) {
      btnGoToInv.onclick = () => navigateToPageWithDateFilter(PAGE_INVENTORY, currentAccounting.date);
    }
  }

  // Validar gastos
  const noExpenses = currentAccounting.totalExpenses === 0;
  const alertNoExpenses = document.getElementById(ID_ALERT_NO_EXPENSES);
  if (alertNoExpenses) {
    alertNoExpenses.classList.toggle("d-none", !noExpenses);
    const btnGoToExp = document.getElementById(ID_BTN_GO_TO_EXPENSES);
    if (btnGoToExp) {
      btnGoToExp.onclick = () => navigateToPageWithDateFilter(PAGE_EXPENSES, currentAccounting.date);
    }
  }

  // Renderizar lista de productos
  renderAccountingProducts();

  // Renderizar lista de gastos
  renderAccountingExpenses();

  // Renderizar sección de ventas
  renderSalesSection();

  // Renderizar totales
  renderTotals();

  // Renderizar sección de cierre de caja
  renderClosingSection();

  // Renderizar sección de cálculo de salario
  renderSalarySection();

  // Habilitar/deshabilitar botón de cerrar
  renderCloseButton();

  // Habilitar/deshabilitar botón de reabrir
  renderReopenButton();
}



// =======================================================
// Funciones de carga y creación de contabilidad
// =======================================================

/**
 * Indica si una contabilidad está cerrada (snapshot inmutable).
 * Tolera true booleano y formas legacy del export.
 * @param {Object|null|undefined} acc
 * @returns {boolean}
 */
function isAccountingClosed(acc) {
  if (!acc) return false;
  return acc.closed === true || acc.closed === "true" || acc.closed === 1;
}

/**
 * Carga la contabilidad del día seleccionado
 * @returns {void}
 */
async function loadAccounting() {
  currentAccounting = await getAccountingByDate(ACCOUNTING_STATE.filterDate);

  if (!currentAccounting) {
    // Crear nueva contabilidad para el día
    await createNewAccounting(ACCOUNTING_STATE.filterDate);
    await persistCurrentAccounting();
  } else if (!isAccountingClosed(currentAccounting)) {
    // Solo abiertas se recalculan. Cerradas: snapshot tal cual (import / días viejos).
    await refreshOpenAccountingData();
    await persistCurrentAccounting();
  }
  // Cerrada: no tocar products ni expenses
}



/**
 * Calcula el salario nominal de la contabilidad actual
 * Actualiza el campo nominalSalary de la contabilidad actual
 * @returns {void}
 */
async function calculateNominalSalary() {
  if (!currentAccounting) {
    return;
  }

  currentAccounting.nominalSalary = roundTo2(currentAccounting.totalAmount * currentAccounting.salaryPercentage / 100);
}

/**
 * Calcula el salario real de la contabilidad actual
 * Actualiza el campo realSalary de la contabilidad actual
 * @returns {void}
 */
async function calculateRealSalary() {
  if (!currentAccounting) {
    return;
  }

  currentAccounting.realSalary = currentAccounting.nominalSalary;
  if (currentAccounting.difference < 0) {
    // si la diferencia es negativa, el salario real es el salario nominal más la diferencia
    // se suma porque la diferencia ya es negativa 
    currentAccounting.realSalary = roundTo2(currentAccounting.nominalSalary + currentAccounting.difference);
  } else {
    currentAccounting.realSalary = roundTo2(currentAccounting.nominalSalary);
  }
}

/**
 * Crea una nueva contabilidad para una fecha
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Object} Objeto de contabilidad
 */
async function createNewAccounting(date) {
  // Construir la lista de productos de la contabilidad
  const accountingProducts = await buildAccountingProductsForDate(date);
  // Calcular el importe total de los productos
  const totalAmount = roundTo2(accountingProducts.reduce((sum, p) => sum + p.amount, 0));
  // Construir la lista de gastos de la contabilidad
  const accountingExpenses = await buildAccountingExpensesForDate(date);
  // Calcular el total de gastos
  const totalExpenses = roundTo2(accountingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0));

  // la diferencia es el total de ventas menos el importe total 
  // (incluye ventas en efectivo + transferencia + total de gastos)
  // (en una contabilidad nueva,total de ventas = total de gastos)
  const difference = roundTo2(totalExpenses - totalAmount);
  // Obtener el porcentaje de salario configurado
  const salaryPercentage = getSalaryPercentage();

  // Crear la nueva contabilidad
  currentAccounting = {
    id: crypto.randomUUID(),
    date: date,
    products: accountingProducts,
    expenses: accountingExpenses,
    cashSales: 0,
    transferSales: 0,
    totalSales: totalExpenses,
    totalExpenses: totalExpenses,
    totalAmount: totalAmount,
    difference: difference,
    salaryPercentage: salaryPercentage,
    nominalSalary: null,
    realSalary: null,
    closed: false,
    createdAt: new Date().toISOString(),
    closedAt: null
  };

  // Calcular el salario nominal
  await calculateNominalSalary();
  // Calcular el salario real
  await calculateRealSalary();
}


/**
 * Actualiza products y expenses de la contabilidad actual con datos actuales.
 * Actualiza total de gastos, importe total, total de ventas y diferencia.
 * Solo debe llamarse cuando la contabilidad no está cerrada.
 * @returns {void}
 */
async function refreshOpenAccountingData() {
  if (!currentAccounting || isAccountingClosed(currentAccounting)) return;

  currentAccounting.products = await buildAccountingProductsForDate(currentAccounting.date);
  currentAccounting.expenses = await buildAccountingExpensesForDate(currentAccounting.date);

  //Actualizar total de gastos
  currentAccounting.totalExpenses = roundTo2(currentAccounting.expenses.reduce((sum, e) => sum + (e.amount || 0), 0));
  // Actualizar total de ventas (incluye ventas en efectivo + transferencia + gastos)
  currentAccounting.totalSales = roundTo2(currentAccounting.cashSales + currentAccounting.transferSales + currentAccounting.totalExpenses);

  // Actualizar importe total (suma de los productos de la contabilidad actual)
  currentAccounting.totalAmount = roundTo2(currentAccounting.products.reduce((sum, p) => sum + p.amount, 0));
  // Actualizar diferencia (importe total - total de ventas)
  currentAccounting.difference = roundTo2(currentAccounting.totalSales - currentAccounting.totalAmount);

  // Actualizar el porcentaje de salario a partir del porcentaje de salario configurado
  currentAccounting.salaryPercentage = getSalaryPercentage();
  // Actualizar salario nominal
  await calculateNominalSalary();
  // Actualizar salario real
  await calculateRealSalary();
}


/**
 * Construye la lista de productos de contabilidad para una fecha.
 *
 * Contabilidad CERRADA: devuelve el snapshot guardado sin filtrar ni recalcular
 * (importaciones / historial deben verse completos).
 *
 * Contabilidad ABIERTA o nueva: incluye producto si
 * - stock inicial (inicio) > 0, o
 * - hubo movimientos de ayer, o
 * - sin cierre previo y quantity > 0 en catálogo, o
 * - ya estaba en el snapshot abierto de ese día (preserva importados/legado
 *   al refrescar, recalculando cifras pero sin borrar filas importadas de golpe).
 *
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Array} Lista de productos de contabilidad
 */
async function buildAccountingProductsForDate(date) {
  const yesterday = getYesterday(date);
  const allAccounting = isCacheLoaded(STG_KEYS.ACCOUNTING)
    ? (CACHE.accounting || [])
    : await getAllAccounting();
  const accounting =
    (Array.isArray(allAccounting)
      ? allAccounting.find((a) => a.date === date)
      : null) ||
    (currentAccounting && currentAccounting.date === date
      ? currentAccounting
      : null);

  // Snapshot congelado: cerrada = todo lo que ya tiene, sin filtrar
  if (isAccountingClosed(accounting)) {
    return Array.isArray(accounting.products)
      ? accounting.products.slice()
      : [];
  }

  const products = CACHE.products || [];
  const movements = isCacheLoaded(STG_KEYS.MOVEMENTS)
    ? (CACHE.movements || [])
    : await getAllMovements();
  const inventory = isCacheLoaded(STG_KEYS.INVENTORY)
    ? (CACHE.inventory || [])
    : await getAllInventory();
  const lastAccounting = await getLastAccounting(date);

  // Productos ya en contabilidad abierta de este día (import / estado previo)
  const existingSnapshot = Array.isArray(accounting?.products)
    ? accounting.products
    : [];
  const existingByProductId = new Map(
    existingSnapshot
      .filter((p) => p && p.productId)
      .map((p) => [p.productId, p])
  );

  // Catálogo + ids que solo estaban en el snapshot (por si faltan en products)
  const catalogById = new Map(products.map((p) => [p.id, p]));
  const idsToBuild = new Set([
    ...products.map((p) => p.id),
    ...existingByProductId.keys(),
  ]);

  const result = [];

  idsToBuild.forEach((productId) => {
    const product = catalogById.get(productId) || { id: productId, price: 0 };

    let inicio = 0;
    if (lastAccounting) {
      const lastAccProduct = (lastAccounting.products || []).find(
        (p) => p.productId === productId
      );
      if (lastAccProduct) {
        inicio = Number(lastAccProduct.todayInventory) || 0;
      }
    }

    const yesterdayEntries = movements
      .filter(
        (m) =>
          m.date === yesterday &&
          m.type === MOVEMENTS_TYPES.IN &&
          m.productId === productId
      )
      .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

    const yesterdayExits = movements
      .filter(
        (m) =>
          m.date === yesterday &&
          m.type === MOVEMENTS_TYPES.OUT &&
          m.productId === productId
      )
      .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

    const hasOpeningStock = inicio > 0;
    const hasYesterdayMovements =
      yesterdayEntries > 0 || yesterdayExits > 0;
    const bootstrapFromCatalog =
      !lastAccounting && (Number(product.quantity) || 0) > 0;
    // Mantener filas que ya venían en el snapshot abierto (export importado)
    const wasInOpenSnapshot = existingByProductId.has(productId);

    if (
      !hasOpeningStock &&
      !hasYesterdayMovements &&
      !bootstrapFromCatalog &&
      !wasInOpenSnapshot
    ) {
      return;
    }

    const todayInventory = inventory.find(
      (inv) =>
        inv.date === date &&
        inv.productId === productId &&
        ["CONFIRMED", "CLOSED"].includes(inv.status)
    );
    let fin = null;
    if (todayInventory) {
      fin =
        (Number(todayInventory.warehouseQuantity) || 0) +
        (Number(todayInventory.storeQuantity) || 0);
    }

    const sales =
      fin !== null
        ? inicio + yesterdayEntries - yesterdayExits - fin
        : null;

    const unitPrice = roundTo2(product.price || 0);
    const amount =
      sales !== null ? roundTo2(sales * (product.price || 0)) : 0;

    result.push({
      productId,
      yesterdayStock: inicio,
      yesterdayEntries,
      yesterdayExits,
      todayInventory: fin,
      sales,
      unitPrice,
      amount,
    });
  });

  return result;
}


/**
 * Obtiene la última contabilidad cerrada anterior a una fecha de referencia.
 * Si no se pasa fecha, usa la más reciente cerrada en general.
 * @param {string} [beforeDate] - YYYY-MM-DD; solo se consideran cierres con date < beforeDate
 * @returns {Object|null} Contabilidad cerrada o null
 */
async function getLastAccounting(beforeDate) {
  const allAccounting = isCacheLoaded(STG_KEYS.ACCOUNTING)
    ? (CACHE.accounting || [])
    : await getAllAccounting();

  let closedAccountings = allAccounting.filter((a) => a.closed === true);

  if (beforeDate) {
    closedAccountings = closedAccountings.filter((a) => a.date < beforeDate);
  }

  // Si no hay contabilidades cerradas, retornar null
  if (closedAccountings.length === 0) {
    return null;
  }

  // Encontrar la contabilidad con la fecha más reciente
  let lastAccounting = closedAccountings[0];
  closedAccountings.forEach((accounting) => {
    const accountingDate = new Date(accounting.date + "T00:00:00");
    const lastAccountingDate = new Date(lastAccounting.date + "T00:00:00");
    if (accountingDate > lastAccountingDate) {
      lastAccounting = accounting;
    }
  });

  return lastAccounting;
}


/**
 * Construye la lista de gastos de contabilidad para una fecha (gastos del día anterior)
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Array} Lista de gastos (snapshot)
 */
async function buildAccountingExpensesForDate(date) {
  const yesterday = getYesterday(date);
  const expenses = isCacheLoaded(STG_KEYS.EXPENSES)
    ? (CACHE.expenses || [])
    : await getAllExpenses();

  let expensesForDate = expenses.filter(e => e.date === yesterday).map(e => ({ ...e }));
  return expensesForDate;
}




/**
 * Valida que todos los productos tengan inventario
 * @returns {boolean} true si faltan productos sin inventario
 */
function validateInventory() {
  if (!currentAccounting) return false;

  return currentAccounting.products.some(p => {
    // Verificar si el inventario es null, undefined o si no hay inventario confirmado para hoy
    return p.todayInventory === null || p.todayInventory === undefined;
  });
}




// =======================================================
// Funciones de renderización de la contabilidad
// =======================================================

/**
 * Renderiza la lista de productos de contabilidad.
 * Fuente única: currentAccounting.products (ya filtrada al construir/guardar).
 * Solo se aplica el filtro de búsqueda; no se re-filtra por stock del catálogo.
 * @returns {void}
 */
async function renderAccountingProducts() {
  if (!currentAccounting) {
    console.error("contabilidad no encontrada");
    return;
  }

  // Obtener la lista de productos del DOM
  const list = document.getElementById(ID_ACCOUNTING_PRODUCTS_LIST);

  // Validar que existan la lista de productos, el template y la contabilidad
  if (!list) {
    console.error("lista de productos no encontrada");
    return;
  }

  // Limpiar la lista
  list.replaceChildren();

  // Filtro opcional por texto de búsqueda (nombre); el resto ya está en products[]
  let filteredProducts = filterAccountingProducts(currentAccounting.products || []);

  filteredProducts.forEach(async (accountingProd) => {
    const newProductCard = await createProductCardFromTemplate(accountingProd);

    if (!newProductCard) {
      console.warn(
        "No se pudo crear card de contabilidad para productId:",
        accountingProd?.productId
      );
      return;
    }

    list.appendChild(newProductCard);
  });
}


// ===============================
// Filtrado de productos
// ===============================

/**
 * Filtra productos usando los criterios de ACCOUNTING_STATE
 * @param {Array} products - Lista de productos a filtrar
 * @returns {Array} Lista de productos filtrados
 */
function filterAccountingProducts(accountingProducts) {
  let filtered = Array.isArray(accountingProducts)
    ? [...accountingProducts]
    : [];

  // Filtro por texto de búsqueda (nombre del producto)
  if (ACCOUNTING_STATE.searchText) {
    const q = ACCOUNTING_STATE.searchText.toLowerCase();
    filtered = filtered.filter((ap) => {
      const product = (CACHE.products || []).find((p) => p.id === ap.productId);
      // Sin catálogo: se puede buscar por fragmento de id
      const name = (product?.name || ap.productId || "").toLowerCase();
      return name.includes(q);
    });
  }

  return filtered;
}


/**
 * Crea una tarjeta de producto desde el template.
 * Usa el catálogo para el nombre; si no está (import / producto borrado),
 * igual renderiza la fila con nombre de respaldo (snapshot de contabilidad).
 * @param {Object} accountingProd - Línea de contabilidad
 * @returns {HTMLElement|undefined} Fragmento del template o undefined si no hay template
 */
async function createProductCardFromTemplate(accountingProd) {
  const template = document.getElementById(ID_ACCOUNTING_PRODUCT_CARD_TEMPLATE);
  if (!template) {
    console.error("template de producto no encontrado");
    return;
  }

  if (!accountingProd || !accountingProd.productId) {
    console.warn("Línea de contabilidad sin productId");
    return;
  }

  const prod =
    (typeof getProductFromCache === "function"
      ? getProductFromCache(accountingProd.productId)
      : null) ||
    (CACHE.products || []).find((p) => p.id === accountingProd.productId);

  const displayName =
    (prod && prod.name) ||
    `Producto (${String(accountingProd.productId).slice(0, 8)}…)`;

  const clonedTemplate = template.content.cloneNode(true);

  clonedTemplate.querySelector("." + CLASS_ACCOUNTING_PRODUCT_NAME).textContent =
    displayName;
  clonedTemplate.querySelector(
    "." + CLASS_ACCOUNTING_PRODUCT_YESTERDAY_STOCK
  ).textContent = accountingProd.yesterdayStock;
  clonedTemplate.querySelector(
    "." + CLASS_ACCOUNTING_PRODUCT_YESTERDAY_ENTRIES
  ).textContent = accountingProd.yesterdayEntries;
  clonedTemplate.querySelector(
    "." + CLASS_ACCOUNTING_PRODUCT_YESTERDAY_EXITS
  ).textContent = accountingProd.yesterdayExits;
  clonedTemplate
    .querySelector("." + CLASS_ACCOUNTING_PRODUCT_MISSING_INVENTORY_WARNING)
    .classList.toggle(
      "d-none",
      accountingProd.todayInventory !== null &&
        accountingProd.todayInventory !== undefined
    );
  clonedTemplate.querySelector(
    "." + CLASS_ACCOUNTING_PRODUCT_TODAY_INVENTORY
  ).textContent =
    accountingProd.todayInventory === null ||
    accountingProd.todayInventory === undefined
      ? "--"
      : accountingProd.todayInventory;
  clonedTemplate.querySelector(
    "." + CLASS_ACCOUNTING_PRODUCT_SALES
  ).textContent =
    accountingProd.sales === null || accountingProd.sales === undefined
      ? "--"
      : accountingProd.sales;

  clonedTemplate.querySelector(
    "." + CLASS_ACCOUNTING_PRODUCT_UNIT_PRICE
  ).textContent = formatTo2(accountingProd.unitPrice);
  clonedTemplate.querySelector(
    "." + CLASS_ACCOUNTING_PRODUCT_TOTAL_AMOUNT
  ).textContent = formatTo2(accountingProd.amount);

  return clonedTemplate;
}


/**
 * Renderiza la lista de gastos
 * @returns {void}
 */
function renderAccountingExpenses() {
  // Obtener el elemento <template> del DOM de la tarjeta de gasto
  const template = document.getElementById(ID_ACCOUNTING_EXPENSE_CARD_TEMPLATE);

  // Obtener la lista de gastos del DOM
  const list = document.getElementById(ID_ACCOUNTING_EXPENSES_LIST);
  //console.error("lista de gastos antes de renderizar: ", list);

  // Validar que existan la lista de gastos, el template y la contabilidad
  if (!list) {
    console.error("lista de gastos no encontrada");
    return;
  }
  if (!template) {
    console.error("template de gasto no encontrado");
    return;
  }
  if (!currentAccounting) {
    console.error("contabilidad no encontrada");
    return;
  }

  // Usar gastos guardados en la contabilidad; si no existen (contabilidades antiguas), usar gastos de ayer
  // let expensesToShow = [];
  // if (Array.isArray(currentAccounting.expenses) && currentAccounting.expenses.length > 0) {
  //   expensesToShow = currentAccounting.expenses;
  // } else {
  //   const yesterday = getYesterday(currentAccounting.date);
  //   const expenses = getData(PAGE_EXPENSES) || [];
  //   expensesToShow = expenses.filter(e => e.date === yesterday);
  // }

  list.replaceChildren();

  // expensesToShow.forEach(async expense => {
  currentAccounting.expenses.forEach(async expense => {

    // crear una copia del template
    const clonedTemplate = template.content.cloneNode(true);

    // crear la tarjeta de gasto
    const newExpenseCard = await createExpenseCardFromTemplate(clonedTemplate, expense);

    if (!newExpenseCard) {
      console.error(`No se pudo crear el new expense card con id: ${expense.concept}`);
      return;
    }

    list.appendChild(newExpenseCard);
    console.log("new expense card creado correctamente: ", expense.concept);
  });
}


/**
 * Crea una nueva tarjeta de gasto desde el template
 * @param {HTMLElement} clonedTemplate - Template de la tarjeta de producto
 * @param {Object} expense - Gasto a crear la tarjeta
 * @returns {HTMLElement} Tarjeta de gasto creada
 */
async function createExpenseCardFromTemplate(clonedTemplate, expense) {
  clonedTemplate.querySelector("." + CLASS_ACCOUNTING_EXPENSE_CONCEPT).textContent = expense.concept;
  clonedTemplate.querySelector("." + CLASS_ACCOUNTING_EXPENSE_AMOUNT).textContent = "-$ " + formatTo2(expense.amount);
  return clonedTemplate;
}


/**
 * Actualiza la sección de ventas
 * @returns {void}
 */
function renderSalesSection() {
  if (!currentAccounting) return;

  // Actualizar montos de ventas en efectivo
  const cashAmount = document.getElementById(ID_CASH_SALES_AMOUNT);
  if (cashAmount) {
    cashAmount.textContent = `$ ${formatTo2(currentAccounting.cashSales)}`;
  }

  // Actualizar montos de ventas por transferencia
  const transferAmount = document.getElementById(ID_TRANSFER_SALES_AMOUNT);
  if (transferAmount) {
    transferAmount.textContent = `$ ${formatTo2(currentAccounting.transferSales)}`;
  }
}


/**
 * Renderiza los totales de la contabilidad
 * @returns {void}
 */
function renderTotals() {
  if (!currentAccounting) return;

  // Importe Total 
  const btnTotalAmount = document.getElementById(ID_BTN_TOTAL_AMOUNT);
  if (btnTotalAmount) {
    btnTotalAmount.innerHTML = `Importe Total: $ ${formatTo2(currentAccounting.totalAmount)}`;
  }

  // Total de gastos
  const btnTotalExpenses = document.getElementById(ID_BTN_TOTAL_EXPENSES);
  if (btnTotalExpenses) {
    btnTotalExpenses.innerHTML = `Total Gastos: $ ${formatTo2(currentAccounting.totalExpenses)}`;
  }

  // Total de ventas (incluye ventas en efectivo + transferencia + gastos)
  const btnTotalSales = document.getElementById(ID_BTN_TOTAL_SALES);
  if (btnTotalSales) {
    btnTotalSales.innerHTML = `Total Ventas: $ ${formatTo2(currentAccounting.totalSales)}`;
  }
}


/**
 * Actualiza la sección de cierre de caja
 * @returns {void}
 */
function renderClosingSection() {
  if (!currentAccounting) return;

  const totalAmount = document.getElementById(ID_CLOSING_TOTAL_AMOUNT);
  const totalSales = document.getElementById(ID_CLOSING_TOTAL_SALES);

  // Actualizar el campo Importe Total
  if (totalAmount) {
    totalAmount.textContent = `$${formatTo2(currentAccounting.totalAmount)}`;
  }

  // Actualizar el campo de total de ventas
  if (totalSales) {
    totalSales.textContent = `$${formatTo2(currentAccounting.totalSales)}`;
  }

  // Actualizar el campo de diferencia
  formatDifferenceField(ID_CLOSING_DIFFERENCE);
}

/**
 * Actualiza la sección de cálculo de salario
 * @returns {void}
 */
function renderSalarySection() {
  if (!currentAccounting) return;

  const percentage = document.getElementById(ID_SALARY_PERCENTAGE);
  const nominal = document.getElementById(ID_NOMINAL_SALARY);
  const real = document.getElementById(ID_REAL_SALARY);

  // Actualizar el campo de porcentaje de salario
  if (percentage) {
    percentage.textContent = `${currentAccounting.salaryPercentage} %`;
  }

  // Actualizar el campo de salario nominal
  if (nominal) {
    nominal.textContent = `$ ${formatTo2(currentAccounting.nominalSalary)}`;
  }

  // Actualizar el campo de diferencia de salario
  formatDifferenceField(ID_SALARY_DIFFERENCE);

  // Actualizar el campo de salario real
  if (real) {
    real.textContent = `$ ${formatTo2(currentAccounting.realSalary)}`;
  }
}

/**
 * Actualiza el salario real
 * @returns {void}
 */
function formatDifferenceField(fieldId) {
  const field = document.getElementById(fieldId);
  if (!currentAccounting || !field) return;

  // Actualizar el texto del campo
  field.textContent = `$${formatTo2(currentAccounting.difference)}`;
  field.className = "fw-semibold";

  // Colorear según el valor
  if (currentAccounting.difference === 0) {
    field.classList.add("text-success");
  } else if (currentAccounting.difference < 0) {
    field.classList.add("text-danger");
  } else {
    field.classList.add("text-primary");
  }
}

/**
 * Actualiza el estado del botón de cerrar contabilidad
 * @returns {void}
 */
function renderCloseButton() {
  const btn = document.getElementById(ID_BTN_CLOSE_ACCOUNTING);
  if (!btn) return;

  // Mostrar/ocultar botón de cerrar
  if (isAccountingClosed(currentAccounting)) {
    btn.classList.add("d-none");
    return;
  } else {
    // Mostrar botón de cerrar
    btn.classList.remove("d-none");

    // Validar que se pueda cerrar la contabilidad
    const canClose = !validateInventory() &&
      currentAccounting.cashSales > 0 &&
      currentAccounting.transferSales > 0 &&
      !isAccountingClosed(currentAccounting);
    // Deshabilitar/habilitar botón de cerrar
    btn.disabled = !canClose;
  }

}

/**
 * Actualiza el estado del botón de reabrir contabilidad
 * @returns {void}
 */
function renderReopenButton() {
  const btn = document.getElementById(ID_BTN_REOPEN_ACCOUNTING);
  if (!btn) return;

  btn.classList.toggle("d-none", !isAccountingClosed(currentAccounting));
}

/**
 * Abre el modal de ventas en efectivo
 * @returns {void}
 */
function openCashSalesModal() {
  // Inicializar el modal de ventas en efectivo
  initModalModule(MODAL_CASH_SALES);
  // Configurar el header del modal
  setModalHeader(MODAL_CASH_SALES, false);

  // Limpiar errores anteriores del input
  clearInputError(ID_INPUT_CASH_SALES);
  // Establecer el valor del input
  setInputValue(ID_INPUT_CASH_SALES, currentAccounting.cashSales != null && currentAccounting.cashSales !== "" ? formatTo2(currentAccounting.cashSales) : "");

  // Mostrar el modal
  showModalModules();
}

/**
 * Abre el modal de ventas por transferencia
 * @returns {void}
 */
function openTransferSalesModal() {
  // Inicializar el modal de ventas por transferencia
  initModalModule(MODAL_TRANSFER_SALES);
  // Configurar el header del modal
  setModalHeader(MODAL_TRANSFER_SALES, false);

  // Limpiar errores anteriores del input
  clearInputError(ID_INPUT_TRANSFER_SALES);
  // Establecer el valor del input
  setInputValue(ID_INPUT_TRANSFER_SALES, currentAccounting.transferSales != null && currentAccounting.transferSales !== "" ? formatTo2(currentAccounting.transferSales) : "");

  // Mostrar el modal
  showModalModules();
}

/**
 * Guarda las ventas en efectivo
 * @returns {void}
 */
function saveCashSales() {
  saveSalesGeneric(ID_INPUT_CASH_SALES).catch((err) =>
    console.error("[accounting] saveCashSales", err)
  );
}

/**
 * Guarda las ventas por transferencia
 * @returns {void}
 */
function saveTransferSales() {
  saveSalesGeneric(ID_INPUT_TRANSFER_SALES).catch((err) =>
    console.error("[accounting] saveTransferSales", err)
  );
}

/**
 * Función genérica para guardar las ventas por transferencia o en efectivo
 * @param {string} inputId - ID del campo de entrada
 * @returns {void}
 */
async function saveSalesGeneric(inputId) {
  if (!currentAccounting) return;

  // Obtener el valor del input
  const amount = parseFloat(getInputValue(inputId));

  // Validar que sea un número válido
  if (isNaN(amount)) {
    setInputError(inputId, "Ingresá una cantidad válida");
    return;
  }

  // Validar que no sea negativo
  if (amount < 0) {
    setInputError(inputId, "La cantidad debe ser mayor a 0");
    return;
  }

  // Actualizar ventas en efectivo o transferencia (guardar con 2 decimales)
  const amountRounded = roundTo2(amount);
  if (inputId === ID_INPUT_CASH_SALES) {
    currentAccounting.cashSales = amountRounded;
  } else if (inputId === ID_INPUT_TRANSFER_SALES) {
    currentAccounting.transferSales = amountRounded;
  }

  // Actualizar total de ventas (incluye ventas en efectivo + transferencia + gastos)
  currentAccounting.totalSales = roundTo2(currentAccounting.cashSales + currentAccounting.transferSales + currentAccounting.totalExpenses);

  // Guardar la contabilidad
  await persistCurrentAccounting();
  // Cerrar el modal
  hideModalModules();
  // Renderizar la contabilidad
  await renderAccounting();
}

/**
 * Persiste la contabilidad actual vía repositorio
 * @returns {Promise<void>}
 */
async function persistCurrentAccounting() {
  if (!currentAccounting) return;

  await saveAccounting(currentAccounting);
}

/**
 * Pide confirmación para reabrir la contabilidad
 * @returns {void}
 */
function confirmReopenAccounting() {
  if (!currentAccounting) return;

  openConfirmActionModal({
    title: "Reabrir contabilidad",
    message: "¿Estás seguro de reabrir la contabilidad? Podrás volver a editar inventarios y datos de este día.",
    confirmText: "Reabrir",
    confirmButtonClass: "btn-primary",
    callbackFn: () =>
      reopenAccounting().catch((err) =>
        console.error("[accounting] reopenAccounting", err)
      ),
  });
}

/**
 * Reabre la contabilidad del día.
 * 1) Marca contabilidad abierta
 * 2) Desbloquea inventarios del día (todos, no solo los de products[])
 * 3) Persiste y re-renderiza (refreshOpen recalcula products con criterio contable,
 *    no por quantity del catálogo)
 * @returns {void}
 */
async function reopenAccounting() {
  if (!currentAccounting) return;
  currentAccounting.closed = false;
  currentAccounting.closedAt = null;

  // Antes del refresh: liberar inventarios del día (si no, quedan CLOSED y no se editan)
  await changeInventoryAccountingStatus("CONFIRMED");

  await persistCurrentAccounting();
  // loadAccounting → refreshOpenAccountingData recalcula products y vuelve a guardar
  await renderAccounting();
  showToast("Contabilidad reabierta correctamente", TOAST_COLORS.SUCCESS, 3);
}

/**
 * Confirma el cierre de contabilidad
 * @returns {void}
 */
function confirmCloseAccounting() {
  if (!currentAccounting) return;

  // Validar que no haya productos sin inventario
  if (validateInventory()) {
    showToast("No se puede cerrar: faltan productos sin inventario", TOAST_COLORS.DANGER, 3);
    return;
  }

  // Validar que haya ventas en efectivo o transferencia
  if (currentAccounting.cashSales === 0 || currentAccounting.transferSales === 0) {
    showToast("No se puede cerrar: faltan ventas en efectivo o transferencia", TOAST_COLORS.DANGER, 3);
    return;
  }

  if (isAccountingClosed(currentAccounting)) {
    showToast("Esta contabilidad ya está cerrada", TOAST_COLORS.PRIMARY, 3);
    return;
  }

  openConfirmActionModal({
    title: "Cerrar contabilidad",
    message: "¿Estás seguro de cerrar la contabilidad? Se actualizará el stock de productos y no podrás editar los inventarios de esta fecha.",
    confirmText: "Cerrar contabilidad",
    confirmButtonClass: "btn-primary",
    callbackFn: () =>
      closeAccounting().catch((err) =>
        console.error("[accounting] closeAccounting", err)
      ),
  });
}

/**
 * Actualiza el stock (quantity) de cada producto con el todayInventory
 * de la contabilidad que se está cerrando. Dual-write HU16: producto + stock del PV.
 * @returns {Promise<void>}
 */
async function updateProductsAccountingStock() {
  if (!currentAccounting?.products?.length) return;

  const productsUpdated = [...CACHE.products];
  currentAccounting.products.forEach((accProduct) => {
    const product = productsUpdated.find((p) => p.id === accProduct.productId);
    if (product) {
      product.quantity = accProduct.todayInventory ?? 0;
    }
  });

  await saveAllProducts(productsUpdated);
  replaceProductsCache(productsUpdated);

  if (typeof upsertStockForProduct === "function") {
    const storeId =
      typeof getCurrentStoreId === "function" ? getCurrentStoreId() : null;
    for (const accProduct of currentAccounting.products) {
      const product = productsUpdated.find((p) => p.id === accProduct.productId);
      if (!product?.id) continue;
      await upsertStockForProduct(product, storeId, {
        quantity: product.quantity,
      });
    }
  }
}

/**
 * Cambia el estado de los inventarios ligados a la contabilidad del día.
 *
 * - Al cerrar (CLOSED): solo inventarios de products[] de la contabilidad
 *   (los del día que entraron al cierre).
 * - Al reabrir (CONFIRMED): TODOS los inventarios de esa fecha con status CLOSED.
 *   Así no quedan productos “huérfanos” bloqueados si la lista de products se
 *   recalcula o se filtró mal en un refresh anterior.
 *
 * @param {string} newStatus - "CLOSED" al cerrar, "CONFIRMED" al reabrir
 * @returns {void}
 */
async function changeInventoryAccountingStatus(newStatus) {
  if (!currentAccounting) return;
  if (newStatus !== "CONFIRMED" && newStatus !== "CLOSED") return;

  const productIds = new Set(
    (currentAccounting.products || []).map((p) => p.productId)
  );
  const inventory = (
    isCacheLoaded(STG_KEYS.INVENTORY)
      ? (CACHE.inventory || [])
      : await getAllInventory()
  ).slice();
  const isClosing = newStatus === "CLOSED";

  inventory.forEach((inv) => {
    if (inv.date !== currentAccounting.date) return;

    const status = inv.status;
    const isCurrentlyOpen = status === "CONFIRMED" || status == null;
    const isCurrentlyClosed = status === "CLOSED";

    if (isClosing) {
      // Solo productos que están en el snapshot de contabilidad
      if (!productIds.has(inv.productId)) return;
      if (isCurrentlyOpen) inv.status = "CLOSED";
    } else {
      // Reabrir: desbloquear cualquier inventario del día
      if (isCurrentlyClosed) inv.status = "CONFIRMED";
    }
  });

  await saveAllInventory(inventory);
}

/**
 * Cierra la contabilidad
 * @returns {void}
 */
async function closeAccounting() {
  if (!currentAccounting) return;

  currentAccounting.closed = true;
  currentAccounting.closedAt = new Date().toISOString();

  await updateProductsAccountingStock();
  await changeInventoryAccountingStatus("CLOSED");

  await persistCurrentAccounting();
  await renderAccounting();
  showToast("Contabilidad cerrada correctamente", TOAST_COLORS.SUCCESS, 3);
}



/**
 * Navega al módulo de inventario
 * @returns {void}
 */
function goToInventory() {
  if (typeof loadPage === "function") {
    loadPage(PAGE_INVENTORY);
  }
}

/**
 * Navega al módulo de gastos
 * @returns {void}
 */
function goToExpenses() {
  if (typeof loadPage === "function") {
    loadPage(PAGE_EXPENSES);
  }
}

// UTILIDADES
// /**
//  * Obtiene la fecha de ayer en formato YYYY-MM-DD
//  * @param {string} date - Fecha en formato YYYY-MM-DD
//  * @returns {string} Fecha de ayer
//  */
// function getYesterday(date) {
//   const d = new Date(date + "T00:00:00");
//   d.setDate(d.getDate() - 1);
//   return d.toISOString().split("T")[0];
// }





