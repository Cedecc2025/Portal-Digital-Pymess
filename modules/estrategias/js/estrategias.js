import { requireAuth } from "../../lib/authGuard.js";

/**
 * Rutas y constantes principales del asistente de estrategias.
 */
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

const MAX_OBJECTIVES = 3;

const strategyState = {
  currentStep: 0,
  data: {
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
  }
};

let progressStepsElement = null;
let stepCountElement = null;
let stepNameElement = null;
let contentAreaElement = null;
let prevButton = null;
let nextButton = null;

/**
 * Inicializa el módulo verificando autenticación y conectando eventos.
 */
function initializeModule() {
  progressStepsElement = document.getElementById("progressSteps");
  stepCountElement = document.getElementById("stepCount");
  stepNameElement = document.getElementById("stepName");
  contentAreaElement = document.getElementById("contentArea");
  prevButton = document.getElementById("prevBtn");
  nextButton = document.getElementById("nextBtn");

  if (!progressStepsElement || !stepCountElement || !stepNameElement || !contentAreaElement) {
    console.error("No se encontraron los elementos base del asistente.");
    return;
  }

  if (prevButton) {
    prevButton.addEventListener("click", handlePreviousStep);
  }

  if (nextButton) {
    nextButton.addEventListener("click", handleNextStep);
  }

  renderProgress();
  renderContent();
  updateNavigation();
}

/**
 * Genera dinámicamente la barra de progreso y el estado de paso.
 */
function renderProgress() {
  if (!progressStepsElement || !stepCountElement || !stepNameElement) {
    return;
  }

  progressStepsElement.innerHTML = "";

  steps.forEach((step, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "step";

    if (index < strategyState.currentStep) {
      wrapper.classList.add("completed");
    } else if (index === strategyState.currentStep) {
      wrapper.classList.add("active");
    }

    const circle = document.createElement("div");
    circle.className = "step-circle";
    circle.textContent = step.icon;
    wrapper.appendChild(circle);

    if (index < steps.length - 1) {
      const line = document.createElement("div");
      line.className = "step-line";
      wrapper.appendChild(line);
    }

    progressStepsElement.appendChild(wrapper);
  });

  stepCountElement.textContent = `Paso ${strategyState.currentStep + 1} de ${steps.length}`;
  stepNameElement.textContent = steps[strategyState.currentStep].name;
}

/**
 * Renderiza el contenido de la vista actual y aplica los controladores necesarios.
 */
function renderContent() {
  if (!contentAreaElement) {
    return;
  }

  contentAreaElement.innerHTML = createStepMarkup(strategyState.currentStep);
  bindCurrentStepHandlers(strategyState.currentStep);
  updateNavigation();
  renderProgress();
}

/**
 * Crea el marcado HTML del paso solicitado.
 * @param {number} stepIndex Paso que se debe dibujar.
 * @returns {string} HTML correspondiente.
 */
