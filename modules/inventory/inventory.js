// ===============================
// Inventory - App Contable
// ===============================

//#region Constants
const BTN_ID_CONFIRM_INVENTORY = "btnConfirmInventory";

const ID_PENDING_INVENTORY_LIST = "pendingInventoryList";
const ID_PARTIAL_INVENTORY_LIST = "partialInventoryList";
const ID_COMPLETED_INVENTORY_LIST = "completedInventoryList";
const ID_PENDING_CARD_TEMPLATE = "pendingInventoryCardTemplate";
const ID_PARTIAL_CARD_TEMPLATE = "partialInventoryCardTemplate";
const ID_COMPLETED_CARD_TEMPLATE = "completedInventoryCardTemplate";

const ID_INVENTORY_PRODUCT_LABEL = "inventoryProductLabel";
const ID_INVENTORY_PRODUCT_STOCK = "inventoryProductStock";
const ID_LOCATION_WAREHOUSE_INPUT = "locationWarehouseInput";
const ID_LOCATION_STORE_INPUT = "locationStoreInput";

//#endregion

// Estado de la pantalla de inventario (unificado)
const INVENTORY_STATE = {
  // Texto de búsqueda (para el input de búsqueda)
  searchText: "",
  // no tiene fecha de filtrado
  filterDate: null,
  // no tiene campo por el que se ordena
  orderBy: null,
  // no tiene dirección de ordenamiento
  orderDir: null,
  // Tipo de inventario filtrado (para los chips de filtro)
  chipFiltered: null, // "pending" | "partial" | "completed" | null (todos)
  // ID del inventario que se va a editar
  elementToEdit: null,
  // ID del inventario que se va a eliminar
  elementToDelete: null,
  // No tiene tipo de inventario actual
  currentType: null,
};

// Exponer el estado globalmente para module-controls.js
window.INVENTORY_STATE = INVENTORY_STATE;

/**
 * Indica si un inventario está cerrado (contabilidad de esa fecha cerrada).
 * @param {Object} [inv] - Objeto de inventario (puede ser null/undefined)
 * @returns {boolean}
 */
function isInventoryClosed(inv) {
  return inv?.status === "CLOSED";
}

// ===============================
// Hook que llama el router
// ===============================

/**
 * Hook que se ejecuta cuando se carga la página de inventario
 * Inicializa el modal, configura los controles y establece la fecha por defecto
 * @returns {void}
 */
async function onInventoryPageLoaded() {
  console.log("onInventoryPageLoaded execution");
  await loadProductsCache();

  // Establecer fecha por defecto (hoy)
  const today = new Date().toISOString().split("T")[0];
  INVENTORY_STATE.filterDate = today;

  // Cargar modal de inventario
  console.log("Loading inventory-modal");
  await loadModal(MODAL_INVENTORY, PAGE_INVENTORY);

  // Inicializar el modal después de cargarlo
  initModalModule(MODAL_INVENTORY);


  // Configurar controles del módulo
  await setupInventoryControls();

  // Configurar botón de confirmar del modal
  const btnConfirm = document.getElementById(BTN_ID_CONFIRM_INVENTORY);
  if (btnConfirm) {
    btnConfirm.onclick = () => {
      saveInventoryFromModal().catch((err) =>
        console.error("[inventory] saveInventoryFromModal", err)
      );
    };
  }

  // Renderizar la lista de inventario
  await renderInventory();
}

/**
 * Configura los controles del módulo de inventario
 * @returns {void}
 */
