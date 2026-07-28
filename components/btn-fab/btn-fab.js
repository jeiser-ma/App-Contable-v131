

/**
 * Configura el botón FAB
 * @param {string} iconClass - Clase de icono para el botón (ejm: bi-plus, bi-trash, etc. Por defecto: bi-three-dots)
 * @param {string} colorClass - Clase de color para el botón (ejm: btn-secondary, btn-success, etc. Por defecto: btn-primary)
 * @param {function} callbackFn - Función para ejecutar en el evento onclick
 * @returns {void}
 */
function setupBtnFAB(btnFabId, iconClass, colorClass, callbackFn) {

  // cargar el template del botón FAB
  const template = document.getElementById(ID_BTN_FAB_TEMPLATE);
  if (!template) {
    throw new Error("No se encontró el template del botón FAB");
  }
  const btnFab = template.content.firstElementChild.cloneNode(true);
  
  if (btnFab) {
    // añadir el id al botón FAB
    if(btnFabId){
      btnFab.id = btnFabId;
    }

    // añadir la clase de color al botón FAB
    if(colorClass){
      btnFab.classList.replace("btn-primary", colorClass);
      //btnFab.classList.remove("btn-primary");
      //btnFab.classList.add(colorClass);
    }
    
    // añadir la clase de icono al botón FAB
    const btnFabIcon = btnFab.querySelector(`.${CLASS_CONTROL_BTN_FAB_ICON}`);
    if(btnFabIcon && iconClass){
      btnFabIcon.classList.replace("bi-three-dots", iconClass);
    }

    // añadir el evento onclick
    btnFab.onclick = () => {
      if (callbackFn && typeof callbackFn === "function") {
        callbackFn();
      }
    };

    document.getElementById(ID_BTN_FAB_CONTAINER).appendChild(btnFab);
  }
}



/**
 * Limpia el contenido de los botones FAB
 * @returns {void}
 */
function clearBtnFABs() {
  const container = document.getElementById(ID_BTN_FAB_CONTAINER);
  if (container) {
    container.replaceChildren();
  }
}


