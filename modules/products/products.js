// ===============================
// Products - App Contable
// ===============================

//#region Constants
// IDs de botones
const BTN_ID_ADD_PRODUCT = "btnAddProduct";
const BTN_ID_SAVE_PRODUCT = "btnSaveProduct";
const BTN_ID_CLEAR_SEARCH = "btnClearSearch";
const BTN_ID_ORDER_DIR = "orderDir";
const BTN_ID_CLEAR_FILTERS_PRODUCTS = "btnClearFiltersProducts";

// IDs de otros elementos
const ID_ORDER_BY = "orderBy";
const ID_SEARCH_PRODUCT = "searchProduct";
const ID_PRODUCTS_LIST = "productsList";
const ID_PRODUCT_CARD_TEMPLATE = "productCardTemplate";
const ID_PRODUCTS_COUNTER = "productsCounter";
const ID_PRODUCT_MODAL_TITLE = "productModalTitle";
const ID_PRODUCT_FORM = "productForm";
const ID_PRODUCT_ID = "productId";
const ID_PRODUCT_CODES_CONTAINER = "productCodesContainer";
const ID_BTN_ADD_CODE_SCAN = "btnAddCodeScan";
const ID_INPUT_NAME = "inputName";
const ID_INPUT_PRICE = "inputPrice";
const ID_INPUT_UM = "inputUM";
const ID_INPUT_QUANTITY = "inputQuantity";
const ID_INPUT_LOW_STOCK_THRESHOLD = "inputLowStockThreshold";
const ID_INPUT_CRITICAL_STOCK_THRESHOLD = "inputCriticalStockThreshold";
//#endregion

let productModal;

/** Lista de códigos del producto en el modal (se guarda al hacer clic en Guardar) */
let productModalCodes = [];

// Estado de la pantalla de productos (unificado)
const PRODUCTS_STATE = {
  // Texto de búsqueda (para el input de búsqueda)
  searchText: "",
  // Fecha de filtrado (para el input de fecha)
  filterDate: null,
  // Campo por el que se ordena (name | price | quantity)
  orderBy: "name",
  // Dirección de ordenamiento (asc | desc)
  orderDir: "asc",
  // Tipo de producto filtrado (para los chips de filtro)
  chipFiltered: null, // "low" | "critical" | null (todos)
  // ID del producto que se va a editar
  elementToEdit: null,
  // ID del producto que se va a eliminar
  elementToDelete: null,
  // No tiene tipo de producto actual (siempre es producto)
  currentType: null,
};

// Estado de la pantalla de productos (unificado)
/*const PRODUCTS_STATE1 = {
  searchText: "",
  productToDelete: null,
  orderBy: "name",
  orderDir: "asc",
  filterStockStatus: null, // "low" | "critical" | null
};*/

// Exponer el estado globalmente para module-controls.js
window.PRODUCTS_STATE = PRODUCTS_STATE;

// ===============================
// Migración de productos (code -> codes)
// ===============================

/**
 * Migra productos con code (string) a codes (array).
 * Se ejecuta al cargar la página de productos.
 */
function migrateProductsToCodes() {
  const products = getData(PAGE_PRODUCTS) || [];
  let changed = false;
  const migrated = products.map((p) => {
    if (Array.isArray(p.codes)) return p;
    if (typeof p.code === "string" && p.code.trim()) {
      changed = true;
      const { code, ...rest } = p;
      return { ...rest, codes: [code.trim()] };
    }
    changed = true;
    const { code, ...rest } = p;
    return { ...rest, codes: [] };
  });
  if (changed) {
    setData(PAGE_PRODUCTS, migrated);
    replaceProductsCache(migrated);
  }
}

// ===============================
// Hook que llama el router
// ===============================

/**
 * Hook que se ejecuta cuando se carga la página de productos
 * Inicializa el modal, los controles de búsqueda y ordenamiento,
 * y configura los event listeners de los botones
 */
