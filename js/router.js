// ===============================
// Router - App Contable
// ===============================

//==============================================
//#region loaders
//==============================================

/**
 * Carga una página HTML y la inserta en el DOM
 * Busca primero en modules/{page}/ si es un módulo, sino en shared/pages/
 * @param {string} page - Nombre de la página a cargar
 * @returns {void}
 */
async function loadPage(page) {
  const pageConfig = PAGES_CONFIG[page];
  const isModule = pageConfig?.isModule || false;

  // Determinar la ruta según si es módulo o página compartida
  const path = isModule ? `modules/${page}/${page}.html` : `pages/${page}.html`;

  console.log("Cargando página:", path);
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${page} desde ${path}`);
  }

  const html = await response.text();
  const pagesContainer = document.getElementById(ID_PAGES_CONTAINER);
  if (!pagesContainer) return;
  pagesContainer.innerHTML = html;
  console.log("Página cargada OK");

  // Configuración de la navbar y el título de la página
  setActiveNav(page);
  setPageTitle(page);

  // Ocultar controles del módulo si no es un módulo
  if (!pageConfig || !pageConfig.isModule) {
    hideModuleControls();
  }

  // Limpiar los botones FAB de la página 
  // (si se carga una página nueva, se limpian los botones FAB de la página anterior)
  // esto es necesario para que no se acumulen botones FAB en la página
  clearBtnFABs();

  // Ejecutar el hook de la página si existe
  await executePageHook(page);
}

/**
 * Ejecuta el hook de una página si existe
 * El hook debe tener el nombre onPageNameLoaded
 * Por ejemplo: onProductsPageLoaded, onMovementsPageLoaded, onSettingsPageLoaded
 * @param {string} page - Nombre de la página
 * @returns {Promise<void>}
 */
async function executePageHook(page) {
  // Construimos el nombre de la función del hook a partir del nombre de la página
  const hookName = `on${page.charAt(0).toUpperCase() + page.slice(1)}PageLoaded`;

  console.log("Buscando hook:", hookName);
  // Buscamos la función del hook en el objeto window
  const hookFunction = window[hookName];
  if (hookFunction) {
    console.log("Ejecutando hook " + hookName);
    // Ejecutamos la función del hook
    await hookFunction();
  } else {
    console.log("Hook NO existe la función: " + hookName);
  }
}

/**
 * Carga un modal HTML y lo inserta en el body del documento
 * Busca primero en modules/{module}/modals/ si es un modal de módulo,
 * sino busca en shared/pages/modals/ para modales compartidos
 * @param {string} name - Nombre del modal a cargar (ej: "product-modal", "confirm-delete")
 * @param {string} module - Opcional: nombre del módulo si es un modal específico
 */
async function loadModal(name, module = null) {
  // Determinar la ruta según si es modal de módulo o compartido
  let path;

  if (module) {
    // Modal específico de un módulo
    path = `modules/${module}/modals/${name}.html`;
  } else {
    // Modal compartido (confirm-delete, etc.)
    path = `components/${name}/${name}.html`;
  }

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el modal ${name} desde ${path}`);
    }
    
    const html = await response.text();
    document
      .getElementById(ID_MODALS_CONTAINER)
      .insertAdjacentHTML("beforeend", html);
    console.log(`${name} loaded from ${path}`);
  } catch (error) {
    console.error(`Error cargando modal ${name}:`, error);
    throw error;
  }
}

/**
 * Carga un componente HTML y lo inserta en el body del documento
 * Los componentes siempre están en components/{name}/
 * @param {string} name - Nombre del componente a cargar
 * @returns {Promise<void>}
 */
async function loadComponent(name) {
  try {
    const response = await fetch(`components/${name}/${name}.html`);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el componente ${name}`);
    }
    
    const html = await response.text();
    const componentsContainer = document.getElementById(ID_COMPONENTS_CONTAINER);
    componentsContainer.insertAdjacentHTML("beforeend", html);
    console.log(`Component ${name} loaded`);
  } catch (error) {
    console.error(`Error cargando componente ${name}:`, error);
    throw error;
  }
}



/**
 * Carga un componente HTML y lo inserta en el body del documento
 * Los componentes siempre están en components/{name}/
 * @param {string} name - Nombre del control a cargar
 * @returns {Promise<void>}
 */
async function loadModuleControl(name) {
  try {
    const response = await fetch(`components/${name}/${name}.html`);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el control ${name}`);
    }
    
    const html = await response.text();
    const config = MODULES_CONTROLS_CONFIG[name];
    if (!config) {
      throw new Error(`No se encontró la configuración del control ${name}`);
    }
    const controlContainer = document.getElementById(config.containerId);
    if (!controlContainer) {
      throw new Error(`No se encontró el contenedor del control ${name}`);
    }
    controlContainer.insertAdjacentHTML("beforeend", html);
    console.log(`Control ${name} loaded`);
  } catch (error) {
    console.error(`Error cargando control ${name}:`, error);
    throw error;
  }
}



//==============================================
//#region main
//==============================================

/**
 * Página inicial al entrar al layout
 * Carga el modal confirm-delete, el componente snackbar, la página inicial y la navbar inferior
 * @returns {void}
 */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById(ID_PAGES_CONTAINER)) {
    void bootLayoutApp();
  }
});

/**
 * Boot del layout: persistencia (IDB + HU15 + HU16) y luego UI.
 * @returns {Promise<void>}
 */
async function bootLayoutApp() {
  if (typeof initAppPersistence === "function") {
    try {
      await initAppPersistence();
    } catch (err) {
      console.error("[router] initAppPersistence", err);
    }
  }

    // Cargar los componentes compartidos:
    // - modal confirm-delete
    // - componente snackbar
    
    // cargamos el modal confirm-delete
    console.log("Loading confirm-delete");
    loadModal(MODAL_CONFIRM_DELETE);

    // cargamos el modal confirm-action (confirmar cualquier acción: cerrar/reabrir contabilidad, etc.)
    console.log("Loading confirm-action");
    loadModal(MODAL_CONFIRM_ACTION);

    // Cargamos el componente snackbar para mostrar mensajes de error o éxito
    console.log("Loading component snackbar");
    loadComponent("snackbar");

    // Cargamos el componente toast para notificaciones (mensaje, color, duración)
    console.log("Loading component toast");
    loadComponent("toast");

    // Cargamos el componente empty-state para placeholders de listas vacías
    console.log("Loading component empty-state");
    loadComponent("empty-state");

    // Cargamos el componente badge (chips con texto y opción de cerrar)
    console.log("Loading component badge");
    loadComponent("badge");

    // Cargamos el componente scanner (modal para escanear códigos de barras/QR)
    console.log("Loading component scanner");
    loadComponent("scanner");

    // Cargamos el template del componente btn-fab (botón FAB para acciones rápidas)
    console.log("Loading component btn-fab");
    loadComponent("btn-fab");

    // Cargamos la página inicial
    console.log("Loading home page");
    loadPage(PAGE_HOME); //poner el home

    // Iniciamos la navegación (navbar inferior, menú contextual y botón adicionar)
    console.log("Configurando navegación");
    setupNavigation();

  // Selector de punto de venta (contexto global; aún sin filtrar pantallas)
  if (typeof initCurrentStoreSelector === "function") {
    await initCurrentStoreSelector();
  }
}
