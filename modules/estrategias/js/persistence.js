// persistence.js
// Gestiona las operaciones de lectura y escritura con Supabase para la estrategia.

import { supabaseClient } from "../../../lib/supabaseClient.js";
import { getCurrentUser } from "../../../lib/authGuard.js";
import { TABLE_NAMES } from "./constants.js";
import { getState, mergeState, createInitialState } from "./stateManager.js";

// Normaliza valores de texto eliminando espacios o retornando null cuando sea necesario.
function toNullableText(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}

// Convierte un valor a número o null cuando no es válido.
function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Elimina entradas vacías de un arreglo de cadenas.
function sanitizeStringArray(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => toNullableText(item))
    .filter((item) => item !== null);
}

// Convierte el diccionario de presupuesto en números confiables.
function sanitizeDistribution(distribution) {
  if (!distribution || typeof distribution !== "object") {
    return {};
  }

  const entries = Object.entries(distribution).map(([channelId, value]) => {
    const numericValue = toNullableNumber(value);
    return [channelId, numericValue ?? 0];
  });

  return Object.fromEntries(entries);
}

// Normaliza las actividades del cronograma.
function sanitizeActivities(activities) {
  if (!Array.isArray(activities)) {
    return [];
  }

  return activities
    .map((activity) => ({
      description: toNullableText(activity?.description),
      responsible: toNullableText(activity?.responsible),
      dependencies: toNullableText(activity?.dependencies),
      cost: toNullableNumber(activity?.cost)
    }))
    .filter((activity) => activity.description || activity.responsible || activity.dependencies || activity.cost !== null);
}

// Normaliza las entradas del calendario editorial.
function sanitizeCalendar(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      day: toNullableText(entry?.day),
      channel: toNullableText(entry?.channel),
      contentType: toNullableText(entry?.contentType),
      time: toNullableText(entry?.time)
    }))
    .filter((entry) => entry.day && (entry.channel || entry.contentType || entry.time));
}

// Normaliza los KPI configurados por el usuario.
function sanitizeKpis(kpis) {
  if (!Array.isArray(kpis)) {
    return [];
  }

  return kpis
    .map((kpi) => ({
      name: toNullableText(kpi?.name),
      measurement: toNullableText(kpi?.measurement),
      target: toNullableNumber(kpi?.target)
    }))
    .filter((kpi) => kpi.name);
}

// Normaliza el seguimiento mensual de KPIs.
function sanitizeMonthlyTracking(months) {
  if (!Array.isArray(months)) {
    return [];
  }

  return months
    .map((month) => ({
      label: toNullableText(month?.label),
      metrics: Array.isArray(month?.metrics)
        ? month.metrics
            .map((metric) => ({
              kpi: toNullableText(metric?.kpi),
              target: toNullableNumber(metric?.target),
              actual: toNullableNumber(metric?.actual),
              variation: toNullableNumber(metric?.variation)
            }))
            .filter((metric) => metric.kpi && (metric.target !== null || metric.actual !== null || metric.variation !== null))
        : []
    }))
    .filter((month) => month.label && month.metrics.length > 0);
}

function sanitizeCampaignDetails(details) {
  if (!details || typeof details !== "object") {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(details));
  } catch (error) {
    console.error("Detalles de campaña no serializables", error);
    return {};
  }
}

// Normaliza la información de competidores.
function sanitizeCompetitors(competitors) {
  if (!Array.isArray(competitors)) {
    return [];
  }

  return competitors
    .map((competitor) => ({
      name: toNullableText(competitor?.name),
      value: toNullableText(competitor?.value),
      notes: toNullableText(competitor?.notes)
    }))
    .filter((competitor) => competitor.name);
}

// Convierte la matriz SWOT en registros listos para persistir.
function sanitizeSwot(swotState) {
  if (!swotState) {
    return [];
  }

  const buildEntries = (items, category) => sanitizeStringArray(items).map((description) => ({
    category: category,
    description: description
  }));

  return [
    ...buildEntries(swotState.strengths, "strength"),
    ...buildEntries(swotState.weaknesses, "weakness"),
    ...buildEntries(swotState.opportunities, "opportunity"),
    ...buildEntries(swotState.threats, "threat")
  ];
}

