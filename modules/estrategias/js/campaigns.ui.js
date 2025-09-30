// campaigns.ui.js
// Controla la UI de campañas: listado, formulario y acciones sobre Supabase.

import { listarCampanas, crearCampana, actualizarCampana, eliminarCampana } from "./campaigns.service.js";
import { CampaignStatusOptions } from "./campaigns.types.js";
import { getState, mergeState } from "./stateManager.js";
import { saveStrategyToSupabase } from "./persistence.js";

let rootContainer = null;
let feedbackNode = null;
let listContainer = null;
let paginationContainer = null;
let formContainer = null;
let formTitle = null;
let nameInput = null;
let channelInput = null;
let budgetInput = null;
let startInput = null;
let endInput = null;
let goalInput = null;
let statusSelect = null;
let detailsInput = null;
let cancelButton = null;

let currentPage = 1;
let pageSize = 10;
let totalItems = 0;
let editingId = null;
let isLoading = false;
let cachedItems = [];

function setLoading(value) {
  isLoading = value;
  if (rootContainer) {
    rootContainer.classList.toggle("is-loading", Boolean(value));
  }
}

function showFeedback(message, type = "info") {
  if (!feedbackNode) {
    return;
  }
  feedbackNode.textContent = message;
  feedbackNode.dataset.type = type;
  feedbackNode.classList.remove("hidden");
}

function clearFeedback() {
  if (!feedbackNode) {
    return;
  }
  feedbackNode.textContent = "";
  feedbackNode.dataset.type = "info";
  feedbackNode.classList.add("hidden");
}

async function ensureStrategyId() {
  const state = getState();
  if (state.strategyId) {
    return state.strategyId;
  }
  try {
    await saveStrategyToSupabase();
    const refreshed = getState();
    if (refreshed.strategyId) {
      return refreshed.strategyId;
    }
  } catch (error) {
    showFeedback("No se pudo preparar la estrategia para registrar campañas.", "error");
    throw error;
  }
  throw new Error("Strategy identifier missing after synchronization");
}

function renderSkeleton(container) {
  container.innerHTML = `
    <section class="campaign-manager">
      <header class="campaign-manager__header">
        <div>
          <h2>Campañas</h2>
          <p>Administra campañas conectadas a tu estrategia actual.</p>
        </div>
        <button type="button" class="btn btn-primary" id="campaignCreateBtn">➕ Nueva campaña</button>
      </header>
      <p id="campaignFeedback" class="campaign-feedback hidden" role="status" aria-live="polite"></p>
      <div id="campaignList" class="campaign-list"></div>
      <div id="campaignPagination" class="campaign-pagination"></div>
      <form id="campaignForm" class="campaign-form hidden">
        <h3 id="campaignFormTitle">Registrar campaña</h3>
        <div class="form-grid">
          <label>
            <span>Nombre</span>
            <input id="campaignName" class="form-control" type="text" required placeholder="Ej: Lanzamiento Q4" />
          </label>
          <label>
            <span>Canal</span>
            <input id="campaignChannel" class="form-control" type="text" required placeholder="Redes Sociales" />
          </label>
          <label>
            <span>Presupuesto</span>
            <input id="campaignBudget" class="form-control" type="number" min="0" step="0.01" placeholder="0" />
          </label>
          <label>
            <span>Inicio</span>
            <input id="campaignStart" class="form-control" type="date" />
          </label>
          <label>
            <span>Fin</span>
            <input id="campaignEnd" class="form-control" type="date" />
          </label>
          <label>
            <span>Objetivo</span>
            <input id="campaignGoal" class="form-control" type="text" placeholder="Objetivo de la campaña" />
          </label>
          <label>
            <span>Estado</span>
            <select id="campaignStatus" class="form-control"></select>
          </label>
        </div>
        <label class="textarea-label">
          <span>Detalles (JSON)</span>
          <textarea id="campaignDetails" class="form-control" rows="6" placeholder='{ "brief": "Descripción extensa" }'></textarea>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="campaignSubmit">💾 Guardar</button>
          <button type="button" class="btn btn-secondary" id="campaignCancel">✖️ Cancelar</button>
        </div>
      </form>
    </section>
  `;

  rootContainer = container.querySelector(".campaign-manager");
  feedbackNode = container.querySelector("#campaignFeedback");
  listContainer = container.querySelector("#campaignList");
  paginationContainer = container.querySelector("#campaignPagination");
  formContainer = container.querySelector("#campaignForm");
  formTitle = container.querySelector("#campaignFormTitle");
  nameInput = container.querySelector("#campaignName");
  channelInput = container.querySelector("#campaignChannel");
  budgetInput = container.querySelector("#campaignBudget");
  startInput = container.querySelector("#campaignStart");
  endInput = container.querySelector("#campaignEnd");
  goalInput = container.querySelector("#campaignGoal");
  statusSelect = container.querySelector("#campaignStatus");
  detailsInput = container.querySelector("#campaignDetails");
  cancelButton = container.querySelector("#campaignCancel");

  statusSelect.innerHTML = CampaignStatusOptions.map((option) => `<option value="${option}">${option}</option>`).join("");
}

