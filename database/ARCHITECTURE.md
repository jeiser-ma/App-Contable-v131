# Capa de acceso a datos — Arquitectura

Documento vivo. Define estructura de carpetas, convenciones y estado de HUs.

## Decisiones respecto al boceto inicial

| Boceto | Decisión HU01 | Motivo |
|--------|---------------|--------|
| `src/database/` | `database/` (raíz del proyecto) | Capa de acceso a datos como concepto de primer nivel (no mezclada con `js/` de UI) |
| `src/modules/` | `modules/` (raíz, existente) | No mover pantallas en esta HU |
| Solo 7 repos | + `stock`, `settings`, `base` | Stock es entidad propia; settings agrupa units/currencies/concepts/salary/currentStoreId |
| Schemas solo en `database/schemas` | Stubs `.js` aquí; JSON en `data/Estructuras/` sigue como referencia | Migración de contenido = HU03 |
| Caché nueva vs `js/cache/` | `database/cache/cache.js` (`CACHE.*`) | Unificado en HU04 ✅ |

## Estructura

```
database/
├── ARCHITECTURE.md          ← este archivo
├── providers/
│   ├── storage-provider.js      ← elige provider activo (HU02 ✅)
│   ├── local-storage.provider.js  ← HU02 ✅
│   └── indexeddb.provider.js    ← stub hasta HU14
├── repositories/
│   ├── base.repository.js       ← contrato común (HU05): getById / upsert / …
│   ├── products.repository.js
│   ├── movements.repository.js
│   ├── inventory.repository.js
│   ├── expenses.repository.js
│   ├── accounting.repository.js
│   ├── finances.repository.js
│   ├── stores.repository.js
│   ├── stock.repository.js
│   └── settings.repository.js   ← config global (métodos por clave: getCurrencies, …)
├── cache/
│   └── cache.js                 ← CACHE unificado (HU04)
└── schemas/                     ← HU03 ✅  (SCHEMAS.*)
    ├── schemas.js               ← namespace vacío
    ├── product.schema.js
    ├── stock.schema.js
    ├── movement.schema.js
    ├── inventory.schema.js
    ├── expense.schema.js
    ├── accounting.schema.js
    ├── finance.schema.js
    └── store.schema.js
```

`modules/`, `components/`, `pages/`, `js/*.js` de UI **no se mueven** en esta épica.

## Capas y responsabilidades

```
UI (modules/, pages/, js/home.js, js/settings.js, …)
        ↓
Repositories  →  qué datos y operaciones de dominio
        ↓
Cache         →  copia en memoria para lecturas rápidas (política en HU04)
        ↓
StorageProvider / Storage  →  get / save / remove / clear / exists (async)
        ↓
LocalStorageProvider | IndexedDBProvider
```

- Los **repositorios no conocen** localStorage ni IndexedDB.
- Un solo archivo elige el provider (`storage-provider.js`).
- Los **schemas** documentan forma de objetos y sirven de plantilla (`structuredClone`), no validan (por ahora).

## Convención de nombres

### Archivos y carpetas
- Carpetas: `kebab-case` o singular temático (`providers`, `repositories`).
- Providers: `{tecnologia}.provider.js` → `local-storage.provider.js`, `indexeddb.provider.js`.
- Repositorios: `{entidad}.repository.js` → `products.repository.js` (plural alineado a `STG_KEYS` / `PAGE_*`).
- Schemas: `{entidad}.schema.js` → singular (`product.schema.js`).
- Caché: un solo `cache.js`.

### Identificadores en código
| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Clave de storage | `STG_KEYS.*` (ya existe) | `STG_KEYS.PRODUCTS` → `"products"` |
| Objeto provider activo | `StorageProvider` (alias `Storage`) | |
| Implementación | `LocalStorageProvider`, `IndexedDBProvider` | |
| API provider (HU02 ✅) | `get`, `save`, `remove`, `clear`, `exists` — **async** | `await Storage.get(key)` |
| Acceso por id | En el **repositorio**, no en el provider | `getProductById(id)` (HU05/HU06) |
| Repo (funciones) | verbo + entidad | `getAllProducts`, `saveProducts`, `getProductById` |
| Caché global | `CACHE` | `CACHE.products`, `CACHE.movements` |
| Schemas | `SCHEMAS.*` (camelCase) | `SCHEMAS.store`, `SCHEMAS.product` |
| Crear desde schema | `structuredClone(SCHEMAS.store)` | |
| Estilo de namespaces | Preferir un objeto raíz | `Storage`, `SCHEMAS`, `CACHE`, `STG_KEYS` |

