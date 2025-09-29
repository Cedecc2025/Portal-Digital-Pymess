// estrategias.js
// Controla el asistente paso a paso para crear una estrategia de marketing.

import { requireAuth } from "../../../lib/authGuard.js";

const progressStepsElement = document.querySelector("#progressSteps");
const stepCountElement = document.querySelector("#stepCount");
const stepNameElement = document.querySelector("#stepName");
const contentAreaElement = document.querySelector("#contentArea");
const previousButton = document.querySelector("#prevBtn");
const nextButton = document.querySelector("#nextBtn");

let currentStep = 0;

const strategyData = {
  companyInfo: {
    name: "",
    industry: "",
    size: "",
    currentSituation: ""
  },
  targetAudience: {
    demographics: "",
    interests: "",
    painPoints: ""
  },
  objectives: [],
  channels: [],
  budget: {
    total: "",
    distribution: {}
  },
  timeline: {
    duration: "3",
    activities: []
  },
  publicationCalendar: {
    contentTypes: []
  },
  kpis: [],
  monthlyTracking: {
    months: []
  }
};

const steps = [
  { name: "Inicio", icon: "💡" },
  { name: "Información de Empresa", icon: "🏢" },
  { name: "Audiencia Objetivo", icon: "👥" },
  { name: "Objetivos", icon: "🎯" },
  { name: "Canales de Marketing", icon: "📢" },
  { name: "Presupuesto", icon: "💰" },
  { name: "Cronograma", icon: "📅" },
  { name: "Calendario de Publicaciones", icon: "✏️" },
  { name: "KPIs", icon: "📊" },
  { name: "Tracking Mensual", icon: "📈" },
  { name: "Resumen", icon: "📄" }
];

const objectives = [
  "Aumentar reconocimiento de marca",
  "Generar más leads",
  "Incrementar ventas",
  "Mejorar retención de clientes",
  "Expandir a nuevos mercados",
  "Lanzar nuevo producto/servicio"
];

const marketingChannels = [
  { id: "social", name: "Redes Sociales", icon: "💬", className: "icon-social" },
  { id: "email", name: "Email Marketing", icon: "✉️", className: "icon-email" },
  { id: "content", name: "Marketing de Contenidos", icon: "📝", className: "icon-content" },
  { id: "seo", name: "SEO", icon: "🌐", className: "icon-seo" },
  { id: "video", name: "Video Marketing", icon: "🎥", className: "icon-video" },
  { id: "paid", name: "Publicidad Pagada", icon: "💸", className: "icon-paid" }
];

const kpiOptions = [
  "Tráfico web",
  "Tasa de conversión",
  "ROI de marketing",
  "Costo por adquisición (CAC)",
  "Valor de vida del cliente (CLV)",
  "Engagement en redes sociales",
  "Tasa de apertura de emails",
  "Posicionamiento SEO"
];

const contentTypes = [
  "Educativo",
  "Promocional",
  "Testimonios",
  "Behind the scenes",
  "Tips y consejos",
  "Noticias",
  "Entretenimiento",
  "Casos de éxito"
];

// Inicializa el módulo asegurando la autenticación previa.
function initializeModule() {
  requireAuth();
  registerNavigationEvents();
  renderProgressIndicators();
  renderStepContent();
}

// Registra los eventos de los botones de navegación principal.
function registerNavigationEvents() {
  if (previousButton) {
    previousButton.addEventListener("click", () => {
      goToPreviousStep();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      goToNextStep();
    });
  }
}

// Avanza al paso siguiente del asistente.
function goToNextStep() {
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    renderProgressIndicators();
    renderStepContent();
  }
}

// Retrocede al paso anterior del asistente.
function goToPreviousStep() {
  if (currentStep > 0) {
    currentStep -= 1;
    renderProgressIndicators();
    renderStepContent();
  }
}

