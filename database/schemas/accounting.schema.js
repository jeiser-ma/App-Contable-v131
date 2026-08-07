/**
 * Schemas de contabilidad diaria.
 *
 * - SCHEMAS.accounting: registro del día (un cierre / borrador).
 * - SCHEMAS.accountingProductLine: fila de producto dentro de accounting.products.
 * - SCHEMAS.accountingExpenseLine: gasto embebido en el snapshot del día.
 *
 * storeId en accounting: PV dueño del cierre (multi-PV).
 * salaryPercentage aquí es el % usado al cerrar ese día (snapshot);
 * el % vigente por PV vive en SCHEMAS.store.salaryPercentage.
 *
 * Uso:
 *   const accounting = structuredClone(SCHEMAS.accounting);
 *   const line = structuredClone(SCHEMAS.accountingProductLine);
 *   accounting.products.push(line);
 *
 * Referencia: data/Estructuras/accounting.json
 */

/** Línea de producto dentro de un cierre de contabilidad */
SCHEMAS.accountingProductLine = {
  productId: null,
  yesterdayStock: 0,
  yesterdayEntries: 0,
  yesterdayExits: 0,
  todayInventory: 0,
  sales: 0,
  unitPrice: 0,
  amount: 0,
};

/** Gasto embebido en el snapshot de contabilidad del día */
SCHEMAS.accountingExpenseLine = {
  id: null,
  concept: "",
  date: "",
  amount: 0,
};

/** Registro de contabilidad de un día */
SCHEMAS.accounting = {
  id: null,
  /** PV del cierre (multi-PV) */
  storeId: null,
  /** Fecha del día YYYY-MM-DD */
  date: "",
  /** Filas SCHEMAS.accountingProductLine */
  products: [],
  /** Filas SCHEMAS.accountingExpenseLine */
  expenses: [],
  cashSales: 0,
  transferSales: 0,
  totalSales: 0,
  totalExpenses: 0,
  totalAmount: 0,
  difference: 0,
  /** % salario aplicado en este cierre (snapshot) */
  salaryPercentage: 0,
  nominalSalary: 0,
  realSalary: 0,
  closed: false,
  createdAt: null,
  closedAt: null,
};
