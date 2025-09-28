// costos.js
// Controla toda la lógica interactiva del módulo de costos.

import { supabaseClient } from "../../../lib/supabaseClient.js";
import { getCurrentUser } from "../../../lib/authGuard.js";

const STORAGE_KEYS = {
  products: "costosModuleProducts",
  costs: "costosModuleFixedCosts",
  transactions: "costosModuleTransactions",
  preferences: "costosModulePreferences"
};

const DEFAULT_EXCHANGE_RATE = 520;

const state = {
  currentCurrency: "CRC",
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  products: [],
  fixedCosts: [],
  transactions: [],
  selectedMonth: "",
  remoteUser: null,
  editingProductId: null,
  editingCostId: null,
  editingTransactionId: null,
  pendingTransactionDeletionId: null,
  charts: {
    flujo: null,
    margen: null,
    equilibrio: null
  }
};

const elements = {
  appContainer: null,
  loadingBanner: null,
  tabButtons: [],
  tabContents: [],
  dropdownButtons: [],
  dropdowns: [],
  fileInput: null,
  currencyDisplay: null,
  currencySelect: null,
  exchangeInput: null,
  exchangeUsdLabel: null,
  logoutButton: null,
  headerSubtitle: null,
  monthInput: null,
  ingresosLabel: null,
  egresosLabel: null,
  saldoLabel: null,
  productosList: null,
  costosList: null,
  transaccionesList: null,
  totalCostosLabel: null,
  prodFormTitle: null,
  prodSubmitButton: null,
  prodCancelButton: null,
  costoFormTitle: null,
  costoSubmitButton: null,
  costoCancelButton: null,
  transFormTitle: null,
  transSubmitButton: null,
  transCancelButton: null,
  recomendaciones: null,
  peUnidades: null,
  peVentas: null,
  peEstado: null,
  peCard: null,
  margenPromedio: null,
  productosFields: {
    nombre: null,
    tipo: null,
    moneda: null,
    costo: null,
    precio: null,
    unidades: null
  },
  costosFields: {
    concepto: null,
    moneda: null,
    monto: null,
    frecuencia: null
  },
  transaccionesFields: {
    fecha: null,
    tipo: null,
    concepto: null,
    moneda: null,
    monto: null,
    categoria: null
  },
  charts: {
    flujo: null,
    margen: null,
    equilibrio: null
  }
};

let toastTimeoutId = null;

const SUPABASE_TABLES = {
  products: "productos",
  fixedCosts: "costos_fijos",
  transactions: "flujo_caja",
  users: "usuarios"
};

// Obtiene un identificador único simple para los registros.
function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStorageScopeSuffix() {
  const currentUser = getCurrentUser();

  if (currentUser?.userId) {
    return `user-${currentUser.userId}`;
  }

  if (currentUser?.username) {
    return `user-${currentUser.username}`;
  }

  return "guest";
}

function getScopedStorageKey(baseKey) {
  return `${baseKey}:${getStorageScopeSuffix()}`;
}

// Carga los datos persistidos en localStorage.
function loadPersistedData() {
  const products = window.localStorage.getItem(getScopedStorageKey(STORAGE_KEYS.products));
  const costs = window.localStorage.getItem(getScopedStorageKey(STORAGE_KEYS.costs));
  const transactions = window.localStorage.getItem(getScopedStorageKey(STORAGE_KEYS.transactions));
  const preferences = window.localStorage.getItem(getScopedStorageKey(STORAGE_KEYS.preferences));

  if (products) {
    state.products = JSON.parse(products);
  }

  if (costs) {
    state.fixedCosts = JSON.parse(costs);
  }

  if (transactions) {
    state.transactions = JSON.parse(transactions);
  }

  if (preferences) {
    const parsedPreferences = JSON.parse(preferences);
    state.currentCurrency = parsedPreferences.currency ?? state.currentCurrency;
    state.exchangeRate = parsedPreferences.exchangeRate ?? state.exchangeRate;
    state.selectedMonth = parsedPreferences.selectedMonth ?? state.selectedMonth;
  }
}

// Persiste los datos actuales en localStorage.
function persistData() {
  window.localStorage.setItem(
    getScopedStorageKey(STORAGE_KEYS.products),
    JSON.stringify(state.products)
  );
  window.localStorage.setItem(
    getScopedStorageKey(STORAGE_KEYS.costs),
    JSON.stringify(state.fixedCosts)
  );
  window.localStorage.setItem(
    getScopedStorageKey(STORAGE_KEYS.transactions),
    JSON.stringify(state.transactions)
  );
  window.localStorage.setItem(
    getScopedStorageKey(STORAGE_KEYS.preferences),
    JSON.stringify({
      currency: state.currentCurrency,
      exchangeRate: state.exchangeRate,
      selectedMonth: state.selectedMonth
    })
  );
}

// Aplica los valores guardados sobre la interfaz.
function applyPreferencesToUI() {
  if (elements.currencySelect) {
    elements.currencySelect.value = state.currentCurrency;
  }

  if (elements.exchangeInput) {
    elements.exchangeInput.value = state.exchangeRate.toString();
  }

  updateCurrencyDisplay();
  updateExchangeLabel();

  if (elements.monthInput) {
    elements.monthInput.value = state.selectedMonth;
  }
}

// Muestra una notificación temporal al usuario.
function showToast(message) {
  if (!elements.loadingBanner) {
    return;
  }

  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId);
  }

  elements.loadingBanner.textContent = message;
  elements.loadingBanner.classList.remove("hidden");

  toastTimeoutId = window.setTimeout(() => {
    hideToast();
  }, 2400);
}

// Oculta la notificación temporal.
function hideToast() {
  if (!elements.loadingBanner) {
    return;
  }

  elements.loadingBanner.classList.add("hidden");
}

// Determina si se debe intentar sincronizar con Supabase.
function shouldSyncWithSupabase() {
  return Boolean(state.remoteUser && state.remoteUser.id);
}

// Verifica si el identificador proviene de la base de datos (numérico).
function isRemoteIdentifier(identifier) {
  if (identifier === null || identifier === undefined) {
    return false;
  }

  const parsed = Number.parseInt(identifier, 10);
  return Number.isInteger(parsed) && `${parsed}` === `${identifier}`;
}

// Convierte un registro de productos de Supabase a la estructura local.
function mapSupabaseProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nombre: row.nombre ?? "",
    tipo: row.tipo ?? "producto",
    moneda: row.moneda ?? "CRC",
    costo: Number.parseFloat(row.costo_unitario ?? 0) || 0,
    precio: Number.parseFloat(row.precio_venta ?? 0) || 0,
    unidades: Number.parseInt(row.unidades_vendidas ?? 0, 10) || 0
  };
}

// Convierte un registro de costos fijos de Supabase a la estructura local.
function mapSupabaseFixedCost(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    concepto: row.concepto ?? "",
    moneda: row.moneda ?? "CRC",
    monto: Number.parseFloat(row.monto ?? 0) || 0,
    frecuencia: row.frecuencia ?? "mensual"
  };
}

// Convierte una transacción remota a la representación interna.
function mapSupabaseTransaction(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fecha: row.fecha ?? "",
    tipo: row.tipo ?? "ingreso",
    categoria: row.categoria ?? "otro",
    concepto: row.concepto ?? "",
    moneda: row.moneda ?? "CRC",
    monto: Number.parseFloat(row.monto ?? 0) || 0
  };
}

// Genera el payload que espera Supabase para un producto.
function buildSupabaseProductPayload(product) {
  if (!product) {
    return null;
  }

  return {
    usuario_id: state.remoteUser?.id ?? null,
    nombre: product.nombre,
    tipo: product.tipo,
    moneda: product.moneda,
    costo_unitario: product.costo,
    precio_venta: product.precio,
    unidades_vendidas: product.unidades
  };
}

// Genera el payload para la tabla de costos fijos.
function buildSupabaseFixedCostPayload(cost) {
  if (!cost) {
    return null;
  }

  return {
    usuario_id: state.remoteUser?.id ?? null,
    concepto: cost.concepto,
    moneda: cost.moneda,
    monto: cost.monto,
    frecuencia: cost.frecuencia
  };
}