// Construye la cabecera del progreso con iconos y metadatos.
function renderProgressIndicators() {
  if (!progressStepsElement) {
    return;
  }

  progressStepsElement.innerHTML = "";

  steps.forEach((step, index) => {
    const stepContainer = document.createElement("div");
    stepContainer.className = [
      "step",
      index < currentStep ? "completed" : "",
      index === currentStep ? "active" : ""
    ]
      .filter(Boolean)
      .join(" ");

    const circle = document.createElement("div");
    circle.className = "step-circle";
    circle.textContent = step.icon;

    stepContainer.appendChild(circle);

    if (index < steps.length - 1) {
      const line = document.createElement("div");
      line.className = "step-line";

      if (index < currentStep) {
        line.classList.add("completed");
      }

      stepContainer.appendChild(line);
    }

    progressStepsElement.appendChild(stepContainer);
  });

  if (stepCountElement) {
    stepCountElement.textContent = `Paso ${currentStep + 1} de ${steps.length}`;
  }

  if (stepNameElement) {
    stepNameElement.textContent = steps[currentStep].name;
  }
}

// Renderiza el contenido del paso actual en pantalla.
function renderStepContent() {
  if (!contentAreaElement) {
    return;
  }

  contentAreaElement.innerHTML = buildStepMarkup(currentStep);
  attachStepHandlers(currentStep);
  updateNavigationButtons();
}