async function setupInventoryControls() {
  // Limpiar el contenido de los controles del módulo
  clearModuleControlsContent();

  // Mostrar los controles del módulo
  showModuleControls();

  // Cargar el control de búsqueda
  await loadModuleControl(CONTROL_SEARCH_INPUT);
  // Configurar el control de búsqueda
  setupSearchInput(PAGE_INVENTORY, renderInventory);

  // Cargar el botón de escanear código
  await loadModuleControl(CONTROL_BTN_SCAN_PRODUCT);
  setupBtnScanProduct(handleScanInventoryCode);

  // El inventario no tiene botón de agregar
  //await loadModuleControl(CONTROL_BTN_ADD);
  // Configurar el botón de agregar
  //setupBtnAdd(openAddInventoryModal);

  // Cargar el control de filtro de fecha
  // El filtro de fecha ya se configura en setupDateFilter con la fecha de hoy
  await loadModuleControl(CONTROL_DATE_FILTER);
  // Configurar el filtro de fecha
  setupDateFilter(PAGE_INVENTORY, renderInventory);

  // el inventario no tiene campo de ordenamiento
  //await loadModuleControl(CONTROL_ORDER_BY);
  // Configurar el control de ordenamiento
  //setupOrderBy(PAGE_INVENTORY, renderInventory);

  // el inventario no tiene campo de chips filter
  await loadModuleControl(CONTROL_CHIPS_FILTER);
  // Configurar el control de chips filter
  await setupChipsFilter(PAGE_INVENTORY, renderInventory);

  // Para los modulos con chips de fecha, inicializar el chip today por defecto al cargar la pagina
  await linkDateAndChipsFilters(PAGE_INVENTORY, CONTROL_DATE_FILTER);

  // el inventario no tiene control de contador de elementos
  //await loadModuleControl(CONTROL_LIST_COUNTER);
  // No es necesario configurarle comportamiento,
  // se actualizará automáticamente al renderizar la lista

  // cargar el control de limpiar filtros
  await loadModuleControl(CONTROL_BTN_CLEAR_FILTERS);
  // Configurar el control de limpiar filtros
  setupBtnClearFilters(PAGE_INVENTORY, renderInventory);
}

/**
 * Maneja el escaneo de código en inventario: si el producto existe abre el modal de inventario
 * con ese producto; si no existe muestra un toast informativo.
 * Usado por el componente btn-scan-product.
 */
function handleScanInventoryCode() {
  if (typeof openScannerModal !== "function") {
    alert("No se pudo iniciar el escáner. Comprueba que el componente scanner esté cargado.");
    return;
  }
  openScannerModal({
    onSuccess: (decodedText) => {
      const found = CACHE.products.find((p) => (p.codes || []).includes(decodedText));
      if (found) {
        openAddInventoryModal(found.id).catch((err) =>
          console.error("[inventory] openAddInventoryModal", err)
        );
      } else {
        if (typeof showToast === "function") {
          showToast("No existe un producto con el código escaneado", TOAST_COLORS.WARNING, 3);
        } else {
          alert("No existe un producto con el código escaneado");
        }
      }
    }
  });
}

/**
 * Abre el modal para realizar inventario de un producto
 * @param {string} productId - ID del producto
 * @returns {Promise<void>}
 */
async function openAddInventoryModal(productId) {

  // Obtener el producto
  const product = getProductFromCache(productId);
  if (!product) {
    console.error("Producto no encontrado");
    return;
  }

  // Definir el producto a editar
  INVENTORY_STATE.elementToEdit = productId;

  // Inicializar el modal
  initModalModule(MODAL_INVENTORY);
  // Definir el header del modal para inventario de un producto
  setModalHeader(MODAL_INVENTORY, false);

  // Mostrar nombre del producto
  setLabelText(ID_INVENTORY_PRODUCT_LABEL, product.name);

  // Mostrar stock del producto
  setLabelText(ID_INVENTORY_PRODUCT_STOCK, formatTo2(product.quantity || 0));


  // Obtener inventario existente para este producto en esta fecha (si existe)
  const date = INVENTORY_STATE.filterDate || getToday();
  const existingInventoryRaw = await getInventoryByProductAndDate(productId, date);
  const existingInventory =
    existingInventoryRaw &&
    ["CONFIRMED", "CLOSED"].includes(existingInventoryRaw.status)
      ? existingInventoryRaw
      : null;

  // Cargar valores existentes o limpiar campos
  if (existingInventory) {
    setInputValue(ID_LOCATION_WAREHOUSE_INPUT, existingInventory.warehouseQuantity != null ? formatTo2(existingInventory.warehouseQuantity) : "");
    setInputValue(ID_LOCATION_STORE_INPUT, existingInventory.storeQuantity != null ? formatTo2(existingInventory.storeQuantity) : "");
  } else {
    setInputValue(ID_LOCATION_WAREHOUSE_INPUT, "");
    setInputValue(ID_LOCATION_STORE_INPUT, "");
  }

  // Limpiar errores
  clearInventoryInputError(ID_LOCATION_WAREHOUSE_INPUT);
  clearInventoryInputError(ID_LOCATION_STORE_INPUT);

  // Mostrar el modal
  toggleModalModules();
}