// Genera el payload para la tabla de flujo de caja.
function buildSupabaseTransactionPayload(transaction) {
  if (!transaction) {
    return null;
  }

  return {
    usuario_id: state.remoteUser?.id ?? null,
    fecha: transaction.fecha,
    tipo: transaction.tipo,
    categoria: transaction.categoria,
    concepto: transaction.concepto,
    moneda: transaction.moneda,
    monto: transaction.monto
  };
}

// Combina la información remota con la local preservando registros no sincronizados.
function mergeRemoteRecords(localRecords, remoteRecords) {
  const normalizedRemote = remoteRecords.filter(Boolean);
  const remoteIds = new Set(normalizedRemote.map((item) => `${item.id}`));

  const pendingLocal = localRecords.filter((item) => !remoteIds.has(`${item.id}`));

  return [...normalizedRemote, ...pendingLocal];
}

// Recupera un usuario de referencia desde Supabase para operar el módulo.
async function bootstrapRemoteUser() {
  const currentUser = getCurrentUser();

  if (!currentUser || !currentUser.username) {
    state.remoteUser = null;
    return;
  }

  if (currentUser.userId) {
    const numericId = Number(currentUser.userId);
    const resolvedId = Number.isNaN(numericId) ? currentUser.userId : numericId;
    state.remoteUser = { id: resolvedId, username: currentUser.username };
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLES.users)
      .select("id, username")
      .eq("username", currentUser.username)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      state.remoteUser = data;
    } else {
      state.remoteUser = null;
    }
  } catch (error) {
    console.warn("No fue posible obtener un usuario remoto para sincronizar.", error);
    state.remoteUser = null;
  }
}

// Obtiene los productos almacenados en Supabase y los integra con el estado local.
async function syncProductsFromSupabase() {
  if (!shouldSyncWithSupabase()) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLES.products)
      .select("id, nombre, tipo, moneda, costo_unitario, precio_venta, unidades_vendidas")
      .eq("usuario_id", state.remoteUser.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const remoteProducts = Array.isArray(data) ? data.map(mapSupabaseProduct).filter(Boolean) : [];
    state.products = mergeRemoteRecords(state.products, remoteProducts);
    persistData();
  } catch (error) {
    console.error("Error al sincronizar productos con Supabase:", error);
    showToast("No se pudieron sincronizar los productos con Supabase.");
  }
}

// Obtiene los costos fijos remotos e incorpora los cambios al estado local.
async function syncFixedCostsFromSupabase() {
  if (!shouldSyncWithSupabase()) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLES.fixedCosts)
      .select("id, concepto, moneda, monto, frecuencia, created_at")
      .eq("usuario_id", state.remoteUser.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const remoteCosts = Array.isArray(data) ? data.map(mapSupabaseFixedCost).filter(Boolean) : [];
    state.fixedCosts = mergeRemoteRecords(state.fixedCosts, remoteCosts);
    persistData();
  } catch (error) {
    console.error("Error al sincronizar costos fijos con Supabase:", error);
    showToast("No se pudieron sincronizar los costos fijos con Supabase.");
  }
}

// Recupera las transacciones de Supabase y actualiza la información local.
async function syncTransactionsFromSupabase() {
  if (!shouldSyncWithSupabase()) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLES.transactions)
      .select("id, fecha, tipo, categoria, concepto, moneda, monto, created_at")
      .eq("usuario_id", state.remoteUser.id)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }

    const remoteTransactions = Array.isArray(data)
      ? data.map(mapSupabaseTransaction).filter(Boolean)
      : [];

    state.transactions = mergeRemoteRecords(state.transactions, remoteTransactions);
    persistData();
  } catch (error) {
    console.error("Error al sincronizar el flujo de caja con Supabase:", error);
    showToast("No se pudo sincronizar el flujo de caja con Supabase.");
  }
}

// Ejecuta una sincronización completa con la base de datos.
async function syncAllDataFromSupabase() {
  await syncProductsFromSupabase();
  await syncFixedCostsFromSupabase();
  await syncTransactionsFromSupabase();
}

// Cambia el estado de un dropdown abierto.
function toggleDropdown(dropdownId) {
  if (!dropdownId) {
    return;
  }

  elements.dropdowns.forEach((dropdown) => {
    if (dropdown && dropdown.dataset.dropdown === dropdownId) {
      dropdown.classList.toggle("open");
    } else if (dropdown) {
      dropdown.classList.remove("open");
    }
  });
}

// Cierra todos los dropdowns activos.
function closeAllDropdowns() {
  elements.dropdowns.forEach((dropdown) => {
    if (dropdown) {
      dropdown.classList.remove("open");
    }
  });
}

// Convierte montos a la moneda configurada actualmente.
function convertToCurrentCurrency(amount, sourceCurrency) {
  if (state.currentCurrency === sourceCurrency) {
    return amount;
  }

  if (state.currentCurrency === "CRC" && sourceCurrency === "USD") {
    return amount * state.exchangeRate;
  }

  if (state.currentCurrency === "USD" && sourceCurrency === "CRC") {
    return amount / state.exchangeRate;
  }

  return amount;
}

// Da formato al monto como texto legible para el usuario.
function formatCurrency(value, currency = state.currentCurrency) {
  const formatter = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2
  });

  return formatter.format(value || 0);
}

// Actualiza las opciones disponibles para la categoría de transacción según el tipo.
function updateTransactionCategoryOptions(transactionType, presetValue = null) {
  const categorySelect = elements.transaccionesFields.categoria;

  if (!categorySelect) {
    return;
  }

  const ingresoOptions = [
    { value: "venta", label: "Venta" },
    { value: "servicio", label: "Servicio" },
    { value: "otro", label: "Otro" }
  ];
  const egresoOptions = [
    { value: "compra", label: "Compra" },
    { value: "salario", label: "Salario" },
    { value: "alquiler", label: "Alquiler" },
    { value: "servicios", label: "Servicios" },
    { value: "otro", label: "Otro" }
  ];

  const options = transactionType === "egreso" ? egresoOptions : ingresoOptions;
  categorySelect.innerHTML = "";

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    categorySelect.appendChild(optionElement);
  });

  const desiredValue = presetValue ?? options[0].value;
  categorySelect.value = options.some((option) => option.value === desiredValue)
    ? desiredValue
    : options[0].value;
}

// Obtiene el símbolo correspondiente a la moneda actual.
function getCurrencySymbol() {
  if (state.currentCurrency === "USD") {
    return "$";
  }
  return "₡";
}

// Maneja los clics realizados sobre la aplicación.
function handleGlobalClick(event) {
  const dropdownButton = event.target.closest("[data-dropdown]");

  if (dropdownButton) {
    event.preventDefault();
    toggleDropdown(dropdownButton.dataset.dropdown);
    return;
  }

  if (!event.target.closest(".dropdown")) {
    closeAllDropdowns();
  }
}

// Cambia la pestaña activa según el botón seleccionado.
function handleTabChange(event) {
  const button = event.currentTarget;
  const targetTab = button.dataset.tab;

  elements.tabButtons.forEach((tabButton) => {
    if (tabButton) {
      tabButton.classList.toggle("active", tabButton === button);
    }
  });

  elements.tabContents.forEach((content) => {
    if (content) {
      content.classList.toggle("active", content.id === `tab-${targetTab}`);
    }
  });
}

