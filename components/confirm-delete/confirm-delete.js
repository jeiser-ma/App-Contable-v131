//#region Constants

// Estado global para el modal de confirmación de eliminación
const DELETE_STATE = {
  type: null, // Tipo de elemento a eliminar ("product" | "movement" | etc.)
  id: null,   // ID del elemento a eliminar
};

//==============================================
//#region MODAL DE CONFIRMACION DE ELIMINACION
//==============================================

/**
 * Event listener para el modal de confirmación de eliminación
 * Confirma la eliminación del elemento según su tipo cuando se hace clic en el botón de confirmación
 * @returns {void}
 */
document.getElementById(ID_MODALS_CONTAINER).addEventListener("click", (e) => {
  if (e.target.id === "btnConfirmDelete") {
    confirmDelete();
  }
});

/**
 * Función genérica que confirma la eliminación según el tipo de elemento
 * Llama a la función específica de confirmación según el tipo de elemento DELETE_STATE.type
 * @returns {void}
 */
function confirmDelete() {
  if (
    !DELETE_STATE.type ||
    DELETE_STATE.id === null ||
    DELETE_STATE.id === undefined
  ) {
    console.warn("No hay elemento configurado para eliminar");
    return;
  }

  // Llama a la función específica según el tipo
  // Manejar casos especiales: "unit" -> "Unit", "concept" -> "Concept"
  let functionName = DELETE_STATE.type.charAt(0).toUpperCase() + DELETE_STATE.type.slice(1);
  const confirmFunction = window[`confirmDelete${functionName}`];
  
  if (confirmFunction && typeof confirmFunction === "function") {
    const result = confirmFunction();
    if (result && typeof result.then === "function") {
      result.catch((err) =>
        console.error(`[confirmDelete] confirmDelete${functionName}`, err)
      );
    }
  } else {
    console.error(`No se encontró la función confirmDelete${functionName}`);
  }
}

/**
 * Abre el modal de confirmación de eliminación de forma genérica
 * @param {string} type - Tipo de elemento a eliminar ("product", "movement", etc.)
 * @param {string} id - ID del elemento a eliminar
 * @param {string} name - Nombre del elemento a mostrar en el mensaje
 */
function openConfirmDeleteModal(type, id, name) {
  DELETE_STATE.type = type;
  DELETE_STATE.id = id;

  document.getElementById("confirmDeleteText").textContent = `¿Desea eliminar "${name}"?`;

  new bootstrap.Modal(document.getElementById(MODAL_CONFIRM_DELETE)).show();
}

/**
 * Oculta el modal de confirmación de eliminación
 * @returns {void}
 */
function hideConfirmModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById(MODAL_CONFIRM_DELETE));
  if (modal) {
    modal.hide();
  }
}

