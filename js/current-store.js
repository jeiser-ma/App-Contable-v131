// ===============================
// Punto de venta actual (contexto global)
// UI + persistencia. Aún no filtra pantallas ni cálculos.
// ===============================

const ID_CURRENT_STORE_SELECT = "currentStoreSelect";

/**
 * Obtiene el id del punto de venta seleccionado
 * @returns {string|null}
 */
function getCurrentStoreId() {
  try {
    const raw = localStorage.getItem(STG_KEYS.CURRENT_STORE_ID);
    if (raw == null || raw === "") return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" && parsed.trim() ? parsed.trim() : null;
  } catch (_) {
    return null;
  }
}

/**
 * Guarda el id del punto de venta seleccionado
 * @param {string|null|undefined} id
 * @returns {void}
 */
function setCurrentStoreId(id) {
  if (!id) {
    localStorage.removeItem(STG_KEYS.CURRENT_STORE_ID);
    return;
  }
  setData(STG_KEYS.CURRENT_STORE_ID, String(id));
}

/**
 * Devuelve el store actual (objeto) o null
 * @returns {Object|null}
 */
function getCurrentStore() {
  const id = getCurrentStoreId();
  if (!id) return null;
  return getDataById(STG_KEYS.STORES, id) || null;
}

/**
 * Asegura un currentStoreId válido (activo si es posible).
 * Si el guardado no existe o está vacío, elige el primer store activo (o el primero).
 * @returns {string|null}
 */
function ensureCurrentStoreId() {
  const stores = getData(STG_KEYS.STORES) || [];
  if (!Array.isArray(stores) || stores.length === 0) {
    setCurrentStoreId(null);
    return null;
  }

  const currentId = getCurrentStoreId();
  const current = currentId ? stores.find((s) => s.id === currentId) : null;
  if (current) return current.id;

  const firstActive = stores.find((s) => s.active !== false);
  const fallback = firstActive || stores[0];
  setCurrentStoreId(fallback.id);
  return fallback.id;
}

/**
 * Opciones del selector: activos + el actual si está inactivo
 * @returns {Array<Object>}
 */
function getStoresForSelector() {
  const stores = getData(STG_KEYS.STORES) || [];
  if (!Array.isArray(stores)) return [];

  const currentId = getCurrentStoreId();
  const sorted = [...stores].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    })
  );

  return sorted.filter(
    (s) => s.active !== false || (currentId && s.id === currentId)
  );
}

/**
 * Rellena el <select> del navbar según stores y currentStoreId
 * @returns {void}
 */
function refreshCurrentStoreSelector() {
  const select = document.getElementById(ID_CURRENT_STORE_SELECT);
  if (!select) return;

  const selectedId = ensureCurrentStoreId();
  const options = getStoresForSelector();

  select.replaceChildren();

  if (options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Sin PV";
    select.appendChild(opt);
    select.disabled = true;
    select.value = "";
    return;
  }

  select.disabled = false;
  options.forEach((store) => {
    const opt = document.createElement("option");
    opt.value = store.id;
    const inactive = store.active === false ? " (inactivo)" : "";
    opt.textContent = (store.name || "Sin nombre") + inactive;
    select.appendChild(opt);
  });

  if (selectedId && options.some((s) => s.id === selectedId)) {
    select.value = selectedId;
  } else {
    select.value = options[0].id;
    setCurrentStoreId(options[0].id);
  }
}

/**
 * Inicializa el selector del navbar (opciones + change)
 * @returns {void}
 */
function initCurrentStoreSelector() {
  const select = document.getElementById(ID_CURRENT_STORE_SELECT);
  if (!select) return;

  refreshCurrentStoreSelector();

  select.onchange = () => {
    const id = select.value || null;
    setCurrentStoreId(id);
    // Más adelante: recargar pantalla activa / filtrar por store
  };
}