// Ejecuta acciones basadas en los atributos data-action de los botones.
async function handleAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  event.preventDefault();

  const action = actionButton.dataset.action;
  const entityId = actionButton.dataset.id ?? null;

  switch (action) {
    case "refrescar-productos":
      await syncProductsFromSupabase();
      refrescarProductos();
      break;
    case "guardar-producto":
      await guardarProducto();
      break;
    case "cancelar-producto":
      cancelarEdicionProducto();
      break;
    case "editar-producto":
      editarProducto(entityId);
      break;
    case "eliminar-producto":
      await eliminarProducto(entityId);
      break;
    case "refrescar-costos":
      await syncFixedCostsFromSupabase();
      refrescarCostosFijos();
      break;
    case "guardar-costo":
      await guardarCostoFijo();
      break;
    case "cancelar-costo":
      cancelarEdicionCostoFijo();
      break;
    case "editar-costo":
      editarCostoFijo(entityId);
      break;
    case "eliminar-costo":
      await eliminarCostoFijo(entityId);
      break;
    case "refrescar-flujo":
      await syncTransactionsFromSupabase();
      refrescarFlujoCaja();
      break;
    case "guardar-transaccion":
      await guardarTransaccion();
      break;
    case "cancelar-transaccion":
      cancelarEdicionTransaccion();
      break;
    case "editar-transaccion":
      editarTransaccion(entityId);
      break;
    case "solicitar-eliminar-transaccion":
      solicitarConfirmacionTransaccion(entityId);
      break;
    case "cancelar-eliminar-transaccion":
      cancelarConfirmacionTransaccion();
      break;
    case "confirmar-eliminar-transaccion":
      await eliminarTransaccion(entityId);
      break;
    case "refrescar-analisis":
      await syncAllDataFromSupabase();
      refrescarAnalisis();
      break;
    case "exportar":
      exportarDatos();
      break;
    case "limpiar":
      limpiarDatos();
      break;
    default:
      break;
  }
}

// Establece la moneda seleccionada.
function handleCurrencyChange(event) {
  state.currentCurrency = event.target.value;
  persistData();
  updateCurrencyDisplay();
  refrescarTodosLosPaneles();
}

// Actualiza la tasa de cambio y la etiqueta informativa.
function handleExchangeChange(event) {
  const parsedValue = Number.parseFloat(event.target.value);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    state.exchangeRate = parsedValue;
    persistData();
    updateExchangeLabel();
    refrescarTodosLosPaneles();
  } else {
    event.target.value = state.exchangeRate.toString();
  }
}

// Configura el mes de referencia para el flujo de caja.
function handleMonthChange(event) {
  state.selectedMonth = event.target.value;
  persistData();
  refrescarFlujoCaja();
  refrescarAnalisis();
}

// Ajusta las categorías cuando se cambia el tipo de transacción.
function handleTransactionTypeChange(event) {
  const newType = event.target.value;
  const currentValue = elements.transaccionesFields.categoria?.value ?? null;
  updateTransactionCategoryOptions(newType, currentValue);
}

// Agrega o actualiza un producto en la colección.
async function guardarProducto() {
  const nombre = elements.productosFields.nombre.value.trim();
  const tipo = elements.productosFields.tipo.value;
  const moneda = elements.productosFields.moneda.value;
  const costo = Number.parseFloat(elements.productosFields.costo.value);
  const precio = Number.parseFloat(elements.productosFields.precio.value);
  const unidades = Number.parseInt(elements.productosFields.unidades.value, 10) || 0;

  if (nombre.length === 0) {
    showToast("Debes indicar un nombre válido.");
    return;
  }

  if (!Number.isFinite(costo) || costo < 0) {
    showToast("El costo debe ser un número positivo.");
    return;
  }

  if (!Number.isFinite(precio) || precio < 0) {
    showToast("El precio debe ser un número positivo.");
    return;
  }

  const isEditing = Boolean(state.editingProductId);
  const provisionalId = state.editingProductId ?? generateId();
  const productData = {
    id: provisionalId,
    nombre: nombre,
    tipo: tipo,
    moneda: moneda,
    costo: costo,
    precio: precio,
    unidades: unidades
  };

  if (isEditing) {
    const index = state.products.findIndex((product) => `${product.id}` === `${state.editingProductId}`);

    if (index === -1) {
      showToast("No se encontró el producto a actualizar.");
      return;
    }

    const previousProduct = { ...state.products[index] };
    state.products[index] = { ...productData };

    if (shouldSyncWithSupabase()) {
      try {
        const payload = buildSupabaseProductPayload(productData);

        let response;

        if (isRemoteIdentifier(productData.id)) {
          response = await supabaseClient
            .from(SUPABASE_TABLES.products)
            .update(payload)
            .eq("id", productData.id)
            .eq("usuario_id", state.remoteUser.id)
            .select("id, nombre, tipo, moneda, costo_unitario, precio_venta, unidades_vendidas")
            .single();
        } else {
          response = await supabaseClient
            .from(SUPABASE_TABLES.products)
            .insert([payload])
            .select("id, nombre, tipo, moneda, costo_unitario, precio_venta, unidades_vendidas")
            .single();
        }

        if (response.error) {
          throw response.error;
        }

        const mappedProduct = mapSupabaseProduct(response.data);
        if (mappedProduct) {
          state.products[index] = mappedProduct;
        }
      } catch (error) {
        console.error("Error al sincronizar el producto con Supabase:", error);
        state.products[index] = previousProduct;
        persistData();
        showToast("No se pudo actualizar el producto en Supabase.");
        return;
      }
    }

    persistData();
    cancelarEdicionProducto();
    refrescarProductos();
    refrescarAnalisis();
    showToast("Producto actualizado correctamente.");
    return;
  }

  state.products.push({ ...productData });

  if (shouldSyncWithSupabase()) {
    try {
      const payload = buildSupabaseProductPayload(productData);
      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLES.products)
        .insert([payload])
        .select("id, nombre, tipo, moneda, costo_unitario, precio_venta, unidades_vendidas")
        .single();

      if (error) {
        throw error;
      }

      const mappedProduct = mapSupabaseProduct(data);
      if (mappedProduct) {
        state.products[state.products.length - 1] = mappedProduct;
      }
    } catch (error) {
      console.error("Error al guardar el producto en Supabase:", error);
      showToast("Producto guardado localmente. Intenta sincronizar más tarde.");
      persistData();
      refrescarProductos();
      refrescarAnalisis();
      cancelarEdicionProducto();
      return;
    }
  }

  persistData();
  cancelarEdicionProducto();
  refrescarProductos();
  refrescarAnalisis();
  showToast("Producto agregado correctamente.");
}

// Cancela la edición del producto y limpia el formulario.
function cancelarEdicionProducto() {
  state.editingProductId = null;
  if (elements.prodFormTitle) {
    elements.prodFormTitle.textContent = "Agregar Producto/Servicio";
  }
  if (elements.prodSubmitButton) {
    elements.prodSubmitButton.textContent = "➕ Agregar Producto";
  }
  if (elements.productosFields.nombre) {
    elements.productosFields.nombre.value = "";
  }
  if (elements.productosFields.tipo) {
    elements.productosFields.tipo.value = "producto";
  }
  if (elements.productosFields.moneda) {
    elements.productosFields.moneda.value = "CRC";
  }
  if (elements.productosFields.costo) {
    elements.productosFields.costo.value = "";
  }
  if (elements.productosFields.precio) {
    elements.productosFields.precio.value = "";
  }
  if (elements.productosFields.unidades) {
    elements.productosFields.unidades.value = "";
  }
  if (elements.prodCancelButton) {
    elements.prodCancelButton.classList.add("hidden");
  }
}

// Prepara el formulario para editar un producto existente.
function editarProducto(productId) {
  const product = state.products.find((item) => `${item.id}` === `${productId}`);

  if (!product) {
    return;
  }

  state.editingProductId = product.id;
  if (elements.prodFormTitle) {
    elements.prodFormTitle.textContent = "Editar Producto/Servicio";
  }
  if (elements.prodSubmitButton) {
    elements.prodSubmitButton.textContent = "💾 Guardar Cambios";
  }
  if (elements.productosFields.nombre) {
    elements.productosFields.nombre.value = product.nombre;
  }
  if (elements.productosFields.tipo) {
    elements.productosFields.tipo.value = product.tipo;
  }
  if (elements.productosFields.moneda) {
    elements.productosFields.moneda.value = product.moneda;
  }
  if (elements.productosFields.costo) {
    elements.productosFields.costo.value = `${product.costo ?? ""}`;
  }
  if (elements.productosFields.precio) {
    elements.productosFields.precio.value = `${product.precio ?? ""}`;
  }
  if (elements.productosFields.unidades) {
    elements.productosFields.unidades.value = `${product.unidades ?? ""}`;
  }
  if (elements.prodCancelButton) {
    elements.prodCancelButton.classList.remove("hidden");
  }
}