async function onProductsPageLoaded() {
  migrateProductsToCodes();
  loadProductsCache();

  // Cargar modal de productos
  console.log("Loading product-modal");
  await loadModal(MODAL_PRODUCTS, PAGE_PRODUCTS);

  // Inicializar el modal después de cargarlo
  initModalModule(MODAL_PRODUCTS);

  // Configurar botón de escanear códigos dentro del modal
  setupProductModalCodesScanButton();

  // Configurar controles del módulo
  await setupProductsControls();

  // Configurar botón de guardar del modal
  document.getElementById(BTN_ID_SAVE_PRODUCT).onclick = saveProductFromModal;

  // Renderizar la lista de productos
  renderProducts();
}



/**
 * Maneja el escaneo de código: abre el scanner y según el resultado abre modal editar o agregar.
 * Usado por el componente btn-scan-product.
 */
function handleScanProductCode() {
  if (typeof openScannerModal !== "function") {
    alert("No se pudo iniciar el escáner. Comprueba que el componente scanner esté cargado.");
    return;
  }
  openScannerModal({
    onSuccess: (decodedText) => {
      const found = CACHE_PRODUCTS.find((p) => (p.codes || []).includes(decodedText));
      if (found) {
        openEditProductModal(found.id);
      } else {
        openAddProductModal(decodedText);
      }
    }
  });
}

/**
 * Renderiza los badges de códigos en el modal de producto.
 * Si no hay códigos muestra un badge "ninguno" sin botón cerrar.
 * Cada código tiene badge con X para eliminarlo.
 */
function renderProductCodesBadges() {
  const container = document.getElementById(ID_PRODUCT_CODES_CONTAINER);
  if (!container) return;

  container.replaceChildren();

  if (productModalCodes.length === 0) {
    const badge = createBadge({
      text: "sin códigos",
      colorClass: "text-muted",
      showCloseButton: false
    });
    if (badge) container.appendChild(badge);
    return;
  }

  productModalCodes.forEach((code, index) => {
    const badge = createBadge({
      text: code,
      colorClass: "bg-primary",
      showCloseButton: true,
      onClose: () => {
        productModalCodes = productModalCodes.filter((_, i) => i !== index);
        renderProductCodesBadges();
      }
    });
    if (badge) container.appendChild(badge);
  });
}

/**
 * Configura el botón de escanear para agregar código dentro del modal de producto.
 * Al escanear se agrega el código a productModalCodes (sin duplicados) y se re-renderizan los badges.
 */
function setupProductModalCodesScanButton() {
  const btnScan = document.getElementById(ID_BTN_ADD_CODE_SCAN);
  if (!btnScan) return;

  btnScan.onclick = () => {
    if (typeof openScannerModal !== "function") {
      alert("No se pudo iniciar el escáner. Comprueba que el componente scanner esté cargado.");
      return;
    }
    openScannerModal({
      onSuccess: (decodedText) => {
        const trimmed = decodedText.trim();
        if (!trimmed) return;
        if (productModalCodes.includes(trimmed)) return;
        productModalCodes.push(trimmed);
        renderProductCodesBadges();
      }
    });
  };
}

/**
 * Configura los controles del módulo de productos
 * @returns {void}
 */
async function setupProductsControls() {
  // Limpiar el contenido de los controles del módulo
  clearModuleControlsContent();

  // Mostrar los controles del módulo
  showModuleControls();

  // Cargar el control de búsqueda
  await loadModuleControl(CONTROL_SEARCH_INPUT);
  // Configurar el control de búsqueda
  setupSearchInput(PAGE_PRODUCTS, renderProducts);

  // Cargar el botón de escanear código (a la izquierda del botón agregar)
  await loadModuleControl(CONTROL_BTN_SCAN_PRODUCT);
  setupBtnScanProduct(handleScanProductCode);

  // Cargar el control de botón de agregar
  await loadModuleControl(CONTROL_BTN_ADD);
  // Configurar el botón de agregar
  setupBtnAdd(openAddProductModal);

  // No tiene filtro de fecha
  //await loadModuleControl(CONTROL_DATE_FILTER);
  // Configurar el filtro de fecha
  //setupDateFilter(PAGE_PRODUCTS, renderProducts);

  // cargar el control de ordenamiento
  await loadModuleControl(CONTROL_ORDER_BY);
  // Configurar el control de ordenamiento
  setupOrderBy(PAGE_PRODUCTS, renderProducts);

  // cargar el control de chips filter
  await loadModuleControl(CONTROL_CHIPS_FILTER);
  // Configurar el control de chips filter
  setupChipsFilter(PAGE_PRODUCTS, renderProducts);

  // Cargar el control de contador de elementos
  await loadModuleControl(CONTROL_LIST_COUNTER);
  // No es necesario configurarle comportamiento,
  // se actualizará automáticamente al renderizar la lista

  // cargar el control de limpiar filtros
  await loadModuleControl(CONTROL_BTN_CLEAR_FILTERS);
  // Configurar el control de limpiar filtros
  setupBtnClearFilters(PAGE_PRODUCTS, renderProducts);
}

