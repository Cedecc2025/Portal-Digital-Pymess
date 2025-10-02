import { supabaseClient } from "../../../lib/supabaseClient.js";
import {
  requireAuth,
  resolveCurrentUserId,
  getCurrentUsername
} from "../../../lib/authGuard.js";

const TABLES = {
  clientes: "crm_clientes",
  oportunidades: "crm_oportunidades",
  tareas: "crm_tareas",
  actividades: "crm_actividades"
};

const state = {
  clientes: [],
  oportunidades: [],
  tareas: [],
  actividades: []
};

const DOM = {
  saveIndicator: null,
  tablaClientes: null,
  tablaOportunidades: null,
  tablaTareas: null,
  listaActividades: null,
  actividadReciente: null,
  storageStats: null,
  currentDateTime: null,
  clienteForm: null,
  clienteModalTitle: null,
  clienteSubmitButton: null,
  oportunidadForm: null,
  oportunidadModalTitle: null,
  oportunidadSubmitButton: null,
  tareaForm: null,
  buscarClienteInput: null,
  buscarOportunidadInput: null,
  buscarTareaInput: null,
  oportunidadClienteSelect: null,
  tareaClienteSelect: null,
  importFileInput: null
};

let currentUserId = null;
let currentUsername = null;
let editingClienteId = null;
let editingOportunidadId = null;

requireAuth();

function normalizeUserId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  return value;
}

function initializeDomReferences() {
  if (typeof document === "undefined") {
    return;
  }

  DOM.saveIndicator = document.getElementById("saveIndicator");
  DOM.tablaClientes = document.getElementById("tablaClientes");
  DOM.tablaOportunidades = document.getElementById("tablaOportunidades");
  DOM.tablaTareas = document.getElementById("tablaTareas");
  DOM.listaActividades = document.getElementById("listaActividades");
  DOM.actividadReciente = document.getElementById("actividadReciente");
  DOM.storageStats = document.getElementById("storageStats");
  DOM.currentDateTime = document.getElementById("currentDateTime");
  DOM.clienteForm = document.getElementById("clienteForm");
  DOM.clienteModalTitle = document.querySelector(
    "#clienteModal .modal-title"
  );
  DOM.clienteSubmitButton = DOM.clienteForm?.querySelector(
    'button[type="submit"]'
  );
  DOM.oportunidadForm = document.getElementById("oportunidadForm");
  DOM.oportunidadModalTitle = document.querySelector(
    "#oportunidadModal .modal-title"
  );
  DOM.oportunidadSubmitButton = DOM.oportunidadForm?.querySelector(
    'button[type="submit"]'
  );
  DOM.tareaForm = document.getElementById("tareaForm");
  DOM.buscarClienteInput = document.getElementById("buscarCliente");
  DOM.buscarOportunidadInput = document.getElementById("buscarOportunidad");
  DOM.buscarTareaInput = document.getElementById("buscarTarea");
  DOM.oportunidadClienteSelect = document.getElementById("oportunidadCliente");
  DOM.tareaClienteSelect = document.getElementById("tareaCliente");
  DOM.importFileInput = document.getElementById("importFile");

  if (DOM.storageStats) {
    DOM.storageStats.textContent = "Cargando estadísticas...";
  }
}

function attachGlobalListeners() {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.classList.contains("modal")) {
      event.target.classList.remove("active");
    }
  });
}

async function bootstrapCrmModule() {
  initializeDomReferences();
  attachGlobalListeners();

  currentUsername = getCurrentUsername();
  const resolvedUserId = await resolveCurrentUserId();
  currentUserId = normalizeUserId(resolvedUserId);

  if (!currentUserId) {
    mostrarNotificacion(
      "No fue posible identificar al usuario actual. Inicia sesión nuevamente.",
      "danger"
    );
    return;
  }

  await loadInitialData();
  actualizarFechaHora();
  setInterval(actualizarFechaHora, 1000);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapCrmModule, {
      once: true
    });
  } else {
    bootstrapCrmModule();
  }
}

function mapCliente(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono ?? "",
    empresa: row.empresa ?? "",
    tipo: row.tipo ?? "Prospecto",
    notas: row.notas ?? "",
    fechaCreacion: row.created_at ?? row.fecha_creacion ?? null
  };
}

function mapOportunidad(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    clienteId: row.cliente_id ?? null,
    clienteNombre: row.cliente_nombre ?? "",
    valor: typeof row.valor === "number" ? row.valor : Number(row.valor ?? 0),
    etapa: row.etapa ?? "Prospección",
    probabilidad: Number.isFinite(row.probabilidad)
      ? row.probabilidad
      : Number(row.probabilidad ?? 0),
    fechaCierre: row.fecha_cierre ?? "",
    descripcion: row.descripcion ?? "",
    fechaCreacion: row.created_at ?? row.fecha_creacion ?? null
  };
}

function mapTarea(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    clienteId: row.cliente_id ?? null,
    clienteNombre: row.cliente_nombre ?? (row.cliente_id ? "Cliente" : "Sin cliente"),
    prioridad: row.prioridad ?? "Media",
    estado: row.estado ?? "Pendiente",
    fechaLimite: row.fecha_limite ?? "",
    descripcion: row.descripcion ?? "",
    fechaCreacion: row.created_at ?? row.fecha_creacion ?? null
  };
}

function mapActividad(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    descripcion: row.descripcion,
    fecha: row.fecha ?? row.created_at ?? new Date().toISOString(),
    clienteId: row.cliente_id ?? null,
    oportunidadId: row.oportunidad_id ?? null,
    tareaId: row.tarea_id ?? null
  };
}

async function loadInitialData() {
  const operations = [
    { key: "clientes", fetcher: fetchClientes },
    { key: "oportunidades", fetcher: fetchOportunidades },
    { key: "tareas", fetcher: fetchTareas },
    { key: "actividades", fetcher: fetchActividades }
  ];

  const results = await Promise.allSettled(
    operations.map((operation) => operation.fetcher())
  );

  const failedSections = [];

  results.forEach((result, index) => {
    const { key } = operations[index];

    if (result.status === "fulfilled") {
      const value = Array.isArray(result.value) ? result.value : [];

      if (key === "actividades") {
        state[key] = value.sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
      } else {
        state[key] = value;
      }
    } else {
      failedSections.push(key);
      console.error(`Error al cargar ${key} desde Supabase`, result.reason);
      state[key] = [];
    }
  });

  actualizarTodasLasVistas();
  cargarClientesEnSelect();
  actualizarDashboard();
  actualizarEstadisticasAlmacenamiento();

  if (failedSections.length > 0) {
    const sectionsLabel = failedSections
      .map((key) => key.charAt(0).toUpperCase() + key.slice(1))
      .join(", ");

    mostrarNotificacion(
      `No fue posible cargar ${sectionsLabel} desde Supabase. Reintenta más tarde.`,
      "warning"
    );
  }
}

