// pdf.js
// Genera un reporte PDF profesional a partir del estado de la estrategia.

import { loadJsPdf } from "../../../lib/assetLoader.js";
import { MARKETING_CHANNELS } from "./constants.js";

/**
 * Construye el documento PDF de la estrategia utilizando jsPDF.
 * @param {import('./stateManager.js').StrategyState} state Estado completo del asistente.
 */
export async function generateStrategyPdf(state) {
  try {
    const jsPDF = await loadJsPdf();
    if (typeof jsPDF !== "function") {
      throw new Error("Constructor jsPDF inválido");
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 15;
    let cursorY = margin;

    // Dibuja el encabezado principal.
    drawHeader(doc, margin);
    cursorY += 20;

    // Inserta la sección de empresa.
    cursorY = drawSection(doc, "Perfil corporativo", buildCompanyBlock(state), margin, cursorY);

    // Inserta la sección de objetivos.
    cursorY = drawSection(doc, "Objetivos estratégicos", buildObjectivesBlock(state), margin, cursorY);

    // Inserta la sección de canales y presupuesto.
    cursorY = drawSection(doc, "Canales y presupuesto", buildChannelsBlock(state), margin, cursorY);

    // Inserta la sección de plan táctico.
    cursorY = drawSection(doc, "Plan táctico", buildTacticalBlock(state), margin, cursorY);

    // Inserta la sección de KPIs.
    cursorY = drawSection(doc, "KPIs clave", buildKpiBlock(state), margin, cursorY);

    // Inserta la sección de timeline si queda espacio, en caso contrario crea una nueva página.
    cursorY = drawSection(doc, "Cronograma", buildTimelineBlock(state), margin, cursorY);

    // Inserta la sección de buyer personas.
    cursorY = drawSection(doc, "Buyer personas", buildBuyerPersonasBlock(state), margin, cursorY);

    // Inserta la sección de análisis competitivo.
    cursorY = drawSection(doc, "Análisis competitivo y SWOT", buildCompetitiveBlock(state), margin, cursorY);

    // Inserta la sección de campañas y automatizaciones.
    cursorY = drawSection(doc, "Campañas y automatizaciones", buildCampaignsBlock(state), margin, cursorY);

    // Inserta la sección de métricas mensuales.
    cursorY = drawSection(doc, "Tracking mensual", buildMonthlyTrackingBlock(state), margin, cursorY);

    // Inserta una nota final.
    if (cursorY > doc.internal.pageSize.getHeight() - margin - 30) {
      doc.addPage();
      cursorY = margin;
    }
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      "Este reporte se generó automáticamente desde la plataforma de Estrategias PYME.",
      margin,
      cursorY + 10
    );

    doc.save("estrategia-marketing.pdf");
  } catch (error) {
    console.error("Error al generar el PDF", error);
    throw error;
  }
}

/**
 * Dibuja el encabezado principal del reporte.
 * @param {import('jspdf').jsPDF} doc Documento PDF activo.
 * @param {number} margin Margen horizontal utilizado en el documento.
 */
function drawHeader(doc, margin) {
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Estrategia de Marketing", margin, 20);
}

/**
 * Construye una sección y la imprime en el PDF.
 * @param {import('jspdf').jsPDF} doc Documento PDF activo.
 * @param {string} title Título de la sección.
 * @param {string[]} lines Contenido ya envuelto en líneas.
 * @param {number} margin Margen lateral.
 * @param {number} cursorY Posición vertical actual.
 * @returns {number} Nueva posición vertical tras dibujar la sección.
 */
