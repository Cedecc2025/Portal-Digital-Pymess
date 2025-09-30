// campaigns.types.js
// Define estructuras de datos y ayudas de tipado para la gestión de campañas.

/**
 * @typedef {Object} CampaignDetails
 * @property {string} [brief] Resumen de la campaña y lineamientos generales.
 * @property {Array<string>} [audiences] Segmentos o audiencias objetivo descritas.
 * @property {Array<{name:string,url:string}>} [assets] Lista de assets referenciados (guardar solo URLs públicas).
 * @property {Array<Object>} [messages] Variantes de mensajes o copies sugeridos.
 * @property {Array<Object>} [budgetBreakdown] División de presupuesto específica por canal o pieza.
 * @property {Record<string, any>} [extra] Campo flexible para información adicional.
 */

/**
 * @typedef {Object} Campaign
 * @property {number} id Identificador único de la campaña.
 * @property {number} strategy_id Identificador de la estrategia a la que pertenece.
 * @property {string} campaign_name Nombre de la campaña.
 * @property {string} channel Canal principal asociado.
 * @property {number|null} budget Presupuesto estimado.
 * @property {string|null} start_date Fecha de inicio en formato ISO (YYYY-MM-DD).
 * @property {string|null} end_date Fecha de fin en formato ISO (YYYY-MM-DD).
 * @property {string|null} goal Objetivo principal de la campaña.
 * @property {string|null} status Estado actual (Planificada, En ejecución, etc.).
 * @property {CampaignDetails} details Información extendida serializada en JSONB.
 */

/**
 * @typedef {Object} CampaignInput
 * @property {number} strategy_id Identificador de la estrategia relacionada.
 * @property {string} campaign_name Nombre de la campaña.
 * @property {string} channel Canal principal.
 * @property {number} [budget] Presupuesto estimado.
 * @property {string} [start_date] Fecha de inicio (YYYY-MM-DD).
 * @property {string} [end_date] Fecha de finalización (YYYY-MM-DD).
 * @property {string} [goal] Objetivo descriptivo.
 * @property {string} [status] Estado actual de la campaña.
 * @property {CampaignDetails} [details] Información extendida opcional.
 */

/**
 * @typedef {Object} CampaignPage
 * @property {Array<Campaign>} items Colección de campañas retornadas para la página actual.
 * @property {number} total Conteo total de campañas registradas.
 */

export const CampaignStatusOptions = [
  "Planificada",
  "En ejecución",
  "Pausada",
  "Finalizada"
];