// Elimina un producto de la colección.
async function eliminarProducto(productId) {
  if (!productId) {
    return;
  }

  const confirmed = window.confirm(
    "¿Deseas eliminar este producto? Esta acción no se puede deshacer."
  );

  if (!confirmed) {
    return;
  }

  const index = state.products.findIndex((product) => `${product.id}` === `${productId}`);

  if (index === -1) {
    showToast("No se encontró el producto a eliminar.");
    return;
  }

  const [removedProduct] = state.products.splice(index, 1);

  if (state.editingProductId && `${state.editingProductId}` === `${productId}`) {
    cancelarEdicionProducto();
  }

  if (shouldSyncWithSupabase() && isRemoteIdentifier(productId)) {
    try {
      const { error } = await supabaseClient
        .from(SUPABASE_TABLES.products)
        .delete()
        .eq("id", productId)
        .eq("usuario_id", state.remoteUser.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error al eliminar el producto en Supabase:", error);
      state.products.splice(index, 0, removedProduct);
      persistData();
      refrescarProductos();
      refrescarAnalisis();
      showToast("No se pudo eliminar el producto en Supabase.");
      return;
    }
  }

  persistData();
  showToast("Producto eliminado.");
  refrescarProductos();
  refrescarAnalisis();
}

// Renderiza la lista de productos en pantalla.
function refrescarProductos() {
  if (!elements.productosList) {
    return;
  }

  elements.productosList.innerHTML = "";

  if (state.products.length === 0) {
    elements.productosList.innerHTML =
      '<p class="empty-message">Aún no registras productos ni servicios.</p>';
    return;
  }

  state.products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "module-card";

    const header = document.createElement("div");
    header.className = "module-card-header";

    const title = document.createElement("h4");
    title.textContent = `${product.nombre} • ${product.tipo}`;

    const actions = document.createElement("div");
    actions.className = "module-card-actions";

    const editButton = document.createElement("button");
    editButton.className = "btn btn-secondary";
    editButton.dataset.action = "editar-producto";
    editButton.dataset.id = product.id;
    editButton.type = "button";
    editButton.textContent = "Editar";

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.dataset.action = "eliminar-producto";
    deleteButton.dataset.id = product.id;
    deleteButton.type = "button";
    deleteButton.textContent = "Eliminar";

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    header.appendChild(title);
    header.appendChild(actions);

    const meta = document.createElement("div");
    meta.innerHTML = `
      <p><strong>Costo unitario:</strong> ${formatCurrency(
        convertToCurrentCurrency(product.costo, product.moneda)
      )}</p>
      <p><strong>Precio de venta:</strong> ${formatCurrency(
        convertToCurrentCurrency(product.precio, product.moneda)
      )}</p>
      <p><strong>Unidades vendidas:</strong> ${product.unidades}</p>
    `;

    card.appendChild(header);
    card.appendChild(meta);
    elements.productosList.appendChild(card);
  });
}

// Guarda o actualiza un costo fijo.
async function guardarCostoFijo() {
  const concepto = elements.costosFields.concepto.value.trim();
  const moneda = elements.costosFields.moneda.value;
  const monto = Number.parseFloat(elements.costosFields.monto.value);
  const frecuencia = elements.costosFields.frecuencia.value;

  if (concepto.length === 0) {
    showToast("Debes indicar un concepto válido.");
    return;
  }

  if (!Number.isFinite(monto) || monto < 0) {
    showToast("El monto debe ser un número positivo.");
    return;
  }

  const isEditing = Boolean(state.editingCostId);
  const provisionalId = state.editingCostId ?? generateId();
  const costData = {
    id: provisionalId,
    concepto: concepto,
    moneda: moneda,
    monto: monto,
    frecuencia: frecuencia
  };

  if (isEditing) {
    const index = state.fixedCosts.findIndex((cost) => `${cost.id}` === `${state.editingCostId}`);

    if (index === -1) {
      showToast("No se encontró el costo fijo a actualizar.");
      return;
    }

    const previousCost = { ...state.fixedCosts[index] };
    state.fixedCosts[index] = { ...costData };

    if (shouldSyncWithSupabase()) {
      try {
        const payload = buildSupabaseFixedCostPayload(costData);

        let response;

        if (isRemoteIdentifier(costData.id)) {
          response = await supabaseClient
            .from(SUPABASE_TABLES.fixedCosts)
            .update(payload)
            .eq("id", costData.id)
            .eq("usuario_id", state.remoteUser.id)
            .select("id, concepto, moneda, monto, frecuencia")
            .single();
        } else {
          response = await supabaseClient
            .from(SUPABASE_TABLES.fixedCosts)
            .insert([payload])
            .select("id, concepto, moneda, monto, frecuencia")
            .single();
        }

        if (response.error) {
          throw response.error;
        }

        const mappedCost = mapSupabaseFixedCost(response.data);
        if (mappedCost) {
          state.fixedCosts[index] = mappedCost;
        }
      } catch (error) {
        console.error("Error al sincronizar el costo fijo con Supabase:", error);
        state.fixedCosts[index] = previousCost;
        persistData();
        showToast("No se pudo actualizar el costo fijo en Supabase.");
        return;
      }
    }

    persistData();
    cancelarEdicionCostoFijo();
    refrescarCostosFijos();
    refrescarAnalisis();
    showToast("Costo fijo actualizado.");
    return;
  }

  state.fixedCosts.push({ ...costData });

  if (shouldSyncWithSupabase()) {
    try {
      const payload = buildSupabaseFixedCostPayload(costData);
      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLES.fixedCosts)
        .insert([payload])
        .select("id, concepto, moneda, monto, frecuencia")
        .single();

      if (error) {
        throw error;
      }

      const mappedCost = mapSupabaseFixedCost(data);
      if (mappedCost) {
        state.fixedCosts[state.fixedCosts.length - 1] = mappedCost;
      }
    } catch (error) {
      console.error("Error al guardar el costo fijo en Supabase:", error);
      showToast("Costo fijo guardado localmente. Intenta sincronizar más tarde.");
      persistData();
      refrescarCostosFijos();
      refrescarAnalisis();
      cancelarEdicionCostoFijo();
      return;
    }
  }

  persistData();
  cancelarEdicionCostoFijo();
  refrescarCostosFijos();
  refrescarAnalisis();
  showToast("Costo fijo agregado.");
}

// Cancela la edición del costo fijo.
function cancelarEdicionCostoFijo() {
  state.editingCostId = null;
  if (elements.costoFormTitle) {
    elements.costoFormTitle.textContent = "Agregar Costo Fijo";
  }
  if (elements.costoSubmitButton) {
    elements.costoSubmitButton.textContent = "➕ Agregar Costo Fijo";
  }
  if (elements.costosFields.concepto) {
    elements.costosFields.concepto.value = "";
  }
  if (elements.costosFields.moneda) {
    elements.costosFields.moneda.value = "CRC";
  }
  if (elements.costosFields.monto) {
    elements.costosFields.monto.value = "";
  }
  if (elements.costosFields.frecuencia) {
    elements.costosFields.frecuencia.value = "mensual";
  }
  if (elements.costoCancelButton) {
    elements.costoCancelButton.classList.add("hidden");
  }
}

// Prepara la edición de un costo fijo existente.
function editarCostoFijo(costId) {
  const cost = state.fixedCosts.find((item) => `${item.id}` === `${costId}`);

  if (!cost) {
    return;
  }

  state.editingCostId = cost.id;
  if (elements.costoFormTitle) {
    elements.costoFormTitle.textContent = "Editar Costo Fijo";
  }
  if (elements.costoSubmitButton) {
    elements.costoSubmitButton.textContent = "💾 Guardar Cambios";
  }
  if (elements.costosFields.concepto) {
    elements.costosFields.concepto.value = cost.concepto;
  }
  if (elements.costosFields.moneda) {
    elements.costosFields.moneda.value = cost.moneda;
  }
  if (elements.costosFields.monto) {
    elements.costosFields.monto.value = cost.monto.toString();
  }
  if (elements.costosFields.frecuencia) {
    elements.costosFields.frecuencia.value = cost.frecuencia;
  }
  if (elements.costoCancelButton) {
    elements.costoCancelButton.classList.remove("hidden");
  }
}