function renderPagination() {
  if (!paginationContainer) {
    return;
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }
  const previousDisabled = currentPage <= 1 ? "disabled" : "";
  const nextDisabled = currentPage >= totalPages ? "disabled" : "";
  paginationContainer.innerHTML = `
    <div class="pagination-controls">
      <button type="button" class="btn btn-secondary" data-action="prev" ${previousDisabled}>← Anterior</button>
      <span>Página ${currentPage} de ${totalPages}</span>
      <button type="button" class="btn btn-secondary" data-action="next" ${nextDisabled}>Siguiente →</button>
    </div>
  `;
}

function renderEmptyState() {
  if (listContainer) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>Aún no registras campañas para esta estrategia.</p>
        <p class="empty-hint">Crea tu primera campaña para iniciar la ejecución.</p>
      </div>
    `;
  }
}

function renderTable(items) {
  if (!listContainer) {
    return;
  }
  if (!items || items.length === 0) {
    renderEmptyState();
    return;
  }
  const rows = items
    .map(
      (campaign) => `
        <tr data-id="${campaign.id}">
          <td>${campaign.campaign_name}</td>
          <td>${campaign.channel || "-"}</td>
          <td>${campaign.status || "-"}</td>
          <td>${campaign.start_date ?? "-"} → ${campaign.end_date ?? "-"}</td>
          <td>${campaign.budget !== null && campaign.budget !== undefined ? campaign.budget : "-"}</td>
          <td>
            <button type="button" class="btn btn-secondary" data-action="edit" data-id="${campaign.id}">✏️ Editar</button>
            <button type="button" class="btn btn-danger" data-action="delete" data-id="${campaign.id}">🗑️ Eliminar</button>
          </td>
        </tr>
      `
    )
    .join("");

  listContainer.innerHTML = `
    <table class="campaign-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Canal</th>
          <th>Estado</th>
          <th>Fechas</th>
          <th>Presupuesto</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function openForm(campaign = null) {
  if (!formContainer) {
    return;
  }
  clearFeedback();
  formContainer.classList.remove("hidden");
  formContainer.scrollIntoView({ behavior: "smooth" });
  if (campaign) {
    editingId = campaign.id;
    formTitle.textContent = "Editar campaña";
    nameInput.value = campaign.campaign_name ?? "";
    channelInput.value = campaign.channel ?? "";
    budgetInput.value = campaign.budget ?? "";
    startInput.value = campaign.start_date ?? "";
    endInput.value = campaign.end_date ?? "";
    goalInput.value = campaign.goal ?? "";
    statusSelect.value = campaign.status ?? CampaignStatusOptions[0];
    const prettyDetails = campaign.details && Object.keys(campaign.details).length > 0
      ? JSON.stringify(campaign.details, null, 2)
      : "";
    detailsInput.value = prettyDetails;
  } else {
    editingId = null;
    formTitle.textContent = "Registrar campaña";
    if (typeof formContainer.reset === "function") {
      formContainer.reset();
    }
    nameInput.value = "";
    channelInput.value = "";
    budgetInput.value = "";
    startInput.value = "";
    endInput.value = "";
    goalInput.value = "";
    statusSelect.value = CampaignStatusOptions[0];
    detailsInput.value = "";
  }
  nameInput.focus();
}

function closeForm() {
  if (!formContainer) {
    return;
  }
  formContainer.classList.add("hidden");
  editingId = null;
}

function parseDetailsFromInput() {
  const raw = detailsInput.value.trim();
  if (raw.length === 0) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("El campo Detalles debe contener un JSON válido.");
  }
}