// Crea el marcado HTML correspondiente a cada paso del asistente.
function buildStepMarkup(stepIndex) {
  switch (stepIndex) {
    case 0:
      return `
        <div class="welcome-hero">
          <div class="welcome-icon">📈</div>
          <h2 class="welcome-title">Bienvenido a tu Plataforma de Estrategia de Marketing</h2>
          <p style="color: #6b7280; max-width: 600px; margin: 0 auto;">
            Diseña una estrategia de marketing profesional para tu PYME en solo 11 pasos.
            Esta herramienta te guiará a través del proceso completo, desde el análisis inicial
            hasta la definición de métricas de éxito.
          </p>
          <div class="feature-cards">
            <div class="feature-card blue">
              <div class="feature-icon">🎯</div>
              <h3 style="color: #1e40af;">Define Objetivos</h3>
              <p style="font-size: 14px; color: #3730a3;">Establece metas claras y medibles</p>
            </div>
            <div class="feature-card purple">
              <div class="feature-icon">🎨</div>
              <h3 style="color: #7c3aed;">Selecciona Canales</h3>
              <p style="font-size: 14px; color: #6d28d9;">Elige los mejores canales para tu audiencia</p>
            </div>
            <div class="feature-card green">
              <div class="feature-icon">📊</div>
              <h3 style="color: #166534;">Mide Resultados</h3>
              <p style="font-size: 14px; color: #15803d;">Define KPIs para evaluar el éxito</p>
            </div>
          </div>
        </div>
      `;
    case 1:
      return `
        <h2>Información de tu Empresa</h2>
        <div class="form-group">
          <label for="companyName">Nombre de la empresa</label>
          <input id="companyName" type="text" class="form-control" value="${strategyData.companyInfo.name}" placeholder="Tu empresa S.A.">
        </div>
        <div class="form-group">
          <label for="industry">Industria</label>
          <select id="industry" class="form-control">
            <option value="">Selecciona una industria</option>
            ${buildSelectOption("retail", "Retail / Comercio", strategyData.companyInfo.industry)}
            ${buildSelectOption("services", "Servicios", strategyData.companyInfo.industry)}
            ${buildSelectOption("technology", "Tecnología", strategyData.companyInfo.industry)}
            ${buildSelectOption("manufacturing", "Manufactura", strategyData.companyInfo.industry)}
            ${buildSelectOption("food", "Alimentos y Bebidas", strategyData.companyInfo.industry)}
            ${buildSelectOption("health", "Salud y Bienestar", strategyData.companyInfo.industry)}
            ${buildSelectOption("education", "Educación", strategyData.companyInfo.industry)}
            ${buildSelectOption("other", "Otro", strategyData.companyInfo.industry)}
          </select>
        </div>
        <div class="form-group">
          <label for="size">Tamaño de la empresa</label>
          <select id="size" class="form-control">
            <option value="">Selecciona el tamaño</option>
            ${buildSelectOption("1-10", "1-10 empleados", strategyData.companyInfo.size)}
            ${buildSelectOption("11-50", "11-50 empleados", strategyData.companyInfo.size)}
            ${buildSelectOption("51-200", "51-200 empleados", strategyData.companyInfo.size)}
            ${buildSelectOption("200+", "200+ empleados", strategyData.companyInfo.size)}
          </select>
        </div>
        <div class="form-group">
          <label for="currentSituation">Situación actual del marketing</label>
          <textarea id="currentSituation" class="form-control" placeholder="Describe brevemente tu situación actual de marketing...">${strategyData.companyInfo.currentSituation}</textarea>
        </div>
      `;
    case 2:
      return `
        <h2>Define tu Audiencia Objetivo</h2>
        <div class="form-group">
          <label for="demographics">Demografía</label>
          <input id="demographics" type="text" class="form-control" value="${strategyData.targetAudience.demographics}" placeholder="Ej: 25-45 años, profesionales, ingresos medios-altos">
        </div>
        <div class="form-group">
          <label for="interests">Intereses y comportamientos</label>
          <textarea id="interests" class="form-control" placeholder="¿Qué les interesa? ¿Cómo se comportan?">${strategyData.targetAudience.interests}</textarea>
        </div>
        <div class="form-group">
          <label for="painPoints">Problemas o necesidades (Pain Points)</label>
          <textarea id="painPoints" class="form-control" placeholder="¿Qué problemas resuelve tu producto/servicio?">${strategyData.targetAudience.painPoints}</textarea>
        </div>
        <div class="alert alert-info">
          <span>ℹ️</span>
          <div>
            <strong>Tip: Sé específico</strong><br>
            Mientras más específica sea tu audiencia, más efectiva será tu estrategia de marketing.
          </div>
        </div>
      `;
    case 3:
      return `
        <h2>Establece tus Objetivos de Marketing</h2>
        <p>Selecciona hasta 3 objetivos principales para tu estrategia</p>
        <div class="grid grid-2">
          ${objectives
            .map((objective) => `
              <div class="selectable-card ${strategyData.objectives.includes(objective) ? "selected" : ""}" data-objective="${objective}">
                <span>${objective}</span>
                ${strategyData.objectives.includes(objective) ? "✓" : ""}
              </div>
            `)
            .join("")}
        </div>
        ${
          strategyData.objectives.length === 3
            ? `
          <div class="alert alert-warning">
            Has seleccionado el máximo de 3 objetivos. Deselecciona uno para elegir otro diferente.
          </div>`
            : ""
        }
      `;
    case 4:
      return `
        <h2>Selecciona tus Canales de Marketing</h2>
        <p>Elige los canales más apropiados para alcanzar a tu audiencia</p>
        <div class="grid grid-3">
          ${marketingChannels
            .map((channel) => `
              <div class="selectable-card ${strategyData.channels.includes(channel.id) ? "selected" : ""}" data-channel="${channel.id}">
                <div class="channel-card">
                  <div class="channel-icon ${channel.className}">${channel.icon}</div>
                  <span>${channel.name}</span>
                </div>
                ${strategyData.channels.includes(channel.id) ? "✓" : ""}
              </div>
            `)
            .join("")}
        </div>
        <div class="alert alert-success">
          <strong>Recomendación:</strong> Comienza con 2-3 canales y domínalos antes de expandirte a más.
        </div>
      `;
    case 5:
      return buildBudgetStep();
    case 6:
      return buildTimelineStep();
    case 7:
      return buildPublicationCalendarStep();
    case 8:
      return buildKpiStep();
    case 9:
      return buildTrackingStep();
    case 10:
      return buildSummaryStep();
    default:
      return "";
  }
}

// Construye el contenido del paso de presupuesto.
function buildBudgetStep() {
  const budgetDistributionMarkup = strategyData.channels
    .map((channelId) => {
      const channel = marketingChannels.find((item) => item.id === channelId);
      const value = strategyData.budget.distribution[channelId] || 0;

      return `
        <div class="budget-slider">
          <div class="channel-label">
            <span class="channel-icon ${channel?.className ?? ""}" style="width: 30px; height: 30px; font-size: 16px;">${channel?.icon ?? ""}</span>
            <span>${channel?.name ?? ""}</span>
          </div>
          <input type="range" min="0" max="100" value="${value}" data-distribution="${channelId}">
          <span class="percentage">${value}%</span>
        </div>
      `;
    })
    .join("");

  const totalAssigned = Object.values(strategyData.budget.distribution).reduce((sum, value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return sum;
    }
    return sum + parsed;
  }, 0);

  return `
    <h2>Define tu Presupuesto de Marketing</h2>
    <div class="form-group">
      <label for="totalBudget">Presupuesto mensual total (en tu moneda local)</label>
      <input id="totalBudget" type="number" class="form-control" value="${strategyData.budget.total}" placeholder="Ej: 5000">
    </div>
    ${
      strategyData.channels.length > 0
        ? `
      <h3>Distribución por canal</h3>
      ${budgetDistributionMarkup}
      <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-top: 20px;">
        <strong>Total asignado: ${totalAssigned}%</strong>
      </div>`
        : `
      <div class="alert alert-info">
        <span>ℹ️</span>
        <div>
          Selecciona al menos un canal de marketing para distribuir tu presupuesto.
        </div>
      </div>`
    }
  `;
}