// Elimina un costo fijo por su identificador.
async function eliminarCostoFijo(costId) {
  if (!costId) {
    return;
  }

  const confirmed = window.confirm(
    "¿Deseas eliminar este costo fijo? Esta acción no se puede deshacer."
  );

  if (!confirmed) {
    return;
  }

  const index = state.fixedCosts.findIndex((cost) => `${cost.id}` === `${costId}`);

  if (index === -1) {
    showToast("No se encontró el costo a eliminar.");
    return;
  }

  const [removedCost] = state.fixedCosts.splice(index, 1);

  if (shouldSyncWithSupabase() && isRemoteIdentifier(costId)) {
    try {
      const { error } = await supabaseClient
        .from(SUPABASE_TABLES.fixedCosts)
        .delete()
        .eq("id", costId)
        .eq("usuario_id", state.remoteUser.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error al eliminar el costo fijo en Supabase:", error);
      state.fixedCosts.splice(index, 0, removedCost);
      persistData();
      refrescarCostosFijos();
      refrescarAnalisis();
      showToast("No se pudo eliminar el costo fijo en Supabase.");
      return;
    }
  }

  persistData();
  showToast("Costo eliminado.");
  refrescarCostosFijos();
  refrescarAnalisis();
}

// Renderiza todos los costos fijos y calcula sus totales.
function refrescarCostosFijos() {
  if (!elements.costosList) {
    return;
  }

  elements.costosList.innerHTML = "";

  if (state.fixedCosts.length === 0) {
    elements.costosList.innerHTML =
      '<p class="empty-message">Registra tus costos fijos para iniciar.</p>';
    if (elements.totalCostosLabel) {
      elements.totalCostosLabel.textContent = `${getCurrencySymbol()}0`;
    }
    return;
  }

  let totalMensual = 0;

  state.fixedCosts.forEach((cost) => {
    const card = document.createElement("article");
    card.className = "module-card";

    const header = document.createElement("div");
    header.className = "module-card-header";

    const title = document.createElement("h4");
    title.textContent = cost.concepto;

    const actions = document.createElement("div");
    actions.className = "module-card-actions";

    const editButton = document.createElement("button");
    editButton.className = "btn btn-secondary";
    editButton.dataset.action = "editar-costo";
    editButton.dataset.id = cost.id;
    editButton.type = "button";
    editButton.textContent = "Editar";

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.dataset.action = "eliminar-costo";
    deleteButton.dataset.id = cost.id;
    deleteButton.type = "button";
    deleteButton.textContent = "Eliminar";

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    header.appendChild(title);
    header.appendChild(actions);

    const monthlyAmount = cost.frecuencia === "anual" ? cost.monto / 12 : cost.monto;
    const converted = convertToCurrentCurrency(monthlyAmount, cost.moneda);
    totalMensual += converted;

    const meta = document.createElement("div");
    meta.innerHTML = `
      <p><strong>Monto:</strong> ${formatCurrency(
        convertToCurrentCurrency(cost.monto, cost.moneda)
      )}</p>
      <p><strong>Frecuencia:</strong> ${cost.frecuencia}</p>
    `;

    card.appendChild(header);
    card.appendChild(meta);
    elements.costosList.appendChild(card);
  });

  if (elements.totalCostosLabel) {
    elements.totalCostosLabel.textContent = formatCurrency(totalMensual);
  }
}

// Guarda o actualiza una transacción de flujo de caja.
async function guardarTransaccion() {
  const fecha = elements.transaccionesFields.fecha.value;
  const tipo = elements.transaccionesFields.tipo.value;
  const concepto = elements.transaccionesFields.concepto.value.trim();
  const moneda = elements.transaccionesFields.moneda.value;
  const monto = Number.parseFloat(elements.transaccionesFields.monto.value);
  const categoria = elements.transaccionesFields.categoria.value;

  if (!fecha) {
    showToast("Selecciona una fecha válida.");
    return;
  }

  if (concepto.length === 0) {
    showToast("Indica un concepto para la transacción.");
    return;
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    showToast("El monto debe ser positivo.");
    return;
  }

  const isEditing = Boolean(state.editingTransactionId);
  const provisionalId = state.editingTransactionId ?? generateId();
  const transactionData = {
    id: provisionalId,
    fecha: fecha,
    tipo: tipo,
    concepto: concepto,
    moneda: moneda,
    monto: monto,
    categoria: categoria
  };

  if (isEditing) {
    const index = state.transactions.findIndex((item) => `${item.id}` === `${state.editingTransactionId}`);

    if (index === -1) {
      showToast("No se encontró la transacción a actualizar.");
      return;
    }

    const previousTransaction = { ...state.transactions[index] };
    state.transactions[index] = { ...transactionData };

    if (shouldSyncWithSupabase()) {
      try {
        const payload = buildSupabaseTransactionPayload(transactionData);

        let response;

        if (isRemoteIdentifier(transactionData.id)) {
          response = await supabaseClient
            .from(SUPABASE_TABLES.transactions)
            .update(payload)
            .eq("id", transactionData.id)
            .eq("usuario_id", state.remoteUser.id)
            .select("id, fecha, tipo, categoria, concepto, moneda, monto")
            .single();
        } else {
          response = await supabaseClient
            .from(SUPABASE_TABLES.transactions)
            .insert([payload])
            .select("id, fecha, tipo, categoria, concepto, moneda, monto")
            .single();
        }

        if (response.error) {
          throw response.error;
        }

        const mappedTransaction = mapSupabaseTransaction(response.data);
        if (mappedTransaction) {
          state.transactions[index] = mappedTransaction;
        }
      } catch (error) {
        console.error("Error al sincronizar la transacción con Supabase:", error);
        state.transactions[index] = previousTransaction;
        persistData();
        showToast("No se pudo actualizar la transacción en Supabase.");
        return;
      }
    }

      persistData();
      cancelarEdicionTransaccion();
      refrescarFlujoCaja();
      refrescarAnalisis();
      showToast("Datos editados correctamente.");
      return;
    }

  state.transactions.push({ ...transactionData });

  if (shouldSyncWithSupabase()) {
    try {
      const payload = buildSupabaseTransactionPayload(transactionData);
      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLES.transactions)
        .insert([payload])
        .select("id, fecha, tipo, categoria, concepto, moneda, monto")
        .single();

      if (error) {
        throw error;
      }

      const mappedTransaction = mapSupabaseTransaction(data);
      if (mappedTransaction) {
        state.transactions[state.transactions.length - 1] = mappedTransaction;
      }
    } catch (error) {
      console.error("Error al guardar la transacción en Supabase:", error);
      showToast("Transacción guardada localmente. Intenta sincronizar más tarde.");
      persistData();
      refrescarFlujoCaja();
      refrescarAnalisis();
      cancelarEdicionTransaccion();
      return;
    }
  }

  persistData();
  cancelarEdicionTransaccion();
  refrescarFlujoCaja();
  refrescarAnalisis();
  showToast("Transacción agregada.");
}

// Cancela la edición de la transacción.
function cancelarEdicionTransaccion() {
  state.editingTransactionId = null;
  state.pendingTransactionDeletionId = null;
  if (elements.transFormTitle) {
    elements.transFormTitle.textContent = "Agregar Transacción";
  }
  if (elements.transSubmitButton) {
    elements.transSubmitButton.textContent = "➕ Agregar Transacción";
  }
  if (elements.transaccionesFields.fecha) {
    elements.transaccionesFields.fecha.value = "";
  }
  if (elements.transaccionesFields.tipo) {
    elements.transaccionesFields.tipo.value = "ingreso";
  }
  if (elements.transaccionesFields.concepto) {
    elements.transaccionesFields.concepto.value = "";
  }
  if (elements.transaccionesFields.moneda) {
    elements.transaccionesFields.moneda.value = "CRC";
  }
  if (elements.transaccionesFields.monto) {
    elements.transaccionesFields.monto.value = "";
  }
  updateTransactionCategoryOptions("ingreso", "venta");
  if (elements.transCancelButton) {
    elements.transCancelButton.classList.add("hidden");
  }
}