/**
 * Abre el modal para agregar un nuevo producto
 * Resetea el formulario y configura el título del modal
 * @param {string} [initialCode] - Código opcional (ej. escaneado) para pre-cargar
 */
function openAddProductModal(initialCode) {
  // Resetear el estado de edición porque es un nuevo producto y no hay producto para editar
  PRODUCTS_STATE.elementToEdit = null;

  // definir el header del modal para nuevo producto
  setModalHeader(MODAL_PRODUCTS, false);
  // Limpiar errores de validación anteriores del modal
  clearInputErrors([ID_INPUT_NAME, ID_INPUT_LOW_STOCK_THRESHOLD, ID_INPUT_CRITICAL_STOCK_THRESHOLD]);

  // Resetear el formulario del modal
  // Establecer el valor del input de ID
  setInputValue(ID_PRODUCT_ID, "");
  productModalCodes = initialCode ? [initialCode.trim()] : [];
  renderProductCodesBadges();
  // Establecer el valor del input de nombre
  setInputValue(ID_INPUT_NAME, "");
  // Establecer el valor del input de precio
  setInputValue(ID_INPUT_PRICE, "");
  // Establecer el valor del input de umbral de stock bajo
  setInputValue(ID_INPUT_LOW_STOCK_THRESHOLD, "");
  // Establecer el valor del input de umbral de stock crítico
  setInputValue(ID_INPUT_CRITICAL_STOCK_THRESHOLD, "");
  // Cargar unidades de medida en el select y seleccionar la del producto
  loadUnitsIntoSelect();

  // Mostrar modal
  toggleModalModules();
}

/**
 * Abre el modal para editar un producto existente
 * Carga los datos del producto en el formulario y muestra el modal
 * @param {string} id - ID del producto a editar
 */
function openEditProductModal(id) {
  // Obtener el producto a editar
  const product = getProductFromCache(id);
  if (!product) return;
  
  // Resetear el estado de edición porque es un nuevo producto y no hay producto para editar
  PRODUCTS_STATE.elementToEdit = id;

  // definir el header del modal para editar producto
  setModalHeader(MODAL_PRODUCTS, true);

  // Limpiar errores de validación anteriores del modal
  clearInputErrors([ID_INPUT_NAME, ID_INPUT_LOW_STOCK_THRESHOLD, ID_INPUT_CRITICAL_STOCK_THRESHOLD]);

  // Establecer el valor del input de ID
  setInputValue(ID_PRODUCT_ID, product.id);
  productModalCodes = [...(Array.isArray(product.codes) ? product.codes : product.code ? [product.code] : [])];
  renderProductCodesBadges();
  // Establecer el valor del input de nombre
  setInputValue(ID_INPUT_NAME, product.name);
  // Establecer el valor del input de precio
  setInputValue(ID_INPUT_PRICE, formatTo2(product.price));
  // Establecer el valor del input de umbral de stock bajo
  setInputValue(ID_INPUT_LOW_STOCK_THRESHOLD, product.lowStockThreshold || "");
  // Establecer el valor del input de umbral de stock crítico
  setInputValue(ID_INPUT_CRITICAL_STOCK_THRESHOLD, product.criticalStockThreshold || "");
  // Cargar unidades de medida en el select y seleccionar la del producto
  loadUnitsIntoSelect();
  // Establecer el valor del input de unidad de medida
  setInputValue(ID_INPUT_UM, product.um);

  // Mostrar modal
  toggleModalModules();
}

