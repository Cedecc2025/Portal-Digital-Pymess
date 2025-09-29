// constants.js
// Define valores constantes reutilizables dentro del asistente de estrategias de marketing.

export const STEPS = [
  { id: "welcome", name: "Inicio", icon: "💡" },
  { id: "company", name: "Empresa", icon: "🏢" },
  { id: "audience", name: "Audiencia", icon: "👥" },
  { id: "buyerPersona", name: "Buyer Persona", icon: "🧠" },
  { id: "competitive", name: "Competencia", icon: "⚔️" },
  { id: "swot", name: "Matriz SWOT", icon: "🧭" },
  { id: "objectives", name: "Objetivos", icon: "🎯" },
  { id: "channels", name: "Canales", icon: "📢" },
  { id: "budget", name: "Presupuesto", icon: "💰" },
  { id: "tacticalPlan", name: "Plan Táctico", icon: "📋" },
  { id: "calendar", name: "Calendario", icon: "🗓️" },
  { id: "campaigns", name: "Campañas", icon: "🚀" },
  { id: "kpis", name: "KPIs", icon: "📊" },
  { id: "tracking", name: "Tracking", icon: "📈" },
  { id: "report", name: "Reporte", icon: "📄" }
];

export const OBJECTIVES = [
  "Aumentar reconocimiento de marca",
  "Generar más leads",
  "Incrementar ventas",
  "Mejorar retención de clientes",
  "Expandir a nuevos mercados",
  "Lanzar nuevo producto/servicio"
];

export const MARKETING_CHANNELS = [
  { id: "social", name: "Redes Sociales", icon: "💬", className: "icon-social" },
  { id: "email", name: "Email Marketing", icon: "✉️", className: "icon-email" },
  { id: "content", name: "Marketing de Contenidos", icon: "📝", className: "icon-content" },
  { id: "seo", name: "SEO", icon: "🌐", className: "icon-seo" },
  { id: "video", name: "Video Marketing", icon: "🎥", className: "icon-video" },
  { id: "paid", name: "Publicidad Pagada", icon: "💸", className: "icon-paid" }
];

export const KPI_OPTIONS = [
  "Tráfico web",
  "Tasa de conversión",
  "ROI de marketing",
  "Costo por adquisición (CAC)",
  "Valor de vida del cliente (CLV)",
  "Engagement en redes sociales",
  "Tasa de apertura de emails",
  "Posicionamiento SEO"
];

export const CONTENT_TYPES = [
  "Educativo",
  "Promocional",
  "Testimonios",
  "Behind the scenes",
  "Tips y consejos",
  "Noticias",
  "Entretenimiento",
  "Casos de éxito"
];

export const DAYS_OF_WEEK = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo"
];

export const LOCAL_STORAGE_KEY = "estrategiaMarketingState";

export const TABLE_NAMES = {
  strategies: "marketing_strategies",
  company: "marketing_company_profiles",
  audience: "marketing_audiences",
  objectives: "marketing_objectives",
  channels: "marketing_channels",
  budget: "marketing_budgets",
  timeline: "marketing_timeline_activities",
  calendar: "marketing_calendar_entries",
  kpis: "marketing_kpis",
  kpiResults: "marketing_kpi_results",
  competitors: "marketing_competitors",
  swot: "marketing_swot_entries",
  buyerPersona: "marketing_buyer_personas",
  campaigns: "marketing_campaigns",
  automations: "marketing_automations",
  versions: "marketing_version_logs"
};
