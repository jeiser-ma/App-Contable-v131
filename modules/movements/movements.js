// ===============================
// Movements - App Contable
// ===============================

//#region Constants
// IDs de botones
const BTN_ID_ADD_MOVEMENT = "btnAddMovement";
const BTN_ID_CONFIRM_MOVEMENT = "btnConfirmMovement";
const BTN_ID_CLEAR_SEARCH_MOVEMENT = "btnClearSearchMovement";
const BTN_ID_FILTER_IN = "filterIn";
const BTN_ID_FILTER_OUT = "filterOut";
const BTN_ID_CLEAR_FILTERS_MOVEMENTS = "btnClearFiltersMovements";

// IDs de otros elementos
const ID_SEARCH_MOVEMENT = "searchMovement";
const ID_MOVEMENTS_LIST = "movementsList";
const ID_MOVEMENT_CARD_TEMPLATE = "movementCardTemplate";
const ID_MOVEMENTS_COUNTER = "movementsCounter";
const ID_FILTER_DATE = "filterDate";
const ID_MOVEMENT_PRODUCT = "movementProduct";
const ID_MOVEMENT_QUANTITY = "movementQuantity";
const ID_MOVEMENT_DATE = "movementDate";
const ID_MOVEMENT_NOTE = "movementNote";
const ID_MOVEMENT_TITLE = "movementTitle";
const ID_MOVEMENT_ICON = "movementIcon";
const ID_MOVEMENT_TYPE_IN = "movementTypeIn";
const ID_MOVEMENT_TYPE_OUT = "movementTypeOut";
//#endregion

// Estado de la pantalla de movimientos (unificado)
const MOVEMENTS_STATE = {
  // Texto de búsqueda (para el input de búsqueda)
  searchText: "",
  // Fecha de filtrado (para el input de fecha)
  filterDate: null,
  // Campo por el que se ordena (date | quantity)
  orderBy: "date",
  // Dirección de ordenamiento (asc | desc)
  orderDir: "desc",
  // Tipo de movimiento filtrado (para los chips de filtro)
  chipFiltered: null, // "IN" | "OUT" | null (todos)
  // ID del movimiento que se va a editar
  elementToEdit: null,
  // ID del movimiento que se va a eliminar
  elementToDelete: null,
  // Tipo de movimiento actual (para el modal)
  currentType: null, // "IN" | "OUT" | null
};

// Exponer el estado globalmente para module-controls.js
window.MOVEMENTS_STATE = MOVEMENTS_STATE;

// ===============================
// Hook que llama el router
// ===============================

/**
 * Hook que se ejecuta cuando se carga la página de movimientos
 * Inicializa el modal, los controles de búsqueda y filtros,
 * y configura los event listeners de los botones
 * @returns {void}
 */
async function onMovementsPageLoaded() {
  console.log("onMovementsPageLoaded execution");
  await loadProductsCache();
  if (typeof loadStockCache === "function") await loadStockCache();

  // Cargar modal de movimientos
  console.log("Loading movement-modal");
  await loadModal(MODAL_MOVEMENTS, PAGE_MOVEMENTS);

  // Inicializar el modal después de cargarlo
  await initModalModule(MODAL_MOVEMENTS);

  // Configurar autocomplete del campo de producto del modal
  initProductAutocomplete();

  // configurar los listeners para el selector de tipo de movimiento del modal
  setupInOutSelectorListeners();

  // Configurar controles del módulo
  await setupMovementsControls();

  // Configurar botón de confirmar del modal
  const btnConfirm = document.getElementById(BTN_ID_CONFIRM_MOVEMENT);
  if (btnConfirm) {
    btnConfirm.onclick = () => {
      saveMovementFromModal().catch((err) =>
        console.error("[movements] saveMovementFromModal", err)
      );
    };
  }

  // Renderizar la lista de movimientos
  await renderMovements();
}


/**
 * Configura los controles del módulo de movimientos
 * @returns {void}
 */