// Construye el contenido del paso de cronograma.
function buildTimelineStep() {
  const months = Math.min(Number.parseInt(strategyData.timeline.duration, 10) || 3, 6);
  const activitiesMarkup = Array.from({ length: months }, (_, index) => {
    const value = strategyData.timeline.activities[index] || "";
    return `
      <div class="kpi-card">
        <label for="activity-${index}">Mes ${index + 1}</label>
        <input id="activity-${index}" type="text" class="form-control" value="${value}" placeholder="Ej: Lanzamiento de campaña en redes sociales">
      </div>
    `;
  }).join("");

  return `
    <h2>Planifica tu Cronograma</h2>
    <div class="form-group">
      <label for="durationSelect">Duración de la campaña (meses)</label>
      <select id="durationSelect" class="form-control">
        ${buildSelectOption("1", "1 mes", strategyData.timeline.duration)}
        ${buildSelectOption("3", "3 meses", strategyData.timeline.duration)}
        ${buildSelectOption("6", "6 meses", strategyData.timeline.duration)}
        ${buildSelectOption("12", "12 meses", strategyData.timeline.duration)}
      </select>
    </div>
    <h3>Actividades clave por mes</h3>
    ${activitiesMarkup}
  `;
}

// Construye el contenido del paso de calendario de publicaciones.
function buildPublicationCalendarStep() {
  const contentTypeMarkup = contentTypes
    .map((type) => `
      <label class="checkbox-group">
        <input type="checkbox" value="${type}" ${strategyData.publicationCalendar.contentTypes.includes(type) ? "checked" : ""}>
        <span>${type}</span>
      </label>
    `)
    .join("");

  const rowsMarkup = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    .map((day) => {
      const channelOptions = strategyData.channels
        .map((channelId) => {
          const channel = marketingChannels.find((item) => item.id === channelId);
          return `<option value="${channelId}">${channel?.name ?? ""}</option>`;
        })
        .join("");

      const contentOptions = strategyData.publicationCalendar.contentTypes
        .map((type) => `<option value="${type}">${type}</option>`)
        .join("");

      return `
        <tr>
          <td><strong>${day}</strong></td>
          <td>
            <select class="form-control" data-calendar="channel">
              <option value="">Seleccionar</option>
              ${channelOptions}
            </select>
          </td>
          <td>
            <select class="form-control" data-calendar="content">
              <option value="">Tipo</option>
              ${contentOptions}
            </select>
          </td>
          <td><input type="time" class="form-control"></td>
        </tr>
      `;
    })
    .join("");

  return `
    <h2>Calendario de Publicaciones</h2>
    <p>Planifica tu contenido semanal para mantener consistencia</p>
    <h3>Tipos de contenido a publicar</h3>
    <div class="grid grid-4">
      ${contentTypeMarkup}
    </div>
    <h3 style="margin-top: 30px;">Frecuencia de publicación semanal</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Día</th>
          <th>Canal</th>
          <th>Tipo de contenido</th>
          <th>Hora</th>
        </tr>
      </thead>
      <tbody>
        ${rowsMarkup}
      </tbody>
    </table>
    <div class="alert alert-info">
      <span>🕐</span>
      <div>
        <strong>Mejores horarios para publicar:</strong><br>
        • LinkedIn: Martes a Jueves, 9-10am<br>
        • Instagram: 11am-1pm y 7-9pm<br>
        • Facebook: 1-4pm<br>
        • Twitter/X: 9-10am y 7-9pm
      </div>
    </div>
  `;
}