/**
 * Guarda un inventario en almacenamiento (crear o actualizar por productId + date).
 * Función genérica usada desde el modal y para inventarios de stock cero.
 * @param {string} productId - ID del producto
 * @param {string} date - Fecha YYYY-MM-DD
 * @param {number|null} warehouseQuantity - Cantidad en almacén
 * @param {number|null} storeQuantity - Cantidad en tienda
 * @returns {Promise<Object|undefined>} El inventario guardado o undefined si falla
 */
async function saveInventory(productId, date, warehouseQuantity, storeQuantity) {
  const existingInv = await getInventoryByProductAndDate(productId, date);

  const finalInv = existingInv
    ? {
        ...existingInv,
        warehouseQuantity: warehouseQuantity != null ? roundTo2(warehouseQuantity) : null,
        storeQuantity: storeQuantity != null ? roundTo2(storeQuantity) : null,
        status: "CONFIRMED",
      }
    : createInventoryCount({
        productId,
        warehouseQuantity: warehouseQuantity != null ? roundTo2(warehouseQuantity) : null,
        storeQuantity: storeQuantity != null ? roundTo2(storeQuantity) : null,
        date,
        status: "CONFIRMED",
      });

  await saveInventoryCount(finalInv);

  return finalInv;
}

/**
 * Valida y obtiene las cantidades finales de almacén/tienda desde el modal.
 * Resuelve vacíos usando valores existentes si es edición.
 * @returns {{ valid: boolean, date?: string, warehouseQuantity?: number|null, storeQuantity?: number|null, productId?: string }} Resultado de validación y valores
 */
function getValidatedInventoryValuesFromModal() {

  const date = INVENTORY_STATE.filterDate || getToday();

  // Obtener valores (pueden estar vacíos)
  const warehouseValue = getInputValue(ID_LOCATION_WAREHOUSE_INPUT);
  const storeValue = getInputValue(ID_LOCATION_STORE_INPUT);

  
  // Validar que sean números válidos
  if (warehouseValue !== "" && isNaN(warehouseValue)) {
    setInputError(ID_LOCATION_WAREHOUSE_INPUT, "Ingresá un número válido", "inventoryErrorFeedback");
    return { valid: false };
  }

  if (storeValue !== "" && isNaN(storeValue)) {
    setInputError(ID_LOCATION_STORE_INPUT, "Ingresá un número válido", "inventoryErrorFeedback");
    return { valid: false };
  }

  // Validar que al menos uno tenga valor
  if (!warehouseValue && !storeValue) {
    setInputError(
      ID_LOCATION_WAREHOUSE_INPUT,
      "Ingresá al menos una cantidad (almacén o tienda)",
      "inventoryErrorFeedback"
    );
    setInputError(
      ID_LOCATION_STORE_INPUT,
      "Ingresá al menos una cantidad (almacén o tienda)",
      "inventoryErrorFeedback"
    );
    return { valid: false };
  }


  // Convertir a números (si está vacío, se manejará después) y redondear a 2 decimales
  let warehouseQuantity = warehouseValue === "" ? null : roundTo2(parseFloat(warehouseValue));
  let storeQuantity = storeValue === "" ? null : roundTo2(parseFloat(storeValue));


  // Validar que no sean negativos (solo si tienen valor)
  if (warehouseQuantity !== null && warehouseQuantity < 0) {
    setInputError(
      ID_LOCATION_WAREHOUSE_INPUT,
      "La cantidad no puede ser negativa",
      "inventoryErrorFeedback"
    );
    return { valid: false };
  }

  if (storeQuantity !== null && storeQuantity < 0) {
    setInputError(ID_LOCATION_STORE_INPUT, "La cantidad no puede ser negativa", "inventoryErrorFeedback");
    return { valid: false };
  }

  // Validar que no tengan comas (solo números enteros o decimales con punto)
  if (warehouseValue.includes(",")) {
    setInputError(
      ID_LOCATION_WAREHOUSE_INPUT,
      "Usá punto (.) en lugar de coma para decimales",
      "inventoryErrorFeedback"
    );
    return { valid: false };
  }

  if (storeValue.includes(",")) {
    setInputError(
      ID_LOCATION_STORE_INPUT,
      "Usá punto (.) en lugar de coma para decimales",
      "inventoryErrorFeedback"
    );
    return { valid: false };
  }



  // Validar que la suma no supere el stock total del producto
  const product = getProductFromCache(INVENTORY_STATE.elementToEdit);
  if (product) {
    const productStock = product.quantity || 0;
    const totalInventory =
      (warehouseQuantity ?? 0) + (storeQuantity ?? 0);
    if (totalInventory > productStock) {
      const errorMessage = `La suma (${totalInventory}) supera el stock disponible (${productStock})`;
      setInputError(ID_LOCATION_WAREHOUSE_INPUT, errorMessage, "inventoryErrorFeedback");
      setInputError(ID_LOCATION_STORE_INPUT, errorMessage, "inventoryErrorFeedback");
      return { valid: false };
    }
  }

  return {
    valid: true,
    date,
    productId: INVENTORY_STATE.elementToEdit,
    warehouseQuantity: warehouseQuantity,
    storeQuantity: storeQuantity,
  };
}

