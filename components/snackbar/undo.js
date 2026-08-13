//#region Constants
const ID_BTN_UNDO = "btnUndo";
const ID_SNACKBAR = "snackbar";
const ID_SNACKBAR_TEXT = "snackbarText";
const ID_SNACKBAR_CLOSE = "snackbarClose";

//#endregion

// Estado de deshacer eliminaciones (HU13: todas las ramas vía repos)
const UNDO_STATE = {
  data: null,
  type: null,
  index: null, // Para unidades y conceptos (guardar posición original)
  buttonListener: null,
  timer: null,
  restoring: false,
};

/**
 * Muestra el snackbar con el texto especificado
 * Activa el event listener del botón undo solo cuando el snackbar está visible
 * @param {string} text - Texto a mostrar en el snackbar
 * @returns {void}
 */
function showSnackbar(text) {
  const bar = document.getElementById(ID_SNACKBAR);
  const btnUndo = document.getElementById(ID_BTN_UNDO);
  const btnClose = document.getElementById(ID_SNACKBAR_CLOSE);

  if (!bar || !btnUndo || !btnClose) return;

  document.getElementById(ID_SNACKBAR_TEXT).textContent = text;
  bar.classList.remove("d-none");
  UNDO_STATE.restoring = false;

  // Agregar event listener solo cuando el snackbar está visible
  if (!UNDO_STATE.buttonListener) {
    UNDO_STATE.buttonListener = () => {
      undoDelete().catch((err) => {
        console.error("[undo] undoDelete", err);
        if (typeof showToast === "function") {
          showToast("No se pudo deshacer la eliminación", TOAST_COLORS.DANGER, 3);
        }
      });
    };
    btnUndo.addEventListener("click", UNDO_STATE.buttonListener);
  }

  clearTimeout(UNDO_STATE.timer);
  UNDO_STATE.timer = setTimeout(() => {
    hideSnackbar();
    clearUndoState();
  }, 5000);
}

/**
 * Limpia el estado de deshacer
 * @returns {void}
 */
function clearUndoState() {
  UNDO_STATE.data = null;
  UNDO_STATE.type = null;
  UNDO_STATE.index = null;
  UNDO_STATE.restoring = false;
}

/**
 * Oculta el snackbar y remueve el event listener del botón undo
 * @returns {void}
 */
function hideSnackbar() {
  const bar = document.getElementById(ID_SNACKBAR);
  const btnUndo = document.getElementById(ID_BTN_UNDO);

  if (bar) {
    bar.classList.add("d-none");
  }

  // Remover event listener cuando el snackbar se oculta
  if (btnUndo && UNDO_STATE.buttonListener) {
    btnUndo.removeEventListener("click", UNDO_STATE.buttonListener);
    UNDO_STATE.buttonListener = null;
  }
}

/**
 * Deshace la eliminación de un elemento
 * Restaura el elemento eliminado según su tipo
 * @returns {Promise<void>}
 */
async function undoDelete() {
  if (!UNDO_STATE.data || !UNDO_STATE.type || UNDO_STATE.restoring) return;

  // Snapshot y cierre UI al inicio: evita doble clic durante awaits
  const payload = UNDO_STATE.data;
  const type = UNDO_STATE.type;
  const index = UNDO_STATE.index;
  UNDO_STATE.restoring = true;
  clearTimeout(UNDO_STATE.timer);
  hideSnackbar();

  try {
    // Unidades, conceptos y monedas (repos settings; conservan índice)
    if (
      type === STG_KEYS.UNITS ||
      type === STG_KEYS.EXPENSE_CONCEPTS ||
      type === STG_KEYS.CURRENCIES
    ) {
      let data;
      if (type === STG_KEYS.UNITS) {
        data = await getUnits();
      } else if (type === STG_KEYS.CURRENCIES) {
        data = await getCurrencies();
      } else {
        data = await getExpenseConcepts();
      }
      if (!Array.isArray(data)) data = [];
      const insertAt =
        index !== undefined && index !== null ? index : data.length;
      data.splice(insertAt, 0, payload);

      if (type === STG_KEYS.UNITS) {
        await saveUnits(data);
        if (typeof renderUnits === "function") await renderUnits();
      } else if (type === STG_KEYS.CURRENCIES) {
        await saveCurrencies(data);
        if (typeof renderCurrencies === "function") await renderCurrencies();
      } else {
        await saveExpenseConcepts(data);
        if (typeof renderConcepts === "function") await renderConcepts();
      }
    } else if (
      (type === "finance-inputs" || type === "finance-outputs") &&
      typeof undoFinanceFlowDelete === "function"
    ) {
      await undoFinanceFlowDelete(type, payload, index);
    } else if (type === PAGE_MOVEMENTS || type === STG_KEYS.MOVEMENTS) {
      const movement = payload;
      await saveMovement(movement);

      if (movement && typeof updateProductQuantity === "function") {
        const delta =
          movement.type === MOVEMENTS_TYPES.IN
            ? Number(movement.quantity) || 0
            : -(Number(movement.quantity) || 0);
        await updateProductQuantity(movement.productId, delta);
      }

      if (typeof renderMovements === "function") {
        await renderMovements();
      }
    } else if (type === PAGE_PRODUCTS || type === STG_KEYS.PRODUCTS) {
      await saveProduct(payload);
      if (typeof syncProductInCache === "function" && payload) {
        syncProductInCache(payload);
      }
      if (typeof upsertStockForProduct === "function" && payload) {
        const storeId =
          typeof getCurrentStoreId === "function" ? getCurrentStoreId() : null;
        await upsertStockForProduct(payload, storeId);
      }
      if (typeof renderProducts === "function") {
        await renderProducts();
      }
    } else if (type === PAGE_STORES || type === STG_KEYS.STORES) {
      await saveStore(payload);
      if (typeof renderStores === "function") {
        await renderStores();
      }
      if (typeof refreshCurrentStoreSelector === "function") {
        await refreshCurrentStoreSelector();
      }
    } else if (type === PAGE_INVENTORY || type === STG_KEYS.INVENTORY) {
      await saveInventoryCount(payload);
      if (typeof renderInventory === "function") {
        await renderInventory();
      }
    } else if (type === PAGE_EXPENSES || type === STG_KEYS.EXPENSES) {
      await saveExpense(payload);
      if (typeof renderExpenses === "function") {
        await renderExpenses();
      }
    } else {
      console.warn("[undo] tipo no soportado:", type);
    }
  } finally {
    clearUndoState();
  }
}


// Delegación: el snackbar se carga después en components-container
document.getElementById(ID_COMPONENTS_CONTAINER)?.addEventListener("click", (e) => {
  if (e.target.id === ID_SNACKBAR_CLOSE) {
    hideSnackbar();
  }
});