function createStepMarkup(stepIndex) {
  const data = strategyState.data;

  switch (stepIndex) {
    case 0: {
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
    }
    case 1: {
      return `
        <h2>Información de tu Empresa</h2>
        <div class="form-group">
          <label for="companyName">Nombre de la empresa</label>
          <input type="text" class="form-control" id="companyName" value="${escapeHtml(data.companyInfo.name)}" placeholder="Tu empresa S.A." />
        </div>
        <div class="form-group">
          <label for="industry">Industria</label>
          <select class="form-control" id="industry">
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
          <select class="form-control" id="size">
            <option value="">Selecciona el tamaño</option>
            <option value="1-10">1-10 empleados</option>
            <option value="11-50">11-50 empleados</option>
            <option value="51-200">51-200 empleados</option>
            <option value="200+">200+ empleados</option>
          </select>
        </div>
        <div class="form-group">
          <label for="currentSituation">Situación actual del marketing</label>
          <textarea class="form-control" id="currentSituation" placeholder="Describe brevemente tu situación actual de marketing...">${escapeHtml(data.companyInfo.currentSituation)}</textarea>
        </div>
      `;
    }
    case 2: {
      return `
        <h2>Define tu Audiencia Objetivo</h2>
        <div class="form-group">
          <label for="demographics">Demografía</label>
          <input type="text" class="form-control" id="demographics" value="${escapeHtml(data.targetAudience.demographics)}" placeholder="Ej: 25-45 años, profesionales, ingresos medios-altos" />
        </div>
        <div class="form-group">
          <label for="interests">Intereses y comportamientos</label>
          <textarea class="form-control" id="interests" placeholder="¿Qué les interesa? ¿Cómo se comportan?">${escapeHtml(data.targetAudience.interests)}</textarea>
        </div>
        <div class="form-group">
          <label for="painPoints">Problemas o necesidades (Pain Points)</label>
          <textarea class="form-control" id="painPoints" placeholder="¿Qué problemas resuelve tu producto/servicio?">${escapeHtml(data.targetAudience.painPoints)}</textarea>
        </div>
        <div class="alert alert-info">
          <span>ℹ️</span>
          <div>
            <strong>Tip: Sé específico</strong><br />
            Mientras más específica sea tu audiencia, más efectiva será tu estrategia de marketing.
          </div>
        </div>
      `;
    }
    case 3: {
      const cards = objectives
        .map((objective) => {
          const selected = data.objectives.includes(objective);
          return `
            <div class="selectable-card ${selected ? "selected" : ""}" data-action="toggle-objective" data-value="${escapeHtml(objective)}">
              <span>${escapeHtml(objective)}</span>
              ${selected ? "✓" : ""}
            </div>
          `;
        })
        .join("");

      const warning = data.objectives.length === MAX_OBJECTIVES
        ? `
            <div class="alert alert-warning">
              Has seleccionado el máximo de ${MAX_OBJECTIVES} objetivos. Deselecciona uno para elegir otro diferente.
            </div>
          `
        : "";

      return `
        <h2>Establece tus Objetivos de Marketing</h2>
        <p>Selecciona hasta ${MAX_OBJECTIVES} objetivos principales para tu estrategia</p>
        <div class="grid grid-2">
          ${cards}
        </div>
        ${warning}
      `;
    }
    case 4: {
      const cards = marketingChannels
        .map((channel) => {
          const selected = data.channels.includes(channel.id);
          return `
            <div class="selectable-card ${selected ? "selected" : ""}" data-action="toggle-channel" data-value="${channel.id}">
              <div class="channel-card">
                <div class="channel-icon ${channel.className}">${channel.icon}</div>
                <span>${channel.name}</span>
              </div>
              ${selected ? "✓" : ""}
            </div>
          `;
        })
        .join("");

      return `
        <h2>Selecciona tus Canales de Marketing</h2>
        <p>Elige los canales más apropiados para alcanzar a tu audiencia</p>
        <div class="grid grid-3">
          ${cards}
        </div>
        <div class="alert alert-success">
          <strong>Recomendación:</strong> Comienza con 2-3 canales y domínalos antes de expandirte a más.
        </div>
      `;
    }
    case 5: {
      let distributionMarkup = "";

      if (data.budget.total && data.channels.length > 0) {
        const sliders = data.channels
          .map((channelId) => {
            const channel = marketingChannels.find((item) => item.id === channelId);
            if (!channel) {
              return "";
            }

            const value = data.budget.distribution[channelId] ?? 0;
            return `
              <div class="budget-slider" data-channel="${channelId}">
                <div class="channel-label">
                  <span class="channel-icon ${channel.className}" style="width: 30px; height: 30px; font-size: 16px;">${channel.icon}</span>
                  <span>${channel.name}</span>
                </div>
                <input type="range" min="0" max="100" value="${value}" data-role="distribution-slider" />
                <span class="percentage">${value}%</span>
              </div>
            `;
          })
          .join("");

        const total = Object.values(data.budget.distribution).reduce((acc, item) => acc + Number(item || 0), 0);

        distributionMarkup = `
          <h3>Distribución por canal</h3>
          ${sliders}
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-top: 20px;">
            <strong>Total asignado: ${total}%</strong>
          </div>
        `;
      }

      return `
        <h2>Define tu Presupuesto de Marketing</h2>
        <div class="form-group">
          <label for="budgetTotal">Presupuesto mensual total (en tu moneda local)</label>
          <input type="number" class="form-control" id="budgetTotal" value="${escapeHtml(String(data.budget.total))}" placeholder="Ej: 5000" />
        </div>
        ${distributionMarkup}
      `;
    }
    case 6: {
      const months = Math.min(Number(data.timeline.duration || "0"), 6) || 0;
      const activities = Array.from({ length: months }).map((_, index) => {
        const value = data.timeline.activities[index] ?? "";
        return `
          <div class="kpi-card">
            <label for="activity-${index}">Mes ${index + 1}</label>
            <input type="text" class="form-control" id="activity-${index}" value="${escapeHtml(value)}" placeholder="Ej: Lanzamiento de campaña en redes sociales" />
          </div>
        `;
      });

      return `
        <h2>Planifica tu Cronograma</h2>
        <div class="form-group">
          <label for="timelineDuration">Duración de la campaña (meses)</label>
          <select class="form-control" id="timelineDuration">
            <option value="1">1 mes</option>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </select>
        </div>
        <h3>Actividades clave por mes</h3>
        ${activities.join("")}
      `;
    }
    case 7: {
      const typeMarkup = contentTypes
        .map((type) => {
          const checked = data.publicationCalendar.contentTypes.includes(type);
          return `
            <label class="checkbox-group">
              <input type="checkbox" data-action="toggle-content-type" data-value="${escapeHtml(type)}" ${checked ? "checked" : ""} />
              <span>${escapeHtml(type)}</span>
            </label>
          `;
        })
        .join("");

      const rows = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        .map((day) => {
          const channelOptions = data.channels
            .map((channelId) => {
              const channel = marketingChannels.find((item) => item.id === channelId);
              return channel ? `<option value="${channel.id}">${channel.name}</option>` : "";
            })
            .join("");

          const contentOptions = data.publicationCalendar.contentTypes
            .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
            .join("");

          return `
            <tr>
              <td><strong>${day}</strong></td>
              <td>
                <select class="form-control">
                  <option value="">Seleccionar</option>
                  ${channelOptions}
                </select>
              </td>
              <td>
                <select class="form-control">
                  <option value="">Tipo</option>
                  ${contentOptions}
                </select>
              </td>
              <td><input type="time" class="form-control" /></td>
            </tr>
          `;
        })
        .join("");

      return `
        <h2>Calendario de Publicaciones</h2>
        <p>Planifica tu contenido semanal para mantener consistencia</p>
        <h3>Tipos de contenido a publicar</h3>
        <div class="grid grid-4">
          ${typeMarkup}
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
            ${rows}
          </tbody>
        </table>
        <div class="alert alert-info">
          <span>🕐</span>
          <div>
            <strong>Mejores horarios para publicar:</strong><br />
            • LinkedIn: Martes a Jueves, 9-10am<br />
            • Instagram: 11am-1pm y 7-9pm<br />
            • Facebook: 1-4pm<br />
            • Twitter/X: 9-10am y 7-9pm
          </div>
        </div>
      `;
    }
    case 8: {
      const cards = kpiOptions
        .map((kpi) => {
          const selected = data.kpis.includes(kpi);
          return `
            <div class="selectable-card ${selected ? "selected" : ""}" data-action="toggle-kpi" data-value="${escapeHtml(kpi)}">
              <span>${escapeHtml(kpi)}</span>
              ${selected ? "✓" : ""}
            </div>
          `;
        })
        .join("");

      return `
        <h2>Define tus KPIs (Indicadores Clave)</h2>
        <p>Selecciona las métricas que usarás para medir el éxito</p>
        <div class="grid grid-2">
          ${cards}
        </div>
        <div class="alert alert-info">
          <strong>Tip:</strong> Elige KPIs que estén directamente relacionados con tus objetivos de negocio.
        </div>
      `;
    }
    case 9: {
      const metrics = strategyState.data.kpis
        .map((kpi) => {
          return `
            <div class="metric-card">
              <div class="metric-header">
                <span>${escapeHtml(kpi)}</span>
                <span>📊</span>
              </div>
              <input type="text" class="form-control" placeholder="Meta mensual" style="margin-bottom: 8px;" />
              <select class="form-control">
                <option>Medición numérica</option>
                <option>Porcentaje</option>
                <option>Escala 1-10</option>
              </select>
            </div>
          `;
        })
        .join("");

      const monthCount = Number.parseInt(strategyState.data.timeline.duration || "3", 10) || 0;
      const headers = Array.from({ length: monthCount })
        .map((_, index) => `<th>Mes ${index + 1}</th>`)
        .join("");

      const rows = strategyState.data.kpis
        .map((kpi) => {
          const inputs = Array.from({ length: monthCount })
            .map(() => '<td><input type="number" placeholder="0" style="width: 80px; text-align: center;" /></td>')
            .join("");

          return `<tr><td><strong>${escapeHtml(kpi)}</strong></td>${inputs}<td style="text-align: center; color: #3b82f6; font-weight: 600;">-</td></tr>`;
        })
        .join("");

      const statusOptions = strategyState.data.kpis
        .map((kpi) => `<option>${escapeHtml(kpi)}</option>`)
        .join("");

      return `
        <h2>Sistema de Tracking Mensual</h2>
        <p>Configura cómo medirás y registrarás tus resultados cada mes</p>
        <h3>Métricas a trackear mensualmente</h3>
        <div class="tracking-grid">
          ${metrics}
        </div>
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
        </table>
        <div class="status-cards">
          <div class="status-card green">
            <div class="status-header">
              <span style="color: #166534;">Mejor rendimiento</span>
              <span>📈</span>
            </div>
            <select class="form-control">
              <option>Seleccionar KPI</option>
              ${statusOptions}
            </select>
          </div>
          <div class="status-card yellow">
            <div class="status-header">
              <span style="color: #854d0e;">Necesita atención</span>
              <span>⚠️</span>
            </div>
            <select class="form-control">
              <option>Seleccionar KPI</option>
              ${statusOptions}
            </select>
          </div>
          <div class="status-card blue">
            <div class="status-header">
              <span style="color: #1e40af;">En objetivo</span>
              <span>✅</span>
            </div>
            <select class="form-control">
              <option>Seleccionar KPI</option>
              ${statusOptions}
            </select>
          </div>
        </div>
      `;
    }
    case 10: {
      const companyInfo = strategyState.data.companyInfo;
      const summarySections = [];

      if (companyInfo.name) {
        summarySections.push(`
          <div class="summary-card">
            <h3>📊 Información de la Empresa</h3>
            <p><strong>Empresa:</strong> ${escapeHtml(companyInfo.name)}</p>
            <p><strong>Industria:</strong> ${escapeHtml(companyInfo.industry)}</p>
            <p><strong>Tamaño:</strong> ${escapeHtml(companyInfo.size)} empleados</p>
          </div>
        `);
      }

      if (strategyState.data.objectives.length > 0) {
        summarySections.push(`
          <div class="summary-card">
            <h3>🎯 Objetivos Principales</h3>
            ${strategyState.data.objectives.map((objective) => `<p>✓ ${escapeHtml(objective)}</p>`).join("")}
          </div>
        `);
      }

      if (strategyState.data.channels.length > 0) {
        const tags = strategyState.data.channels
          .map((channelId) => {
            const channel = marketingChannels.find((item) => item.id === channelId);
            return channel ? `<span class="tag tag-blue">${channel.name}</span>` : "";
          })
          .join("");

        summarySections.push(`
          <div class="summary-card">
            <h3>📢 Canales de Marketing</h3>
            ${tags}
          </div>
        `);
      }

      if (strategyState.data.budget.total) {
        summarySections.push(`
          <div class="summary-card">
            <h3>💰 Presupuesto</h3>
            <p style="font-size: 24px; color: #3b82f6; font-weight: bold;">$${escapeHtml(String(strategyState.data.budget.total))}/mes</p>
            <p>Durante ${escapeHtml(strategyState.data.timeline.duration)} meses</p>
          </div>
        `);
      }

      return `
        <div style="text-align: center;">
          <div class="success-icon">✓</div>
          <h2 style="font-size: 28px; margin-bottom: 8px;">¡Tu Estrategia de Marketing está Lista!</h2>
          <p style="color: #6b7280;">Aquí está el resumen de tu plan estratégico</p>
        </div>
        <div class="summary-section">
          ${summarySections.join("")}
        </div>
        <div class="alert alert-success" style="margin-top: 20px;">
          <div>
            <strong>✨ Tu estrategia está completa y lista para implementar</strong><br /><br />
            Próximos pasos:<br />
            • Implementa tu calendario de publicaciones<br />
            • Registra tus métricas mensualmente en el dashboard<br />
            • Ajusta la estrategia basándote en los resultados<br />
            • Revisa y actualiza trimestralmente
          </div>
        </div>
      `;
    }
    default: {
      return "";
    }
  }
}