/**
 * Guarda el conteo de inventario desde el modal.
 * Valida entradas, resuelve valores y delega el guardado a saveInventory.
 * @returns {Promise<void>}
 */
async function saveInventoryFromModal() {
  const result = getValidatedInventoryValuesFromModal();
  if (!result.valid) return;

  // No permitir guardar si el inventario ya está cerrado (contabilidad cerrada)
  const existingInv = await getInventoryByProductAndDate(
    result.productId,
    result.date
  );
  if (isInventoryClosed(existingInv)) {
    showToast("No se puede editar: la contabilidad de esta fecha está cerrada", TOAST_COLORS.DANGER, 3);
    return;
  }
  
  // Guardar el inventario
  await saveInventory(result.productId, result.date, result.warehouseQuantity, result.storeQuantity);

  // Cerrar modal y actualizar vista
  hideModalModules();
  // Limpiar el elemento a editar
  INVENTORY_STATE.elementToEdit = null;
  // Renderizar la lista de inventario
  await renderInventory();
}

/**
 * Elimina un conteo de inventario
 * @param {string} inventoryId - ID del conteo a eliminar
 * @returns {Promise<void>}
 */
async function openDeleteInventoryModal(inventoryId) {
  // No permitir eliminar inventarios virtuales de stock cero
  if (inventoryId?.startsWith("zero-stock-")) {
    return;
  }

  const inv = await getInventoryById(inventoryId);
  if (!inv?.id) return;

  // No permitir eliminar inventarios cerrados (contabilidad cerrada)
  if (isInventoryClosed(inv)) {
    showToast("No se puede eliminar: la contabilidad de esta fecha está cerrada", TOAST_COLORS.DANGER, 3);
    return;
  }

  const products = CACHE.products || [];
  const product = products.find((p) => p.id === inv.productId);
  const productName = product ? product.name : "Inventario";

  DELETE_STATE.type = PAGE_INVENTORY;
  DELETE_STATE.id = inventoryId;

  openConfirmDeleteModal(PAGE_INVENTORY, inventoryId, productName);
}

/**
 * Confirma la eliminación de un conteo de inventario
 * @returns {Promise<void>}
 */
async function confirmDeleteInventory() {
  if (!DELETE_STATE.id) return;

  const deleted = await getInventoryById(DELETE_STATE.id);
  if (!deleted?.id) return;

  // No permitir eliminar inventarios cerrados (contabilidad cerrada)
  if (isInventoryClosed(deleted)) {
    showToast("No se puede eliminar: la contabilidad de esta fecha está cerrada", TOAST_COLORS.DANGER, 3);
    return;
  }

  // Guardar estado para undo
  UNDO_STATE.data = deleted;
  UNDO_STATE.type = PAGE_INVENTORY;

  await deleteInventoryCount(DELETE_STATE.id);

  DELETE_STATE.type = null;
  DELETE_STATE.id = null;

  hideConfirmModal();
  await renderInventory();
  showSnackbar("Conteo de inventario eliminado");
}

