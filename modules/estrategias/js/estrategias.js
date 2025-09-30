// estrategias.js
// Orquesta el flujo del asistente de estrategia de marketing, gestionando UI, validaciones y persistencia.

import { requireAuth, getCurrentUser } from "../../../lib/authGuard.js";
import { STEPS, OBJECTIVES, MARKETING_CHANNELS, KPI_OPTIONS, CONTENT_TYPES, DAYS_OF_WEEK } from "./constants.js";
import { getState, setState, mergeState, loadStateFromStorage, saveState } from "./stateManager.js";
import {
  validateRequired,
  validatePositiveNumber,
  validateEmail,
  setFieldError,
  clearFeedback
} from "./validation.js";
import { saveStrategyToSupabase, loadStrategyFromSupabase } from "./persistence.js";
import { renderTrackingChart } from "./charts.js";
import { generateStrategyPdf } from "./pdf.js";
import { initializeCampaignsSection } from "./campaigns.ui.js";

const CAMPAIGN_STEP_INDEX = STEPS.findIndex((step) => step.id === "campaigns");

let currentStepIndex = 0;
let contentArea = null;
let progressSteps = null;
let stepCount = null;
let stepName = null;
let nextButton = null;
let prevButton = null;
let statusBanner = null;
let campaignOverviewCard = null;
let campaignOverviewContainer = null;
let overviewButton = null;
let wizardSections = [];

// Inicializa la UI seleccionando elementos y registrando eventos principales.
function initializeElements() {
  contentArea = document.querySelector("#contentArea");
  progressSteps = document.querySelector("#progressSteps");
  stepCount = document.querySelector("#stepCount");
  stepName = document.querySelector("#stepName");
  nextButton = document.querySelector("#nextBtn");
  prevButton = document.querySelector("#prevBtn");
  statusBanner = document.querySelector("#statusBanner");
  campaignOverviewCard = document.querySelector("#campaignOverviewCard");
  campaignOverviewContainer = document.querySelector("#campaignOverview");
  overviewButton = document.querySelector("#overviewBtn");
  wizardSections = Array.from(document.querySelectorAll("[data-wizard-section]"));

  prevButton.addEventListener("click", handlePreviousStep);
  nextButton.addEventListener("click", handleNextStep);
  if (overviewButton) {
    overviewButton.addEventListener("click", handleReturnToOverview);
  }
}

// Renderiza los indicadores de progreso con base en el paso actual.
function renderProgress() {
  progressSteps.innerHTML = "";
  STEPS.forEach((step, index) => {
    const node = document.createElement("div");
    node.className = [
      "step",
      index < currentStepIndex ? "completed" : "",
      index === currentStepIndex ? "active" : ""
    ]
      .filter(Boolean)
      .join(" ");

    node.innerHTML = `
      <div class="step-circle">${step.icon}</div>
      ${index < STEPS.length - 1 ? '<div class="step-line"></div>' : ""}
    `;
    progressSteps.appendChild(node);
  });

  stepCount.textContent = `Paso ${currentStepIndex + 1} de ${STEPS.length}`;
  stepName.textContent = STEPS[currentStepIndex].name;

  prevButton.disabled = currentStepIndex === 0;
  nextButton.textContent = currentStepIndex === STEPS.length - 1 ? "Completado" : "Siguiente →";
}

// Maneja el evento del botón "Siguiente" validando y avanzando el flujo.
async function handleNextStep() {
  const currentStepId = STEPS[currentStepIndex].id;
  const isValid = runStepValidation(currentStepId);
  if (!isValid) {
    return;
  }

  const isLastStep = currentStepIndex === STEPS.length - 1;

  if (!isLastStep) {
    try {
      await saveStrategyToSupabase();
      if (statusBanner) {
        statusBanner.textContent = "Progreso guardado correctamente.";
      }
    } catch (error) {
      if (statusBanner) {
        statusBanner.textContent = "No se pudo guardar el progreso. Revisa tu conexión e inténtalo nuevamente.";
      }
      console.error("Error al guardar avance de estrategia", error);
      return;
    }
  }

  if (isLastStep) {
    await finalizeStrategy();
    return;
  }

  currentStepIndex += 1;
  renderProgress();
  renderStepContent();
}

// Regresa al paso anterior del asistente.
function handlePreviousStep() {
  if (currentStepIndex === 0) {
    return;
  }
  currentStepIndex -= 1;
  renderProgress();
  renderStepContent();
}

// Calcula estadísticas rápidas para el seguimiento mensual.
function computeTrackingInsights() {
  const state = getState();
  const insights = [];
  state.monthlyTracking.months.forEach((month, index) => {
    month.metrics.forEach((metric) => {
      const variation = Number(metric.actual ?? 0) - Number(metric.target ?? 0);
      const previousMonth = state.monthlyTracking.months[index - 1];
      let trend = 0;
      if (previousMonth) {
        const previousMetric = previousMonth.metrics.find((item) => item.kpi === metric.kpi);
        if (previousMetric) {
          const previousValue = Number(previousMetric.actual ?? 0);
          trend = previousValue === 0 ? 0 : ((Number(metric.actual ?? 0) - previousValue) / previousValue) * 100;
        }
      }
      metric.variation = Number.isFinite(variation) ? variation : 0;
      metric.trend = Number.isFinite(trend) ? trend : 0;
    });
  });
  state.monthlyTracking.insights = insights;
}

// Alterna la visibilidad de las tarjetas del asistente.
function toggleWizardVisibility(isVisible) {
  wizardSections.forEach((section) => {
    section.classList.toggle("hidden", !isVisible);
  });
  if (overviewButton) {
    overviewButton.classList.toggle("hidden", !isVisible);
  }
}