/**
 * Conecta los controladores de eventos del paso actual.
 * @param {number} stepIndex Paso que requiere los manejadores.
 */
function bindCurrentStepHandlers(stepIndex) {
  if (!contentAreaElement) {
    return;
  }

  switch (stepIndex) {
    case 1: {
      const companyName = contentAreaElement.querySelector("#companyName");
      const industry = contentAreaElement.querySelector("#industry");
      const size = contentAreaElement.querySelector("#size");
      const currentSituation = contentAreaElement.querySelector("#currentSituation");

      if (companyName) {
        companyName.addEventListener("input", (event) => {
          updateData("companyInfo", "name", event.target.value);
        });
      }

      if (industry) {
        industry.value = strategyState.data.companyInfo.industry;
        industry.addEventListener("change", (event) => {
          updateData("companyInfo", "industry", event.target.value);
        });
      }

      if (size) {
        size.value = strategyState.data.companyInfo.size;
        size.addEventListener("change", (event) => {
          updateData("companyInfo", "size", event.target.value);
        });
      }

      if (currentSituation) {
        currentSituation.addEventListener("input", (event) => {
          updateData("companyInfo", "currentSituation", event.target.value);
        });
      }

      break;
    }
    case 2: {
      const demographics = contentAreaElement.querySelector("#demographics");
      const interests = contentAreaElement.querySelector("#interests");
      const painPoints = contentAreaElement.querySelector("#painPoints");

      if (demographics) {
        demographics.addEventListener("input", (event) => {
          updateData("targetAudience", "demographics", event.target.value);
        });
      }

      if (interests) {
        interests.addEventListener("input", (event) => {
          updateData("targetAudience", "interests", event.target.value);
        });
      }

      if (painPoints) {
        painPoints.addEventListener("input", (event) => {
          updateData("targetAudience", "painPoints", event.target.value);
        });
      }

      break;
    }
    case 3: {
      const buttons = contentAreaElement.querySelectorAll("[data-action='toggle-objective']");
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          toggleObjective(button.dataset.value || "");
        });
      });
      break;
    }
    case 4: {
      const buttons = contentAreaElement.querySelectorAll("[data-action='toggle-channel']");
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          toggleChannel(button.dataset.value || "");
        });
      });
      break;
    }
    case 5: {
      const totalInput = contentAreaElement.querySelector("#budgetTotal");
      if (totalInput) {
        totalInput.addEventListener("input", (event) => {
          updateData("budget", "total", event.target.value);
        });
      }

      const sliders = contentAreaElement.querySelectorAll("[data-role='distribution-slider']");
      sliders.forEach((slider) => {
        slider.addEventListener("change", (event) => {
          const channelId = slider.parentElement?.getAttribute("data-channel") || "";
          const value = Number(event.target.value || 0);
          updateBudgetDistribution(channelId, value);
        });
      });
      break;
    }
    case 6: {
      const durationSelect = contentAreaElement.querySelector("#timelineDuration");
      if (durationSelect) {
        durationSelect.value = strategyState.data.timeline.duration;
        durationSelect.addEventListener("change", (event) => {
          updateData("timeline", "duration", event.target.value);
          ensureActivitiesLength();
          renderContent();
        });
      }

      strategyState.data.timeline.activities.forEach((value, index) => {
        const input = contentAreaElement.querySelector(`#activity-${index}`);
        if (input) {
          input.addEventListener("input", (event) => {
            updateActivity(index, event.target.value);
          });
        }
      });
      break;
    }
    case 7: {
      const checkboxes = contentAreaElement.querySelectorAll("[data-action='toggle-content-type']");
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          toggleContentType(checkbox.dataset.value || "", checkbox.checked);
        });
      });
      break;
    }
    case 8: {
      const buttons = contentAreaElement.querySelectorAll("[data-action='toggle-kpi']");
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          toggleKpi(button.dataset.value || "");
        });
      });
      break;
    }
    default:
      break;
  }
}