// ===============================
// Filtrado
// ===============================

/**
 * Filtra productos de inventario según el texto de búsqueda
 * @param {Array} products - Lista de productos a filtrar
 * @returns {Array} Lista de productos filtrados
 */
function filterInventoryProductsByName(products) {
  if (!INVENTORY_STATE.searchText) return products;

  return products.filter((p) =>
    p.name.toLowerCase().includes(INVENTORY_STATE.searchText.toLowerCase())
  );
}

// ===============================
// Render
// ===============================

/**
 * Renderiza la lista de productos pendientes
 * @param {Array} products - Lista de productos pendientes
 * @param {boolean} allComplete - Indica si todos los productos tienen inventario completo
 * @returns {void}
 */
function renderPendingInventoryList(products, allComplete = false) {
  const list = document.getElementById(ID_PENDING_INVENTORY_LIST);
  const template = document.getElementById(ID_PENDING_CARD_TEMPLATE);

  if (!list || !template) return;

  list.innerHTML = "";

  if (products.length === 0) {
    // Solo mostrar mensaje si todos los productos tienen inventario completo (ambos valores)
    if (allComplete) {
      const placeholder = createEmptyStatePlaceholder(
        "Todos los productos tienen inventario del día",
        "bi-check-circle",
        "Ir a Contabilidad",
        () => navigateToPageWithDateFilter(PAGE_ACCOUNTING, INVENTORY_STATE.filterDate)
      );
      if (placeholder) list.appendChild(placeholder);
    }
    return;
  }

  products.forEach((product) => {
    const node = template.content.cloneNode(true);

    const productName = node.querySelector(".pending-product-name");
    if (productName) productName.textContent = product.name;

    const productStock = node.querySelector(".pending-product-stock");
    if (productStock) {
      productStock.textContent = formatTo2(product.quantity || 0);
    }

    const btnAdd = node.querySelector(".btn-add-inventory");
    if (btnAdd) {
      btnAdd.onclick = () => {
        openAddInventoryModal(product.id).catch((err) =>
          console.error("[inventory] openAddInventoryModal", err)
        );
      };
    }

    list.appendChild(node);
  });
}

/**
 * Renderiza la lista de productos parciales
 * @param {Array} inventoryCounts - Lista de conteos de inventario parciales
 * @returns {void}
 */
function renderPartialInventoryList(inventoryCounts) {
  const list = document.getElementById(ID_PARTIAL_INVENTORY_LIST);
  const template = document.getElementById(ID_PARTIAL_CARD_TEMPLATE);
  const products = CACHE.products || [];

  if (!list || !template) return;

  list.replaceChildren();

  if (inventoryCounts.length === 0) {
    const placeholder = createEmptyStatePlaceholder(
      "No hay inventarios parciales para esta fecha",
      "bi-clipboard"
    );
    if (placeholder) list.appendChild(placeholder);
    return;
  }

  inventoryCounts.forEach((inv) => {
    const product = products.find((p) => p.id === inv.productId);
    if (!product) return;

    const node = template.content.cloneNode(true);

    const productName = node.querySelector(".partial-product-name");
    const warehouseQty = node.querySelector(".warehouse-qty");
    const storeQty = node.querySelector(".store-qty");

    if (productName) productName.textContent = product.name;

    const productStock = node.querySelector(".partial-product-stock");
    if (productStock) {
      productStock.textContent = formatTo2(product.quantity || 0);
    }

    // Mostrar valores, usar "--" si no está definido
    if (warehouseQty) {
      if (
        inv.warehouseQuantity !== null &&
        inv.warehouseQuantity !== undefined
      ) {
        warehouseQty.textContent = formatTo2(inv.warehouseQuantity);
      } else {
        warehouseQty.textContent = "--";
        warehouseQty.classList.add("text-muted");
      }
    }
    if (storeQty) {
      // El icono siempre mantiene el color verde, solo el texto cambia
      if (inv.storeQuantity !== null && inv.storeQuantity !== undefined) {
        storeQty.textContent = formatTo2(inv.storeQuantity);
      } else {
        storeQty.textContent = "--";
      }
      // El icono siempre es verde (text-success), el "--" indica que no tiene valor
      storeQty.classList.remove("text-muted");
      storeQty.classList.add("text-success");
    }

    const btnAdd = node.querySelector(".btn-add-inventory");
    if (btnAdd) {
      if (isInventoryClosed(inv)) {
        btnAdd.disabled = true;
        btnAdd.setAttribute("title", "Contabilidad cerrada: no se puede editar");
        btnAdd.style.cursor = "not-allowed";
      } else {
        btnAdd.onclick = () => {
          openAddInventoryModal(inv.productId).catch((err) =>
            console.error("[inventory] openAddInventoryModal", err)
          );
        };
      }
    }

    const btnDelete = node.querySelector(".btn-delete-inventory");
    if (btnDelete) {
      if (isInventoryClosed(inv)) {
        btnDelete.disabled = true;
        btnDelete.setAttribute("title", "Contabilidad cerrada: no se puede eliminar");
        btnDelete.style.cursor = "not-allowed";
      } else {
        btnDelete.onclick = () => {
          openDeleteInventoryModal(inv.id).catch((err) =>
            console.error("[inventory] openDeleteInventoryModal", err)
          );
        };
      }
    }

    list.appendChild(node);
  });
}