// Normaliza la información de los buyer persona.
function sanitizeArchetypes(archetypes) {
  if (!Array.isArray(archetypes)) {
    return [];
  }

  return archetypes
    .map((persona) => ({
      name: toNullableText(persona?.name),
      motivations: toNullableText(persona?.motivations),
      objections: toNullableText(persona?.objections),
      channels: sanitizeStringArray(persona?.channels)
    }))
    .filter((persona) => persona.name);
}

// Normaliza campañas activas para evitar registros incompletos.
function sanitizeCampaigns(campaigns) {
  if (!Array.isArray(campaigns)) {
    return [];
  }

  return campaigns
    .map((campaign) => {
      const planSummary = toNullableText(campaign?.details?.plan ?? campaign?.plan);
      const details = sanitizeCampaignDetails(campaign?.details);

      if (planSummary) {
        details.plan = planSummary;
      }

      return {
        name: toNullableText(campaign?.name),
        channel: toNullableText(campaign?.channel),
        budget: toNullableNumber(campaign?.budget),
        startDate: toNullableText(campaign?.startDate),
        endDate: toNullableText(campaign?.endDate),
        goal: toNullableText(campaign?.goal),
        status: toNullableText(campaign?.status),
        details
      };
    })
    .filter((campaign) =>
      Boolean(
        campaign.name ||
          campaign.channel ||
          campaign.goal ||
          campaign.status ||
          campaign.startDate ||
          campaign.endDate ||
          campaign.budget !== null ||
          (campaign.details && Object.keys(campaign.details).length > 0)
      )
    )
    .map((campaign) => ({
      ...campaign,
      status: campaign.status || "Planificada"
    }));
}

// Normaliza automatizaciones antes de enviarlas a la base de datos.
function sanitizeAutomations(automations) {
  if (!Array.isArray(automations)) {
    return [];
  }

  return automations
    .map((automation) => ({
      name: toNullableText(automation?.name),
      trigger: toNullableText(automation?.trigger),
      cadence: toNullableText(automation?.cadence),
      tool: toNullableText(automation?.tool)
    }))
    .filter((automation) => automation.name);
}