async function fetchClientes() {
  const { data, error } = await supabaseClient
    .from(TABLES.clientes)
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCliente);
}

async function refreshClientes({ suppressErrorNotification = false } = {}) {
  try {
    const clientes = await fetchClientes();
    state.clientes = clientes;
    mostrarClientes();
    cargarClientesEnSelect();
    actualizarDashboard();
    actualizarEstadisticasAlmacenamiento();
    return clientes;
  } catch (error) {
    console.error("Error al sincronizar clientes", error);
    if (!suppressErrorNotification) {
      mostrarNotificacion(
        "No fue posible sincronizar los clientes con Supabase.",
        "danger"
      );
    }
    throw error;
  }
}

async function fetchOportunidades() {
  const { data, error } = await supabaseClient
    .from(TABLES.oportunidades)
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapOportunidad);
}

async function fetchTareas() {
  const { data, error } = await supabaseClient
    .from(TABLES.tareas)
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTarea);
}

async function fetchActividades() {
  const { data, error } = await supabaseClient
    .from(TABLES.actividades)
    .select("*")
    .eq("user_id", currentUserId)
    .order("fecha", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapActividad);
}

function actualizarTodasLasVistas() {
  mostrarClientes();
  mostrarOportunidades();
  mostrarTareas();
  mostrarActividades();
  mostrarActividadReciente();
}

function showSection(event, sectionId) {
  if (typeof document === "undefined") {
    return;
  }

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  const sectionElement = document.getElementById(sectionId);
  if (sectionElement) {
    sectionElement.classList.add("active");
  }

  const target = event?.currentTarget ?? event?.target;
  if (target instanceof HTMLElement) {
    target.classList.add("active");
  }

  if (sectionId === "dashboard") {
    actualizarDashboard();
  } else if (sectionId === "configuracion") {
    actualizarEstadisticasAlmacenamiento();
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);

  if (modal) {
    modal.classList.add("active");
  }

  if (modalId === "oportunidadModal" || modalId === "tareaModal") {
    cargarClientesEnSelect();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);

  if (modal) {
    modal.classList.remove("active");
  }

  if (modalId === "clienteModal" && DOM.clienteForm) {
    DOM.clienteForm.reset();
    editingClienteId = null;
    setClienteModalMode("create");
  } else if (modalId === "oportunidadModal" && DOM.oportunidadForm) {
    DOM.oportunidadForm.reset();
    editingOportunidadId = null;
    setOportunidadModalMode("create");
  } else if (modalId === "tareaModal" && DOM.tareaForm) {
    DOM.tareaForm.reset();
  }
}

function mostrarIndicadorGuardado() {
  if (!DOM.saveIndicator) {
    return;
  }

  DOM.saveIndicator.classList.add("show");
  setTimeout(() => {
    DOM.saveIndicator?.classList.remove("show");
  }, 2000);
}

function setClienteModalMode(mode) {
  if (!DOM.clienteModalTitle || !DOM.clienteSubmitButton) {
    return;
  }

  if (mode === "edit") {
    DOM.clienteModalTitle.textContent = "Editar Cliente";
    DOM.clienteSubmitButton.textContent = "Actualizar";
  } else {
    DOM.clienteModalTitle.textContent = "Nuevo Cliente";
    DOM.clienteSubmitButton.textContent = "Guardar";
  }
}

function setOportunidadModalMode(mode) {
  if (!DOM.oportunidadModalTitle || !DOM.oportunidadSubmitButton) {
    return;
  }

  if (mode === "edit") {
    DOM.oportunidadModalTitle.textContent = "Editar Oportunidad";
    DOM.oportunidadSubmitButton.textContent = "Actualizar";
  } else {
    DOM.oportunidadModalTitle.textContent = "Nueva Oportunidad";
    DOM.oportunidadSubmitButton.textContent = "Guardar";
  }
}

function openClienteModal() {
  editingClienteId = null;
  if (DOM.clienteForm) {
    DOM.clienteForm.reset();
  }
  setClienteModalMode("create");
  openModal("clienteModal");
}

function openOportunidadModal() {
  editingOportunidadId = null;
  if (DOM.oportunidadForm) {
    DOM.oportunidadForm.reset();
  }
  setOportunidadModalMode("create");
  cargarClientesEnSelect();
  openModal("oportunidadModal");
}

function editarCliente(id) {
  if (!DOM.clienteForm) {
    return;
  }

  const cliente = state.clientes.find((c) => c.id === id);

  if (!cliente) {
    mostrarNotificacion("No fue posible cargar la información del cliente.", "danger");
    return;
  }

  editingClienteId = id;

  DOM.clienteForm.querySelector("#clienteNombre").value = cliente.nombre ?? "";
  DOM.clienteForm.querySelector("#clienteEmail").value = cliente.email ?? "";
  DOM.clienteForm.querySelector("#clienteTelefono").value = cliente.telefono ?? "";
  DOM.clienteForm.querySelector("#clienteEmpresa").value = cliente.empresa ?? "";
  DOM.clienteForm.querySelector("#clienteTipo").value = cliente.tipo ?? "Prospecto";
  DOM.clienteForm.querySelector("#clienteNotas").value = cliente.notas ?? "";

  setClienteModalMode("edit");
  openModal("clienteModal");
}