### Storage Provider — contrato (HU02)

```js
await Storage.get(key)           // null si no existe (repos ponen default)
await Storage.save(key, data)
await Storage.remove(key)
await Storage.clear()            // elimina claves de STG_KEYS
await Storage.clear(["products"]) // solo esas
await Storage.exists(key)        // boolean
```

`Storage` === `StorageProvider` === implementación activa (`LocalStorageProvider` hoy).

El provider trabaja a nivel de **clave completa** (ej. toda la lista `"products"`).
`getById` / `setById` del legado `storage.js` **no van aquí**: son lógica de colección → viven en repositorios (HU05+).

### Async
La interfaz pública es **asíncrona** aunque LocalStorage sea sync por dentro.
Así IndexedDB (HU14) no obliga a reescribir callers otra vez.

### Qué no hacer
- No llamar `localStorage` / `indexedDB` desde módulos ni repos (salvo legado `getData`/`setData` hasta HU13).
- No hidratar en caché colecciones enormes enteras al boot sin política (definir en HU04).
- No usar `save(colecciónCompleta)` como única API a largo plazo; base repo preverá `getById` / `upsert` (HU05).

## Roadmap de HUs (referencia)

1. **HU01** Arquitectura ✅
2. **HU02** Storage Provider ✅
3. **HU03** Schemas ✅
4. **HU04** Cache unificado ✅
5. **HU05** Base Repository ✅
6. **HU06** Products Repository ✅
7. **HU07** Movements Repository ✅
8. **HU08** Expenses Repository ✅
9. **HU09** Inventory Repository ✅
10. **HU10** Accounting Repository ✅
11. **HU11** Stores Repository ✅
12. **HU12** Finances Repository ✅
    - Extra: Stock + Settings repositories ✅
13. **HU13** Migrar módulos existentes (dejar de usar `getData`/`setData` directo)
    - ✅ stores + undo stores + current-store (stores vía repo)
    - ✅ settings: units / currencies / concepts (+ undo)
    - ✅ expenses, movements, inventory, products (+ undo)
    - ✅ accounting, finances
    - ✅ home, exports/imports, list-counter
    - Legado aceptable: `getData`/`setData` solo en `storage.js` (API), `auth.js` (login index), `loadCache` sync (usa getData; repos usan `loadCacheAsync`/`Storage`)
    - `getSalaryPercentage` / `getCurrentStoreId` leen localStorage en el mismo formato JSON que Storage (sync UI)
14. **HU14** IndexedDB Provider
15. **HU15** Migración LocalStorage → IndexedDB

### HU13 — Orden de migración recomendado

| # | Estado | Qué |
|---|--------|-----|
| 0 | ✅ | stores + undo + current-store |
| 1 | ✅ | settings units/currencies/concepts |
| 2 | ✅ | expenses |
| 3 | ✅ | movements (+ updateProductQuantity) |
| 4 | ✅ | inventory |
| 5 | ✅ | products |
| 6 | ✅ | accounting |
| 7 | ✅ | finances |
| 8 | ✅ | home |
| 9 | ✅ | exports / imports (+ invalidateCache) |
| 10 | parcial | currentStoreId/salary sync LS (mismo shape que Storage) |

## Schemas (HU03)

Namespace único `SCHEMAS` (`database/schemas/schemas.js` + aportes por archivo).

Uso:
```js
const store = structuredClone(SCHEMAS.store);
store.id = crypto.randomUUID();
store.name = "Paradero";
store.salaryPercentage = 2.0;
store.createdAt = new Date().toISOString();
```

| Clave | Archivo | Notas |
|-------|---------|--------|
| `SCHEMAS.product` | product.schema.js | Catálogo (sin stock/precios) |
| `SCHEMAS.stock` | stock.schema.js | Por `(storeId, productId)` + `prices` |
| `SCHEMAS.movement` | movement.schema.js | `storeId` multi-PV |
| `SCHEMAS.expense` | expense.schema.js | `storeId` multi-PV |
| `SCHEMAS.inventory` | inventory.schema.js | `storeId` multi-PV |
| `SCHEMAS.accounting` | accounting.schema.js | + `accountingProductLine`, `accountingExpenseLine` |
| `SCHEMAS.finance` | finance.schema.js | + `financeStoreEntry`, `financeFlowItem` |
| `SCHEMAS.store` | store.schema.js | Incluye `salaryPercentage` **por PV** |

### Settings / config (sin schema de objeto por ahora)

