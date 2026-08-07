/**
 * Namespace global de plantillas de datos (capa database / HU03).
 *
 * Propósito:
 * - Documentar la forma de cada entidad.
 * - Crear objetos nuevos con structuredClone (no validan datos).
 *
 * Uso:
 *   const store = structuredClone(SCHEMAS.store);
 *   store.id = crypto.randomUUID();
 *   store.name = "Paradero";
 *
 * Cada archivo *.schema.js aporta una o más claves a este objeto.
 * Convención app: preferir SCHEMAS.x (y namespaces como Storage, CACHE, STG_KEYS)
 * frente a globals sueltas tipo STORE_SCHEMA.
 *
 * Este archivo debe cargarse ANTES que los demás *.schema.js.
 */
const SCHEMAS = {};