/**
 * Carga las unidades de medida en el select del modal de productos
 * @returns {void}
 */
function loadUnitsIntoSelect() {
  const select = document.getElementById(ID_INPUT_UM);
  if (!select) return;

  // Limpiar opciones existentes (excepto la primera)
  const firstOption = select.querySelector('option[value=""]');
  select.innerHTML = "";
  if (firstOption) {
    select.appendChild(firstOption);
  } else {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Seleccioná una unidad...";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);
  }

  // Obtener unidades de medida
  const units = getUnits();

  // Agregar opciones
  units.forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    select.appendChild(option);
  });
}

/**
 * Inicializa los controles de ordenamiento de productos
 * Configura los event listeners para el selector de campo y el botón de dirección
 * Actualiza PRODUCTS_STATE y renderiza los productos cuando cambian los criterios
 */
function initProductOrdering() {
  const orderBy = document.getElementById(ID_ORDER_BY);
  const orderDirBtn = document.getElementById(BTN_ID_ORDER_DIR);

  if (!orderBy || !orderDirBtn) return;

  orderBy.onchange = () => {
    PRODUCTS_STATE.orderBy = orderBy.value;
    updateClearFiltersButton();
    renderProducts();
  };

  orderDirBtn.onclick = () => {
    PRODUCTS_STATE.orderDir =
      PRODUCTS_STATE.orderDir === "asc" ? "desc" : "asc";

    orderDirBtn.innerHTML =
      PRODUCTS_STATE.orderDir === "asc"
        ? '<i class="bi bi-sort-alpha-down"></i>'
        : '<i class="bi bi-sort-alpha-up"></i>';

    updateClearFiltersButton();
    renderProducts();
  };
}

/**
 * Inicializa el buscador de productos
 * Configura los event listeners para el input de búsqueda y el botón de limpiar
 * Actualiza PRODUCTS_STATE.searchText y renderiza los productos al escribir
 */
function initProductSearch() {
  const input = document.getElementById(ID_SEARCH_PRODUCT);
  const btnClear = document.getElementById(BTN_ID_CLEAR_SEARCH);

  if (!input || !btnClear) return;

  input.addEventListener("input", () => {
    PRODUCTS_STATE.searchText = input.value.toLowerCase();
    btnClear.classList.toggle("d-none", !PRODUCTS_STATE.searchText);
    updateClearFiltersButton();
    renderProducts();
  });

  btnClear.onclick = () => {
    input.value = "";
    PRODUCTS_STATE.searchText = "";
    btnClear.classList.add("d-none");
    updateClearFiltersButton();
    renderProducts();
    input.focus();
  };
}

/**
 * Inicializa el botón de limpiar filtros
 * @returns {void}
 */
function initClearFilters() {
  const btnClearFilters = document.getElementById(
    BTN_ID_CLEAR_FILTERS_PRODUCTS
  );
  if (!btnClearFilters) return;

  btnClearFilters.onclick = () => {
    // Limpiar búsqueda
    const searchInput = document.getElementById(ID_SEARCH_PRODUCT);
    const btnClearSearch = document.getElementById(BTN_ID_CLEAR_SEARCH);
    if (searchInput) {
      searchInput.value = "";
      PRODUCTS_STATE.searchText = "";
      if (btnClearSearch) btnClearSearch.classList.add("d-none");
    }

    // Limpiar ordenamiento
    const orderBy = document.getElementById(ID_ORDER_BY);
    if (orderBy) {
      orderBy.value = "";
      PRODUCTS_STATE.orderBy = "name";
    }
    PRODUCTS_STATE.orderDir = "asc";
    const orderDirBtn = document.getElementById(BTN_ID_ORDER_DIR);
    if (orderDirBtn) {
      orderDirBtn.innerHTML = '<i class="bi bi-sort-alpha-down"></i>';
    }

    updateClearFiltersButton();
    renderProducts();
  };

  updateClearFiltersButton();
}

/**
 * Actualiza la visibilidad del botón de limpiar filtros
 * @returns {void}
 */