// Construye el contenido del paso de KPIs.
function buildKpiStep() {
  return `
    <h2>Define tus KPIs (Indicadores Clave)</h2>
    <p>Selecciona las métricas que usarás para medir el éxito</p>
    <div class="grid grid-2">
      ${kpiOptions
        .map((kpi) => `
          <div class="selectable-card ${strategyData.kpis.includes(kpi) ? "selected" : ""}" data-kpi="${kpi}">
            <span>${kpi}</span>
            ${strategyData.kpis.includes(kpi) ? "✓" : ""}
          </div>
        `)
        .join("")}
    </div>
    <div class="alert alert-info">
      <strong>Tip:</strong> Elige KPIs que estén directamente relacionados con tus objetivos de negocio.
    </div>
  `;
}

// Construye el contenido del paso de seguimiento mensual.
function buildTrackingStep() {
  const duration = Number.parseInt(strategyData.timeline.duration, 10) || 3;
  const headers = Array.from({ length: duration }, (_, index) => `<th>Mes ${index + 1}</th>`).join("");
  const rows = strategyData.kpis
    .map((kpi) => {
      const inputs = Array.from({ length: duration }, () => `<td><input type="number" placeholder="0" style="width: 80px; text-align: center;"></td>`).join("");
      return `<tr><td><strong>${kpi}</strong></td>${inputs}<td style="text-align: center; color: #3b82f6; font-weight: 600;">-</td></tr>`;
    })
    .join("");

  const statusCards = [
    { color: "green", label: "Mejor rendimiento", icon: "📈" },
    { color: "yellow", label: "Necesita atención", icon: "⚠️" },
    { color: "blue", label: "En objetivo", icon: "✅" }
  ]
    .map((card) => `
      <div class="status-card ${card.color}">
        <div class="status-header">
          <span>${card.label}</span>
          <span>${card.icon}</span>
        </div>
        <select class="form-control">
          <option>Seleccionar KPI</option>
          ${strategyData.kpis.map((kpi) => `<option>${kpi}</option>`).join("")}
        </select>
      </div>
    `)
    .join("");

  return `
    <h2>Sistema de Tracking Mensual</h2>
    <p>Configura cómo medirás y registrarás tus resultados cada mes</p>
    <h3>Métricas a trackear mensualmente</h3>
    <div class="tracking-grid">
      ${strategyData.kpis
        .map((kpi) => `
          <div class="metric-card">
            <div class="metric-header">
              <span>${kpi}</span>
              <span>📊</span>
            </div>
            <input type="text" class="form-control" placeholder="Meta mensual" style="margin-bottom: 8px;">
            <select class="form-control">
              <option>Medición numérica</option>
              <option>Porcentaje</option>
              <option>Escala 1-10</option>
            </select>
          </div>
        `)
        .join("")}
    </div>
    ${
      strategyData.kpis.length > 0
        ? `
      <h3>Dashboard de Resultados Mensuales</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Métrica</th>
            ${headers}
            <th>Promedio</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>`
        : ""
    }
    <div class="status-cards">
      ${statusCards}
    </div>
  `;
}