/**
 * Actualiza el estado y persiste un campo dentro de una sección.
 * @param {keyof typeof strategyState.data} section Sección a modificar.
 * @param {string} field Campo objetivo dentro de la sección.
 * @param {string} value Valor capturado desde la UI.
 */
function updateData(section, field, value) {
  const target = strategyState.data[section];
  if (!target) {
    return;
  }

  if (typeof target === "object" && !Array.isArray(target)) {
    target[field] = value;
  }
}

/**
 * Alterna la selección de un objetivo respetando el máximo permitido.
 * @param {string} objective Objetivo que se desea modificar.
 */
function toggleObjective(objective) {
  if (!objective) {
    return;
  }

  const index = strategyState.data.objectives.indexOf(objective);
  if (index >= 0) {
    strategyState.data.objectives.splice(index, 1);
  } else if (strategyState.data.objectives.length < MAX_OBJECTIVES) {
    strategyState.data.objectives.push(objective);
  }

  renderContent();
}

/**
 * Alterna la selección de un canal de marketing.
 * @param {string} channelId Identificador del canal.
 */
function toggleChannel(channelId) {
  if (!channelId) {
    return;
  }

  const index = strategyState.data.channels.indexOf(channelId);
  if (index >= 0) {
    strategyState.data.channels.splice(index, 1);
  } else {
    strategyState.data.channels.push(channelId);
  }

  renderContent();
}