// Prepara la edición de una transacción existente.
function editarTransaccion(transactionId) {
  const transaction = state.transactions.find((item) => `${item.id}` === `${transactionId}`);

  if (!transaction) {
    return;
  }

  state.pendingTransactionDeletionId = null;
  state.editingTransactionId = transaction.id;
  if (elements.transFormTitle) {
    elements.transFormTitle.textContent = "Editar Transacción";
  }
  if (elements.transSubmitButton) {
    elements.transSubmitButton.textContent = "💾 Guardar Cambios";
  }
  if (elements.transaccionesFields.fecha) {
    elements.transaccionesFields.fecha.value = transaction.fecha;
  }
  if (elements.transaccionesFields.tipo) {
    elements.transaccionesFields.tipo.value = transaction.tipo;
  }
  updateTransactionCategoryOptions(transaction.tipo, transaction.categoria);
  if (elements.transaccionesFields.concepto) {
    elements.transaccionesFields.concepto.value = transaction.concepto;
  }
  if (elements.transaccionesFields.moneda) {
    elements.transaccionesFields.moneda.value = transaction.moneda;
  }
  if (elements.transaccionesFields.monto) {
    elements.transaccionesFields.monto.value = transaction.monto.toString();
  }
  if (elements.transaccionesFields.categoria) {
    elements.transaccionesFields.categoria.value = transaction.categoria;
  }
  if (elements.transCancelButton) {
    elements.transCancelButton.classList.remove("hidden");
  }
}

// Muestra un aviso de confirmación antes de eliminar una transacción.
function solicitarConfirmacionTransaccion(transactionId) {
  if (!transactionId) {
    return;
  }

  const normalizedId = `${transactionId}`;
  if (`${state.pendingTransactionDeletionId}` === normalizedId) {
    state.pendingTransactionDeletionId = null;
  } else {
    state.pendingTransactionDeletionId = transactionId;
  }
  refrescarFlujoCaja();
}

// Cancela la advertencia de eliminación activa.
function cancelarConfirmacionTransaccion() {
  if (!state.pendingTransactionDeletionId) {
    return;
  }

  state.pendingTransactionDeletionId = null;
  refrescarFlujoCaja();
}