function editarOportunidad(id) {
  if (!DOM.oportunidadForm) {
    return;
  }

  const oportunidad = state.oportunidades.find((op) => op.id === id);

  if (!oportunidad) {
    mostrarNotificacion(
      "No fue posible cargar la información de la oportunidad.",
      "danger"
    );
    return;
  }

  editingOportunidadId = id;
  DOM.oportunidadForm.reset();
  setOportunidadModalMode("edit");
  openModal("oportunidadModal");

  const tituloInput = DOM.oportunidadForm.querySelector("#oportunidadTitulo");
  const clienteSelect = DOM.oportunidadForm.querySelector(
    "#oportunidadCliente"
  );
  const valorInput = DOM.oportunidadForm.querySelector("#oportunidadValor");
  const etapaSelect = DOM.oportunidadForm.querySelector("#oportunidadEtapa");
  const probabilidadInput = DOM.oportunidadForm.querySelector(
    "#oportunidadProbabilidad"
  );
  const fechaCierreInput = DOM.oportunidadForm.querySelector(
    "#oportunidadFechaCierre"
  );
  const descripcionTextarea = DOM.oportunidadForm.querySelector(
    "#oportunidadDescripcion"
  );

  if (tituloInput) {
    tituloInput.value = oportunidad.titulo ?? "";
  }
  if (clienteSelect) {
    clienteSelect.value =
      oportunidad.clienteId !== null && oportunidad.clienteId !== undefined
        ? String(oportunidad.clienteId)
        : "";
  }
  if (valorInput) {
    valorInput.value =
      oportunidad.valor !== undefined && oportunidad.valor !== null
        ? String(oportunidad.valor)
        : "";
  }
  if (etapaSelect) {
    etapaSelect.value = oportunidad.etapa ?? "Prospección";
  }
  if (probabilidadInput) {
    probabilidadInput.value =
      oportunidad.probabilidad !== undefined &&
      oportunidad.probabilidad !== null
        ? String(oportunidad.probabilidad)
        : "0";
  }
  if (fechaCierreInput) {
    fechaCierreInput.value = oportunidad.fechaCierre ?? "";
  }
  if (descripcionTextarea) {
    descripcionTextarea.value = oportunidad.descripcion ?? "";
  }
}