async function setupMovementsControls() {
  // Limpiar el contenido de los controles del módulo
  clearModuleControlsContent();

  // Mostrar los controles del módulo
  showModuleControls();

  // Cargar el control de búsqueda
  await loadModuleControl(CONTROL_SEARCH_INPUT);
  // Configurar el control de búsqueda
  setupSearchInput(PAGE_MOVEMENTS, renderMovements);

  // Cargar el botón de escanear código (a la izquierda del botón agregar)
  await loadModuleControl(CONTROL_BTN_SCAN_PRODUCT);
  setupBtnScanProduct(handleScanMovementCode);

  // Cargar el control de botón de agregar
  await loadModuleControl(CONTROL_BTN_ADD);
  // Configurar el botón de agregar
  setupBtnAdd(openAddMovementModal);

  // Cargar el control de filtro de fecha
  await loadModuleControl(CONTROL_DATE_FILTER);
  // Configurar el filtro de fecha
  setupDateFilter(PAGE_MOVEMENTS, renderMovements);

  // cargar el control de ordenamiento
  await loadModuleControl(CONTROL_ORDER_BY);
  // Configurar el control de ordenamiento
  setupOrderBy(PAGE_MOVEMENTS, renderMovements);

  // cargar el control de chips filter
  await loadModuleControl(CONTROL_CHIPS_FILTER);
  // Configurar el control de chips filter
  setupChipsFilter(PAGE_MOVEMENTS, renderMovements);

  // Cargar el control de contador de elementos
  await loadModuleControl(CONTROL_LIST_COUNTER);
  // No es necesario configurarle comportamiento,
  // se actualizará automáticamente al renderizar la lista

  // cargar el control de limpiar filtros
  await loadModuleControl(CONTROL_BTN_CLEAR_FILTERS);
  // Configurar el control de limpiar filtros
  setupBtnClearFilters(PAGE_MOVEMENTS, renderMovements);
}


/**
 * Maneja el escaneo de código en movimientos: si el producto existe abre el modal para agregar;
 * si no existe muestra un toast informativo.
 * Usado por el componente btn-scan-product.
 */