function updateClearFiltersButton() {
  const btnClearFilters = document.getElementById(
    BTN_ID_CLEAR_FILTERS_PRODUCTS
  );
  if (!btnClearFilters) return;

  const hasFilters =
    PRODUCTS_STATE.searchText ||
    PRODUCTS_STATE.orderBy !== "name" ||
    PRODUCTS_STATE.orderDir !== "asc";

  if (hasFilters) {
    btnClearFilters.classList.remove("d-none");
  } else {
    btnClearFilters.classList.add("d-none");
  }
}

// ===============================
// Filtrado y Ordenamiento
// ===============================

/**
 * Filtra productos usando los criterios de PRODUCTS_STATE
 * @param {Array} products - Lista de productos a filtrar
 * @returns {Array} Lista de productos filtrados
 */
function filterProducts(products) {
  
  let filtered = [...products];
  // Filtrar por texto de búsqueda (busca en nombre del producto)
  if (PRODUCTS_STATE.searchText) {
    filtered = filtered.filter((p) => {
      if (!p || !p.name) return false;
      return p.name
        .toLowerCase()
        .includes(PRODUCTS_STATE.searchText.toLowerCase());
    });
  }

  // Filtro por chips de estado de stock
  const stockStatus = PRODUCTS_STATE.chipFiltered ? PRODUCTS_STATE.chipFiltered.toLowerCase() : null;

  if (stockStatus) {
    filtered = filtered.filter((p) => {
      if (!p) return false;
      const lowThreshold = p.lowStockThreshold || 0;
      const criticalThreshold = p.criticalStockThreshold || 0;
      if (stockStatus === "critical") {
        return p.quantity !== undefined && p.quantity <= criticalThreshold;
      } else if (stockStatus === "low") {
        return p.quantity !== undefined && p.quantity > criticalThreshold && p.quantity <= lowThreshold;
      } else {
        return false;
      }
    });
  }

  return filtered;

}

/**
 * Ordena productos usando los criterios de PRODUCTS_STATE
 * @param {Array} products - Lista de productos a ordenar
 * @returns {Array} Lista de productos ordenados
 */
function sortProducts(products) {
  // Asegurarse de usar el estado actualizado desde window
  //const state = window.PRODUCTS_STATE || PRODUCTS_STATE;
  //if (!state) return products;

  return [...products].sort((a, b) => {
    let v1 = a[PRODUCTS_STATE.orderBy];
    let v2 = b[PRODUCTS_STATE.orderBy];

    // Normalizar strings para comparación
    if (typeof v1 === "string") {
      v1 = v1.toLowerCase();
      v2 = v2.toLowerCase();
    }

    if (v1 < v2) return PRODUCTS_STATE.orderDir === "asc" ? -1 : 1;
    if (v1 > v2) return PRODUCTS_STATE.orderDir === "asc" ? 1 : -1;
    return 0;
  });
}

// ===============================
// Render
// ===============================

/**
 * Renderiza la lista de productos en el DOM
 * @param {Array} products - Lista de productos a renderizar
 * @returns {void}
 */
function renderProductsList(products) {
  const prodList = document.getElementById(ID_PRODUCTS_LIST);
  const prodTemplate = document.getElementById(ID_PRODUCT_CARD_TEMPLATE);

  if (!prodList || !prodTemplate) return;

  prodList.innerHTML = "";

  if (products.length === 0) {
    const placeholder = createEmptyStatePlaceholder("No se encontraron productos");
    if (placeholder) prodList.appendChild(placeholder);
    return;
  }

  products.forEach((p) => {
    const node = prodTemplate.content.cloneNode(true);

    node.querySelector(".product-name").textContent = p.name;

    // Determinar color y icono según el stock
    const criticalThreshold = p.criticalStockThreshold || 0;
    const lowThreshold = p.lowStockThreshold || 0;
    let quantityColor = "";
    let quantityIcon = "bi-boxes";

    if (p.quantity <= criticalThreshold) {
      quantityColor = "text-danger";
      quantityIcon = "bi-exclamation-triangle-fill";
    } else if (p.quantity <= lowThreshold) {
      quantityColor = "text-warning";
      quantityIcon = "bi-exclamation-triangle-fill";
    }

    const metaEl = node.querySelector(".product-meta");
    if (metaEl) {
      metaEl.innerHTML = `<i class="bi ${quantityIcon} ${quantityColor}"></i> <span class="${quantityColor}">${formatTo2(p.quantity)}</span> 
      • <i class="bi bi-currency-dollar"></i> ${formatTo2(p.price)} 
      • <i class="bi bi-beaker small"></i> ${p.um}`;
    }

    node.querySelector(".btn-edit").onclick = () => openEditProductModal(p.id);
    node.querySelector(".btn-delete").onclick = () =>
      openDeleteProductModal(p.id);

    prodList.appendChild(node);
  });
}