// Obtiene o crea un registro maestro en la tabla marketing_strategies.
async function ensureStrategyRecord(userId) {
  const state = getState();
  if (state.strategyId) {
    return state.strategyId;
  }

  const { data: existing, error: fetchError } = await supabaseClient
    .from(TABLE_NAMES.strategies)
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (fetchError) {
    throw fetchError;
  }

  if (existing && existing.length > 0) {
    const strategyId = existing[0].id;
    mergeState({ strategyId: strategyId });
    return strategyId;
  }

  const { data, error } = await supabaseClient
    .from(TABLE_NAMES.strategies)
    .insert({
      user_id: userId,
      status: state.versionLog.status ?? "En progreso",
      updated_at: new Date().toISOString(),
      strategy_name: state.companyInfo.name || "Estrategia sin título"
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  mergeState({ strategyId: data.id });
  return data.id;
}

// Limpia las filas previas de una tabla específica para una estrategia.
async function clearTableForStrategy(tableName, strategyId) {
  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .eq("strategy_id", strategyId);

  if (error) {
    throw error;
  }
}

// Crea filas masivas en una tabla asociadas a la estrategia.
async function bulkInsert(tableName, rows) {
  if (!rows || rows.length === 0) {
    return;
  }

  const { error } = await supabaseClient
    .from(tableName)
    .insert(rows);

  if (error) {
    throw error;
  }
}

// Guarda el estado completo en Supabase dividiendo por tablas.
export async function saveStrategyToSupabase() {
  const user = getCurrentUser();
  if (!user || !user.userId) {
    throw new Error("No se encontró un usuario autenticado para guardar la estrategia.");
  }

  const state = getState();
  const strategyId = await ensureStrategyRecord(user.userId);
  const nowIso = new Date().toISOString();

  const { error: strategyUpdateError } = await supabaseClient
    .from(TABLE_NAMES.strategies)
    .update({
      strategy_name: state.companyInfo.name || "Estrategia sin título",
      status: state.versionLog.status ?? "En progreso",
      updated_at: nowIso
    })
    .eq("id", strategyId);

  if (strategyUpdateError) {
    throw strategyUpdateError;
  }

  const sanitizedObjectives = sanitizeStringArray(state.objectives);
  const sanitizedChannels = [...new Set(sanitizeStringArray(state.channels))];
  const sanitizedDistribution = sanitizeDistribution(state.budget.distribution);
  const sanitizedActivities = sanitizeActivities(state.timeline.activities);
  const sanitizedCalendar = sanitizeCalendar(state.publicationCalendar.entries);
  const sanitizedKpis = sanitizeKpis(state.kpis);
  const sanitizedTracking = sanitizeMonthlyTracking(state.monthlyTracking.months);
  const sanitizedCompetitors = sanitizeCompetitors(state.competitiveAnalysis.competitors);
  const sanitizedSwot = sanitizeSwot(state.swot);
  const sanitizedArchetypes = sanitizeArchetypes(state.buyerPersona.archetypes);
  const sanitizedCampaigns = sanitizeCampaigns(state.campaigns.active);
  const sanitizedAutomations = sanitizeAutomations(state.campaigns.automations);

  const companyPayload = {
    strategy_id: strategyId,
    name: toNullableText(state.companyInfo.name),
    industry: toNullableText(state.companyInfo.industry),
    size: toNullableText(state.companyInfo.size),
    current_situation: toNullableText(state.companyInfo.currentSituation)
  };

  await supabaseClient
    .from(TABLE_NAMES.company)
    .upsert(companyPayload, { onConflict: "strategy_id" });

  const audiencePayload = {
    strategy_id: strategyId,
    demographics: toNullableText(state.targetAudience.demographics),
    interests: toNullableText(state.targetAudience.interests),
    pain_points: toNullableText(state.targetAudience.painPoints),
    motivations: toNullableText(state.buyerPersona.motivations),
    objections: toNullableText(state.buyerPersona.objections),
    preferred_channels: sanitizeStringArray(state.buyerPersona.preferredChannels),
    contact_email: toNullableText(state.buyerPersona.contactEmail)
  };
  await supabaseClient
    .from(TABLE_NAMES.audience)
    .upsert(audiencePayload, { onConflict: "strategy_id" });

  await clearTableForStrategy(TABLE_NAMES.objectives, strategyId);
  await bulkInsert(
    TABLE_NAMES.objectives,
    sanitizedObjectives.map((objective, index) => ({
      strategy_id: strategyId,
      objective_text: objective,
      priority_order: index + 1
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.channels, strategyId);
  await bulkInsert(
    TABLE_NAMES.channels,
    sanitizedChannels.map((channelId) => ({
      strategy_id: strategyId,
      channel_id: channelId,
      allocation: sanitizedDistribution[channelId] ?? 0
    }))
  );

  await supabaseClient
    .from(TABLE_NAMES.budget)
    .upsert(
      {
        strategy_id: strategyId,
        total_amount: toNullableNumber(state.budget.total),
        distribution_json: sanitizedDistribution
      },
      { onConflict: "strategy_id" }
    );

  await clearTableForStrategy(TABLE_NAMES.timeline, strategyId);
  await bulkInsert(
    TABLE_NAMES.timeline,
    sanitizedActivities.map((activity, index) => ({
      strategy_id: strategyId,
      month_index: index + 1,
      description: activity.description,
      responsible: activity.responsible,
      dependencies: activity.dependencies,
      cost_estimate: activity.cost
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.calendar, strategyId);
  await bulkInsert(
    TABLE_NAMES.calendar,
    sanitizedCalendar.map((entry) => ({
      strategy_id: strategyId,
      day_of_week: entry.day,
      channel_id: entry.channel,
      content_type: entry.contentType,
      publish_time: entry.time
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.kpis, strategyId);
  await bulkInsert(
    TABLE_NAMES.kpis,
    sanitizedKpis.map((kpi) => ({
      strategy_id: strategyId,
      kpi_name: kpi.name,
      measurement_type: kpi.measurement,
      monthly_target: kpi.target
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.kpiResults, strategyId);
  await bulkInsert(
    TABLE_NAMES.kpiResults,
    sanitizedTracking.flatMap((month) =>
      month.metrics.map((metric) => ({
        strategy_id: strategyId,
        month_label: month.label,
        kpi_name: metric.kpi,
        target_value: metric.target,
        actual_value: metric.actual,
        variation: metric.variation
      }))
    )
  );

  await clearTableForStrategy(TABLE_NAMES.competitors, strategyId);
  await bulkInsert(
    TABLE_NAMES.competitors,
    sanitizedCompetitors.map((competitor) => ({
      strategy_id: strategyId,
      competitor_name: competitor.name,
      value_proposition: competitor.value,
      notes: competitor.notes
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.swot, strategyId);
  await bulkInsert(
    TABLE_NAMES.swot,
    sanitizedSwot.map((entry) => ({
      strategy_id: strategyId,
      category: entry.category,
      description: entry.description
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.buyerPersona, strategyId);
  await bulkInsert(
    TABLE_NAMES.buyerPersona,
    sanitizedArchetypes.map((persona) => ({
      strategy_id: strategyId,
      persona_name: persona.name,
      motivations: persona.motivations,
      objections: persona.objections,
      preferred_channels: persona.channels
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.campaigns, strategyId);
  await bulkInsert(
    TABLE_NAMES.campaigns,
    sanitizedCampaigns.map((campaign) => ({
      strategy_id: strategyId,
      campaign_name: campaign.name,
      channel: campaign.channel,
      budget: campaign.budget,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      goal: campaign.goal,
      status: campaign.status,
      details: campaign.details ?? {}
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.automations, strategyId);
  await bulkInsert(
    TABLE_NAMES.automations,
    sanitizedAutomations.map((automation) => ({
      strategy_id: strategyId,
      automation_name: automation.name,
      trigger_event: automation.trigger,
      cadence: automation.cadence,
      tool: automation.tool
    }))
  );

  await supabaseClient
    .from(TABLE_NAMES.versions)
    .upsert(
      {
        strategy_id: strategyId,
        status: state.versionLog.status,
        updated_at: new Date().toISOString(),
        author: user.username
      },
      { onConflict: "strategy_id" }
    );
  mergeState({ lastSyncedAt: nowIso });
}

// Recupera toda la información almacenada en Supabase para reanudar el asistente.
export async function loadStrategyFromSupabase() {
  const user = getCurrentUser();
  if (!user || !user.userId) {
    return null;
  }

  const { data: strategies, error: strategyError } = await supabaseClient
    .from(TABLE_NAMES.strategies)
    .select("id, status, updated_at")
    .eq("user_id", user.userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (strategyError) {
    console.error("No se pudo cargar la estrategia principal", strategyError);
    return null;
  }

  const strategy = strategies?.[0];
  if (!strategy) {
    return null;
  }

  const strategyId = strategy.id;
  const [company, audience, objectives, channels, budget, timeline, calendar, kpis, kpiResults, competitors, swot, buyerPersona, campaigns, automations, versionLog] =
    await Promise.all([
      supabaseClient.from(TABLE_NAMES.company).select("*").eq("strategy_id", strategyId).maybeSingle(),
      supabaseClient.from(TABLE_NAMES.audience).select("*").eq("strategy_id", strategyId).maybeSingle(),
      supabaseClient.from(TABLE_NAMES.objectives).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.channels).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.budget).select("*").eq("strategy_id", strategyId).maybeSingle(),
      supabaseClient.from(TABLE_NAMES.timeline).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.calendar).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.kpis).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.kpiResults).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.competitors).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.swot).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.buyerPersona).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.campaigns).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.automations).select("*").eq("strategy_id", strategyId),
      supabaseClient.from(TABLE_NAMES.versions).select("*").eq("strategy_id", strategyId).maybeSingle()
    ]);

  const newState = createInitialState();
  newState.strategyId = strategyId;
  newState.versionLog.status = versionLog.data?.status ?? "En progreso";
  newState.versionLog.author = versionLog.data?.author ?? user.username;
  newState.versionLog.updatedAt = versionLog.data?.updated_at ?? strategy.updated_at;

  if (company.data) {
    newState.companyInfo = {
      name: company.data.name ?? "",
      industry: company.data.industry ?? "",
      size: company.data.size ?? "",
      currentSituation: company.data.current_situation ?? ""
    };
  }

  if (audience.data) {
    newState.targetAudience = {
      demographics: audience.data.demographics ?? "",
      interests: audience.data.interests ?? "",
      painPoints: audience.data.pain_points ?? ""
    };
    newState.buyerPersona.motivations = audience.data.motivations ?? "";
    newState.buyerPersona.objections = audience.data.objections ?? "";
    newState.buyerPersona.preferredChannels = audience.data.preferred_channels ?? [];
    newState.buyerPersona.contactEmail = audience.data.contact_email ?? "";
  }

  newState.objectives = objectives.data?.map((row) => row.objective_text) ?? [];
  newState.channels = channels.data?.map((row) => row.channel_id) ?? [];
  newState.budget.total = budget.data?.total_amount ?? "";
  newState.budget.distribution = budget.data?.distribution_json ?? {};

  newState.timeline.duration = String(Math.max(timeline.data?.length ?? 0, parseInt(newState.timeline.duration, 10)) || 3);
  newState.timeline.activities = timeline.data?.map((row) => ({
    description: row.description,
    responsible: row.responsible,
    dependencies: row.dependencies,
    cost: row.cost_estimate
  })) ?? [];

  newState.publicationCalendar.entries = calendar.data?.map((row) => ({
    day: row.day_of_week,
    channel: row.channel_id,
    contentType: row.content_type,
    time: row.publish_time
  })) ?? [];

  newState.kpis = kpis.data?.map((row) => ({
    name: row.kpi_name,
    measurement: row.measurement_type,
    target: row.monthly_target
  })) ?? [];

  const groupedMetrics = {};
  (kpiResults.data ?? []).forEach((row) => {
    if (!groupedMetrics[row.month_label]) {
      groupedMetrics[row.month_label] = [];
    }
    groupedMetrics[row.month_label].push({
      kpi: row.kpi_name,
      target: row.target_value,
      actual: row.actual_value,
      variation: row.variation
    });
  });

  newState.monthlyTracking.months = Object.entries(groupedMetrics).map(([label, metrics]) => ({
    label,
    metrics
  }));

  newState.competitiveAnalysis.competitors = competitors.data?.map((row) => ({
    name: row.competitor_name,
    value: row.value_proposition,
    notes: row.notes
  })) ?? [];

  const swotData = swot.data ?? [];
  newState.swot.strengths = swotData.filter((row) => row.category === "strength").map((row) => row.description);
  newState.swot.weaknesses = swotData.filter((row) => row.category === "weakness").map((row) => row.description);
  newState.swot.opportunities = swotData.filter((row) => row.category === "opportunity").map((row) => row.description);
  newState.swot.threats = swotData.filter((row) => row.category === "threat").map((row) => row.description);

  newState.buyerPersona.archetypes = buyerPersona.data?.map((row) => ({
    name: row.persona_name,
    motivations: row.motivations,
    objections: row.objections,
    channels: row.preferred_channels
  })) ?? [];

  newState.campaigns.active = campaigns.data?.map((row) => ({
    id: row.id,
    name: row.campaign_name,
    channel: row.channel,
    budget: row.budget,
    startDate: row.start_date,
    endDate: row.end_date,
    goal: row.goal,
    status: row.status ?? "Planificada",
    details: typeof row.details === "object" && row.details !== null ? row.details : {}
  })) ?? [];

  newState.campaigns.automations = automations.data?.map((row) => ({
    name: row.automation_name,
    trigger: row.trigger_event,
    cadence: row.cadence,
    tool: row.tool
  })) ?? [];

  mergeState({ ...newState, lastSyncedAt: strategy.updated_at });
  return newState;
}
