/**
 * ============================================================================
 * Scroll Helpers
 * Funciones reutilizables para navegación vertical de la página.
 * ============================================================================
 */

const SCROLL_TOP_OFFSET = 150;
const SCROLL_BOTTOM_OFFSET = 150;
const SCROLL_ANIMATION_MS = 500;

let isScrolling = false;
let scrollListenerInitialized = false;

/**
 * Realiza un scroll suave hasta la posición indicada.
 * @param {number} top Posición vertical destino.
 */
function scrollToPosition(top) {

  if (isScrolling) return;

  isScrolling = true;

  window.scrollTo({
    top,
    behavior: "smooth"
  });

  setTimeout(() => {
    isScrolling = false;
  }, SCROLL_ANIMATION_MS);
}


/**
 * Desplaza la página hasta el inicio.
 */
function scrollPageTop() {
  scrollToPosition(0);
}


/**
 * Desplaza la página hasta el final.
 */
function scrollPageBottom() {
  scrollToPosition(document.documentElement.scrollHeight);
}


/**
 * Devuelve true si la página está cerca del inicio.
 * @returns {boolean}
 */
function isScrollAtTop() {
  return window.scrollY <= SCROLL_TOP_OFFSET;
}


/**
 * Devuelve true si la página está cerca del final.
 * @returns {boolean}
 */
function isScrollAtBottom() {

  const maxScroll =
    document.documentElement.scrollHeight - window.innerHeight;

  return window.scrollY >= (maxScroll - SCROLL_BOTTOM_OFFSET);
}


/**
 * Actualiza la visibilidad de los botones FAB de scroll.
 *
 * - Oculta el botón ↑ cuando estamos arriba.
 * - Oculta el botón ↓ cuando estamos abajo.
 *
 * @param {string} btnTopId
 * @param {string} btnBottomId
 */
function updateScrollFABsVisibility(btnTopId, btnBottomId) {

  const btnTop = document.getElementById(btnTopId);
  const btnBottom = document.getElementById(btnBottomId);

  if (!btnTop || !btnBottom) return;

  btnTop.classList.toggle("d-none", isScrollAtTop());

  btnBottom.classList.toggle("d-none", isScrollAtBottom());

}


/**
 * Inicializa la navegación mediante botones FAB.
 *
 * Debe llamarse una única vez cuando la página termina de cargarse.
 *
 * @param {string} btnTopId
 * @param {string} btnBottomId
 */
function initializeScrollFABs(btnTopId, btnBottomId) {

    updateScrollFABsVisibility(btnTopId, btnBottomId);

    if (scrollListenerInitialized) return;

    scrollListenerInitialized = true;

    window.addEventListener("scroll", () => {
        updateScrollFABsVisibility(btnTopId, btnBottomId);
    });

}
