// campaigns.service.js
// Expone operaciones CRUD contra Supabase para gestionar campañas de marketing.

import { supabaseClient } from "../../../lib/supabaseClient.js";
import { getCurrentUser } from "../../../lib/authGuard.js";
import { CampaignStatusOptions } from "./campaigns.types.js";

// Decisión de persistencia: utilizamos la columna jsonb `details` en la tabla marketing_campaigns
// para guardar briefs, audiencias, assets y configuraciones extensas. Esta aproximación cubre la
// mayoría de planes (< ~2MB). Si el payload crece significativamente o requiere versionado granular,
// migra a una tabla marketing_campaign_details con FK y timestamps. Para assets pesados (imágenes,
// PDFs, videos) utilice Supabase Storage y guarde únicamente URLs o metadatos en details.assets[].

const TABLE_NAME = "marketing_campaigns";
const DEFAULT_PAGE_SIZE = 10;

function buildError(code, message, cause) {
  const error = { code, message };
  if (cause) {
    // eslint-disable-next-line no-console
    console.error(message, cause);
    error.cause = cause;
  }
  return error;
}

function ensureAuthenticated() {
  const user = getCurrentUser();
  if (!user || !user.userId) {
    throw buildError("AUTH", "Debes iniciar sesión para gestionar campañas.");
  }
  return user.userId;
}

function sanitizeStrategyId(strategyId) {
  const parsed = Number(strategyId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw buildError("VALIDATION", "El identificador de estrategia es inválido.");
  }
  return parsed;
}

function sanitizeStatus(status) {
  if (!status || typeof status !== "string") {
    return CampaignStatusOptions[0];
  }
  const normalized = status.trim();
  if (CampaignStatusOptions.includes(normalized)) {
    return normalized;
  }
  return CampaignStatusOptions[0];
}

function sanitizeDetails(details) {
  if (!details || typeof details !== "object") {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(details));
  } catch (error) {
    throw buildError("VALIDATION", "Los detalles de la campaña contienen datos no serializables.", error);
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    strategy_id: row.strategy_id,
    campaign_name: row.campaign_name ?? "",
    channel: row.channel ?? "",
    budget: row.budget ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    goal: row.goal ?? null,
    status: row.status ?? CampaignStatusOptions[0],
    details: typeof row.details === "object" && row.details !== null ? row.details : {}
  };
}

function normalizeInput(input) {
  if (!input || typeof input !== "object") {
    throw buildError("VALIDATION", "Los datos de la campaña son obligatorios.");
  }

  const normalized = {
    strategy_id: sanitizeStrategyId(input.strategy_id),
    campaign_name: typeof input.campaign_name === "string" ? input.campaign_name.trim() : "",
    channel: typeof input.channel === "string" ? input.channel.trim() : "",
    budget: input.budget !== undefined && input.budget !== null && input.budget !== ""
      ? Number(input.budget)
      : null,
    start_date: input.start_date ? String(input.start_date) : null,
    end_date: input.end_date ? String(input.end_date) : null,
    goal: typeof input.goal === "string" && input.goal.trim().length > 0 ? input.goal.trim() : null,
    status: sanitizeStatus(input.status),
    details: sanitizeDetails(input.details ?? {})
  };

  if (normalized.campaign_name.length === 0) {
    throw buildError("VALIDATION", "El nombre de la campaña es obligatorio.");
  }
  if (normalized.channel.length === 0) {
    throw buildError("VALIDATION", "Debes indicar el canal principal de la campaña.");
  }
  if (normalized.budget !== null && Number.isNaN(normalized.budget)) {
    throw buildError("VALIDATION", "El presupuesto debe ser un número válido.");
  }
  return normalized;
}

/**
 * Lista campañas por strategy_id (paginación opcional).
 * @param {number} strategyId Identificador de la estrategia.
 * @param {{page?:number, pageSize?:number}} opts Opciones de paginación.
 * @returns {Promise<{items: import('./campaigns.types.js').Campaign[], total: number}>}
 */
export async function listarCampanas(strategyId, opts = {}) {
  ensureAuthenticated();
  const validStrategyId = sanitizeStrategyId(strategyId);
  const page = Number.isInteger(opts.page) && opts.page > 0 ? opts.page : 1;
  const pageSize = Number.isInteger(opts.pageSize) && opts.pageSize > 0 ? opts.pageSize : DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseClient
    .from(TABLE_NAME)
    .select("*", { count: "exact" })
    .eq("strategy_id", validStrategyId)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw buildError("SUPABASE", "No se pudieron cargar las campañas.", error);
  }

  const items = (data ?? []).map(mapRow).filter(Boolean);
  return { items, total: typeof count === "number" ? count : items.length };
}

/**
 * Crea una campaña nueva asociada a la estrategia indicada.
 * @param {import('./campaigns.types.js').CampaignInput} input Datos de la campaña.
 * @returns {Promise<import('./campaigns.types.js').Campaign>}
 */
export async function crearCampana(input) {
  ensureAuthenticated();
  const normalized = normalizeInput(input);

  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .insert({
      strategy_id: normalized.strategy_id,
      campaign_name: normalized.campaign_name,
      channel: normalized.channel,
      budget: normalized.budget,
      start_date: normalized.start_date,
      end_date: normalized.end_date,
      goal: normalized.goal,
      status: normalized.status,
      details: normalized.details
    })
    .select()
    .single();

  if (error) {
    throw buildError("SUPABASE", "No se pudo crear la campaña.", error);
  }

  return mapRow(data);
}

/**
 * Actualiza una campaña existente.
 * @param {number} id Identificador de la campaña.
 * @param {import('./campaigns.types.js').CampaignInput} patch Cambios a aplicar.
 * @returns {Promise<import('./campaigns.types.js').Campaign>}
 */
export async function actualizarCampana(id, patch) {
  ensureAuthenticated();
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw buildError("VALIDATION", "El identificador de la campaña es inválido.");
  }

  const normalized = normalizeInput(patch);

  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .update({
      campaign_name: normalized.campaign_name,
      channel: normalized.channel,
      budget: normalized.budget,
      start_date: normalized.start_date,
      end_date: normalized.end_date,
      goal: normalized.goal,
      status: normalized.status,
      details: normalized.details
    })
    .eq("id", campaignId)
    .eq("strategy_id", normalized.strategy_id)
    .select()
    .single();

  if (error) {
    throw buildError("SUPABASE", "No se pudo actualizar la campaña.", error);
  }

  return mapRow(data);
}

/**
 * Elimina una campaña según su identificador.
 * @param {number} id Identificador de la campaña.
 * @param {number} strategyId Estrategia propietaria.
 * @returns {Promise<void>}
 */
export async function eliminarCampana(id, strategyId) {
  ensureAuthenticated();
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw buildError("VALIDATION", "El identificador de la campaña es inválido.");
  }
  const validStrategyId = sanitizeStrategyId(strategyId);

  const { error } = await supabaseClient
    .from(TABLE_NAME)
    .delete()
    .eq("id", campaignId)
    .eq("strategy_id", validStrategyId);

  if (error) {
    throw buildError("SUPABASE", "No se pudo eliminar la campaña.", error);
  }
}