// Formatea un valor de fecha para mostrarse en tarjetas.
function formatDateValue(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString("es-CR", { year: "numeric", month: "short", day: "numeric" });
}

// Construye un rango legible entre fechas de inicio y fin.
function formatDateRange(start, end) {
  const startLabel = formatDateValue(start);
  const endLabel = formatDateValue(end);
  if (!startLabel && !endLabel) {
    return "Sin fecha definida";
  }
  if (startLabel && endLabel) {
    return `${startLabel} – ${endLabel}`;
  }
  return startLabel ?? endLabel;
}

// Formatea el presupuesto numérico mostrado en el resumen.
function formatBudget(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "No asignado";
  }
  return new Intl.NumberFormat("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
}

// Construye la tarjeta de campaña dentro del resumen inicial.
function renderCampaignCard(campaign, index) {
  const displayName = campaign.name?.trim() || `Campaña ${index + 1}`;
  const status = campaign.status?.trim() || "Planificada";
  const channel = campaign.channel?.trim() || "Canal no especificado";
  const goal = campaign.goal?.trim() || "Sin objetivo definido";
  const budget = formatBudget(campaign.budget);
  const dateRange = formatDateRange(campaign.startDate, campaign.endDate);

  return `
    <article class="campaign-card">
      <h3>${displayName}</h3>
      <span class="campaign-status">${status}</span>
      <div class="campaign-meta">
        <span>Canal: ${channel}</span>
        <span>Objetivo: ${goal}</span>
        <span>Periodo: ${dateRange}</span>
        <span>Presupuesto estimado: ${budget}</span>
      </div>
    </article>
  `;
}

// Registra los eventos de la vista inicial.
function attachLandingEvents() {
  if (!campaignOverviewContainer) {
    return;
  }
  const startWizardButton = campaignOverviewContainer.querySelector("#landingStartWizard");
  if (startWizardButton) {
    startWizardButton.addEventListener("click", () => startWizard(0));
  }
  const newCampaignButton = campaignOverviewContainer.querySelector("#landingNewCampaign");
  if (newCampaignButton) {
    newCampaignButton.addEventListener("click", () => {
      const managerCard = document.querySelector("#campaignManagerCard");
      if (managerCard) {
        managerCard.scrollIntoView({ behavior: "smooth" });
      }
      const createButton = document.querySelector("#campaignCreateBtn");
      if (createButton) {
        createButton.dispatchEvent(new Event("click", { bubbles: true }));
      }
    });
  }
  const syncButton = campaignOverviewContainer.querySelector("#landingSync");
  if (syncButton) {
    syncButton.addEventListener("click", syncFromSupabase);
  }
}

// Recupera campañas desde el estado o fuerza una sincronización contra Supabase.
async function ensureCampaignDataset(forceRefresh = false) {
  const state = getState();
  const existingCampaigns = Array.isArray(state.campaigns?.active) ? state.campaigns.active : [];

  if (!forceRefresh && existingCampaigns.length > 0) {
    return existingCampaigns;
  }

  try {
    const remoteState = await loadStrategyFromSupabase();
    if (remoteState) {
      setState(remoteState);
      return Array.isArray(remoteState.campaigns?.active) ? remoteState.campaigns.active : [];
    }
  } catch (error) {
    console.error("No se pudo cargar la información remota de campañas", error);
    if (statusBanner) {
      statusBanner.textContent = "No se pudieron cargar las campañas guardadas desde Supabase.";
    }
  }

  const refreshedState = getState();
  return Array.isArray(refreshedState.campaigns?.active) ? refreshedState.campaigns.active : [];
}

// Renderiza la vista de resumen con las campañas guardadas.
async function renderLandingView(options = {}) {
  const { forceRefresh = false } = options;
  if (!campaignOverviewCard || !campaignOverviewContainer) {
    return;
  }

  toggleWizardVisibility(false);
  campaignOverviewCard.classList.remove("hidden");

  campaignOverviewContainer.innerHTML = `
    <div class="campaign-overview">
      <header>
        <h2>Campañas guardadas</h2>
        <p>Cargando campañas sincronizadas...</p>
      </header>
    </div>
  `;

  const campaigns = await ensureCampaignDataset(forceRefresh);
  const hasCampaigns = campaigns.length > 0;
  const campaignMarkup = hasCampaigns
    ? `<div class="campaign-grid">${campaigns.map((campaign, index) => renderCampaignCard(campaign, index)).join("")}</div>`
    : '<div class="empty-campaigns">Aún no has registrado campañas. Inicia el asistente para crear tu primera estrategia.</div>';

  if (statusBanner) {
    statusBanner.textContent = hasCampaigns
      ? "Campañas sincronizadas correctamente."
      : "No encontramos campañas guardadas. Comienza el asistente para crear tu estrategia.";
  }

  campaignOverviewContainer.innerHTML = `
    <div class="campaign-overview">
      <header>
        <h2>Campañas guardadas</h2>
        <p>Consulta tus campañas sincronizadas y reanuda la planeación cuando lo necesites.</p>
      </header>
      ${campaignMarkup}
      <div class="landing-actions">
        <button type="button" class="btn btn-primary" id="landingStartWizard">📋 Planificar estrategia completa</button>
        <button type="button" class="btn btn-secondary" id="landingNewCampaign">🚀 Agregar campaña</button>
        <button type="button" class="btn btn-secondary" id="landingSync">🔄 Sincronizar con Supabase</button>
      </div>
    </div>
  `;

  attachLandingEvents();
}

