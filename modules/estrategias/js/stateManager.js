// stateManager.js
// Administra el estado local del asistente, persistiendo en memoria y en localStorage.

import { LOCAL_STORAGE_KEY } from "./constants.js";
import { getCurrentUser } from "../../../lib/authGuard.js";

let currentState = null;

// Crea un estado inicial vacío para comenzar el asistente.
export function createInitialState() {
  return {
    strategyId: null,
    lastSyncedAt: null,
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
    buyerPersona: {
      motivations: "",
      objections: "",
      preferredChannels: [],
      contactEmail: "",
      archetypes: []
    },
    competitiveAnalysis: {
      competitors: [],
      valuePropositions: ""
    },
    swot: {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
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
    tacticalPlan: {
      items: []
    },
    publicationCalendar: {
      contentTypes: [],
      entries: []
    },
    campaigns: {
      active: [],
      automations: []
    },
    kpis: [],
    monthlyTracking: {
      months: [],
      insights: []
    },
    versionLog: {
      status: "En progreso",
      author: null,
      updatedAt: null
    }
  };
}

// Retorna el estado actual en memoria, generando uno si es necesario.
export function getState() {
  if (!currentState) {
    currentState = createInitialState();
  }
  return currentState;
}

// Reemplaza el estado actual y persiste la nueva referencia.
export function setState(newState) {
  currentState = { ...createInitialState(), ...newState };
  saveState();
}

// Fusiona cambios parciales dentro del estado actual.
export function mergeState(partialState) {
  currentState = { ...getState(), ...partialState };
  saveState();
}

// Persiste el estado en localStorage incluyendo el usuario asociado.
export function saveState() {
  const user = getCurrentUser();
  const payload = {
    owner: user?.userId ?? null,
    savedAt: new Date().toISOString(),
    data: getState()
  };
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

// Intenta recuperar el estado desde localStorage.
export function loadStateFromStorage() {
  try {
    const rawValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }
    const payload = JSON.parse(rawValue);
    currentState = payload.data ?? createInitialState();
    return currentState;
  } catch (error) {
    console.error("No se pudo recuperar el estado local", error);
    currentState = createInitialState();
    return currentState;
  }
}

// Limpia el estado local almacenado cuando se desee reiniciar el asistente.
export function clearState() {
  currentState = createInitialState();
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}