// Elimina una transacción del registro.
async function eliminarTransaccion(transactionId) {
  if (!transactionId) {
    return;
  }

  const index = state.transactions.findIndex((item) => `${item.id}` === `${transactionId}`);

  if (index === -1) {
    showToast("No se encontró la transacción a eliminar.");
    return;
  }

  const [removedTransaction] = state.transactions.splice(index, 1);
  state.pendingTransactionDeletionId = null;

  if (shouldSyncWithSupabase() && isRemoteIdentifier(transactionId)) {
    try {
      const { error } = await supabaseClient
        .from(SUPABASE_TABLES.transactions)
        .delete()
        .eq("id", transactionId)
        .eq("usuario_id", state.remoteUser.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error al eliminar la transacción en Supabase:", error);
      state.transactions.splice(index, 0, removedTransaction);
      persistData();
      refrescarFlujoCaja();
      refrescarAnalisis();
      showToast("No se pudo eliminar la transacción en Supabase.");
      return;
    }
  }

  persistData();
  showToast("Transacción eliminada.");
  refrescarFlujoCaja();
  refrescarAnalisis();
}

// Renderiza la tabla de transacciones filtrada por mes.
function refrescarFlujoCaja() {
  if (!elements.transaccionesList) {
    return;
  }

  if (
    state.pendingTransactionDeletionId &&
    !state.transactions.some(
      (transaction) => `${transaction.id}` === `${state.pendingTransactionDeletionId}`
    )
  ) {
    state.pendingTransactionDeletionId = null;
  }

  elements.transaccionesList.innerHTML = "";

  const month = state.selectedMonth || getCurrentMonthValue();
  const filtered = state.transactions.filter((transaction) =>
    transaction.fecha.startsWith(month)
  );

  let totalIngresos = 0;
  let totalEgresos = 0;

  if (filtered.length === 0) {
    elements.transaccionesList.innerHTML =
      '<p class="empty-message">No hay transacciones registradas para este mes.</p>';
  }

  filtered.forEach((transaction) => {
    const card = document.createElement("article");
    card.className = "module-card";

    const header = document.createElement("div");
    header.className = "module-card-header";

    const title = document.createElement("h4");
    title.textContent = `${transaction.fecha} • ${transaction.concepto}`;

    const actions = document.createElement("div");
    actions.className = "module-card-actions";

    const editButton = document.createElement("button");
    editButton.className = "btn btn-secondary";
    editButton.dataset.action = "editar-transaccion";
    editButton.dataset.id = transaction.id;
    editButton.type = "button";
    editButton.textContent = "Editar";

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.dataset.action = "solicitar-eliminar-transaccion";
    deleteButton.dataset.id = transaction.id;
    deleteButton.type = "button";
    deleteButton.textContent = "Eliminar";

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    header.appendChild(title);
    header.appendChild(actions);

    const converted = convertToCurrentCurrency(transaction.monto, transaction.moneda);
    if (transaction.tipo === "ingreso") {
      totalIngresos += converted;
    } else {
      totalEgresos += converted;
    }

    const meta = document.createElement("div");
    meta.innerHTML = `
      <p><strong>Tipo:</strong> ${transaction.tipo}</p>
      <p><strong>Categoría:</strong> ${transaction.categoria}</p>
      <p><strong>Monto:</strong> ${formatCurrency(converted)}</p>
    `;

    card.appendChild(header);
    card.appendChild(meta);

    const isPendingDeletion = `${state.pendingTransactionDeletionId}` === `${transaction.id}`;

    if (isPendingDeletion) {
      const warning = document.createElement("div");
      warning.className = "delete-warning";

      const warningText = document.createElement("p");
      warningText.className = "delete-warning__text";
      warningText.textContent =
        "¿Deseas eliminar esta transacción? Esta acción no se puede deshacer.";

      const warningActions = document.createElement("div");
      warningActions.className = "delete-warning__actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "btn btn-secondary";
      cancelButton.dataset.action = "cancelar-eliminar-transaccion";
      cancelButton.textContent = "Cancelar";

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "btn btn-danger";
      confirmButton.dataset.action = "confirmar-eliminar-transaccion";
      confirmButton.dataset.id = transaction.id;
      confirmButton.textContent = "Eliminar";

      warningActions.appendChild(cancelButton);
      warningActions.appendChild(confirmButton);
      warning.appendChild(warningText);
      warning.appendChild(warningActions);
      card.appendChild(warning);
    }

    elements.transaccionesList.appendChild(card);
  });

  const saldo = totalIngresos - totalEgresos;
  if (elements.ingresosLabel) {
    elements.ingresosLabel.textContent = formatCurrency(totalIngresos);
  }
  if (elements.egresosLabel) {
    elements.egresosLabel.textContent = formatCurrency(totalEgresos);
  }
  if (elements.saldoLabel) {
    elements.saldoLabel.textContent = formatCurrency(saldo);
  }
  updateSaldoCardColor(saldo);
  actualizarGraficoFlujo(filtered);
}

// Ajusta el color del saldo según sea positivo o negativo.
function updateSaldoCardColor(saldo) {
  const saldoCard = document.querySelector("#saldo-card");

  if (!saldoCard) {
    return;
  }

  if (saldo >= 0) {
    saldoCard.style.background = "linear-gradient(135deg, #48bb78 0%, #38a169 100%)";
  } else {
    saldoCard.style.background = "linear-gradient(135deg, #f56565 0%, #e53e3e 100%)";
  }
}

// Actualiza el gráfico de flujo de caja utilizando Chart.js.
function actualizarGraficoFlujo(transactions) {
  if (!elements.charts.flujo || !window.Chart) {
    return;
  }

  const grouped = {};

  transactions.forEach((transaction) => {
    const day = transaction.fecha.slice(-2);
    if (!grouped[day]) {
      grouped[day] = { ingresos: 0, egresos: 0 };
    }

    const converted = convertToCurrentCurrency(transaction.monto, transaction.moneda);

    if (transaction.tipo === "ingreso") {
      grouped[day].ingresos += converted;
    } else {
      grouped[day].egresos += converted;
    }
  });

  const labels = Object.keys(grouped).sort();
  const ingresos = labels.map((label) => grouped[label].ingresos);
  const egresos = labels.map((label) => grouped[label].egresos);

  elements.charts.flujo.data.labels = labels;
  elements.charts.flujo.data.datasets[0].data = ingresos;
  elements.charts.flujo.data.datasets[1].data = egresos;
  elements.charts.flujo.update();
}

// Calcula métricas y actualiza los indicadores analíticos.
function refrescarAnalisis() {
  const totalCostosFijos = state.fixedCosts.reduce((acc, cost) => {
    const monthlyAmount = cost.frecuencia === "anual" ? cost.monto / 12 : cost.monto;
    return acc + convertToCurrentCurrency(monthlyAmount, cost.moneda);
  }, 0);

  let totalMargen = 0;
  let totalUnidades = 0;
  let totalVentas = 0;
  const margenesIndividuales = [];

  state.products.forEach((product) => {
    const costo = convertToCurrentCurrency(product.costo, product.moneda);
    const precio = convertToCurrentCurrency(product.precio, product.moneda);
    const margenUnitario = precio - costo;
    const margenPorcentaje = precio > 0 ? (margenUnitario / precio) * 100 : 0;

    totalMargen += margenUnitario * product.unidades;
    totalUnidades += product.unidades;
    totalVentas += precio * product.unidades;

    margenesIndividuales.push({
      nombre: product.nombre,
      margenUnitario: margenUnitario,
      margenPorcentaje: margenPorcentaje
    });
  });

  const margenPromedio = totalVentas > 0 ? (totalMargen / totalVentas) * 100 : 0;

  const contribucionUnitarioPromedio = state.products.length > 0
    ? totalMargen / Math.max(totalUnidades, 1)
    : 0;

  const unidadesEquilibrio = contribucionUnitarioPromedio > 0
    ? Math.ceil(totalCostosFijos / contribucionUnitarioPromedio)
    : 0;

  const ventasEquilibrio = unidadesEquilibrio * contribucionUnitarioPromedio;

  const ingresosNetos = state.transactions.reduce((acc, transaction) => {
    const value = convertToCurrentCurrency(transaction.monto, transaction.moneda);
    return transaction.tipo === "ingreso" ? acc + value : acc - value;
  }, 0);

  if (elements.peUnidades) {
    elements.peUnidades.textContent = unidadesEquilibrio.toString();
  }
  if (elements.peVentas) {
    elements.peVentas.textContent = formatCurrency(ventasEquilibrio);
  }
  if (elements.peEstado) {
    elements.peEstado.textContent = formatCurrency(ingresosNetos - totalCostosFijos);
  }
  if (elements.margenPromedio) {
    elements.margenPromedio.textContent = `${margenPromedio.toFixed(1)}%`;
  }
  updateEstadoCardColor(ingresosNetos - totalCostosFijos);
  actualizarGraficoMargen(margenesIndividuales);
  actualizarGraficoEquilibrio(unidadesEquilibrio, ventasEquilibrio, totalCostosFijos);
  actualizarRecomendaciones(unidadesEquilibrio, ingresosNetos - totalCostosFijos, margenPromedio);
}

// Cambia el color del estado según la rentabilidad.
function updateEstadoCardColor(resultado) {
  if (!elements.peCard) {
    return;
  }

  if (resultado >= 0) {
    elements.peCard.style.background = "linear-gradient(135deg, #48bb78 0%, #38a169 100%)";
  } else {
    elements.peCard.style.background = "linear-gradient(135deg, #f56565 0%, #e53e3e 100%)";
  }
}

// Actualiza el gráfico de márgenes por producto.
function actualizarGraficoMargen(margenes) {
  if (!elements.charts.margen || !window.Chart) {
    return;
  }

  const labels = margenes.map((item) => item.nombre);
  const data = margenes.map((item) => item.margenPorcentaje);

  elements.charts.margen.data.labels = labels;
  elements.charts.margen.data.datasets[0].data = data;
  elements.charts.margen.update();
}

// Actualiza el gráfico del punto de equilibrio.
function actualizarGraficoEquilibrio(unidades, ventas, costosFijos) {
  if (!elements.charts.equilibrio || !window.Chart) {
    return;
  }

  elements.charts.equilibrio.data.labels = ["Equilibrio", "Costos Fijos"];
  elements.charts.equilibrio.data.datasets[0].data = [ventas, costosFijos];
  elements.charts.equilibrio.update();
}

// Genera recomendaciones basadas en las métricas calculadas.
function actualizarRecomendaciones(unidadesEquilibrio, resultado, margenPromedio) {
  if (!elements.recomendaciones) {
    return;
  }

  elements.recomendaciones.innerHTML = "";

  if (state.products.length === 0) {
    elements.recomendaciones.innerHTML =
      '<p class="empty-message">Registra productos para recibir recomendaciones.</p>';
    return;
  }

  const recomendaciones = [];

  if (unidadesEquilibrio > 0) {
    recomendaciones.push(
      `Debes vender aproximadamente ${unidadesEquilibrio} unidades para cubrir tus costos fijos.`
    );
  }

  if (resultado < 0) {
    recomendaciones.push(
      "Tu flujo actual es negativo. Revisa tus costos fijos o incrementa tus ventas para mejorar el saldo."
    );
  } else {
    recomendaciones.push(
      "Tu flujo actual es positivo. Considera reinvertir una parte para impulsar el crecimiento."
    );
  }

  if (margenPromedio < 25) {
    recomendaciones.push(
      "El margen promedio es bajo. Evalúa ajustar precios o reducir costos directos."
    );
  } else {
    recomendaciones.push(
      "Mantén tus márgenes optimizados para sostener la rentabilidad." 
    );
  }

  recomendaciones.forEach((texto) => {
    const panel = document.createElement("div");
    panel.className = "recomendacion";
    panel.textContent = texto;
    elements.recomendaciones.appendChild(panel);
  });
}

// Exporta todos los datos en formato JSON.
function exportarDatos() {
  const payload = {
    products: state.products,
    fixedCosts: state.fixedCosts,
    transactions: state.transactions,
    preferences: {
      currency: state.currentCurrency,
      exchangeRate: state.exchangeRate,
      selectedMonth: state.selectedMonth
    }
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "costos-datos.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast("Datos exportados correctamente.");
}

// Importa los datos desde un archivo JSON.
function importarDatos(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const content = JSON.parse(reader.result);
      state.products = Array.isArray(content.products) ? content.products : [];
      state.fixedCosts = Array.isArray(content.fixedCosts) ? content.fixedCosts : [];
      state.transactions = Array.isArray(content.transactions) ? content.transactions : [];

      if (content.preferences) {
        state.currentCurrency = content.preferences.currency ?? state.currentCurrency;
        state.exchangeRate = content.preferences.exchangeRate ?? state.exchangeRate;
        state.selectedMonth = content.preferences.selectedMonth ?? state.selectedMonth;
      }

      persistData();
      applyPreferencesToUI();
      refrescarTodosLosPaneles();
      showToast("Datos importados.");
    } catch (error) {
      console.error("Error al importar datos", error);
      showToast("No se pudo leer el archivo seleccionado.");
    }
  };
  reader.readAsText(file);
}

// Elimina todos los registros guardados tras confirmación del usuario.
function limpiarDatos() {
  const confirmed = window.confirm("¿Deseas eliminar todos los datos guardados?");

  if (confirmed) {
    state.products = [];
    state.fixedCosts = [];
    state.transactions = [];
    persistData();
    refrescarTodosLosPaneles();
    showToast("Datos reiniciados.");
  }
}