// Abre el asistente en el paso indicado.
function startWizard(stepIndex = 0) {
  currentStepIndex = Math.max(0, Math.min(stepIndex, STEPS.length - 1));
  if (campaignOverviewCard) {
    campaignOverviewCard.classList.add("hidden");
  }
  toggleWizardVisibility(true);
  renderProgress();
  renderStepContent();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Regresa al resumen guardando los datos del paso actual.
async function handleReturnToOverview() {
  if (contentArea && STEPS[currentStepIndex]) {
    runStepValidation(STEPS[currentStepIndex].id);
  }
  saveState();
  await renderLandingView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Sincroniza la estrategia desde Supabase y refresca el resumen.
async function syncFromSupabase() {
  try {
    const remoteState = await loadStrategyFromSupabase();
    if (remoteState) {
      setState(remoteState);
    } else {
      statusBanner.textContent = "No encontramos campañas guardadas en Supabase.";
    }
  } catch (error) {
    statusBanner.textContent = "No se pudo sincronizar con Supabase.";
    console.error(error);
  }
  await renderLandingView({ forceRefresh: true });
}

// Ejecuta la validación específica del paso actual.
function runStepValidation(stepId) {
  const container = contentArea.querySelector(".step-container");
  clearFeedback(container ?? contentArea);
  const state = getState();

  switch (stepId) {
    case "company": {
      const nameInput = container.querySelector("#companyName");
      const industrySelect = container.querySelector("#industry");
      const sizeSelect = container.querySelector("#size");
      const situationArea = container.querySelector("#currentSituation");

      let isValid = true;
      if (!validateRequired(nameInput.value)) {
        setFieldError(nameInput, "El nombre de la empresa es obligatorio.");
        isValid = false;
      }
      if (!validateRequired(industrySelect.value)) {
        setFieldError(industrySelect, "Selecciona una industria.");
        isValid = false;
      }
      if (!validateRequired(sizeSelect.value)) {
        setFieldError(sizeSelect, "Selecciona el tamaño.");
        isValid = false;
      }
      if (!validateRequired(situationArea.value)) {
        setFieldError(situationArea, "Describe la situación actual.");
        isValid = false;
      }
      if (isValid) {
        state.companyInfo = {
          name: nameInput.value.trim(),
          industry: industrySelect.value,
          size: sizeSelect.value,
          currentSituation: situationArea.value.trim()
        };
        saveState();
      }
      return isValid;
    }
    case "audience": {
      const demographicsInput = container.querySelector("#audienceDemographics");
      const interestsInput = container.querySelector("#audienceInterests");
      const painsInput = container.querySelector("#audiencePains");

      let isValid = true;
      if (!validateRequired(demographicsInput.value)) {
        setFieldError(demographicsInput, "Define la demografía.");
        isValid = false;
      }
      if (!validateRequired(interestsInput.value)) {
        setFieldError(interestsInput, "Describe los intereses.");
        isValid = false;
      }
      if (!validateRequired(painsInput.value)) {
        setFieldError(painsInput, "Indica los pain points.");
        isValid = false;
      }
      if (isValid) {
        state.targetAudience = {
          demographics: demographicsInput.value.trim(),
          interests: interestsInput.value.trim(),
          painPoints: painsInput.value.trim()
        };
        saveState();
      }
      return isValid;
    }
    case "buyerPersona": {
      const motivations = container.querySelector("#personaMotivations");
      const objections = container.querySelector("#personaObjections");
      const email = container.querySelector("#personaEmail");
      let isValid = true;
      if (!validateRequired(motivations.value)) {
        setFieldError(motivations, "Describe motivaciones.");
        isValid = false;
      }
      if (!validateRequired(objections.value)) {
        setFieldError(objections, "Describe objeciones.");
        isValid = false;
      }
      if (!validateRequired(email.value)) {
        setFieldError(email, "Ingresa un correo de referencia.");
        isValid = false;
      } else if (!validateEmail(email.value)) {
        setFieldError(email, "Correo inválido.");
        isValid = false;
      }
      if (isValid) {
        const archetypeRows = Array.from(container.querySelectorAll(".persona-row"));
        state.buyerPersona = {
          motivations: motivations.value.trim(),
          objections: objections.value.trim(),
          contactEmail: email.value.trim(),
          preferredChannels: Array.from(container.querySelectorAll("input[name='personaChannel']:checked")).map((input) => input.value),
          archetypes: archetypeRows.map((row) => ({
            name: row.querySelector(".persona-name").value.trim(),
            motivations: row.querySelector(".persona-motivations").value.trim(),
            objections: row.querySelector(".persona-objections").value.trim(),
            channels: row.querySelector(".persona-channels").value.split(",").map((value) => value.trim()).filter(Boolean)
          }))
        };
        saveState();
      }
      return isValid;
    }
    case "competitive": {
      const competitorRows = Array.from(container.querySelectorAll(".competitor-row"));
      if (competitorRows.length === 0) {
        return false;
      }
      state.competitiveAnalysis.competitors = competitorRows.map((row) => ({
        name: row.querySelector(".competitor-name").value.trim(),
        value: row.querySelector(".competitor-value").value.trim(),
        notes: row.querySelector(".competitor-notes").value.trim()
      }));
      saveState();
      return true;
    }
    case "swot": {
      state.swot = {
        strengths: Array.from(container.querySelectorAll("textarea[data-category='strength']")).map((area) => area.value.trim()).filter(Boolean),
        weaknesses: Array.from(container.querySelectorAll("textarea[data-category='weakness']")).map((area) => area.value.trim()).filter(Boolean),
        opportunities: Array.from(container.querySelectorAll("textarea[data-category='opportunity']")).map((area) => area.value.trim()).filter(Boolean),
        threats: Array.from(container.querySelectorAll("textarea[data-category='threat']")).map((area) => area.value.trim()).filter(Boolean)
      };
      saveState();
      return true;
    }
    case "objectives": {
      if (state.objectives.length === 0) {
        const grid = container.querySelector(".grid");
        setFieldError(grid, "Selecciona al menos un objetivo.");
        return false;
      }
      return true;
    }
    case "channels": {
      if (state.channels.length === 0) {
        const grid = container.querySelector(".grid");
        setFieldError(grid, "Selecciona al menos un canal.");
        return false;
      }
      return true;
    }
    case "budget": {
      const totalInput = container.querySelector("#budgetTotal");
      if (!validatePositiveNumber(totalInput.value)) {
        setFieldError(totalInput, "Ingresa un presupuesto válido.");
        return false;
      }
      state.budget.total = Number(totalInput.value);
      saveState();
      return true;
    }
    case "tacticalPlan": {
      const rows = Array.from(container.querySelectorAll(".tactical-row"));
      state.tacticalPlan.items = rows.map((row) => ({
        activity: row.querySelector(".tactical-activity").value.trim(),
        responsible: row.querySelector(".tactical-responsible").value.trim(),
        dependencies: row.querySelector(".tactical-dependencies").value.trim(),
        cost: Number(row.querySelector(".tactical-cost").value) || 0
      }));
      saveState();
      return true;
    }
    case "calendar": {
      const entryRows = Array.from(container.querySelectorAll(".calendar-row"));
      state.publicationCalendar.entries = entryRows.map((row) => ({
        day: row.querySelector(".calendar-day").value,
        channel: row.querySelector(".calendar-channel").value,
        contentType: row.querySelector(".calendar-type").value,
        time: row.querySelector(".calendar-time").value
      }));
      saveState();
      return true;
    }
    case "campaigns": {
      const campaignRows = Array.from(container.querySelectorAll(".campaign-row"));
      const automationRows = Array.from(container.querySelectorAll(".automation-row"));
      state.campaigns.active = campaignRows
        .map((row) => {
          const planSummary = row.querySelector(".campaign-plan").value.trim();

          return {
            name: row.querySelector(".campaign-name").value.trim(),
            channel: row.querySelector(".campaign-channel").value.trim(),
            budget: Number(row.querySelector(".campaign-budget").value) || 0,
            startDate: row.querySelector(".campaign-start").value,
            endDate: row.querySelector(".campaign-end").value,
            goal: row.querySelector(".campaign-goal").value.trim(),
            status: row.querySelector(".campaign-status").value,
            details: planSummary.length > 0 ? { plan: planSummary } : {}
          };
        })
        .filter(
          (campaign) =>
            campaign.name.length > 0 ||
            campaign.channel.length > 0 ||
            campaign.goal.length > 0 ||
            campaign.budget > 0 ||
            campaign.startDate ||
            campaign.endDate ||
            (campaign.details && campaign.details.plan && campaign.details.plan.length > 0)
        );
      state.campaigns.automations = automationRows
        .map((row) => ({
          name: row.querySelector(".automation-name").value.trim(),
          trigger: row.querySelector(".automation-trigger").value.trim(),
          cadence: row.querySelector(".automation-cadence").value.trim(),
          tool: row.querySelector(".automation-tool").value.trim()
        }))
        .filter(
          (automation) =>
            automation.name.length > 0 ||
            automation.trigger.length > 0 ||
            automation.cadence.length > 0 ||
            automation.tool.length > 0
        );
      saveState();
      return true;
    }
    case "kpis": {
      const selectedRows = Array.from(container.querySelectorAll(".kpi-row"));
      state.kpis = selectedRows.map((row) => ({
        name: row.querySelector(".kpi-name").textContent,
        measurement: row.querySelector(".kpi-measurement").value,
        target: Number(row.querySelector(".kpi-target").value) || 0
      }));
      saveState();
      return true;
    }
    case "tracking": {
      const monthRows = Array.from(container.querySelectorAll(".tracking-row"));
      state.monthlyTracking.months = monthRows.map((row) => ({
        label: row.querySelector(".tracking-label").value,
        metrics: Array.from(row.querySelectorAll(".tracking-metric"), (metricRow) => ({
          kpi: metricRow.dataset.kpi,
          target: Number(metricRow.querySelector(".metric-target").value) || 0,
          actual: Number(metricRow.querySelector(".metric-actual").value) || 0,
          variation: 0,
          trend: 0
        }))
      }));
      computeTrackingInsights();
      saveState();
      return true;
    }
    default:
      return true;
  }
}

// Permite agregar filas dinámicas en secciones repetibles.
function addDynamicRow(containerSelector, template) {
  const container = contentArea.querySelector(containerSelector);
  if (!container) {
    return;
  }
  container.insertAdjacentHTML("beforeend", template);
}

// Renderiza el contenido del paso actual.
function renderStepContent() {
  const stepId = STEPS[currentStepIndex].id;
  const state = getState();

  const templates = {
    welcome: renderWelcomeStep,
    company: renderCompanyStep,
    audience: renderAudienceStep,
    buyerPersona: renderBuyerPersonaStep,
    competitive: renderCompetitiveStep,
    swot: renderSwotStep,
    objectives: renderObjectivesStep,
    channels: renderChannelsStep,
    budget: renderBudgetStep,
    tacticalPlan: renderTacticalPlanStep,
    calendar: renderCalendarStep,
    campaigns: renderCampaignsStep,
    kpis: renderKpiStep,
    tracking: renderTrackingStep,
    report: renderReportStep
  };

  templates[stepId](state);
  saveState();
}

// Genera el paso de bienvenida.
function renderWelcomeStep() {
  contentArea.innerHTML = `
    <div class="step-container welcome-hero">
      <div class="welcome-icon">📈</div>
      <h2 class="welcome-title">Bienvenido a tu Plataforma de Estrategia de Marketing</h2>
      <p>Guardaremos tus avances automáticamente en Supabase y en este dispositivo.</p>
      <div class="feature-cards">
        <div class="feature-card blue">
          <div class="feature-icon">🎯</div>
          <h3>Define Objetivos</h3>
          <p>Metas medibles por cada etapa del funnel.</p>
        </div>
        <div class="feature-card purple">
          <div class="feature-icon">🤝</div>
          <h3>Asignación de Responsables</h3>
          <p>Plan táctico detallado con dependencias.</p>
        </div>
        <div class="feature-card green">
          <div class="feature-icon">📊</div>
          <h3>Seguimiento Inteligente</h3>
          <p>KPIs con tendencias, alertas y reportes ejecutivos.</p>
        </div>
      </div>
    </div>
  `;
}

// Renderiza el formulario de información empresarial.
function renderCompanyStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Información de tu Empresa</h2>
      <div class="form-group">
        <label for="companyName">Nombre de la empresa</label>
        <input id="companyName" type="text" class="form-control" value="${state.companyInfo.name}" />
      </div>
      <div class="form-group">
        <label for="industry">Industria</label>
        <select id="industry" class="form-control">
          <option value="">Selecciona una industria</option>
          <option value="retail">Retail / Comercio</option>
          <option value="services">Servicios</option>
          <option value="technology">Tecnología</option>
          <option value="manufacturing">Manufactura</option>
          <option value="food">Alimentos y Bebidas</option>
          <option value="health">Salud y Bienestar</option>
          <option value="education">Educación</option>
          <option value="other">Otro</option>
        </select>
      </div>
      <div class="form-group">
        <label for="size">Tamaño de la empresa</label>
        <select id="size" class="form-control">
          <option value="">Selecciona el tamaño</option>
          <option value="1-10">1-10 empleados</option>
          <option value="11-50">11-50 empleados</option>
          <option value="51-200">51-200 empleados</option>
          <option value="200+">200+ empleados</option>
        </select>
      </div>
      <div class="form-group">
        <label for="currentSituation">Situación actual del marketing</label>
        <textarea id="currentSituation" class="form-control" rows="4">${state.companyInfo.currentSituation}</textarea>
      </div>
    </div>
  `;
  contentArea.querySelector("#industry").value = state.companyInfo.industry;
  contentArea.querySelector("#size").value = state.companyInfo.size;
}

// Renderiza el paso de audiencia objetivo.
function renderAudienceStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Define tu Audiencia Objetivo</h2>
      <div class="form-group">
        <label for="audienceDemographics">Demografía</label>
        <textarea id="audienceDemographics" class="form-control" rows="3">${state.targetAudience.demographics}</textarea>
      </div>
      <div class="form-group">
        <label for="audienceInterests">Intereses y comportamientos</label>
        <textarea id="audienceInterests" class="form-control" rows="3">${state.targetAudience.interests}</textarea>
      </div>
      <div class="form-group">
        <label for="audiencePains">Problemas o necesidades (Pain Points)</label>
        <textarea id="audiencePains" class="form-control" rows="3">${state.targetAudience.painPoints}</textarea>
      </div>
    </div>
  `;
}

// Renderiza el paso de buyer persona avanzado.
function renderBuyerPersonaStep(state) {
  const archetypes = state.buyerPersona.archetypes ?? [];
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Buyer Persona Avanzado</h2>
      <div class="form-group">
        <label for="personaMotivations">Motivaciones clave</label>
        <textarea id="personaMotivations" class="form-control" rows="3">${state.buyerPersona.motivations ?? ""}</textarea>
      </div>
      <div class="form-group">
        <label for="personaObjections">Objeciones habituales</label>
        <textarea id="personaObjections" class="form-control" rows="3">${state.buyerPersona.objections ?? ""}</textarea>
      </div>
      <div class="form-group">
        <label for="personaEmail">Correo de referencia</label>
        <input id="personaEmail" type="email" class="form-control" value="${state.buyerPersona.contactEmail ?? ""}" />
      </div>
      <div class="form-group">
        <label>Canales preferidos</label>
        <div class="checkbox-grid">
          ${MARKETING_CHANNELS.map((channel) => `
            <label class="checkbox-group">
              <input type="checkbox" name="personaChannel" value="${channel.id}" ${state.buyerPersona.preferredChannels?.includes(channel.id) ? "checked" : ""} />
              <span>${channel.name}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <div class="persona-archetypes">
        <h3>Arquetipos</h3>
        <div class="persona-list"></div>
        <button type="button" class="btn btn-secondary" id="addPersona">➕ Agregar arquetipo</button>
      </div>
    </div>
  `;

  const listContainer = contentArea.querySelector(".persona-list");
  const renderRow = (persona = { name: "", motivations: "", objections: "", channels: [] }) => `
    <div class="persona-row">
      <input class="form-control persona-name" placeholder="Nombre" value="${persona.name}" />
      <textarea class="form-control persona-motivations" rows="2" placeholder="Motivaciones">${persona.motivations}</textarea>
      <textarea class="form-control persona-objections" rows="2" placeholder="Objeciones">${persona.objections}</textarea>
      <input class="form-control persona-channels" placeholder="Canales separados por coma" value="${persona.channels.join(", ")}" />
    </div>
  `;
  listContainer.innerHTML = archetypes.length ? archetypes.map((persona) => renderRow(persona)).join("") : renderRow();
  contentArea.querySelector("#addPersona").addEventListener("click", () => {
    addDynamicRow(".persona-list", renderRow());
  });
}

// Renderiza el paso de análisis competitivo.
function renderCompetitiveStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Análisis Competitivo</h2>
      <div class="competitor-list"></div>
      <button type="button" class="btn btn-secondary" id="addCompetitor">➕ Agregar competidor</button>
    </div>
  `;
  const list = contentArea.querySelector(".competitor-list");
  const renderRow = (competitor = { name: "", value: "", notes: "" }) => `
    <div class="competitor-row">
      <input class="form-control competitor-name" placeholder="Nombre" value="${competitor.name}" />
      <input class="form-control competitor-value" placeholder="Propuesta de valor" value="${competitor.value}" />
      <textarea class="form-control competitor-notes" rows="2" placeholder="Notas">${competitor.notes}</textarea>
    </div>
  `;
  list.innerHTML = state.competitiveAnalysis.competitors.length
    ? state.competitiveAnalysis.competitors.map((competitor) => renderRow(competitor)).join("")
    : renderRow();
  contentArea.querySelector("#addCompetitor").addEventListener("click", () => {
    addDynamicRow(".competitor-list", renderRow());
  });
}

// Renderiza el paso de matriz SWOT.
function renderSwotStep(state) {
  const categories = [
    { key: "strength", label: "Fortalezas", items: state.swot.strengths },
    { key: "weakness", label: "Debilidades", items: state.swot.weaknesses },
    { key: "opportunity", label: "Oportunidades", items: state.swot.opportunities },
    { key: "threat", label: "Amenazas", items: state.swot.threats }
  ];
  contentArea.innerHTML = `
    <div class="step-container swot-grid">
      ${categories
        .map(
          (category) => `
            <div class="swot-card">
              <h3>${category.label}</h3>
              <textarea data-category="${category.key}" class="form-control" rows="6">${category.items.join("\n")}</textarea>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

// Renderiza la selección de objetivos.
function renderObjectivesStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Objetivos de Marketing</h2>
      <p>Selecciona hasta 3 objetivos prioritarios.</p>
      <div class="grid grid-2 objective-grid">
        ${OBJECTIVES.map((objective) => `
          <button type="button" class="selectable-card ${state.objectives.includes(objective) ? "selected" : ""}" data-objective="${objective}">
            <span>${objective}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  contentArea.querySelectorAll(".selectable-card").forEach((card) => {
    card.addEventListener("click", () => {
      const value = card.dataset.objective;
      const currentObjectives = new Set(getState().objectives);
      if (currentObjectives.has(value)) {
        currentObjectives.delete(value);
      } else if (currentObjectives.size < 3) {
        currentObjectives.add(value);
      }
      mergeState({ objectives: Array.from(currentObjectives) });
      renderStepContent();
    });
  });
}

// Renderiza la selección de canales y presupuesto.
function renderChannelsStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Canales de Marketing</h2>
      <div class="grid grid-3 channel-grid">
        ${MARKETING_CHANNELS.map((channel) => `
          <button type="button" class="selectable-card ${state.channels.includes(channel.id) ? "selected" : ""}" data-channel="${channel.id}">
            <div class="channel-card">
              <div class="channel-icon ${channel.className}">${channel.icon}</div>
              <span>${channel.name}</span>
            </div>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  contentArea.querySelectorAll(".selectable-card").forEach((card) => {
    card.addEventListener("click", () => {
      const value = card.dataset.channel;
      const channels = new Set(getState().channels);
      if (channels.has(value)) {
        channels.delete(value);
      } else {
        channels.add(value);
      }
      mergeState({ channels: Array.from(channels) });
      renderStepContent();
    });
  });
}

// Renderiza el paso de presupuesto con sliders.
function renderBudgetStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Presupuesto</h2>
      <div class="form-group">
        <label for="budgetTotal">Presupuesto mensual total</label>
        <input id="budgetTotal" type="number" class="form-control" value="${state.budget.total}" />
      </div>
      <div class="budget-grid">
        ${state.channels
          .map((channelId) => {
            const channel = MARKETING_CHANNELS.find((item) => item.id === channelId);
            const value = state.budget.distribution[channelId] ?? 0;
            return `
              <div class="budget-slider">
                <div class="channel-label">
                  <span class="channel-icon ${channel.className}">${channel.icon}</span>
                  <span>${channel.name}</span>
                </div>
                <input type="range" min="0" max="100" value="${value}" data-channel="${channelId}" />
                <span class="percentage">${value}%</span>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
  contentArea.querySelectorAll(".budget-slider input[type='range']").forEach((slider) => {
    slider.addEventListener("input", (event) => {
      const channelId = event.target.dataset.channel;
      const value = Number(event.target.value);
      event.target.nextElementSibling.textContent = `${value}%`;
      const state = getState();
      state.budget.distribution[channelId] = value;
      saveState();
    });
  });
}

// Renderiza el plan táctico con responsables y costos.
function renderTacticalPlanStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Plan Táctico y Responsables</h2>
      <div class="tactical-list"></div>
      <button type="button" class="btn btn-secondary" id="addTactical">➕ Agregar actividad</button>
    </div>
  `;
  const list = contentArea.querySelector(".tactical-list");
  const renderRow = (item = { activity: "", responsible: "", dependencies: "", cost: 0 }) => `
    <div class="tactical-row">
      <input class="form-control tactical-activity" placeholder="Actividad" value="${item.activity}" />
      <input class="form-control tactical-responsible" placeholder="Responsable" value="${item.responsible}" />
      <input class="form-control tactical-dependencies" placeholder="Dependencias" value="${item.dependencies}" />
      <input class="form-control tactical-cost" type="number" placeholder="Costo" value="${item.cost}" />
    </div>
  `;
  list.innerHTML = state.tacticalPlan.items.length
    ? state.tacticalPlan.items.map((item) => renderRow(item)).join("")
    : renderRow();
  contentArea.querySelector("#addTactical").addEventListener("click", () => {
    addDynamicRow(".tactical-list", renderRow());
  });
}

// Renderiza el calendario editorial con canal y hora.
function renderCalendarStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Calendario Editorial</h2>
      <div class="calendar-list"></div>
      <button type="button" class="btn btn-secondary" id="addCalendar">➕ Agregar publicación</button>
    </div>
  `;
  const list = contentArea.querySelector(".calendar-list");
  const renderRow = (entry = { day: DAYS_OF_WEEK[0], channel: state.channels[0] ?? "", contentType: CONTENT_TYPES[0], time: "09:00" }) => `
    <div class="calendar-row">
      <select class="form-control calendar-day">
        ${DAYS_OF_WEEK.map((day) => `<option value="${day}" ${day === entry.day ? "selected" : ""}>${day}</option>`).join("")}
      </select>
      <select class="form-control calendar-channel">
        ${state.channels.map((channelId) => {
          const channel = MARKETING_CHANNELS.find((item) => item.id === channelId);
          return `<option value="${channelId}" ${channelId === entry.channel ? "selected" : ""}>${channel?.name ?? channelId}</option>`;
        }).join("")}
      </select>
      <select class="form-control calendar-type">
        ${CONTENT_TYPES.map((type) => `<option value="${type}" ${type === entry.contentType ? "selected" : ""}>${type}</option>`).join("")}
      </select>
      <input class="form-control calendar-time" type="time" value="${entry.time}" />
    </div>
  `;
  list.innerHTML = state.publicationCalendar.entries.length
    ? state.publicationCalendar.entries.map((entry) => renderRow(entry)).join("")
    : renderRow();
  contentArea.querySelector("#addCalendar").addEventListener("click", () => {
    addDynamicRow(".calendar-list", renderRow());
  });
}

// Renderiza el paso de campañas y automatizaciones.
function renderCampaignsStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Campañas y Automatizaciones</h2>
      <h3>Campañas activas</h3>
      <div class="campaign-list"></div>
      <button type="button" class="btn btn-secondary" id="addCampaign">➕ Agregar campaña</button>
      <h3>Automatizaciones</h3>
      <div class="automation-list"></div>
      <button type="button" class="btn btn-secondary" id="addAutomation">➕ Agregar automatización</button>
    </div>
  `;
  const campaignList = contentArea.querySelector(".campaign-list");
  const automationList = contentArea.querySelector(".automation-list");
  const encodeHtml = (value) => {
    if (value === undefined || value === null) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  const renderCampaignRow = (campaign = {
    name: "",
    channel: "",
    budget: 0,
    startDate: "",
    endDate: "",
    goal: "",
    status: "Planificada",
    details: {}
  }) => {
    const planSummary = encodeHtml(campaign.details?.plan ?? campaign.plan ?? "");

    return `
    <div class="campaign-row">
      <input class="form-control campaign-name" placeholder="Nombre" value="${campaign.name}" />
      <input class="form-control campaign-channel" placeholder="Canal" value="${campaign.channel}" />
      <input class="form-control campaign-budget" type="number" placeholder="Presupuesto" value="${campaign.budget}" />
      <input class="form-control campaign-start" type="date" value="${campaign.startDate ?? ""}" />
      <input class="form-control campaign-end" type="date" value="${campaign.endDate ?? ""}" />
      <input class="form-control campaign-goal" placeholder="Objetivo" value="${campaign.goal}" />
      <select class="form-control campaign-status">
        ${["Planificada", "En ejecución", "Pausada", "Finalizada"].map((status) => `<option value="${status}" ${status === campaign.status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
      <textarea class="form-control campaign-plan" rows="3" placeholder="Resumen de la planificación, mensajes clave o brief">${planSummary}</textarea>
    </div>
  `;
  };
  const renderAutomationRow = (automation = { name: "", trigger: "", cadence: "", tool: "" }) => `
    <div class="automation-row">
      <input class="form-control automation-name" placeholder="Nombre" value="${automation.name}" />
      <input class="form-control automation-trigger" placeholder="Trigger" value="${automation.trigger}" />
      <input class="form-control automation-cadence" placeholder="Frecuencia" value="${automation.cadence}" />
      <input class="form-control automation-tool" placeholder="Herramienta" value="${automation.tool}" />
    </div>
  `;
  campaignList.innerHTML = state.campaigns.active.length
    ? state.campaigns.active.map((campaign) => renderCampaignRow(campaign)).join("")
    : renderCampaignRow();
  automationList.innerHTML = state.campaigns.automations.length
    ? state.campaigns.automations.map((automation) => renderAutomationRow(automation)).join("")
    : renderAutomationRow();
  contentArea.querySelector("#addCampaign").addEventListener("click", () => {
    addDynamicRow(".campaign-list", renderCampaignRow());
  });
  contentArea.querySelector("#addAutomation").addEventListener("click", () => {
    addDynamicRow(".automation-list", renderAutomationRow());
  });
}

// Renderiza el paso de KPIs.
function renderKpiStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>KPIs</h2>
      <p>Configura las métricas a seguir.</p>
      <div class="kpi-list">
        ${KPI_OPTIONS.map((kpi) => {
          const existing = state.kpis.find((item) => item.name === kpi) ?? { measurement: "Cantidad", target: 0 };
          return `
            <div class="kpi-row">
              <span class="kpi-name">${kpi}</span>
              <select class="form-control kpi-measurement">
                ${["Cantidad", "Porcentaje", "Índice"].map((option) => `<option value="${option}" ${option === existing.measurement ? "selected" : ""}>${option}</option>`).join("")}
              </select>
              <input class="form-control kpi-target" type="number" value="${existing.target}" />
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// Renderiza el paso de tracking mensual con gráfico.
function renderTrackingStep(state) {
  contentArea.innerHTML = `
    <div class="step-container">
      <h2>Tracking Mensual</h2>
      <div class="tracking-list"></div>
      <button type="button" class="btn btn-secondary" id="addMonth">➕ Agregar mes</button>
      <div class="chart-container" style="height: 280px; margin-top: 24px;">
        <canvas id="trackingChart"></canvas>
      </div>
    </div>
  `;
  const list = contentArea.querySelector(".tracking-list");
  const renderMonthRow = (month = { label: "2024-01", metrics: state.kpis.map((kpi) => ({ kpi: kpi.name, target: kpi.target, actual: 0 })) }) => `
    <div class="tracking-row">
      <input class="form-control tracking-label" type="month" value="${month.label}" />
      ${month.metrics
        .map(
          (metric) => `
            <div class="tracking-metric" data-kpi="${metric.kpi}">
              <strong>${metric.kpi}</strong>
              <input class="form-control metric-target" type="number" value="${metric.target}" placeholder="Meta" />
              <input class="form-control metric-actual" type="number" value="${metric.actual}" placeholder="Resultado" />
            </div>
          `
        )
        .join("")}
    </div>
  `;
  list.innerHTML = state.monthlyTracking.months.length
    ? state.monthlyTracking.months.map((month) => renderMonthRow(month)).join("")
    : renderMonthRow();
  contentArea.querySelector("#addMonth").addEventListener("click", () => {
    addDynamicRow(".tracking-list", renderMonthRow());
  });
  renderTrackingChart(contentArea.querySelector("#trackingChart"), state.monthlyTracking.months.length ? state.monthlyTracking.months : [
    { label: "2024-01", metrics: state.kpis.map((kpi) => ({ kpi: kpi.name, target: kpi.target, actual: 0 })) }
  ]);
}

// Renderiza el paso final con resumen y acciones.
function renderReportStep(state) {
  const user = getCurrentUser();
  const mailtoLink = `mailto:?subject=Estrategia%20de%20Marketing&body=Consulta%20la%20estrategia%20guardada%20por%20${encodeURIComponent(user?.username ?? "")}`;
  contentArea.innerHTML = `
    <div class="step-container">
      <div class="success-icon">✓</div>
      <h2>Resumen Ejecutivo</h2>
      <p>Revisa y comparte tu plan estratégico.</p>
      <div class="summary-section">
        <div class="summary-card">
          <h3>Empresa</h3>
          <p><strong>${state.companyInfo.name}</strong> • ${state.companyInfo.industry} • ${state.companyInfo.size}</p>
          <p>${state.companyInfo.currentSituation}</p>
        </div>
        <div class="summary-card">
          <h3>Objetivos</h3>
          <ul>${state.objectives.map((objective) => `<li>${objective}</li>`).join("")}</ul>
        </div>
        <div class="summary-card">
          <h3>Canales y Presupuesto</h3>
          <p>Presupuesto mensual: <strong>$${state.budget.total}</strong></p>
          <ul>
            ${Object.entries(state.budget.distribution)
              .map(([channel, percentage]) => {
                const channelData = MARKETING_CHANNELS.find((item) => item.id === channel);
                return `<li>${channelData?.name ?? channel}: ${percentage}%</li>`;
              })
              .join("")}
          </ul>
        </div>
        <div class="summary-card">
          <h3>Plan táctico</h3>
          <ul>${state.tacticalPlan.items.map((item) => `<li>${item.activity} - ${item.responsible}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="cta-group">
        <button type="button" class="btn btn-primary" id="saveStrategy">💾 Guardar en Supabase</button>
        <button type="button" class="btn btn-secondary" id="downloadPdf">⬇️ Descargar PDF</button>
        <a class="btn btn-secondary" href="${mailtoLink}">📧 Compartir por correo</a>
        <button type="button" class="btn" id="goDashboard">🏠 Ir al Dashboard</button>
      </div>
      <p class="confirmation" id="confirmationMessage"></p>
    </div>
  `;
  contentArea.querySelector("#saveStrategy").addEventListener("click", async () => {
    try {
      await saveStrategyToSupabase();
      const message = contentArea.querySelector("#confirmationMessage");
      message.textContent = "✅ Estrategia guardada correctamente.";
    } catch (error) {
      const message = contentArea.querySelector("#confirmationMessage");
      message.textContent = "❌ No se pudo guardar la estrategia.";
      console.error(error);
    }
  });
  contentArea.querySelector("#downloadPdf").addEventListener("click", () => {
    generateStrategyPdf(state);
    const message = contentArea.querySelector("#confirmationMessage");
    if (message) {
      message.textContent = "📄 Reporte PDF generado correctamente.";
    }
  });
  contentArea.querySelector("#goDashboard").addEventListener("click", () => {
    window.location.href = "../dashboard/index.html";
  });
}

// Finaliza el asistente guardando todo y mostrando confirmación.
async function finalizeStrategy() {
  try {
    await saveStrategyToSupabase();
    const message = contentArea.querySelector("#confirmationMessage");
    if (message) {
      message.textContent = "✅ Estrategia guardada correctamente.";
    }
    statusBanner.textContent = "Estrategia sincronizada con éxito.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    statusBanner.textContent = "No se pudo guardar la estrategia. Intenta nuevamente.";
    console.error(error);
  }
}

// Recupera la estrategia previa desde Supabase o localStorage.
async function bootstrapState() {
  const localState = loadStateFromStorage();
  if (localState) {
    setState(localState);
  }
  try {
    const remoteState = await loadStrategyFromSupabase();
    if (remoteState) {
      setState(remoteState);
    }
  } catch (error) {
    console.error("No se pudo sincronizar con Supabase", error);
  }
}

// Punto de entrada principal del módulo.
async function initializeModule() {
  requireAuth();
  initializeElements();
  await bootstrapState();
  await initializeCampaignsSection();
  await renderLandingView();
}

if (typeof document !== "undefined") {
  initializeModule();
}
