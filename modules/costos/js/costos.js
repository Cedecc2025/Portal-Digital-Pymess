// costos.js
// Controla toda la lógica interactiva del módulo de costos.

import { requireAuth, logout, getCurrentUsername } from "../../../lib/authGuard.js";

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
  editingProductId: null,
  editingCostId: null,
  editingTransactionId: null,
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
  prodCancelButton: null,
  costoFormTitle: null,
  costoCancelButton: null,
  transFormTitle: null,
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

// Obtiene un identificador único simple para los registros.
function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Carga los datos persistidos en localStorage.
function loadPersistedData() {
  const products = window.localStorage.getItem(STORAGE_KEYS.products);
  const costs = window.localStorage.getItem(STORAGE_KEYS.costs);
  const transactions = window.localStorage.getItem(STORAGE_KEYS.transactions);
  const preferences = window.localStorage.getItem(STORAGE_KEYS.preferences);

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
  window.localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(state.products));
  window.localStorage.setItem(STORAGE_KEYS.costs, JSON.stringify(state.fixedCosts));
  window.localStorage.setItem(
    STORAGE_KEYS.transactions,
    JSON.stringify(state.transactions)
  );
  window.localStorage.setItem(
    STORAGE_KEYS.preferences,
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
function handleAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  const entityId = actionButton.dataset.id ?? null;

  switch (action) {
    case "refrescar-productos":
      refrescarProductos();
      break;
    case "guardar-producto":
      guardarProducto();
      break;
    case "cancelar-producto":
      cancelarEdicionProducto();
      break;
    case "editar-producto":
      editarProducto(entityId);
      break;
    case "eliminar-producto":
      eliminarProducto(entityId);
      break;
    case "refrescar-costos":
      refrescarCostosFijos();
      break;
    case "guardar-costo":
      guardarCostoFijo();
      break;
    case "cancelar-costo":
      cancelarEdicionCostoFijo();
      break;
    case "editar-costo":
      editarCostoFijo(entityId);
      break;
    case "eliminar-costo":
      eliminarCostoFijo(entityId);
      break;
    case "refrescar-flujo":
      refrescarFlujoCaja();
      break;
    case "guardar-transaccion":
      guardarTransaccion();
      break;
    case "cancelar-transaccion":
      cancelarEdicionTransaccion();
      break;
    case "editar-transaccion":
      editarTransaccion(entityId);
      break;
    case "eliminar-transaccion":
      eliminarTransaccion(entityId);
      break;
    case "refrescar-analisis":
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

// Asocia el botón de cerrar sesión con el guard de autenticación.
function handleLogoutClick() {
  logout();
}

// Agrega o actualiza un producto en la colección.
function guardarProducto() {
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

  const productData = {
    id: state.editingProductId ?? generateId(),
    nombre: nombre,
    tipo: tipo,
    moneda: moneda,
    costo: costo,
    precio: precio,
    unidades: unidades
  };

  if (state.editingProductId) {
    state.products = state.products.map((product) =>
      product.id === state.editingProductId ? productData : product
    );
    showToast("Producto actualizado correctamente.");
  } else {
    state.products.push(productData);
    showToast("Producto agregado correctamente.");
  }

  persistData();
  cancelarEdicionProducto();
  refrescarProductos();
  refrescarAnalisis();
}

// Cancela la edición del producto y limpia el formulario.
function cancelarEdicionProducto() {
  state.editingProductId = null;
  if (elements.prodFormTitle) {
    elements.prodFormTitle.textContent = "Agregar Producto/Servicio";
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
  const product = state.products.find((item) => item.id === productId);

  if (!product) {
    return;
  }

  state.editingProductId = product.id;
  if (elements.prodFormTitle) {
    elements.prodFormTitle.textContent = "Editar Producto/Servicio";
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
    elements.productosFields.costo.value = product.costo.toString();
  }
  if (elements.productosFields.precio) {
    elements.productosFields.precio.value = product.precio.toString();
  }
  if (elements.productosFields.unidades) {
    elements.productosFields.unidades.value = product.unidades.toString();
  }
  if (elements.prodCancelButton) {
    elements.prodCancelButton.classList.remove("hidden");
  }
}

// Elimina un producto de la colección.
function eliminarProducto(productId) {
  if (!productId) {
    return;
  }

  state.products = state.products.filter((product) => product.id !== productId);
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
function guardarCostoFijo() {
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

  const costData = {
    id: state.editingCostId ?? generateId(),
    concepto: concepto,
    moneda: moneda,
    monto: monto,
    frecuencia: frecuencia
  };

  if (state.editingCostId) {
    state.fixedCosts = state.fixedCosts.map((cost) =>
      cost.id === state.editingCostId ? costData : cost
    );
    showToast("Costo fijo actualizado.");
  } else {
    state.fixedCosts.push(costData);
    showToast("Costo fijo agregado.");
  }

  persistData();
  cancelarEdicionCostoFijo();
  refrescarCostosFijos();
  refrescarAnalisis();
}

// Cancela la edición del costo fijo.
function cancelarEdicionCostoFijo() {
  state.editingCostId = null;
  if (elements.costoFormTitle) {
    elements.costoFormTitle.textContent = "Agregar Costo Fijo";
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
  const cost = state.fixedCosts.find((item) => item.id === costId);

  if (!cost) {
    return;
  }

  state.editingCostId = cost.id;
  if (elements.costoFormTitle) {
    elements.costoFormTitle.textContent = "Editar Costo Fijo";
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
function eliminarCostoFijo(costId) {
  if (!costId) {
    return;
  }

  state.fixedCosts = state.fixedCosts.filter((cost) => cost.id !== costId);
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
function guardarTransaccion() {
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

  const transactionData = {
    id: state.editingTransactionId ?? generateId(),
    fecha: fecha,
    tipo: tipo,
    concepto: concepto,
    moneda: moneda,
    monto: monto,
    categoria: categoria
  };

  if (state.editingTransactionId) {
    state.transactions = state.transactions.map((item) =>
      item.id === state.editingTransactionId ? transactionData : item
    );
    showToast("Transacción actualizada.");
  } else {
    state.transactions.push(transactionData);
    showToast("Transacción agregada.");
  }

  persistData();
  cancelarEdicionTransaccion();
  refrescarFlujoCaja();
  refrescarAnalisis();
}

// Cancela la edición de la transacción.
function cancelarEdicionTransaccion() {
  state.editingTransactionId = null;
  if (elements.transFormTitle) {
    elements.transFormTitle.textContent = "Agregar Transacción";
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
  if (elements.transaccionesFields.categoria) {
    elements.transaccionesFields.categoria.value = "venta";
  }
  if (elements.transCancelButton) {
    elements.transCancelButton.classList.add("hidden");
  }
}

// Prepara la edición de una transacción existente.
function editarTransaccion(transactionId) {
  const transaction = state.transactions.find((item) => item.id === transactionId);

  if (!transaction) {
    return;
  }

  state.editingTransactionId = transaction.id;
  if (elements.transFormTitle) {
    elements.transFormTitle.textContent = "Editar Transacción";
  }
  if (elements.transaccionesFields.fecha) {
    elements.transaccionesFields.fecha.value = transaction.fecha;
  }
  if (elements.transaccionesFields.tipo) {
    elements.transaccionesFields.tipo.value = transaction.tipo;
  }
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

// Elimina una transacción del registro.
function eliminarTransaccion(transactionId) {
  if (!transactionId) {
    return;
  }

  state.transactions = state.transactions.filter((item) => item.id !== transactionId);
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
    deleteButton.dataset.action = "eliminar-transaccion";
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

// Configura el saludo con el usuario autenticado.
function setupGreeting() {
  if (!elements.headerSubtitle) {
    return;
  }

  const username = getCurrentUsername();

  if (username) {
    elements.headerSubtitle.textContent = `Hola ${username}, gestiona aquí tus finanzas con precisión.`;
  }
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
  if (elements.fileInput) {
    elements.fileInput.addEventListener("change", importarDatos);
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", handleLogoutClick);
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
  elements.prodCancelButton = document.querySelector('[data-action="cancelar-producto"]');
  elements.costoFormTitle = document.querySelector("#costo-form-title");
  elements.costoCancelButton = document.querySelector('[data-action="cancelar-costo"]');
  elements.transFormTitle = document.querySelector("#trans-form-title");
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
  requireAuth();

  if (typeof document === "undefined") {
    return;
  }

  cacheElements();
  hideToast();
  loadPersistedData();

  if (!state.selectedMonth) {
    state.selectedMonth = getCurrentMonthValue();
  }

  applyPreferencesToUI();
  setupGreeting();
  registerEventListeners();

  await waitForChartLibrary();
  createCharts();
  refrescarTodosLosPaneles();

  if (elements.appContainer) {
    elements.appContainer.classList.remove("hidden");
  }
}

initializeModule();