| Clave hoy | Destino |
|-----------|---------|
| `units`, `currencies`, `expenseConcepts` | Arrays de string → sin schema; métodos en settings.repository |
| `salaryPercentage` (global `STG_KEYS`) | **Deprecado** → `SCHEMAS.store.salaryPercentage` / campo en cada store |
| `salesPoint` | **Deprecado** → `stores` + `currentStoreId` |
| `currentStoreId` | Escalár de contexto (sin schema) |

`data/Estructuras/*.json` sigue como referencia humana; la fuente para código es `database/schemas/`.

## Estado actual vs esta capa

| Hoy | Destino |
|-----|---------|
| `js/storage.js` (`getData`/`setData`) | Sigue en uso en UI; provider listo para repos (HU05+) |
| `Storage` / `StorageProvider` | ✅ LocalStorage detrás |
| `SCHEMAS.*` | ✅ Plantillas HU03 |
| `CACHE.*` | ✅ Caché unificada HU04 (`database/cache/cache.js`) |
| `BaseRepository` / `createRepository` | ✅ Contrato HU05 |
| `products.repository` | ✅ HU06 |
| repos HU07–12 + stock/settings | ✅ |
| `data/Estructuras/*.json` | Referencia documental |

## Caché (HU04)

```js
loadCache("products");           // hidrata CACHE.products desde storage
const list = CACHE.products;     // lecturas en UI
getCache("movements");           // lazy: carga si aún no está loaded
replaceCache("products", list);  // tras setData completo
syncInCache("products", item);   // upsert por id
invalidateCache("products");     // fuerza recarga en el próximo load
```

- `CACHE_STATUS[key]` distingue “vacío legítimo” de “aún no cargado”.
- No se carga todo al boot (volumen alto en movements/accounting).
- Compat productos: `loadProductsCache`, `getProductFromCache`, etc.

## Repositorio base (HU05)

Contrato común (`BaseRepository` / `createRepository`). Solo habla con `Storage` + `CACHE`.

```js
const productsRepository = createRepository({ key: STG_KEYS.PRODUCTS });

await productsRepository.getAll();
await productsRepository.getById(id);
await productsRepository.saveAll(list);
await productsRepository.upsert(item);
await productsRepository.removeById(id);
await productsRepository.clear();
```

Las claves de colección se toman de `STG_KEYS` (no magic strings). Si mañana cambia el valor de `STG_KEYS.PRODUCTS`, repos + CACHE + Storage siguen alineados.

### Products repository (HU06 ✅)

```js
await getAllProducts();
await getProductById(id);
await findProductByCode(code);
const p = createProduct({ name: "…", codes: ["…"] }); // no persiste
await saveProduct(p);
await saveAllProducts(list);
await deleteProduct(id);
await clearProducts();
// o: productsRepository.getAll()
```

### Repos HU07–12 (+ stock / settings) ✅

| Repo | Clave | API principal |
|------|-------|----------------|
| movements | `STG_KEYS.MOVEMENTS` | `getAllMovements`, `getMovementsByDate`, `createMovement`, `saveMovement` |
| expenses | `STG_KEYS.EXPENSES` | `getAllExpenses`, `getExpensesByDate`, `createExpense`, `saveExpense` |
| inventory | `STG_KEYS.INVENTORY` | `getInventoryByDate`, `getInventoryByProductAndDate`, `createInventoryCount` |
| accounting | `STG_KEYS.ACCOUNTING` | `getAccountingByDate`, `createAccounting`, `saveAccounting` |
| stores | `STG_KEYS.STORES` | `getActiveStores`, `createStore`, `saveStore` |
| finances | `STG_KEYS.FINANCES` | `getFinanceByDate`, `createFinance`, `saveFinance` |
| stock | `STG_KEYS.STOCK` | `getStockByStoreAndProduct`, `createStock`, `saveStock` |
| settings | varias | `getCurrencies` / `saveCurrencies`, `getUnits`, `getCurrentStoreIdSetting`, … |

Settings no usa `BaseRepository` (arrays de string / escalares vía `Storage`).

## Cableado en layout

Orden de scripts:

1. `js/storage.js` — `STG_KEYS` + legado `getData`/`setData`
2. `database/providers/local-storage.provider.js`
3. `database/providers/storage-provider.js`
4. `database/schemas/schemas.js` luego `*.schema.js`
5. `database/cache/cache.js`
6. `database/repositories/base.repository.js`
7. `database/repositories/*.repository.js` (products … settings)