/**
 * Modifica el listado de KPIs seleccionados.
 * @param {string} kpi Indicador seleccionado.
 */
function toggleKpi(kpi) {
  if (!kpi) {
    return;
  }

  const index = strategyState.data.kpis.indexOf(kpi);
  if (index >= 0) {
    strategyState.data.kpis.splice(index, 1);
  } else {
    strategyState.data.kpis.push(kpi);
  }

  renderContent();
}

/**
 * Ajusta la distribución de presupuesto por canal.
 * @param {string} channelId Canal a modificar.
 * @param {number} value Valor porcentual asignado.
 */
function updateBudgetDistribution(channelId, value) {
  if (!channelId) {
    return;
  }

  strategyState.data.budget.distribution[channelId] = Number.isFinite(value) ? value : 0;
  renderContent();
}

/**
 * Persiste una actividad mensual del cronograma.
 * @param {number} index Índice del mes.
 * @param {string} value Descripción de la actividad.
 */
function updateActivity(index, value) {
  if (!Array.isArray(strategyState.data.timeline.activities)) {
    strategyState.data.timeline.activities = [];
  }

  strategyState.data.timeline.activities[index] = value;
}

/**
 * Administra la lista de tipos de contenido seleccionados.
 * @param {string} type Tipo de contenido.
 * @param {boolean} selected Indica si debe añadirse o removerse.
 */