function handleScanMovementCode() {
  if (typeof openScannerModal !== "function") {
    alert("No se pudo iniciar el escáner. Comprueba que el componente scanner esté cargado.");
    return;
  }
  openScannerModal({
    onSuccess: (decodedText) => {
      const found = CACHE.products.find((p) => (p.codes || []).includes(decodedText));
      if (found) {
        openAddMovementModal();
        setInputValue(ID_MOVEMENT_PRODUCT, found.name);
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
 * Abre el formulario para entrada (type=IN) o salida (type=OUT)
 * @param {string} type - Tipo de movimiento ("IN" | "OUT")
 * @returns {void}
 */
function openAddMovementModal() {
  // Resetear el estado de edición porque es un nuevo movimiento y no hay movimiento para editar
  MOVEMENTS_STATE.elementToEdit = null;

  // definir el header del modal para nuevo movimiento
  setModalHeader(MODAL_MOVEMENTS, false);
  // Limpiar errores de validación anteriores del modal
  clearInputErrors([ID_MOVEMENT_PRODUCT, ID_MOVEMENT_QUANTITY, ID_MOVEMENT_DATE, ID_MOVEMENT_NOTE]);

  // Configurar tipo por defecto (entrada)
  setInOutSelector(MOVEMENTS_TYPES.IN);

  // Establecer el valor del input de producto
  setInputValue(ID_MOVEMENT_PRODUCT, "");
  // Establecer el valor del input de cantidad  
  setInputValue(ID_MOVEMENT_QUANTITY, "");
  // Establecer el valor del input de fecha
  setInputValue(ID_MOVEMENT_DATE, MOVEMENTS_STATE.filterDate || new Date().toISOString().split("T")[0]);
  // Establecer el valor del input de observaciones
  setInputValue(ID_MOVEMENT_NOTE, "");

  // Mostrar el formulario después de hacer todos los ajustes
  toggleModalModules();
}


/**
 * Configura los listeners para el selector de tipo de movimiento
 * @returns {void}
 */
function setupInOutSelectorListeners() {
  // obtener los elementos del selector
  const typeIn = document.getElementById(ID_MOVEMENT_TYPE_IN);
  const typeOut = document.getElementById(ID_MOVEMENT_TYPE_OUT);

  // verificar que se encontraron los elementos del selector
  if (!typeIn || !typeOut) {
    console.error("No se encontraron los elementos del selector");
    return;
  }

  // configurar el listener para el tipo de movimiento "IN"
  typeIn.onclick = () => {
    MOVEMENTS_STATE.currentType = MOVEMENTS_TYPES.IN;
    console.log("typeIn clicked, MOVEMENTS_STATE.currentType: ", MOVEMENTS_STATE.currentType);
  };

  // configurar el listener para el tipo de movimiento "OUT"
  typeOut.onclick = () => {
    MOVEMENTS_STATE.currentType = MOVEMENTS_TYPES.OUT;
    console.log("typeOut clicked, MOVEMENTS_STATE.currentType: ", MOVEMENTS_STATE.currentType);
  };
}


/**
 * Configura el selector de tipo de movimiento
 * @param {string} type - Tipo de movimiento ("IN" | "OUT")
 * @returns {void}
 */
function setInOutSelector(type) {
  // obtener el elemento del selector según el tipo
  const typeElem = type === MOVEMENTS_TYPES.OUT
    ? document.getElementById(ID_MOVEMENT_TYPE_OUT)
    : document.getElementById(ID_MOVEMENT_TYPE_IN);

  if (typeElem) {
    typeElem.click();
  }
}

/**
 * @description Limpia todos los campos del formulario
 * @returns {void}
 * @example
 * resetMovementForm();
 * // Limpia todos los campos del formulario
 * // campos: movementProduct, movementQuantity, movementDate, movementNote
 * // el.value = ""; // Limpia el valor del campo
 * // el.classList.remove("is-invalid"); // Elimina la clase is-invalid del campo
 */
function resetMovementForm() {
  const fields = [
    ID_MOVEMENT_PRODUCT,
    ID_MOVEMENT_QUANTITY,
    ID_MOVEMENT_DATE,
    ID_MOVEMENT_NOTE,
  ];

  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
      el.classList.remove("is-invalid");
    }
  });

  // Limpiar estado de edición
  MOVEMENTS_STATE.elementToEdit = null;
}

/**
 * Inicializa el buscador de movimientos
 * Configura los event listeners para el input de búsqueda y el botón de limpiar
 * @returns {void}
 */
function initMovementSearch() {
  const input = document.getElementById(ID_SEARCH_MOVEMENT);
  const btnClear = document.getElementById(BTN_ID_CLEAR_SEARCH_MOVEMENT);

  if (!input || !btnClear) return;

  input.addEventListener("input", () => {
    MOVEMENTS_STATE.searchText = input.value.toLowerCase();
    btnClear.classList.toggle("d-none", !MOVEMENTS_STATE.searchText);
    updateClearFiltersButton();
    renderMovements();
  });

  btnClear.onclick = () => {
    input.value = "";
    MOVEMENTS_STATE.searchText = "";
    btnClear.classList.add("d-none");
    updateClearFiltersButton();
    renderMovements();
    input.focus();
  };
}

/**
 * Inicializa los filtros de movimientos (tipo y fecha)
 * Configura los event listeners para los botones de filtro y el input de fecha
 * @returns {void}
 */
function initMovementFilters() {
  const filterIn = document.getElementById(BTN_ID_FILTER_IN);
  const filterOut = document.getElementById(BTN_ID_FILTER_OUT);
  const filterDate = document.getElementById(ID_FILTER_DATE);

  if (filterIn) {
    filterIn.onclick = () => {
      if (MOVEMENTS_STATE.chipFiltered === MOVEMENTS_TYPES.IN) {
        MOVEMENTS_STATE.chipFiltered = null;
        filterIn.classList.remove("active");
      } else {
        MOVEMENTS_STATE.chipFiltered = MOVEMENTS_TYPES.IN;
        filterIn.classList.add("active");
        if (filterOut) filterOut.classList.remove("active");
      }
      updateClearFiltersButton();
      renderMovements();
    };
  }

  if (filterOut) {
    filterOut.onclick = () => {
      if (MOVEMENTS_STATE.chipFiltered === MOVEMENTS_TYPES.OUT) {
        MOVEMENTS_STATE.chipFiltered = null;
        filterOut.classList.remove("active");
      } else {
        MOVEMENTS_STATE.chipFiltered = MOVEMENTS_TYPES.OUT;
        filterOut.classList.add("active");
        if (filterIn) filterIn.classList.remove("active");
      }
      updateClearFiltersButton();
      renderMovements();
    };
  }

  if (filterDate) {
    filterDate.onchange = () => {
      MOVEMENTS_STATE.filterDate = filterDate.value || null;
      updateClearFiltersButton();
      renderMovements();
    };
  }
}

// ===============================
// Filtrado y Ordenamiento
// ===============================

/**
 * Filtra movimientos usando los criterios de MOVEMENTS_STATE
 * @param {Array} movements - Lista de movimientos a filtrar
 * @returns {Array} Lista de movimientos filtrados
 */
function filterMovements(movements) {
  let filtered = [...movements];

  // Filtro por PV actual (HU20)
  if (typeof filterByCurrentStore === "function") {
    filtered = filterByCurrentStore(filtered);
  }

  // Filtro por texto de búsqueda (busca en nombre del producto)
  if (MOVEMENTS_STATE.searchText) {
    filtered = filtered.filter((m) => {
      const product = CACHE.products.find((p) => p.id === m.productId);
      if (!product) return false;
      return product.name.toLowerCase().includes(MOVEMENTS_STATE.searchText.toLowerCase());
    });
  }

  // Filtro por tipo (in/out)
  if (MOVEMENTS_STATE.chipFiltered) {
    filtered = filtered.filter(
      (m) => m.type.toUpperCase() === MOVEMENTS_STATE.chipFiltered.toUpperCase()
    );
  }

  // Filtro por fecha
  if (MOVEMENTS_STATE.filterDate) {
    filtered = filtered.filter((m) => m.date === MOVEMENTS_STATE.filterDate);
  }

  return filtered;
}

/**
 * Ordena movimientos usando los criterios de MOVEMENTS_STATE
 * @param {Array} movements - Lista de movimientos a ordenar
 * @returns {Array} Lista de movimientos ordenados
 */
function sortMovements(movements) {
  return [...movements].sort((a, b) => {
    v1 = a[MOVEMENTS_STATE.orderBy];
    v2 = b[MOVEMENTS_STATE.orderBy];

    // Para fechas, comparar directamente
    if (MOVEMENTS_STATE.orderBy === "date") {
      if (v1 < v2) return MOVEMENTS_STATE.orderDir === "asc" ? -1 : 1;
      if (v1 > v2) return MOVEMENTS_STATE.orderDir === "asc" ? 1 : -1;
      return 0;
    }

   

    // Normalizar strings para comparación
    if (typeof v1 === "string") {
      v1 = v1.toLowerCase();
      v2 = v2.toLowerCase();
    }

    if (v1 < v2) return MOVEMENTS_STATE.orderDir === "asc" ? -1 : 1;
    if (v1 > v2) return MOVEMENTS_STATE.orderDir === "asc" ? 1 : -1;
    return 0;
  });
}

// ===============================
// Render
// ===============================

/**
 * Renderiza la lista de movimientos en el DOM
 * @param {Array} movements - Lista de movimientos a renderizar
 * @returns {void}
 */
function renderMovementsList(movements) {
  // Obtener los elementos del DOM
  const movementsList = document.getElementById(ID_MOVEMENTS_LIST);
  const movementTemplate = document.getElementById(ID_MOVEMENT_CARD_TEMPLATE);
  

  if (!movementsList || !movementTemplate) return;

  // Limpiar la lista de movimientos
  movementsList.replaceChildren();

  if (movements.length === 0) {
    const placeholder = createEmptyStatePlaceholder("No se encontraron movimientos");
    if (placeholder) movementsList.appendChild(placeholder);
    return;
  }

  // Recorrer la lista de movimientos
  movements.forEach((m) => {
    // Obtener el producto
    const product = CACHE.products.find((p) => p.id === m.productId);
    if (!product) {
      console.error("No se encontró el producto: ", m.productId);
      return; // Si no existe el producto, no mostrar el movimiento
    }

    // Clonar el template del movimiento
    const node = movementTemplate.content.cloneNode(true);
    const card = node.querySelector(".card");
    const iconDiv = node.querySelector(".movement-icon");
    const iconI = node.querySelector(".movement-icon-i");
    const productName = node.querySelector(".movement-product");
    const meta = node.querySelector(".movement-meta");

    // Configurar icono según tipo (IN = + verde, OUT = - rojo)
    if (m.type === MOVEMENTS_TYPES.IN) {
      iconDiv.classList.add("bg-success");
      iconI.className = "bi bi-plu bi-arrow-right text-white";
    } else {
      iconDiv.classList.add("bg-danger");
      iconI.className = "bi bi-das bi-arrow-left text-white";
    }

    // Configurar contenido
    productName.textContent = product.name;

    // Formatear fecha: "19/12/2025" desde "2025-12-19"
    const dateObj = new Date(m.date + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Mostrar cantidad con icono de caja (similar a productos)
    meta.innerHTML = `<i class="bi bi-calendar"></i> ${formattedDate} • <i class="bi bi-boxes"></i> ${formatTo2(m.quantity)} `;

    // Configurar botones de acción
    node.querySelector(".btn-edit-movement").onclick = () => {
      openEditMovementModal(m.id).catch((err) =>
        console.error("[movements] openEditMovementModal", err)
      );
    };
    node.querySelector(".btn-delete-movement").onclick = () => {
      openDeleteMovementModal(m.id).catch((err) =>
        console.error("[movements] openDeleteMovementModal", err)
      );
    };

    movementsList.appendChild(node);
  });
}

/**
 * Función principal que renderiza los movimientos
 * Filtra, ordena y renderiza usando MOVEMENTS_STATE
 * @returns {Promise<void>}
 */
async function renderMovements() {
  const allMovements = await getAllMovements();

  // Primero filtrar, luego ordenar
  const filtered = filterMovements(allMovements);
  console.log("filtrados: ", filtered);

  const sorted = sortMovements(filtered);
  console.log("ordenados: ", sorted);

  updateListCounter(sorted.length, allMovements.length, PAGE_MOVEMENTS);
  renderMovementsList(sorted);
}

// ===============================
// Guardado
// ===============================

/**
 * Guarda el movimiento desde el modal
 * Valida los campos, actualiza el stock del producto y guarda el movimiento
 * @returns {Promise<void>}
 */
async function saveMovementFromModal() {


  const productInput = document.getElementById(ID_MOVEMENT_PRODUCT);
  const quantityInput = document.getElementById(ID_MOVEMENT_QUANTITY);
  const dateInput = document.getElementById(ID_MOVEMENT_DATE);
  const noteInput = document.getElementById(ID_MOVEMENT_NOTE);


  if (!productInput || !quantityInput || !dateInput) {
    console.error("No se encontraron los campos del formulario");
    return;
  }

  // El tipo de movimiento del selector ya está definido en MOVEMENTS_STATE.currentType 
  // Se actualiza cuando se hace clic en el selector de tipo de movimiento


  const productName = getInputValue(ID_MOVEMENT_PRODUCT);
  const quantity = parseFloat(getInputValue(ID_MOVEMENT_QUANTITY));
  const date = getInputValue(ID_MOVEMENT_DATE);
  const note = getInputValue(ID_MOVEMENT_NOTE) || "";

  // Validaciones
  // Validar que se ingresó un producto
  if (!productName) {
    setInputError(ID_MOVEMENT_PRODUCT, "Seleccioná un producto");
    return;
  }

  // Validar que el producto existe (vista catálogo + stock HU17)
  const productsView =
    typeof getProductsWithStockFromCache === "function"
      ? getProductsWithStockFromCache(
          typeof getCurrentStoreId === "function" ? getCurrentStoreId() : null
        )
      : CACHE.products || [];
  const product = productsView.find(
    (p) => p.name.toLowerCase() === productName.toLowerCase()
  );
  // Si el producto no existe, mostrar error
  if (!product) {
    setInputError(ID_MOVEMENT_PRODUCT, "El producto no existe");
    return;
  }

  // Validar que se ingresó una cantidad válida
  if (Number.isNaN(quantity) || quantity <= 0) {
    setInputError(ID_MOVEMENT_QUANTITY, "Ingresá una cantidad válida");
    return;
  }

  // Obtener el movimiento a editar si existe
  const editingMovement = MOVEMENTS_STATE.elementToEdit
    ? await getMovementById(MOVEMENTS_STATE.elementToEdit)
    : null;

  // Validar stock para salidas (solo si es nuevo movimiento o si cambió la cantidad/producto)
  if (MOVEMENTS_STATE.currentType === MOVEMENTS_TYPES.OUT) {
    let availableStock = product.quantity;

    // Si estamos editando, considerar el stock que se revertirá
    if (MOVEMENTS_STATE.elementToEdit) {

      // Si el movimiento existe y es del mismo producto, considerar el stock que se revertirá
      if (editingMovement && editingMovement.productId === product.id) {
        // Si es el mismo producto, el stock disponible incluye la cantidad que se revertirá
        if (editingMovement.type === MOVEMENTS_TYPES.IN) {
          availableStock -= editingMovement.quantity; // Ya estaba sumado
        } else {
          availableStock += editingMovement.quantity; // Se revertirá la resta
        }
      } else if (
        editingMovement &&
        editingMovement.productId !== product.id
      ) {
        // Si cambió el producto, no hay efecto de reversión en el nuevo producto
        // El stock disponible es el actual
      }
    }

    if (availableStock < quantity) {
      setInputError(
        ID_MOVEMENT_QUANTITY,
        `Stock insuficiente. Disponible: ${formatTo2(availableStock)}`
      );
      return;
    }
  }

  // Validar que se ingresó una fecha
  if (!date) {
    setInputError(ID_MOVEMENT_DATE, "Seleccioná una fecha");
    return;
  }

  const quantityRounded = roundTo2(quantity);

  // GUARDAR MOVIMIENTO
  //const movements = getData(PAGE_MOVEMENTS) || [];

  if (MOVEMENTS_STATE.elementToEdit) {
    // EDITAR: Actualizar movimiento existente
    if (!editingMovement?.id) {
      setInputError(ID_MOVEMENT_PRODUCT, "No se encontró el movimiento a editar");
      return;
    }

    // Al editar: siempre revertir el efecto anterior y luego aplicar el nuevo.
    // Si solo se cambia la cantidad del mismo producto, sin revertir se sumaría de más
    // (ej. entrada 10→20 dejaba stock +30 en vez de +20).
    const revertDelta =
      editingMovement.type === MOVEMENTS_TYPES.IN
        ? -editingMovement.quantity
        : editingMovement.quantity;
    const applyDelta =
      MOVEMENTS_STATE.currentType === MOVEMENTS_TYPES.IN
        ? quantityRounded
        : -quantityRounded;

    const afterRevert = await updateProductQuantity(
      editingMovement.productId,
      revertDelta
    );
    if (afterRevert === -1) {
      setInputError(
        ID_MOVEMENT_QUANTITY,
        "Stock insuficiente para revertir el movimiento"
      );
      return;
    }

    const afterApply = await updateProductQuantity(product.id, applyDelta);
    if (afterApply === -1) {
      // Deshacer la reversión para no dejar el stock inconsistente
      await updateProductQuantity(editingMovement.productId, -revertDelta);
      setInputError(
        ID_MOVEMENT_QUANTITY,
        "Stock insuficiente para aplicar el movimiento"
      );
      return;
    }

    // Actualizar el movimiento
    const updatedMovement = {
      ...editingMovement,
      productId: product.id,
      type: MOVEMENTS_STATE.currentType,
      quantity: quantityRounded,
      date: date,
      note: note || "",
    };
    await saveMovement(updatedMovement);

    MOVEMENTS_STATE.elementToEdit = null;
  } else {
    // NUEVO: 

    //1. Actualizar stock del producto para ver si hay suficiente stock
    let deltaQuantity = MOVEMENTS_STATE.currentType === MOVEMENTS_TYPES.IN ? quantityRounded : -quantityRounded;
    let newQuantity = await updateProductQuantity(product.id, deltaQuantity);
    if (newQuantity === -1) {
      // Si el stock es insuficiente, mostrar error y no crear el movimiento
      setInputError(ID_MOVEMENT_QUANTITY, "Stock insuficiente para aplicar el movimiento");
      return;
    }

    //2. Crear nuevo movimiento
    console.log("Crear nuevo movimiento");
    await saveMovement(
      createMovement({
        productId: product.id,
        type: MOVEMENTS_STATE.currentType, //.toUpperCase(),
        quantity: quantityRounded,
        date: date,
        note: note || "",
      })
    );

    // // Actualizar stock del producto
    // const updatedProducts = products.map((p) => {
    //   if (p.id === product.id) {
    //     if (MOVEMENTS_STATE.currentType === MOVEMENTS_TYPES.IN) {
    //       return { ...p, quantity: p.quantity + quantity };
    //     } else {
    //       return { ...p, quantity: p.quantity - quantity };
    //     }
    //   }
    //   return p;
    // });
    // setData(PAGE_PRODUCTS, updatedProducts);


    
  }

  // Cerrar modal y actualizar vista
  hideModalModules();
  MOVEMENTS_STATE.currentType = null;
  await renderMovements();
}

/**
 * Inicializa el autocompletado del input de producto en el modal de movimientos.
 * Crea un <datalist> con los nombres de todos los productos y lo asocia al input
 * para que el navegador muestre sugerencias al escribir.
 * @returns {void}
 */
function initProductAutocomplete() {
  // obtener los productos
  // obtener el input de producto
  const productInput = document.getElementById(ID_MOVEMENT_PRODUCT);

  // verificar que se encontraron los elementos
  if (!productInput) return;
  //if (!Array.isArray(products)) return;

  // Quitar datalist anterior si existe (la función puede llamarse más de una vez)
  const existing = document.getElementById("productsDatalist");
  if (existing) existing.remove();

  // crear el datalist de productos
  const datalist = document.createElement("datalist");
  datalist.id = "productsDatalist";

  // Agregar opciones para cada producto
  CACHE.products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.name;
    datalist.appendChild(option);
  });

  // El datalist debe estar en el DOM para que el input lo use
  document.body.appendChild(datalist);
  // asignar el datalist al input de producto
  productInput.setAttribute("list", "productsDatalist");
}

// ===============================
// Editar y Eliminar
// ===============================

/**
 * Abre el modal para editar un movimiento existente
 * @param {string} id - ID del movimiento a editar
 * @returns {Promise<void>}
 */
async function openEditMovementModal(id) {
  // Obtener el movimiento
  const movement = await getMovementById(id);
  if (!movement?.id) return;

  // Obtener el producto
  const product = getProductFromCache(movement.productId);
  if (!product) return;

  // definir el movimiento a editar
  MOVEMENTS_STATE.elementToEdit = id;

  // definir el header del modal para editar movimiento
  setModalHeader(MODAL_MOVEMENTS, true);

  // Limpiar errores de validación anteriores del modal
  clearInputErrors([ID_MOVEMENT_PRODUCT, ID_MOVEMENT_QUANTITY, ID_MOVEMENT_DATE, ID_MOVEMENT_NOTE]);

  // definir el tipo de movimiento
  // actualiza el movement_state y el selector de tipo de movimiento
  setInOutSelector(movement.type);


  // Llenar campos con datos del movimiento
  // Establecer el valor del input de producto
  setInputValue(ID_MOVEMENT_PRODUCT, product.name);
  // Establecer el valor del input de cantidad
  setInputValue(ID_MOVEMENT_QUANTITY, formatTo2(movement.quantity));
  // Establecer el valor del input de fecha
  setInputValue(ID_MOVEMENT_DATE, movement.date);
  // Establecer el valor del input de observaciones
  setInputValue(ID_MOVEMENT_NOTE, movement.note || "");

  // Mostrar modal
  toggleModalModules();
}

/**
 * Abre el modal para eliminar un movimiento
 * @param {string} id - ID del movimiento a eliminar
 * @returns {Promise<void>}
 */
async function openDeleteMovementModal(id) {
  // definir el movimiento a eliminar
  MOVEMENTS_STATE.elementToDelete = id;

  // Obtener el movimiento
  const movement = await getMovementById(id);
  if (!movement?.id) return;

  // Obtener el producto
  const product = getProductFromCache(movement.productId);
  if (!product) return;

  // definir el tipo de movimiento
  const movementTypeText = movement.type === MOVEMENTS_TYPES.IN ? "entrada" : "salida";
  // abrir el modal de confirmación de eliminación
  openConfirmDeleteModal(
    "movement",
    id,
    `${movementTypeText} de ${product.name}`
  );
}

/**
 * Confirma la eliminación de un movimiento
 * Elimina el movimiento y revierte el efecto en el stock del producto
 * @returns {Promise<void>}
 */
async function confirmDeleteMovement() {
  if (!MOVEMENTS_STATE.elementToDelete) return;

  const movement = await getMovementById(MOVEMENTS_STATE.elementToDelete);
  if (!movement?.id) return;

  // Guardar estado undo
  UNDO_STATE.data = movement;
  UNDO_STATE.type = PAGE_MOVEMENTS;

  // Revertir el efecto en el stock del producto (y sincronizar caché)
  const deltaQuantity =
    movement.type === MOVEMENTS_TYPES.IN
      ? -movement.quantity
      : movement.quantity;
  const newQuantity = await updateProductQuantity(movement.productId, deltaQuantity);
  if (newQuantity === -1) {
    showToast(
      "No se pudo revertir el stock del producto",
      TOAST_COLORS.DANGER,
      3
    );
    return;
  }

  // Eliminar el movimiento
  await deleteMovement(MOVEMENTS_STATE.elementToDelete);

  MOVEMENTS_STATE.elementToDelete = null;
  DELETE_STATE.type = null;
  DELETE_STATE.id = null;

  hideConfirmModal();
  await renderMovements();
  showSnackbar("Movimiento eliminado");
}