function drawSection(doc, title, lines, margin, cursorY) {
  if (!lines || lines.length === 0) {
    return cursorY;
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  const headerHeight = 10;
  const spacing = 5;

  if (cursorY + headerHeight + lines.length * 6 > pageHeight - margin) {
    doc.addPage();
    cursorY = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(title, margin, cursorY + headerHeight);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);

  let currentY = cursorY + headerHeight + spacing;
  lines.forEach((line) => {
    if (currentY > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
    doc.text(line, margin, currentY);
    currentY += 6;
  });

  return currentY + spacing;
}

/**
 * Genera el bloque de líneas para la sección de perfil corporativo.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 * @returns {string[]} Líneas para el PDF.
 */
function buildCompanyBlock(state) {
  const lines = [];
  if (state.companyInfo.name) {
    lines.push(`Empresa: ${state.companyInfo.name}`);
  }
  if (state.companyInfo.industry) {
    lines.push(`Industria: ${state.companyInfo.industry}`);
  }
  if (state.companyInfo.size) {
    lines.push(`Tamaño: ${state.companyInfo.size}`);
  }
  if (state.companyInfo.currentSituation) {
    lines.push("Situación actual:");
    lines.push(...wrapText(state.companyInfo.currentSituation));
  }
  return lines;
}

/**
 * Genera el bloque de objetivos.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildObjectivesBlock(state) {
  return state.objectives.length > 0
    ? state.objectives.map((objective, index) => `${index + 1}. ${objective}`)
    : ["No se registraron objetivos."];
}

/**
 * Construye el bloque de canales y presupuesto.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildChannelsBlock(state) {
  const lines = [];
  if (state.budget.total) {
    lines.push(`Presupuesto mensual estimado: $${state.budget.total}`);
  }
  const entries = Object.entries(state.budget.distribution ?? {});
  if (entries.length > 0) {
    lines.push("Distribución por canal:");
    entries.forEach(([channel, percentage]) => {
      lines.push(` • ${resolveChannelLabel(channel)}: ${percentage}%`);
    });
  }
  if (state.channels.length > 0) {
    lines.push("Canales prioritarios:");
    state.channels.forEach((channel, index) => {
      lines.push(`   ${index + 1}. ${resolveChannelLabel(channel)}`);
    });
  }
  return lines;
}

/**
 * Construye el bloque de plan táctico.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildTacticalBlock(state) {
  if (!state.tacticalPlan?.items?.length) {
    return ["No se registraron actividades tácticas."];
  }
  return state.tacticalPlan.items.map(
    (item, index) =>
      `${index + 1}. ${item.activity} • Responsable: ${item.responsible} • Costo: ${item.estimatedCost ?? 0}`
  );
}

/**
 * Construye el bloque de KPIs.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildKpiBlock(state) {
  if (!state.kpis?.length) {
    return ["No se definieron KPIs."];
  }
  return state.kpis.map((kpi, index) => {
    const parts = [`${index + 1}. ${kpi.name}`];
    if (kpi.target) {
      parts.push(`Meta: ${kpi.target}`);
    }
    if (kpi.measurementType) {
      parts.push(`Medición: ${kpi.measurementType}`);
    }
    return parts.join(" • ");
  });
}

/**
 * Construye el bloque de cronograma.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildTimelineBlock(state) {
  if (!state.timeline?.activities?.length) {
    return ["No se registraron actividades en el cronograma."];
  }
  return state.timeline.activities.map(
    (activity, index) => `${index + 1}. Mes ${index + 1}: ${activity.description ?? activity}`
  );
}

/**
 * Construye el bloque de buyer personas.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildBuyerPersonasBlock(state) {
  if (!state.advancedBuyerPersonas?.length) {
    return ["No se definieron buyer personas avanzadas."];
  }
  const lines = [];
  state.advancedBuyerPersonas.forEach((persona, index) => {
    lines.push(`${index + 1}. ${persona.name}`);
    if (persona.demographics) {
      lines.push(`   Demografía: ${persona.demographics}`);
    }
    if (persona.motivations) {
      lines.push(`   Motivaciones: ${persona.motivations}`);
    }
    if (persona.objections) {
      lines.push(`   Objeciones: ${persona.objections}`);
    }
    if (persona.preferredChannels?.length) {
      lines.push(`   Canales preferidos: ${persona.preferredChannels.join(", ")}`);
    }
  });
  return lines;
}

/**
 * Construye el bloque de análisis competitivo.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildCompetitiveBlock(state) {
  const lines = [];
  if (state.competitors?.length) {
    lines.push("Competidores identificados:");
    state.competitors.forEach((competitor, index) => {
      lines.push(` ${index + 1}. ${competitor.name} • Propuesta: ${competitor.valueProposition ?? "-"}`);
    });
  }
  if (state.swot?.length) {
    lines.push("Matriz SWOT:");
    state.swot.forEach((entry) => {
      lines.push(` ${entry.category}: ${entry.description}`);
    });
  }
  if (lines.length === 0) {
    lines.push("No se registró información competitiva.");
  }
  return lines;
}

/**
 * Construye el bloque de campañas y automatizaciones.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildCampaignsBlock(state) {
  const lines = [];
  if (state.campaigns?.length) {
    lines.push("Campañas planificadas:");
    state.campaigns.forEach((campaign, index) => {
      lines.push(
        ` ${index + 1}. ${campaign.name} • Canal: ${resolveChannelLabel(campaign.channel)} • Presupuesto: ${campaign.budget ?? 0}`
      );
    });
  }
  if (state.automations?.length) {
    lines.push("Automatizaciones:");
    state.automations.forEach((automation, index) => {
      lines.push(
        ` ${index + 1}. ${automation.name} • Disparador: ${automation.trigger ?? "-"} • Herramienta: ${automation.tool ?? "-"}`
      );
    });
  }
  if (lines.length === 0) {
    lines.push("No se registraron campañas ni automatizaciones.");
  }
  return lines;
}

/**
 * Construye el bloque de seguimiento mensual.
 * @param {import('./stateManager.js').StrategyState} state Estado actual.
 */
function buildMonthlyTrackingBlock(state) {
  if (!state.monthlyTracking?.length) {
    return ["No se registraron métricas mensuales."];
  }
  const lines = [];
  state.monthlyTracking.forEach((record) => {
    lines.push(`${record.label}:`);
    record.metrics.forEach((metric) => {
      lines.push(`   ${metric.kpi} • Meta: ${metric.target ?? 0} • Actual: ${metric.actual ?? 0}`);
    });
  });
  return lines;
}

/**
 * Envuelve un texto largo en líneas legibles para el PDF.
 * @param {string} text Texto a dividir.
 */
function wrapText(text) {
  if (!text) {
    return [];
  }
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if ((current + word).length > 80) {
      lines.push(current.trim());
      current = `${word} `;
    } else {
      current += `${word} `;
    }
  });
  if (current.trim()) {
    lines.push(current.trim());
  }
  return lines;
}

/**
 * Resuelve la etiqueta legible para un canal de marketing.
 * @param {string} channelId Identificador del canal.
 */
function resolveChannelLabel(channelId) {
  if (!channelId) {
    return "-";
  }
  const channel = MARKETING_CHANNELS.find((item) => item.id === channelId);
  return channel?.name ?? channelId;
}