/**
 * Renderiza la lista de productos completados
 * @param {Array} inventoryCounts - Lista de conteos de inventario completados
 * @returns {void}
 */
function renderCompletedInventoryList(inventoryCounts) {
  const list = document.getElementById(ID_COMPLETED_INVENTORY_LIST);
  const template = document.getElementById(ID_COMPLETED_CARD_TEMPLATE);
  const products = CACHE.products || [];

  if (!list || !template) return;

  list.replaceChildren();

  if (inventoryCounts.length === 0) {
    const placeholder = createEmptyStatePlaceholder(
      "No hay inventarios realizados para esta fecha",
      "bi-clipboard-minus"
    );
    if (placeholder) list.appendChild(placeholder);
    return;
  }

  inventoryCounts.forEach((inv) => {
    const product = products.find((p) => p.id === inv.productId);
    if (!product) return;

    const node = template.content.cloneNode(true);

    const productName = node.querySelector(".completed-product-name");
    const productStock = node.querySelector(".completed-product-stock");
    const warehouseQty = node.querySelector(".warehouse-qty");
    const storeQty = node.querySelector(".store-qty");

    if (productName) productName.textContent = product.name;
    if (productStock) {
      productStock.textContent = formatTo2(product.quantity || 0);
    }
    if (warehouseQty) warehouseQty.textContent = formatTo2(inv.warehouseQuantity ?? 0);
    if (storeQty) storeQty.textContent = formatTo2(inv.storeQuantity ?? 0);

    const btnDelete = node.querySelector(".btn-delete-inventory");
    if (btnDelete) {
      const isZeroStockProduct = (product.quantity || 0) === 0;
      const isZeroStockInv = inv.isZeroStock || inv.id?.startsWith("zero-stock-");
      const isClosed = isInventoryClosed(inv);

      if (isZeroStockProduct || isZeroStockInv || isClosed) {
        btnDelete.disabled = true;
        btnDelete.style.cursor = "not-allowed";
        btnDelete.title = "No se puede eliminar el inventario de un producto sin stock o contabilidad cerrada";
      } else {
        btnDelete.onclick = () => {
          openDeleteInventoryModal(inv.id).catch((err) =>
            console.error("[inventory] openDeleteInventoryModal", err)
          );
        };
      }
    }

    list.appendChild(node);
  });
}

/**
 * Función principal que renderiza el inventario
 * Separa productos en pendientes, parciales y completados según la fecha seleccionada
 * @returns {Promise<void>}
 */