// Construye el contenido del paso final con el resumen de la estrategia.
function buildSummaryStep() {
  const companyInfo = strategyData.companyInfo.name
    ? `
      <div class="summary-card">
        <h3>📊 Información de la Empresa</h3>
        <p><strong>Empresa:</strong> ${strategyData.companyInfo.name}</p>
        <p><strong>Industria:</strong> ${strategyData.companyInfo.industry}</p>
        <p><strong>Tamaño:</strong> ${strategyData.companyInfo.size} empleados</p>
      </div>`
    : "";

  const objectivesInfo = strategyData.objectives.length > 0
    ? `
      <div class="summary-card">
        <h3>🎯 Objetivos Principales</h3>
        ${strategyData.objectives.map((item) => `<p>✓ ${item}</p>`).join("")}
      </div>`
    : "";

  const channelsInfo = strategyData.channels.length > 0
    ? `
      <div class="summary-card">
        <h3>📢 Canales de Marketing</h3>
        ${strategyData.channels
          .map((channelId) => {
            const channel = marketingChannels.find((item) => item.id === channelId);
            return `<span class="tag tag-blue">${channel?.name ?? ""}</span>`;
          })
          .join("")}
      </div>`
    : "";

  const budgetInfo = strategyData.budget.total
    ? `
      <div class="summary-card">
        <h3>💰 Presupuesto</h3>
        <p style="font-size: 24px; color: #3b82f6; font-weight: bold;">$${strategyData.budget.total}/mes</p>
        <p>Durante ${strategyData.timeline.duration} meses</p>
      </div>`
    : "";

  return `
    <div style="text-align: center;">
      <div class="success-icon">✓</div>
      <h2 style="font-size: 28px; margin-bottom: 8px;">¡Tu Estrategia de Marketing está Lista!</h2>
      <p style="color: #6b7280;">Aquí está el resumen de tu plan estratégico</p>
    </div>
    <div class="summary-section">
      ${companyInfo}
      ${objectivesInfo}
      ${channelsInfo}
      ${budgetInfo}
    </div>
    <div class="alert alert-success" style="margin-top: 20px;">
      <div>
        <strong>✨ Tu estrategia está completa y lista para implementar</strong><br><br>
        Próximos pasos:<br>
        • Implementa tu calendario de publicaciones<br>
        • Registra tus métricas mensualmente en el dashboard<br>
        • Ajusta la estrategia basándote en los resultados<br>
        • Revisa y actualiza trimestralmente
      </div>
    </div>
  `;
}

// Adjunta los manejadores de eventos para cada paso renderizado.
function attachStepHandlers(stepIndex) {
  switch (stepIndex) {
    case 1:
      wireCompanyInfoStep();
      break;
    case 2:
      wireAudienceStep();
      break;
    case 3:
      wireObjectivesStep();
      break;
    case 4:
      wireChannelsStep();
      break;
    case 5:
      wireBudgetStep();
      break;
    case 6:
      wireTimelineStep();
      break;
    case 7:
      wirePublicationStep();
      break;
    case 8:
      wireKpiStep();
      break;
    default:
      break;
  }
}

// Agrega listeners para actualizar la información de la empresa.
function wireCompanyInfoStep() {
  const nameInput = document.querySelector("#companyName");
  const industrySelect = document.querySelector("#industry");
  const sizeSelect = document.querySelector("#size");
  const situationTextarea = document.querySelector("#currentSituation");

  if (nameInput) {
    nameInput.addEventListener("input", (event) => {
      updateData("companyInfo", "name", event.target.value);
    });
  }

  if (industrySelect) {
    industrySelect.addEventListener("change", (event) => {
      updateData("companyInfo", "industry", event.target.value);
    });
  }

  if (sizeSelect) {
    sizeSelect.addEventListener("change", (event) => {
      updateData("companyInfo", "size", event.target.value);
    });
  }

  if (situationTextarea) {
    situationTextarea.addEventListener("input", (event) => {
      updateData("companyInfo", "currentSituation", event.target.value);
    });
  }
}

// Agrega listeners para los campos de audiencia objetivo.
function wireAudienceStep() {
  const demographicsInput = document.querySelector("#demographics");
  const interestsTextarea = document.querySelector("#interests");
  const painPointsTextarea = document.querySelector("#painPoints");

  if (demographicsInput) {
    demographicsInput.addEventListener("input", (event) => {
      updateData("targetAudience", "demographics", event.target.value);
    });
  }

  if (interestsTextarea) {
    interestsTextarea.addEventListener("input", (event) => {
      updateData("targetAudience", "interests", event.target.value);
    });
  }

  if (painPointsTextarea) {
    painPointsTextarea.addEventListener("input", (event) => {
      updateData("targetAudience", "painPoints", event.target.value);
    });
  }
}

// Configura los listeners para seleccionar y deseleccionar objetivos.
function wireObjectivesStep() {
  const cards = document.querySelectorAll("[data-objective]");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const objective = card.getAttribute("data-objective");
      if (!objective) {
        return;
      }
      toggleObjective(objective);
    });
  });
}

// Configura los listeners para seleccionar canales de marketing.
function wireChannelsStep() {
  const cards = document.querySelectorAll("[data-channel]");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const channel = card.getAttribute("data-channel");
      if (!channel) {
        return;
      }
      toggleChannel(channel);
    });
  });
}