function toggleContentType(type, selected) {
  if (!type) {
    return;
  }

  const current = strategyState.data.publicationCalendar.contentTypes;
  const index = current.indexOf(type);

  if (selected && index === -1) {
    current.push(type);
  } else if (!selected && index >= 0) {
    current.splice(index, 1);
  }

  renderContent();
}

/**
 * Garantiza que el arreglo de actividades tenga la longitud adecuada.
 */
function ensureActivitiesLength() {
  const duration = Number(strategyState.data.timeline.duration || "0");
  const limit = Math.min(duration, 6);
  const activities = strategyState.data.timeline.activities;

  if (!Array.isArray(activities)) {
    strategyState.data.timeline.activities = [];
    return;
  }

  if (activities.length > limit) {
    activities.splice(limit);
  } else {
    while (activities.length < limit) {
      activities.push("");
    }
  }
}

/**
 * Avanza un paso dentro del asistente.
 */
function handleNextStep() {
  if (strategyState.currentStep >= steps.length - 1) {
    return;
  }

  strategyState.currentStep += 1;
  renderContent();
}

/**
 * Retrocede un paso dentro del asistente.
 */
function handlePreviousStep() {
  if (strategyState.currentStep <= 0) {
    return;
  }

  strategyState.currentStep -= 1;
  renderContent();
}

/**
 * Ajusta el estado visual de la navegación inferior.
 */
function updateNavigation() {
  if (!prevButton || !nextButton) {
    return;
  }

  prevButton.disabled = strategyState.currentStep === 0;
  nextButton.disabled = strategyState.currentStep === steps.length - 1;
  nextButton.textContent = strategyState.currentStep === steps.length - 1 ? "Completado" : "Siguiente →";
}

/**
 * Escapa contenido para evitar inyección de HTML en plantillas.
 * @param {string} value Texto a sanear.
 * @returns {string} Versión segura del texto.
 */
function escapeHtml(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Ejecuta la autenticación y prepara el asistente al cargar la página.
 */
function bootstrap() {
  requireAuth();
  ensureActivitiesLength();
  initializeModule();
}

document.addEventListener("DOMContentLoaded", bootstrap);