// Actualiza el indicador visual de moneda actual.
function updateCurrencyDisplay() {
  if (!elements.currencyDisplay) {
    return;
  }

  const symbol = getCurrencySymbol();
  elements.currencyDisplay.textContent = `${symbol} ${state.currentCurrency}`;
}

// Actualiza el texto auxiliar de la tasa de cambio.
function updateExchangeLabel() {
  if (!elements.exchangeUsdLabel) {
    return;
  }

  const conversion = 1 / state.exchangeRate;
  elements.exchangeUsdLabel.textContent = conversion.toFixed(4);
}

// Recupera el mes actual en formato YYYY-MM.
function getCurrentMonthValue() {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

// Inicializa las instancias de Chart.js necesarias.
function createCharts() {
  if (!window.Chart) {
    return;
  }

  const flujoContext = document.getElementById("flujoChart");
  const margenContext = document.getElementById("margenChart");
  const equilibrioContext = document.getElementById("equilibrioChart");

  if (flujoContext) {
    elements.charts.flujo = new window.Chart(flujoContext, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Ingresos",
            data: [],
            borderColor: "#38a169",
            backgroundColor: "rgba(56, 161, 105, 0.3)",
            tension: 0.3,
            fill: true
          },
          {
            label: "Egresos",
            data: [],
            borderColor: "#e53e3e",
            backgroundColor: "rgba(229, 62, 62, 0.3)",
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top"
          }
        }
      }
    });
  }

  if (margenContext) {
    elements.charts.margen = new window.Chart(margenContext, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Margen %",
            data: [],
            backgroundColor: "rgba(128, 90, 213, 0.7)"
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        }
      }
    });
  }

  if (equilibrioContext) {
    elements.charts.equilibrio = new window.Chart(equilibrioContext, {
      type: "doughnut",
      data: {
        labels: ["Equilibrio", "Costos"],
        datasets: [
          {
            data: [],
            backgroundColor: ["#667eea", "#e53e3e"]
          }
        ]
      }
    });
  }
}

// Refresca cada panel de manera centralizada.
function refrescarTodosLosPaneles() {
  refrescarProductos();
  refrescarCostosFijos();
  refrescarFlujoCaja();
  refrescarAnalisis();
}

// Configura el mensaje de contexto en el encabezado.
function setupGreeting() {
  if (!elements.headerSubtitle) {
    return;
  }

  elements.headerSubtitle.textContent =
    "Gestiona tus costos, flujo de caja y análisis financiero desde un único panel.";
}

// Registra todos los listeners necesarios para la interfaz.
function registerEventListeners() {
  document.addEventListener("click", handleGlobalClick);
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", handleTabChange);
  });
  if (elements.appContainer) {
    elements.appContainer.addEventListener("click", handleAction);
  }
  if (elements.currencySelect) {
    elements.currencySelect.addEventListener("change", handleCurrencyChange);
  }
  if (elements.exchangeInput) {
    elements.exchangeInput.addEventListener("change", handleExchangeChange);
  }
  if (elements.monthInput) {
    elements.monthInput.addEventListener("change", handleMonthChange);
  }
  if (elements.transaccionesFields.tipo) {
    elements.transaccionesFields.tipo.addEventListener("change", handleTransactionTypeChange);
  }
  if (elements.fileInput) {
    elements.fileInput.addEventListener("change", importarDatos);
  }
}

// Obtiene y almacena las referencias a los elementos DOM relevantes.
function cacheElements() {
  elements.appContainer = document.querySelector("#costosApp");
  elements.loadingBanner = document.querySelector("#loading");
  elements.tabButtons = Array.from(document.querySelectorAll(".tabs .tab"));
  elements.tabContents = Array.from(document.querySelectorAll(".tab-content"));
  elements.dropdownButtons = Array.from(document.querySelectorAll("[data-dropdown]"));
  elements.dropdowns = Array.from(document.querySelectorAll(".dropdown"));
  elements.fileInput = document.querySelector("#fileInput");
  elements.currencyDisplay = document.querySelector("#monedaActual");
  elements.currencySelect = document.querySelector("#selectMoneda");
  elements.exchangeInput = document.querySelector("#tasaCambio");
  elements.exchangeUsdLabel = document.querySelector("#tasaDolar");
  elements.logoutButton = document.querySelector("#logoutButton");
  elements.headerSubtitle = document.querySelector(".subtitle");
  elements.monthInput = document.querySelector("#mes-seleccionado");
  elements.ingresosLabel = document.querySelector("#flujo-ingresos");
  elements.egresosLabel = document.querySelector("#flujo-egresos");
  elements.saldoLabel = document.querySelector("#flujo-saldo");
  elements.productosList = document.querySelector("#lista-productos");
  elements.costosList = document.querySelector("#lista-costos");
  elements.transaccionesList = document.querySelector("#lista-transacciones");
  elements.totalCostosLabel = document.querySelector("#total-costos-fijos");
  elements.prodFormTitle = document.querySelector("#prod-form-title");
  elements.prodSubmitButton = document.querySelector('[data-action="guardar-producto"]');
  elements.prodCancelButton = document.querySelector('[data-action="cancelar-producto"]');
  elements.costoFormTitle = document.querySelector("#costo-form-title");
  elements.costoSubmitButton = document.querySelector('[data-action="guardar-costo"]');
  elements.costoCancelButton = document.querySelector('[data-action="cancelar-costo"]');
  elements.transFormTitle = document.querySelector("#trans-form-title");
  elements.transSubmitButton = document.querySelector('[data-action="guardar-transaccion"]');
  elements.transCancelButton = document.querySelector('[data-action="cancelar-transaccion"]');
  elements.recomendaciones = document.querySelector("#recomendaciones");
  elements.peUnidades = document.querySelector("#pe-unidades");
  elements.peVentas = document.querySelector("#pe-ventas");
  elements.peEstado = document.querySelector("#pe-estado");
  elements.peCard = document.querySelector("#pe-estado-card");
  elements.margenPromedio = document.querySelector("#margen-promedio");
  elements.productosFields = {
    nombre: document.querySelector("#prod-nombre"),
    tipo: document.querySelector("#prod-tipo"),
    moneda: document.querySelector("#prod-moneda"),
    costo: document.querySelector("#prod-costo"),
    precio: document.querySelector("#prod-precio"),
    unidades: document.querySelector("#prod-unidades")
  };
  elements.costosFields = {
    concepto: document.querySelector("#costo-concepto"),
    moneda: document.querySelector("#costo-moneda"),
    monto: document.querySelector("#costo-monto"),
    frecuencia: document.querySelector("#costo-frecuencia")
  };
  elements.transaccionesFields = {
    fecha: document.querySelector("#trans-fecha"),
    tipo: document.querySelector("#trans-tipo"),
    concepto: document.querySelector("#trans-concepto"),
    moneda: document.querySelector("#trans-moneda"),
    monto: document.querySelector("#trans-monto"),
    categoria: document.querySelector("#trans-categoria")
  };
}

// Espera a que Chart.js esté disponible antes de crear gráficos.
function waitForChartLibrary() {
  return new Promise((resolve) => {
    if (window.Chart) {
      resolve();
      return;
    }

    const intervalId = window.setInterval(() => {
      if (window.Chart) {
        window.clearInterval(intervalId);
        resolve();
      }
    }, 50);
  });
}

// Inicializa el módulo asegurando que todos los recursos estén listos.
async function initializeModule() {
  if (typeof document === "undefined") {
    return;
  }

  cacheElements();
  hideToast();
  await bootstrapRemoteUser();
  loadPersistedData();
  const initialType = elements.transaccionesFields.tipo?.value ?? "ingreso";
  updateTransactionCategoryOptions(initialType);

  if (!state.selectedMonth) {
    state.selectedMonth = getCurrentMonthValue();
  }

  applyPreferencesToUI();
  setupGreeting();
  registerEventListeners();

  await waitForChartLibrary();
  createCharts();
  await syncAllDataFromSupabase();
  refrescarTodosLosPaneles();

  if (elements.appContainer) {
    elements.appContainer.classList.remove("hidden");
  }
}

initializeModule();