async function refreshCampaigns() {
  setLoading(true);
  clearFeedback();
  try {
    const strategyId = await ensureStrategyId();
    const { items, total } = await listarCampanas(strategyId, { page: currentPage, pageSize });
    totalItems = total;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) {
      currentPage = totalPages;
      await refreshCampaigns();
      return;
    }
    cachedItems = items;
    const stateCampaigns = items.map((item) => ({
      id: item.id,
      name: item.campaign_name,
      channel: item.channel,
      budget: item.budget,
      startDate: item.start_date,
      endDate: item.end_date,
      goal: item.goal,
      status: item.status,
      details: item.details ?? {}
    }));
    const currentState = getState();
    mergeState({
      campaigns: {
        active: stateCampaigns,
        automations: currentState.campaigns?.automations ?? []
      }
    });
    renderTable(items);
    renderPagination();
  } catch (error) {
    renderEmptyState();
    showFeedback(error.message || "No se pudieron cargar las campañas.", "error");
  } finally {
    setLoading(false);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  setLoading(true);
  clearFeedback();
  try {
    const strategyId = await ensureStrategyId();
    const details = parseDetailsFromInput();
    const payload = {
      strategy_id: strategyId,
      campaign_name: nameInput.value.trim(),
      channel: channelInput.value.trim(),
      budget: budgetInput.value,
      start_date: startInput.value || null,
      end_date: endInput.value || null,
      goal: goalInput.value.trim(),
      status: statusSelect.value,
      details
    };

    if (editingId) {
      await actualizarCampana(editingId, payload);
      showFeedback("Campaña actualizada correctamente.", "success");
    } else {
      await crearCampana(payload);
      showFeedback("Campaña creada correctamente.", "success");
    }
    closeForm();
    await refreshCampaigns();
  } catch (error) {
    showFeedback(error.message || "No se pudo guardar la campaña.", "error");
  } finally {
    setLoading(false);
  }
}

async function handleDelete(id) {
  const confirmed = window.confirm("¿Deseas eliminar esta campaña? Esta acción no se puede deshacer.");
  if (!confirmed) {
    return;
  }
  setLoading(true);
  clearFeedback();
  try {
    const strategyId = await ensureStrategyId();
    await eliminarCampana(id, strategyId);
    showFeedback("Campaña eliminada correctamente.", "success");
    await refreshCampaigns();
  } catch (error) {
    showFeedback(error.message || "No se pudo eliminar la campaña.", "error");
  } finally {
    setLoading(false);
  }
}

function attachEvents(container) {
  const createButton = container.querySelector("#campaignCreateBtn");
  if (createButton) {
    createButton.addEventListener("click", () => openForm());
  }

  if (formContainer) {
    formContainer.addEventListener("submit", handleFormSubmit);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      closeForm();
      clearFeedback();
    });
  }

  if (listContainer) {
    listContainer.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const action = target.dataset.action;
      const id = Number(target.dataset.id);
      if (!action || !Number.isInteger(id)) {
        return;
      }
      if (action === "edit") {
        const campaign = cachedItems.find((item) => item.id === id);
        if (!campaign) {
          return;
        }
        openForm(campaign);
      }
      if (action === "delete") {
        handleDelete(id);
      }
    });
  }

  if (paginationContainer) {
    paginationContainer.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const action = target.dataset.action;
      if (!action) {
        return;
      }
      if (action === "prev" && currentPage > 1) {
        currentPage -= 1;
        refreshCampaigns();
      }
      if (action === "next") {
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        if (currentPage < totalPages) {
          currentPage += 1;
          refreshCampaigns();
        }
      }
    });
  }
}

export async function initializeCampaignsSection(options = {}) {
  const selector = options.containerSelector ?? "#campaignManager";
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }
  renderSkeleton(container);
  attachEvents(container);
  await refreshCampaigns();
}