async function renderInventory() {
  const date =
    INVENTORY_STATE.filterDate || new Date().toISOString().split("T")[0];
  const allProducts = CACHE.products || [];
  const dayInventoryRaw = await getInventoryByDate(date);

  // Filtrar productos por búsqueda
  const filteredProducts = filterInventoryProductsByName(allProducts);

  // Obtener inventarios del día seleccionado (CONFIRMED y CLOSED se muestran)
  const dayInventory = dayInventoryRaw.filter((inv) =>
    ["CONFIRMED", "CLOSED"].includes(inv.status)
  );

  // Separar inventarios en parciales y completados
  const partialInventory = [];
  const completedInventory = [];

  dayInventory.forEach((inv) => {
    const hasWarehouse =
      inv.warehouseQuantity !== null && inv.warehouseQuantity !== undefined;
    const hasStore =
      inv.storeQuantity !== null && inv.storeQuantity !== undefined;

    if (hasWarehouse && hasStore) {
      // Tiene ambos valores: completado
      completedInventory.push(inv);
    } else if (hasWarehouse || hasStore) {
      // Tiene al menos uno: parcial
      partialInventory.push(inv);
    }
  });

  // Obtener IDs de productos que tienen inventario (parcial o completo)
  const inventoryProductIds = new Set(dayInventory.map((inv) => inv.productId));

  // Productos con stock cero: se muestran automáticamente como completados con valores 0
  const zeroStockProducts = filteredProducts.filter((p) => {
    const stock = p.quantity || 0;
    return stock === 0 && !inventoryProductIds.has(p.id);
  });

  // Productos con stock cero: persistir inventario 0/0 y mostrarlos como completados
  for (const product of zeroStockProducts) {
    await saveInventory(product.id, date, 0, 0);

    // Crear inventario virtual para productos con stock cero
    const virtualInventory = {
      id: `zero-stock-${product.id}`, // ID especial para identificar inventarios virtuales
      productId: product.id,
      warehouseQuantity: 0,
      storeQuantity: 0,
      date: date,
      status: "CONFIRMED",
      isZeroStock: true, // Flag para identificar inventarios de stock cero
    };
    completedInventory.push(virtualInventory);
    inventoryProductIds.add(product.id); // Agregar a la lista para que no aparezca en pendientes
  }

  // Productos pendientes: no tienen ningún inventario y no tienen stock cero
  const pendingProducts = filteredProducts.filter((p) => {
    const stock = p.quantity || 0;
    return !inventoryProductIds.has(p.id) && stock > 0;
  });

  // Filtrar inventarios parciales y completados por búsqueda
  const filteredPartialInventory = partialInventory.filter((inv) => {
    const product = filteredProducts.find((p) => p.id === inv.productId);
    return product !== undefined;
  });

  const filteredCompletedInventory = completedInventory.filter((inv) => {
    const product = filteredProducts.find((p) => p.id === inv.productId);
    return product !== undefined;
  });

  // Actualizar contador (solo completados)
  const total = allProducts.length;
  const completed = completedInventory.length;
  updateListCounter(completed, total, PAGE_INVENTORY);

  // Mostrar mensaje "Todos los productos tienen inventario del día" solo si:
  // - No hay productos pendientes
  // - No hay productos parciales
  // - Todos los productos tienen inventario completo (ambos valores) o tienen stock cero
  const allProductsHaveCompleteInventory =
    pendingProducts.length === 0 && filteredPartialInventory.length === 0;

  // Renderizar listas
  renderPendingInventoryList(pendingProducts, allProductsHaveCompleteInventory);
  renderPartialInventoryList(filteredPartialInventory);
  renderCompletedInventoryList(filteredCompletedInventory);
}

/**
 * Limpia el error en el input de inventario.
 * El feedback es compartido: solo se oculta cuando ambos campos (almacén y tienda) están sin error.
 * @param {string} inputId - ID del input
 * @returns {void}
 */
function clearInventoryInputError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.classList.remove("is-invalid");

  // Solo ocultar el feedback si ambos campos están limpios
  const warehouseInput = document.getElementById(ID_LOCATION_WAREHOUSE_INPUT);
  const storeInput = document.getElementById(ID_LOCATION_STORE_INPUT);

  const warehouseHasError =
    warehouseInput && warehouseInput.classList.contains("is-invalid");
  const storeHasError =
    storeInput && storeInput.classList.contains("is-invalid");

  if (!warehouseHasError && !storeHasError) {
    const feedback = document.getElementById("inventoryErrorFeedback");
    if (feedback) {
      feedback.textContent = "";
      feedback.style.display = "";
      feedback.classList.remove("d-block");
    }
  }
}