// Configura los listeners del paso de presupuesto.
function wireBudgetStep() {
  const totalInput = document.querySelector("#totalBudget");
  const sliders = document.querySelectorAll("[data-distribution]");

  if (totalInput) {
    totalInput.addEventListener("input", (event) => {
      updateData("budget", "total", event.target.value);
    });
  }

  sliders.forEach((slider) => {
    slider.addEventListener("input", (event) => {
      const channelId = slider.getAttribute("data-distribution");
      if (!channelId) {
        return;
      }
      updateBudgetDistribution(channelId, event.target.value);
    });
  });
}

// Configura los listeners del cronograma.
function wireTimelineStep() {
  const durationSelect = document.querySelector("#durationSelect");
  const activityInputs = document.querySelectorAll("[id^='activity-']");

  if (durationSelect) {
    durationSelect.addEventListener("change", (event) => {
      updateData("timeline", "duration", event.target.value);
      renderStepContent();
    });
  }

  activityInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number.parseInt(input.id.replace("activity-", ""), 10);
      if (Number.isNaN(index)) {
        return;
      }
      updateActivity(index, event.target.value);
    });
  });
}

// Configura los listeners del calendario de publicaciones.
function wirePublicationStep() {
  const checkboxes = document.querySelectorAll("[type='checkbox']");

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const { value, checked } = event.target;
      if (checked) {
        addContentType(value);
      } else {
        removeContentType(value);
      }
    });
  });
}

// Configura los listeners para la selección de KPIs.
function wireKpiStep() {
  const cards = document.querySelectorAll("[data-kpi]");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const kpi = card.getAttribute("data-kpi");
      if (!kpi) {
        return;
      }
      toggleKpi(kpi);
    });
  });
}

// Actualiza el estado de cualquier campo simple.
function updateData(section, field, value) {
  if (!strategyData[section]) {
    return;
  }

  strategyData[section][field] = value;
}

// Alterna la selección de un objetivo.
function toggleObjective(objective) {
  const index = strategyData.objectives.indexOf(objective);

  if (index > -1) {
    strategyData.objectives.splice(index, 1);
  } else if (strategyData.objectives.length < 3) {
    strategyData.objectives.push(objective);
  }

  renderStepContent();
}

// Alterna la selección de un canal.
function toggleChannel(channelId) {
  const index = strategyData.channels.indexOf(channelId);

  if (index > -1) {
    strategyData.channels.splice(index, 1);
  } else {
    strategyData.channels.push(channelId);
  }

  renderStepContent();
}

// Alterna la selección de un KPI.
function toggleKpi(kpi) {
  const index = strategyData.kpis.indexOf(kpi);

  if (index > -1) {
    strategyData.kpis.splice(index, 1);
  } else {
    strategyData.kpis.push(kpi);
  }

  renderStepContent();
}

// Agrega un tipo de contenido al calendario.
function addContentType(type) {
  if (!strategyData.publicationCalendar.contentTypes.includes(type)) {
    strategyData.publicationCalendar.contentTypes.push(type);
  }
}

// Elimina un tipo de contenido del calendario.
function removeContentType(type) {
  strategyData.publicationCalendar.contentTypes = strategyData.publicationCalendar.contentTypes.filter(
    (item) => item !== type
  );
}

// Actualiza la distribución del presupuesto por canal.
function updateBudgetDistribution(channelId, value) {
  strategyData.budget.distribution[channelId] = Number.parseInt(value, 10) || 0;
  renderStepContent();
}

// Almacena la descripción de la actividad para un mes dado.
function updateActivity(index, value) {
  if (!Array.isArray(strategyData.timeline.activities)) {
    strategyData.timeline.activities = [];
  }

  strategyData.timeline.activities[index] = value;
}

// Ajusta el estado de los botones de navegación.
function updateNavigationButtons() {
  if (previousButton) {
    previousButton.disabled = currentStep === 0;
  }

  if (nextButton) {
    nextButton.disabled = currentStep === steps.length - 1;
    nextButton.textContent = currentStep === steps.length - 1 ? "Completado" : "Siguiente →";
  }
}

// Construye una opción para un elemento select de forma reutilizable.
function buildSelectOption(value, label, current) {
  return `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`;
}

initializeModule();