async function guardarCliente(event) {
  event.preventDefault();

  if (!DOM.clienteForm || !currentUserId) {
    return;
  }

  const nombre = DOM.clienteForm.querySelector("#clienteNombre")?.value.trim();
  const email = DOM.clienteForm.querySelector("#clienteEmail")?.value.trim();

  if (!nombre || !email) {
    mostrarNotificacion(
      "Completa los campos obligatorios para guardar el cliente.",
      "warning"
    );
    return;
  }

  const telefono = DOM.clienteForm.querySelector("#clienteTelefono")?.value.trim() ?? "";
  const empresa = DOM.clienteForm.querySelector("#clienteEmpresa")?.value.trim() ?? "";
  const tipo = DOM.clienteForm.querySelector("#clienteTipo")?.value ?? "Prospecto";
  const notas = DOM.clienteForm.querySelector("#clienteNotas")?.value ?? "";
  const isEditing = editingClienteId !== null;
  const timestamp = new Date().toISOString();

  try {
    if (isEditing) {
      const { data, error } = await supabaseClient
        .from(TABLES.clientes)
        .update({
          nombre,
          email,
          telefono: telefono || null,
          empresa: empresa || null,
          tipo,
          notas: notas || null,
          updated_at: timestamp
        })
        .eq("user_id", currentUserId)
        .eq("id", editingClienteId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const clienteActualizado = mapCliente(data);
      await refreshClientes({ suppressErrorNotification: true });
      mostrarIndicadorGuardado();
      closeModal("clienteModal");

      await registrarActividad(
        "Cliente actualizado",
        `Se actualizó el cliente ${clienteActualizado.nombre}`,
        {
          clienteId: clienteActualizado.id
        }
      );

      mostrarNotificacion("Cliente actualizado exitosamente", "success");
    } else {
      const { data, error } = await supabaseClient
        .from(TABLES.clientes)
        .insert([
          {
            user_id: currentUserId,
            nombre,
            email,
            telefono: telefono || null,
            empresa: empresa || null,
            tipo,
            notas: notas || null,
            created_at: timestamp,
            updated_at: timestamp
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const cliente = mapCliente(data);
      await refreshClientes({ suppressErrorNotification: true });
      mostrarIndicadorGuardado();
      closeModal("clienteModal");

      await registrarActividad(
        "Cliente creado",
        `Se agregó el cliente ${cliente.nombre}`,
        {
          clienteId: cliente.id
        }
      );

      mostrarNotificacion("Cliente agregado exitosamente", "success");
    }
  } catch (error) {
    console.error("Error al guardar cliente", error);
    mostrarNotificacion("No fue posible guardar el cliente. Intenta nuevamente.", "danger");
  }
}

async function eliminarCliente(id) {
  if (!currentUserId) {
    return;
  }

  const confirmacion = window.confirm("¿Está seguro de eliminar este cliente?");
  if (!confirmacion) {
    return;
  }

  try {
    await supabaseClient
      .from(TABLES.oportunidades)
      .delete()
      .eq("user_id", currentUserId)
      .eq("cliente_id", id);

    await supabaseClient
      .from(TABLES.tareas)
      .delete()
      .eq("user_id", currentUserId)
      .eq("cliente_id", id);

    const { error } = await supabaseClient
      .from(TABLES.clientes)
      .delete()
      .eq("user_id", currentUserId)
      .eq("id", id);

    if (error) {
      throw error;
    }

    const cliente = state.clientes.find((c) => c.id === id);

    state.oportunidades = state.oportunidades.filter((o) => o.clienteId !== id);
    state.tareas = state.tareas.filter((t) => t.clienteId !== id);

    await refreshClientes({ suppressErrorNotification: true });
    mostrarOportunidades();
    mostrarTareas();

    await registrarActividad(
      "Cliente eliminado",
      `Se eliminó el cliente ${cliente?.nombre ?? ""}`,
      {
        clienteId: id
      }
    );

    mostrarNotificacion("Cliente eliminado", "danger");
  } catch (error) {
    console.error("Error al eliminar cliente", error);
    mostrarNotificacion("No fue posible eliminar el cliente.", "danger");
  }
}

function buscarClientes() {
  const busqueda = DOM.buscarClienteInput?.value.trim().toLowerCase() ?? "";
  const tabla = DOM.tablaClientes;

  if (!tabla) {
    return;
  }

  const clientesFiltrados = state.clientes.filter((cliente) => {
    const nombre = cliente.nombre?.toLowerCase() ?? "";
    const email = cliente.email?.toLowerCase() ?? "";
    const telefono = cliente.telefono ?? "";
    const empresa = cliente.empresa?.toLowerCase() ?? "";

    return (
      nombre.includes(busqueda) ||
      email.includes(busqueda) ||
      telefono.includes(busqueda) ||
      empresa.includes(busqueda)
    );
  });

  renderClientes(clientesFiltrados, "No se encontraron resultados");
}

function filtrarClientes(tipo) {
  const tabla = DOM.tablaClientes;
  if (!tabla) {
    return;
  }

  const clientesFiltrados = tipo
    ? state.clientes.filter((cliente) => cliente.tipo === tipo)
    : state.clientes;

  const mensaje = tipo
    ? `No se encontraron clientes de tipo ${tipo}`
    : "No hay clientes registrados";

  renderClientes(clientesFiltrados, mensaje);
}

function renderClientes(clientes, emptyMessage) {
  if (!DOM.tablaClientes) {
    return;
  }

  if (!clientes || clientes.length === 0) {
    DOM.tablaClientes.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon">👥</div>
          <p>${emptyMessage}</p>
        </td>
      </tr>
    `;
    return;
  }

  DOM.tablaClientes.innerHTML = clientes
    .map(
      (cliente) => `
      <tr>
        <td><strong>${cliente.nombre}</strong></td>
        <td>${cliente.email}</td>
        <td>${cliente.telefono || "-"}</td>
        <td>${cliente.empresa || "-"}</td>
        <td><span class="badge badge-info">${cliente.tipo}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-secondary" onclick="editarCliente(${cliente.id})">Editar</button>
            <button class="btn btn-danger" onclick="eliminarCliente(${cliente.id})">Eliminar</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

async function guardarOportunidad(event) {
  event.preventDefault();

  if (!DOM.oportunidadForm || !currentUserId) {
    return;
  }

  const titulo = DOM.oportunidadForm.querySelector("#oportunidadTitulo")?.value.trim();
  const clienteIdValue = DOM.oportunidadForm.querySelector("#oportunidadCliente")?.value;
  const valorInputValue =
    DOM.oportunidadForm.querySelector("#oportunidadValor")?.value ?? 0;
  const valor = Number(valorInputValue);

  if (!titulo || !clienteIdValue) {
    mostrarNotificacion(
      "Completa los campos obligatorios para guardar la oportunidad.",
      "warning"
    );
    return;
  }

  const clienteId = Number(clienteIdValue);
  const cliente = state.clientes.find((c) => c.id === clienteId);
  const etapa = DOM.oportunidadForm.querySelector("#oportunidadEtapa")?.value ?? "Prospección";
  const probabilidadInputValue =
    DOM.oportunidadForm.querySelector("#oportunidadProbabilidad")?.value ?? 0;
  const probabilidad = Number(probabilidadInputValue);
  const fechaCierre = DOM.oportunidadForm.querySelector("#oportunidadFechaCierre")?.value ?? "";
  const descripcion = DOM.oportunidadForm.querySelector("#oportunidadDescripcion")?.value ?? "";
  const isEditing = editingOportunidadId !== null;
  const timestamp = new Date().toISOString();

  try {
    if (isEditing) {
      const { data, error } = await supabaseClient
        .from(TABLES.oportunidades)
        .update({
          titulo,
          cliente_id: clienteId,
          cliente_nombre: cliente?.nombre ?? "",
          valor: Number.isFinite(valor) ? valor : 0,
          etapa,
          probabilidad: Number.isFinite(probabilidad) ? probabilidad : 0,
          fecha_cierre: fechaCierre || null,
          descripcion: descripcion || null,
          updated_at: timestamp
        })
        .eq("user_id", currentUserId)
        .eq("id", editingOportunidadId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const oportunidadActualizada = mapOportunidad(data);
      state.oportunidades = state.oportunidades.map((op) =>
        op.id === oportunidadActualizada.id ? oportunidadActualizada : op
      );

      mostrarOportunidades();
      actualizarDashboard();
      actualizarEstadisticasAlmacenamiento();
      mostrarIndicadorGuardado();
      closeModal("oportunidadModal");

      await registrarActividad(
        "Oportunidad actualizada",
        `Se actualizó la oportunidad ${oportunidadActualizada.titulo}`,
        {
          oportunidadId: oportunidadActualizada.id,
          clienteId: oportunidadActualizada.clienteId ?? null
        }
      );

      mostrarNotificacion("Oportunidad actualizada exitosamente", "success");
    } else {
      const { data, error } = await supabaseClient
        .from(TABLES.oportunidades)
        .insert([
          {
            user_id: currentUserId,
            titulo,
            cliente_id: clienteId,
            cliente_nombre: cliente?.nombre ?? "",
            valor: Number.isFinite(valor) ? valor : 0,
            etapa,
            probabilidad: Number.isFinite(probabilidad) ? probabilidad : 0,
            fecha_cierre: fechaCierre || null,
            descripcion: descripcion || null,
            created_at: timestamp
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const oportunidad = mapOportunidad(data);
      state.oportunidades = [oportunidad, ...state.oportunidades];

      mostrarOportunidades();
      actualizarDashboard();
      actualizarEstadisticasAlmacenamiento();
      mostrarIndicadorGuardado();
      closeModal("oportunidadModal");

      await registrarActividad(
        "Oportunidad creada",
        `Nueva oportunidad: ${oportunidad.titulo} - $${oportunidad.valor.toLocaleString()}`,
        {
          oportunidadId: oportunidad.id,
          clienteId: clienteId
        }
      );

      mostrarNotificacion("Oportunidad creada exitosamente", "success");
    }
  } catch (error) {
    console.error("Error al guardar oportunidad", error);
    mostrarNotificacion("No fue posible guardar la oportunidad.", "danger");
  }
}

async function eliminarOportunidad(id) {
  if (!currentUserId) {
    return;
  }

  const confirmacion = window.confirm("¿Está seguro de eliminar esta oportunidad?");
  if (!confirmacion) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from(TABLES.oportunidades)
      .delete()
      .eq("user_id", currentUserId)
      .eq("id", id);

    if (error) {
      throw error;
    }

    const oportunidad = state.oportunidades.find((o) => o.id === id);
    state.oportunidades = state.oportunidades.filter((o) => o.id !== id);

    mostrarOportunidades();
    actualizarDashboard();
    actualizarEstadisticasAlmacenamiento();

    await registrarActividad("Oportunidad eliminada", `Se eliminó: ${oportunidad?.titulo ?? ""}`, {
      oportunidadId: id,
      clienteId: oportunidad?.clienteId ?? null
    });

    mostrarNotificacion("Oportunidad eliminada", "danger");
  } catch (error) {
    console.error("Error al eliminar oportunidad", error);
    mostrarNotificacion("No fue posible eliminar la oportunidad.", "danger");
  }
}

function buscarOportunidades() {
  const busqueda = DOM.buscarOportunidadInput?.value.trim().toLowerCase() ?? "";

  const oportunidadesFiltradas = state.oportunidades.filter((op) => {
    const titulo = op.titulo?.toLowerCase() ?? "";
    const cliente = op.clienteNombre?.toLowerCase() ?? "";
    return titulo.includes(busqueda) || cliente.includes(busqueda);
  });

  renderOportunidades(oportunidadesFiltradas, "No se encontraron resultados");
}

function filtrarOportunidades(etapa) {
  const oportunidadesFiltradas = etapa
    ? state.oportunidades.filter((op) => op.etapa === etapa)
    : state.oportunidades;

  const mensaje = etapa
    ? `No se encontraron oportunidades en etapa ${etapa}`
    : "No hay oportunidades registradas";

  renderOportunidades(oportunidadesFiltradas, mensaje);
}

function renderOportunidades(oportunidades, emptyMessage) {
  if (!DOM.tablaOportunidades) {
    return;
  }

  if (!oportunidades || oportunidades.length === 0) {
    DOM.tablaOportunidades.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-icon">💼</div>
          <p>${emptyMessage}</p>
        </td>
      </tr>
    `;
    return;
  }

  DOM.tablaOportunidades.innerHTML = oportunidades
    .map(
      (op) => `
      <tr>
        <td><strong>${op.titulo}</strong></td>
        <td>${op.clienteNombre}</td>
        <td>$${Number(op.valor ?? 0).toLocaleString()}</td>
        <td><span class="badge ${getEtapaBadgeClass(op.etapa)}">${op.etapa}</span></td>
        <td>${op.probabilidad}%</td>
        <td>${op.fechaCierre || "-"}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-secondary" onclick="editarOportunidad(${op.id})">Editar</button>
            <button class="btn btn-danger" onclick="eliminarOportunidad(${op.id})">Eliminar</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

function getEtapaBadgeClass(etapa) {
  const clases = {
    "Prospección": "badge-info",
    "Calificación": "badge-warning",
    "Propuesta": "badge-warning",
    "Negociación": "badge-warning",
    "Cerrada Ganada": "badge-success",
    "Cerrada Perdida": "badge-danger"
  };
  return clases[etapa] || "badge-info";
}

async function guardarTarea(event) {
  event.preventDefault();

  if (!DOM.tareaForm || !currentUserId) {
    return;
  }

  const titulo = DOM.tareaForm.querySelector("#tareaTitulo")?.value.trim();
  if (!titulo) {
    mostrarNotificacion("El título de la tarea es obligatorio.", "warning");
    return;
  }

  const clienteIdValue = DOM.tareaForm.querySelector("#tareaCliente")?.value ?? "";
  const clienteId = clienteIdValue ? Number(clienteIdValue) : null;
  const cliente = clienteId ? state.clientes.find((c) => c.id === clienteId) : null;
  const prioridad = DOM.tareaForm.querySelector("#tareaPrioridad")?.value ?? "Media";
  const estado = DOM.tareaForm.querySelector("#tareaEstado")?.value ?? "Pendiente";
  const fechaLimite = DOM.tareaForm.querySelector("#tareaFechaLimite")?.value ?? "";
  const descripcion = DOM.tareaForm.querySelector("#tareaDescripcion")?.value ?? "";

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.tareas)
      .insert([
        {
          user_id: currentUserId,
          titulo,
          cliente_id: clienteId,
          cliente_nombre: cliente?.nombre ?? (clienteId ? "Cliente" : "Sin cliente"),
          prioridad,
          estado,
          fecha_limite: fechaLimite || null,
          descripcion: descripcion || null,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    const tarea = mapTarea(data);
    state.tareas = [tarea, ...state.tareas];

    mostrarTareas();
    actualizarDashboard();
    mostrarIndicadorGuardado();
    closeModal("tareaModal");

    await registrarActividad("Tarea creada", `Nueva tarea: ${tarea.titulo}`, {
      tareaId: tarea.id,
      clienteId: tarea.clienteId
    });

    mostrarNotificacion("Tarea creada exitosamente", "success");
  } catch (error) {
    console.error("Error al guardar tarea", error);
    mostrarNotificacion("No fue posible guardar la tarea.", "danger");
  }
}

async function cambiarEstadoTarea(id) {
  if (!currentUserId) {
    return;
  }

  const tarea = state.tareas.find((t) => t.id === id);
  if (!tarea) {
    return;
  }

  const estados = ["Pendiente", "En Progreso", "Completada"];
  const indiceActual = estados.indexOf(tarea.estado);
  const nuevoEstado = estados[(indiceActual + 1) % estados.length];

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.tareas)
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", currentUserId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const tareaActualizada = mapTarea(data);
    state.tareas = state.tareas.map((t) => (t.id === id ? tareaActualizada : t));

    mostrarTareas();
    actualizarDashboard();
    actualizarEstadisticasAlmacenamiento();

    await registrarActividad(
      "Tarea actualizada",
      `${tareaActualizada.titulo} - Estado: ${tareaActualizada.estado}`,
      {
        tareaId: tareaActualizada.id,
        clienteId: tareaActualizada.clienteId
      }
    );

    mostrarNotificacion(`Tarea actualizada: ${tareaActualizada.estado}`, "info");
  } catch (error) {
    console.error("Error al actualizar tarea", error);
    mostrarNotificacion("No fue posible actualizar la tarea.", "danger");
  }
}

async function eliminarTarea(id) {
  if (!currentUserId) {
    return;
  }

  const confirmacion = window.confirm("¿Está seguro de eliminar esta tarea?");
  if (!confirmacion) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from(TABLES.tareas)
      .delete()
      .eq("user_id", currentUserId)
      .eq("id", id);

    if (error) {
      throw error;
    }

    const tarea = state.tareas.find((t) => t.id === id);
    state.tareas = state.tareas.filter((t) => t.id !== id);

    mostrarTareas();
    actualizarDashboard();
    actualizarEstadisticasAlmacenamiento();

    await registrarActividad("Tarea eliminada", `Se eliminó: ${tarea?.titulo ?? ""}`, {
      tareaId: id,
      clienteId: tarea?.clienteId ?? null
    });

    mostrarNotificacion("Tarea eliminada", "danger");
  } catch (error) {
    console.error("Error al eliminar tarea", error);
    mostrarNotificacion("No fue posible eliminar la tarea.", "danger");
  }
}

function buscarTareas() {
  const busqueda = DOM.buscarTareaInput?.value.trim().toLowerCase() ?? "";

  const tareasFiltradas = state.tareas.filter((tarea) => {
    const titulo = tarea.titulo?.toLowerCase() ?? "";
    const cliente = tarea.clienteNombre?.toLowerCase() ?? "";
    return titulo.includes(busqueda) || cliente.includes(busqueda);
  });

  renderTareas(tareasFiltradas, "No se encontraron resultados");
}

function filtrarTareas(estado) {
  const tareasFiltradas = estado
    ? state.tareas.filter((tarea) => tarea.estado === estado)
    : state.tareas;

  const mensaje = estado
    ? `No se encontraron tareas con estado ${estado}`
    : "No hay tareas registradas";

  renderTareas(tareasFiltradas, mensaje);
}

function renderTareas(tareas, emptyMessage) {
  if (!DOM.tablaTareas) {
    return;
  }

  if (!tareas || tareas.length === 0) {
    DOM.tablaTareas.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon">✅</div>
          <p>${emptyMessage}</p>
        </td>
      </tr>
    `;
    return;
  }

  DOM.tablaTareas.innerHTML = tareas
    .map(
      (tarea) => `
      <tr>
        <td><strong>${tarea.titulo}</strong></td>
        <td>${tarea.clienteNombre}</td>
        <td><span class="badge ${getPrioridadBadgeClass(tarea.prioridad)}">${tarea.prioridad}</span></td>
        <td><span class="badge ${getEstadoBadgeClass(tarea.estado)}">${tarea.estado}</span></td>
        <td>${tarea.fechaLimite || "-"}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-success" onclick="cambiarEstadoTarea(${tarea.id})">✓</button>
            <button class="btn btn-danger" onclick="eliminarTarea(${tarea.id})">Eliminar</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

function getPrioridadBadgeClass(prioridad) {
  const clases = {
    Baja: "badge-info",
    Media: "badge-warning",
    Alta: "badge-danger",
    Urgente: "badge-danger"
  };
  return clases[prioridad] || "badge-info";
}

function getEstadoBadgeClass(estado) {
  const clases = {
    Pendiente: "badge-warning",
    "En Progreso": "badge-info",
    Completada: "badge-success"
  };
  return clases[estado] || "badge-info";
}

function mostrarTareas() {
  renderTareas(state.tareas, "No hay tareas registradas");
}

function mostrarOportunidades() {
  renderOportunidades(state.oportunidades, "No hay oportunidades registradas");
}

function mostrarClientes() {
  renderClientes(state.clientes, "No hay clientes registrados");
}

async function registrarActividad(tipo, descripcion, metadata = {}) {
  if (!currentUserId) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.actividades)
      .insert([
        {
          user_id: currentUserId,
          tipo,
          descripcion,
          fecha: new Date().toISOString(),
          cliente_id: metadata.clienteId ?? null,
          oportunidad_id: metadata.oportunidadId ?? null,
          tarea_id: metadata.tareaId ?? null
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    const actividad = mapActividad(data);
    state.actividades = [actividad, ...state.actividades].slice(0, 100);
    mostrarActividades();
    mostrarActividadReciente();
  } catch (error) {
    console.error("No fue posible registrar la actividad", error);
  }
}

function mostrarActividades() {
  if (!DOM.listaActividades) {
    return;
  }

  if (!state.actividades || state.actividades.length === 0) {
    DOM.listaActividades.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No hay actividades registradas</p>
      </div>
    `;
    return;
  }

  DOM.listaActividades.innerHTML = state.actividades
    .map(
      (act) => `
      <div class="activity-item">
        <div class="activity-icon">
          ${getActividadIcon(act.tipo)}
        </div>
        <div class="activity-content">
          <div class="activity-title">${act.tipo}</div>
          <div>${act.descripcion}</div>
          <div class="activity-meta">${formatearFecha(act.fecha)}</div>
        </div>
      </div>
    `
    )
    .join("");
}

function mostrarActividadReciente() {
  if (!DOM.actividadReciente) {
    return;
  }

  const recientes = state.actividades.slice(0, 5);

  if (recientes.length === 0) {
    DOM.actividadReciente.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No hay actividad reciente</p>
      </div>
    `;
    return;
  }

  DOM.actividadReciente.innerHTML = recientes
    .map(
      (act) => `
      <div class="activity-item">
        <div class="activity-icon">
          ${getActividadIcon(act.tipo)}
        </div>
        <div class="activity-content">
          <div class="activity-title">${act.tipo}</div>
          <div>${act.descripcion}</div>
          <div class="activity-meta">${formatearFecha(act.fecha)}</div>
        </div>
      </div>
    `
    )
    .join("");
}

function getActividadIcon(tipo) {
  const iconos = {
    "Cliente creado": "👤",
    "Cliente actualizado": "✏️",
    "Cliente eliminado": "❌",
    "Oportunidad creada": "💼",
    "Oportunidad actualizada": "✏️",
    "Oportunidad eliminada": "🗑️",
    "Tarea creada": "📝",
    "Tarea actualizada": "✏️",
    "Tarea eliminada": "🗑️",
    "Datos importados": "📁",
    "Datos exportados": "💾"
  };
  return iconos[tipo] || "📋";
}

function actualizarDashboard() {
  const totalClientes = state.clientes.length;
  const oportunidadesAbiertas = state.oportunidades.filter(
    (o) => o.etapa !== "Cerrada Ganada" && o.etapa !== "Cerrada Perdida"
  ).length;
  const tareasPendientes = state.tareas.filter((t) => t.estado !== "Completada").length;
  const valorTotal = state.oportunidades
    .filter((o) => o.etapa !== "Cerrada Perdida")
    .reduce((sum, o) => sum + (Number(o.valor ?? 0) || 0), 0);

  const totalClientesElement = document.getElementById("totalClientes");
  const oportunidadesElement = document.getElementById("oportunidadesAbiertas");
  const tareasElement = document.getElementById("tareasPendientes");
  const valorElement = document.getElementById("valorTotal");

  if (totalClientesElement) {
    totalClientesElement.textContent = String(totalClientes);
  }
  if (oportunidadesElement) {
    oportunidadesElement.textContent = String(oportunidadesAbiertas);
  }
  if (tareasElement) {
    tareasElement.textContent = String(tareasPendientes);
  }
  if (valorElement) {
    valorElement.textContent = Number(valorTotal).toLocaleString();
  }
}

function cargarClientesEnSelect() {
  const options = state.clientes
    .map((cliente) => `<option value="${cliente.id}">${cliente.nombre}</option>`)
    .join("");

  if (DOM.oportunidadClienteSelect) {
    DOM.oportunidadClienteSelect.innerHTML =
      '<option value="">Seleccionar cliente...</option>' + options;
  }

  if (DOM.tareaClienteSelect) {
    DOM.tareaClienteSelect.innerHTML =
      '<option value="">Sin cliente asociado</option>' + options;
  }
}

function actualizarFechaHora() {
  if (!DOM.currentDateTime) {
    return;
  }

  const fecha = new Date();
  const opciones = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  };

  DOM.currentDateTime.textContent = fecha.toLocaleDateString("es-ES", opciones);
}

function formatearFecha(fechaISO) {
  if (!fechaISO) {
    return "";
  }

  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diff = ahora - fecha;

  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return "Hace un momento";
  if (minutos < 60) return `Hace ${minutos} minuto${minutos > 1 ? "s" : ""}`;
  if (horas < 24) return `Hace ${horas} hora${horas > 1 ? "s" : ""}`;
  if (dias < 30) return `Hace ${dias} día${dias > 1 ? "s" : ""}`;

  return fecha.toLocaleDateString("es-ES");
}

function mostrarNotificacion(mensaje, tipo) {
  if (typeof document === "undefined") {
    return;
  }

  const notificacion = document.createElement("div");
  notificacion.className = "notification";

  let background = "var(--primary)";
  if (tipo === "success") {
    background = "var(--success)";
  } else if (tipo === "danger") {
    background = "var(--danger)";
  } else if (tipo === "warning") {
    background = "var(--warning)";
  }

  notificacion.style.background = background;
  notificacion.textContent = mensaje;

  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.style.animation = "fadeOut 0.3s";
    setTimeout(() => {
      if (notificacion.parentNode) {
        notificacion.parentNode.removeChild(notificacion);
      }
    }, 300);
  }, 3000);
}

function actualizarEstadisticasAlmacenamiento() {
  if (!DOM.storageStats) {
    return;
  }

  try {
    const dataSize = new Blob([JSON.stringify(state)]).size;
    const dataSizeKB = (dataSize / 1024).toFixed(2);

    DOM.storageStats.innerHTML = `
      <div>📊 <strong>Tamaño sincronizado:</strong> ${dataSizeKB} KB</div>
      <div>👥 <strong>Clientes:</strong> ${state.clientes.length}</div>
      <div>💼 <strong>Oportunidades:</strong> ${state.oportunidades.length}</div>
      <div>✅ <strong>Tareas:</strong> ${state.tareas.length}</div>
      <div>📋 <strong>Actividades:</strong> ${state.actividades.length}</div>
      <div style="margin-top: 10px; color: var(--success);">
        ✓ Datos sincronizados con Supabase para ${currentUsername ?? "tu cuenta"}
      </div>
    `;
  } catch (error) {
    DOM.storageStats.innerHTML =
      '<div style="color: var(--danger);">Error al calcular estadísticas</div>';
  }
}

const EXPORT_VERSION = "supabase-v1";

async function exportarDatos() {
  const datosExportar = {
    version: EXPORT_VERSION,
    fecha: new Date().toISOString(),
    datos: state
  };

  const json = JSON.stringify(datosExportar, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `crm_backup_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  await registrarActividad("Datos exportados", "Se creó una copia de seguridad");
  mostrarIndicadorGuardado();
  mostrarNotificacion("Datos exportados exitosamente", "success");
}

async function importarDatos(event) {
  if (!currentUserId) {
    return;
  }

  const file = event?.target?.files?.[0];
  if (!file) {
    return;
  }

  const confirmacion = window.confirm(
    "¿Estás seguro? Esto reemplazará todos los datos actuales sincronizados."
  );

  if (!confirmacion) {
    event.target.value = "";
    return;
  }

  try {
    const contenido = await file.text();
    const datosImportados = JSON.parse(contenido);
    const payload = datosImportados.datos ?? datosImportados;

    const clientes = Array.isArray(payload.clientes) ? payload.clientes : [];
    const oportunidades = Array.isArray(payload.oportunidades) ? payload.oportunidades : [];
    const tareas = Array.isArray(payload.tareas) ? payload.tareas : [];
    const actividades = Array.isArray(payload.actividades) ? payload.actividades : [];

    await limpiarDatosRemotos();

    const clienteRows = clientes.map((cliente) => ({
      user_id: currentUserId,
      nombre: cliente.nombre ?? "Sin nombre",
      email: cliente.email ?? "",
      telefono: cliente.telefono ?? null,
      empresa: cliente.empresa ?? null,
      tipo: cliente.tipo ?? "Prospecto",
      notas: cliente.notas ?? null,
      created_at: cliente.fechaCreacion ?? new Date().toISOString()
    }));

    let insertedClientes = [];
    if (clienteRows.length > 0) {
      const { data, error } = await supabaseClient
        .from(TABLES.clientes)
        .insert(clienteRows)
        .select();

      if (error) {
        throw error;
      }

      insertedClientes = data ?? [];
    }

    const clienteMaps = buildClienteMaps(clientes, insertedClientes);

    const oportunidadRows = oportunidades.map((op) => {
      const clienteId = resolveClienteIdFromImport(op, clienteMaps);
      const clienteNombre = op.clienteNombre ??
        (clienteId ? clienteMaps.nameById.get(clienteId) ?? "" : "");

      return {
        user_id: currentUserId,
        titulo: op.titulo ?? "Oportunidad",
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        valor: Number(op.valor ?? 0) || 0,
        etapa: op.etapa ?? "Prospección",
        probabilidad: Number(op.probabilidad ?? 0) || 0,
        fecha_cierre: op.fechaCierre || null,
        descripcion: op.descripcion ?? null,
        created_at: op.fechaCreacion ?? new Date().toISOString()
      };
    });

    let insertedOportunidades = [];
    if (oportunidadRows.length > 0) {
      const { data, error } = await supabaseClient
        .from(TABLES.oportunidades)
        .insert(oportunidadRows)
        .select();

      if (error) {
        throw error;
      }

      insertedOportunidades = data ?? [];
    }

    const oportunidadIdMap = buildIdMap(oportunidades, insertedOportunidades);

    const tareaRows = tareas.map((tarea) => {
      const clienteId = resolveClienteIdFromImport(tarea, clienteMaps, tarea.clienteNombre);
      const clienteNombre = tarea.clienteNombre ??
        (clienteId ? clienteMaps.nameById.get(clienteId) ?? "Sin cliente" : "Sin cliente");

      return {
        user_id: currentUserId,
        titulo: tarea.titulo ?? "Tarea",
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        prioridad: tarea.prioridad ?? "Media",
        estado: tarea.estado ?? "Pendiente",
        fecha_limite: tarea.fechaLimite || null,
        descripcion: tarea.descripcion ?? null,
        created_at: tarea.fechaCreacion ?? new Date().toISOString()
      };
    });

    let insertedTareas = [];
    if (tareaRows.length > 0) {
      const { data, error } = await supabaseClient
        .from(TABLES.tareas)
        .insert(tareaRows)
        .select();

      if (error) {
        throw error;
      }

      insertedTareas = data ?? [];
    }

    const tareaIdMap = buildIdMap(tareas, insertedTareas);

    const actividadRows = actividades.map((actividad) => ({
      user_id: currentUserId,
      tipo: actividad.tipo ?? "Actividad",
      descripcion: actividad.descripcion ?? "",
      fecha: actividad.fecha ?? actividad.fechaCreacion ?? new Date().toISOString(),
      cliente_id: resolveClienteIdFromImport(actividad, clienteMaps, actividad.clienteNombre),
      oportunidad_id: resolveFromMap(actividad.oportunidadId, oportunidadIdMap),
      tarea_id: resolveFromMap(actividad.tareaId, tareaIdMap)
    }));

    if (actividadRows.length > 0) {
      const { error } = await supabaseClient
        .from(TABLES.actividades)
        .insert(actividadRows);

      if (error) {
        throw error;
      }
    }

    await loadInitialData();
    mostrarIndicadorGuardado();

    await registrarActividad(
      "Datos importados",
      "Se restauró una copia de seguridad",
      {}
    );

    mostrarNotificacion("Datos importados exitosamente", "success");
  } catch (error) {
    console.error("Error al importar datos", error);
    mostrarNotificacion(`Error al importar datos: ${error.message}`, "danger");
  } finally {
    if (event?.target) {
      event.target.value = "";
    }
  }
}

async function limpiarDatos() {
  if (!currentUserId) {
    return;
  }

  const confirmacion = window.confirm(
    "⚠️ ¿Estás seguro de eliminar TODOS los datos?\n\nEsta acción no se puede deshacer."
  );

  if (!confirmacion) {
    return;
  }

  const segundaConfirmacion = window.confirm(
    "⚠️ ÚLTIMA CONFIRMACIÓN:\n\n¿Realmente deseas eliminar TODO permanentemente?"
  );

  if (!segundaConfirmacion) {
    return;
  }

  try {
    await limpiarDatosRemotos();

    state.clientes = [];
    state.oportunidades = [];
    state.tareas = [];
    state.actividades = [];

    actualizarTodasLasVistas();
    actualizarDashboard();
    actualizarEstadisticasAlmacenamiento();
    mostrarIndicadorGuardado();

    await registrarActividad(
      "Datos eliminados",
      "Se eliminaron todos los datos del CRM",
      {}
    );

    mostrarNotificacion("Todos los datos han sido eliminados", "warning");
  } catch (error) {
    console.error("Error al limpiar datos", error);
    mostrarNotificacion("No fue posible eliminar los datos.", "danger");
  }
}

async function limpiarDatosRemotos() {
  await supabaseClient.from(TABLES.actividades).delete().eq("user_id", currentUserId);
  await supabaseClient.from(TABLES.tareas).delete().eq("user_id", currentUserId);
  await supabaseClient.from(TABLES.oportunidades).delete().eq("user_id", currentUserId);
  await supabaseClient.from(TABLES.clientes).delete().eq("user_id", currentUserId);
}

function buildClienteMaps(importedClientes, insertedClientes) {
  const idMap = new Map();
  const keyMap = new Map();
  const nameById = new Map();

  insertedClientes.forEach((inserted, index) => {
    const original = importedClientes[index] ?? {};
    if (original.id !== undefined && original.id !== null) {
      idMap.set(String(original.id), inserted.id);
    }

    const key = getClienteKey(original);
    if (key) {
      keyMap.set(key, inserted.id);
    }

    const nombre = inserted.nombre ?? original.nombre;
    if (nombre) {
      nameById.set(inserted.id, nombre);
    }

    const normalizedName = (original.nombre ?? "").trim().toLowerCase();
    if (normalizedName && !keyMap.has(normalizedName)) {
      keyMap.set(normalizedName, inserted.id);
    }
  });

  return { idMap, keyMap, nameById };
}

function buildIdMap(importedItems, insertedItems) {
  const idMap = new Map();
  insertedItems.forEach((inserted, index) => {
    const original = importedItems[index] ?? {};
    if (original.id !== undefined && original.id !== null) {
      idMap.set(String(original.id), inserted.id);
    }
  });
  return idMap;
}

function resolveFromMap(originalId, idMap) {
  if (originalId === undefined || originalId === null) {
    return null;
  }
  const mapped = idMap.get(String(originalId));
  return mapped ?? null;
}

function resolveClienteIdFromImport(item, clienteMaps, nombreFallback = undefined) {
  if (!clienteMaps) {
    return null;
  }

  if (item.clienteId !== undefined && item.clienteId !== null) {
    const mapped = clienteMaps.idMap.get(String(item.clienteId));
    if (mapped) {
      return mapped;
    }
  }

  const key = getClienteKey(item);
  if (key && clienteMaps.keyMap.get(key)) {
    return clienteMaps.keyMap.get(key);
  }

  const nombre = (item.clienteNombre ?? nombreFallback ?? item.nombre ?? "")
    .trim()
    .toLowerCase();

  if (nombre && clienteMaps.keyMap.get(nombre)) {
    return clienteMaps.keyMap.get(nombre);
  }

  return null;
}

function getClienteKey(cliente) {
  const nombre = (cliente.clienteNombre ?? cliente.nombre ?? "").trim().toLowerCase();
  const email = (cliente.email ?? "").trim().toLowerCase();

  if (!nombre && !email) {
    return null;
  }

  return `${nombre}|${email}`;
}

window.showSection = showSection;
window.openModal = openModal;
window.openClienteModal = openClienteModal;
window.openOportunidadModal = openOportunidadModal;
window.closeModal = closeModal;
window.guardarCliente = guardarCliente;
window.editarCliente = editarCliente;
window.eliminarCliente = eliminarCliente;
window.buscarClientes = buscarClientes;
window.filtrarClientes = filtrarClientes;
window.guardarOportunidad = guardarOportunidad;
window.editarOportunidad = editarOportunidad;
window.eliminarOportunidad = eliminarOportunidad;
window.buscarOportunidades = buscarOportunidades;
window.filtrarOportunidades = filtrarOportunidades;
window.guardarTarea = guardarTarea;
window.cambiarEstadoTarea = cambiarEstadoTarea;
window.eliminarTarea = eliminarTarea;
window.buscarTareas = buscarTareas;
window.filtrarTareas = filtrarTareas;
window.exportarDatos = exportarDatos;
window.importarDatos = importarDatos;
window.limpiarDatos = limpiarDatos;
window.cargarClientesEnSelect = cargarClientesEnSelect;
