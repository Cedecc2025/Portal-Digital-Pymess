// persistence.js
// Gestiona las operaciones de lectura y escritura con Supabase para la estrategia.

import { supabaseClient } from "../../../lib/supabaseClient.js";
import { getCurrentUser } from "../../../lib/authGuard.js";
import { TABLE_NAMES } from "./constants.js";
import { getState, mergeState, createInitialState } from "./stateManager.js";

// Obtiene o crea un registro maestro en la tabla marketing_strategies.
async function ensureStrategyRecord(userId) {
  const state = getState();
  if (state.strategyId) {
    return state.strategyId;
  }

  const { data, error } = await supabaseClient
    .from(TABLE_NAMES.strategies)
    .insert({
      user_id: userId,
      status: state.versionLog.status,
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

  const companyPayload = {
    strategy_id: strategyId,
    name: state.companyInfo.name,
    industry: state.companyInfo.industry,
    size: state.companyInfo.size,
    current_situation: state.companyInfo.currentSituation
  };

  await supabaseClient
    .from(TABLE_NAMES.company)
    .upsert(companyPayload, { onConflict: "strategy_id" });

  const audiencePayload = {
    strategy_id: strategyId,
    demographics: state.targetAudience.demographics,
    interests: state.targetAudience.interests,
    pain_points: state.targetAudience.painPoints,
    motivations: state.buyerPersona.motivations,
    objections: state.buyerPersona.objections,
    preferred_channels: state.buyerPersona.preferredChannels,
    contact_email: state.buyerPersona.contactEmail
  };
  await supabaseClient
    .from(TABLE_NAMES.audience)
    .upsert(audiencePayload, { onConflict: "strategy_id" });

  await clearTableForStrategy(TABLE_NAMES.objectives, strategyId);
  await bulkInsert(
    TABLE_NAMES.objectives,
    state.objectives.map((objective, index) => ({
      strategy_id: strategyId,
      objective_text: objective,
      priority_order: index + 1
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.channels, strategyId);
  await bulkInsert(
    TABLE_NAMES.channels,
    state.channels.map((channelId) => ({
      strategy_id: strategyId,
      channel_id: channelId,
      allocation: state.budget.distribution[channelId] ?? 0
    }))
  );

  await supabaseClient
    .from(TABLE_NAMES.budget)
    .upsert(
      {
        strategy_id: strategyId,
        total_amount: state.budget.total,
        distribution_json: state.budget.distribution
      },
      { onConflict: "strategy_id" }
    );

  await clearTableForStrategy(TABLE_NAMES.timeline, strategyId);
  await bulkInsert(
    TABLE_NAMES.timeline,
    state.timeline.activities.map((activity, index) => ({
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
    state.publicationCalendar.entries.map((entry) => ({
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
    state.kpis.map((kpi) => ({
      strategy_id: strategyId,
      kpi_name: kpi.name,
      measurement_type: kpi.measurement,
      monthly_target: kpi.target
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.kpiResults, strategyId);
  await bulkInsert(
    TABLE_NAMES.kpiResults,
    state.monthlyTracking.months.flatMap((month) =>
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
    state.competitiveAnalysis.competitors.map((competitor) => ({
      strategy_id: strategyId,
      competitor_name: competitor.name,
      value_proposition: competitor.value,
      notes: competitor.notes
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.swot, strategyId);
  await bulkInsert(
    TABLE_NAMES.swot,
    [
      ...state.swot.strengths.map((description) => ({ strategy_id: strategyId, category: "strength", description })),
      ...state.swot.weaknesses.map((description) => ({ strategy_id: strategyId, category: "weakness", description })),
      ...state.swot.opportunities.map((description) => ({ strategy_id: strategyId, category: "opportunity", description })),
      ...state.swot.threats.map((description) => ({ strategy_id: strategyId, category: "threat", description }))
    ]
  );

  await clearTableForStrategy(TABLE_NAMES.buyerPersona, strategyId);
  await bulkInsert(
    TABLE_NAMES.buyerPersona,
    state.buyerPersona.archetypes?.map((persona) => ({
      strategy_id: strategyId,
      persona_name: persona.name,
      motivations: persona.motivations,
      objections: persona.objections,
      preferred_channels: persona.channels
    })) ?? []
  );

  await clearTableForStrategy(TABLE_NAMES.campaigns, strategyId);
  await bulkInsert(
    TABLE_NAMES.campaigns,
    state.campaigns.active.map((campaign) => ({
      strategy_id: strategyId,
      campaign_name: campaign.name,
      channel: campaign.channel,
      budget: campaign.budget,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      goal: campaign.goal,
      status: campaign.status
    }))
  );

  await clearTableForStrategy(TABLE_NAMES.automations, strategyId);
  await bulkInsert(
    TABLE_NAMES.automations,
    state.campaigns.automations.map((automation) => ({
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
  mergeState({ lastSyncedAt: new Date().toISOString() });
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
    name: row.campaign_name,
    channel: row.channel,
    budget: row.budget,
    startDate: row.start_date,
    endDate: row.end_date,
    goal: row.goal,
    status: row.status
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