/**
 * Función principal que renderiza los productos
 * Filtra, ordena y renderiza usando PRODUCTS_STATE
 * @returns {void}
 */
function renderProducts() {
  const allProducts = CACHE_PRODUCTS || [];

  // Primero filtrar, luego ordenar
  const filtered = filterProducts(allProducts);
  const sorted = sortProducts(filtered);

  updateListCounter(sorted.length, allProducts.length, PAGE_PRODUCTS);
  renderProductsList(sorted);
}

/**
 * Guarda el producto desde el modal
 * @returns {void}
 */
function saveProductFromModal() {
  // Obtener los valores de los inputs
  const id = getInputValue(ID_PRODUCT_ID);
  const codesRaw = [...productModalCodes];
  const name = getInputValue(ID_INPUT_NAME).trim();
  const price = parseFloat(getInputValue(ID_INPUT_PRICE));
  const um = getInputValue(ID_INPUT_UM).trim();
  const lowStockThreshold = Number(getInputValue(ID_INPUT_LOW_STOCK_THRESHOLD));
  const criticalStockThreshold = Number(getInputValue(ID_INPUT_CRITICAL_STOCK_THRESHOLD));

  // Obtener los productos (caché en memoria)
  let products = CACHE_PRODUCTS || [];

  // Limpiar errores de validación anteriores del modal
  clearInputErrors([ID_INPUT_NAME, ID_INPUT_LOW_STOCK_THRESHOLD, ID_INPUT_CRITICAL_STOCK_THRESHOLD]);

  // Validaciones
  // nombre obligatorio
  if (!name) {
    setInputError(ID_INPUT_NAME, "El nombre es obligatorio");
    return;
  }

  // nombre único
  if (
    products.some(
      (p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== id
    )
  ) {
    setInputError(ID_INPUT_NAME, "Ya existe un producto con ese nombre");
    return;
  }

  // Umbrales obligatorios
  if (!lowStockThreshold || lowStockThreshold < 0) {
    setInputError(
      ID_INPUT_LOW_STOCK_THRESHOLD,
      "El umbral de stock bajo es obligatorio"
    );
    return;
  }

  if (!criticalStockThreshold || criticalStockThreshold < 0) {
    
    setInputError(
      ID_INPUT_CRITICAL_STOCK_THRESHOLD,
      "El umbral de stock crítico es obligatorio"
    );
    return;
  }

  const priceRounded = roundTo2(price);

  // Si hay un id de producto es una edición si no, es un alta de producto
  if (id) {
    // EDITAR
    const productToEdit = getProductFromCache(id);
    if (!productToEdit) {
      setInputError(ID_PRODUCT_ID, "El producto no existe");
      return;
    }
    const updatedProduct = {
      ...productToEdit,
      codes: codesRaw,
      name,
      price: priceRounded,
      um,
      lowStockThreshold,
      criticalStockThreshold,
    };
    setDataById(PAGE_PRODUCTS, updatedProduct);
    syncProductInCache(updatedProduct);

  } else {
    // ALTA
    const newProduct = {
      id: crypto.randomUUID(),
      codes: codesRaw,
      name,
      price: priceRounded,
      um,
      quantity: 0,
      lowStockThreshold,
      criticalStockThreshold
    };
    setDataById(PAGE_PRODUCTS, newProduct);
    syncProductInCache(newProduct);
  }

  // Cerrar el modal
  toggleModalModules();

  // Renderizar la lista de productos
  renderProducts();
}

// ===============================
// Baja
// ===============================

/**
 * Indica si un producto está vinculado a movimientos, inventarios (CONFIRMED/CLOSED) o contabilidades cerradas.
 * No se debe eliminar un producto vinculado.
 * @param {string} prodId - ID del producto
 * @returns {boolean} true si está vinculado, false en caso contrario
 */
function isProductLinked(prodId) {
  if (!prodId) return false;

  const movements = getData(PAGE_MOVEMENTS) || [];
  if (movements.some((m) => m.productId === prodId)) return true;

  const inventory = getData(PAGE_INVENTORY) || [];
  if (
    inventory.some(
      (inv) =>
        inv.productId === prodId &&
        (inv.status === "CONFIRMED" || inv.status === "CLOSED")
    )
  ) {
    return true;
  }

  const accounting = getData(PAGE_ACCOUNTING) || [];
  if (
    accounting.some(
      (acc) =>
        acc.closed === true &&
        acc.products?.some((p) => p.productId === prodId)
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Actualiza la cantidad de un producto sumando (o restando) un valor a la cantidad actual.
 * @param {string} productId - ID del producto
 * @param {number} quantityDelta - Cantidad a sumar (positivo = aumentar, negativo = disminuir)
 * @returns {number|undefined} Nueva cantidad del producto, 
 * o undefined si el producto no existe, 
 * o -1 si la nueva cantidad es negativa (error)
 */
function updateProductQuantity(productId, quantityDelta) {
  if (!productId) return undefined; // Error: ID de producto no válido

  const product =
    getProductFromCache(productId) || getDataById(PAGE_PRODUCTS, productId);
  if (!product) return undefined; // Error: producto no encontrado

  const currentQuantity = product.quantity ?? 0;
  const newQuantity = roundTo2(currentQuantity + quantityDelta);

  // Si la nueva cantidad es negativa, no se actualiza
  if (newQuantity < 0) return -1; // Error: cantidad negativa

  // Actualizar la cantidad del producto
  product.quantity = newQuantity;
  setDataById(PAGE_PRODUCTS, product);
  syncProductInCache(product);
  return newQuantity;
}

/**
 * Abre el modal para eliminar un producto
 * @param {string} id - ID del producto a eliminar
 * @returns {void}
 */
function openDeleteProductModal(id) {
  const product = getProductFromCache(id);
  if (!product) return;

  if (isProductLinked(id)) {
    showToast(
      "No se puede eliminar: el producto tiene elementos vinculados", 
      TOAST_COLORS.DANGER,3
    );
    return;
  }

  PRODUCTS_STATE.elementToDelete = id;
  openConfirmDeleteModal("product", id, product.name);
}

/**
 * Confirma la eliminación de un producto
 * Elimina el producto de la lista y renderiza los productos
 * @returns {void}
 */
function confirmDeleteProduct() {
  if (!PRODUCTS_STATE.elementToDelete) return;

  const idToDel = PRODUCTS_STATE.elementToDelete;
  if (isProductLinked(idToDel)) {
    showToast(
      "No se puede eliminar: el producto tiene elementos vinculados",
      TOAST_COLORS.DANGER,3
    );
    hideConfirmModal();
    PRODUCTS_STATE.elementToDelete = null;
    DELETE_STATE.type = null;
    DELETE_STATE.id = null;
    return;
  }

  const products = getData(PAGE_PRODUCTS);
  const deleted = products.find((p) => p.id === idToDel);

  // Guardamos estado undo
  UNDO_STATE.data = deleted;
  UNDO_STATE.type = PAGE_PRODUCTS; // Nombre de la colección en storage

  const updated = products.filter((p) => p.id !== idToDel);
  setData(PAGE_PRODUCTS, updated);
  replaceProductsCache(updated);

  PRODUCTS_STATE.elementToDelete = null;
  DELETE_STATE.type = null;
  DELETE_STATE.id = null;

  hideConfirmModal();
  renderProducts();
  showSnackbar("Producto eliminado");
}
