// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import { requireAuth, getCurrentUsername, logout } from "../../../lib/authGuard.js";
import { prefetchAssets, warmDocument } from "../../../lib/assetPrefetcher.js";
const usernameDisplay = document.querySelector("#usernameDisplay");
const logoutButton = document.querySelector("#logoutButton");
const moduleCards = document.querySelectorAll(".module-card");

const MODULE_PREFETCH_MAP = {
  costos: {
    document: "../costos/index.html",
    assets: [
      { href: "../costos/css/costos.css", as: "style" },
      { href: "../costos/js/costos.js", as: "script" },
      {
        href: "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.esm.js",
        as: "script"
      }
    ],
    idle: true
  },
  estrategias: {
    document: "../estrategias/index.html",
    assets: [
      { href: "../estrategias/css/estrategias.css", as: "style" },
      { href: "../estrategias/js/estrategias.js", as: "script" },
      {
        href: "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.esm.js",
        as: "script"
      },
      {
        href: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js",
        as: "script"
      }
    ],
    idle: true
  },
  crm: {
    document: "../crm-pro/index.html",
    assets: [{ href: "../crm-pro/js/crm.js", as: "script" }]
  },
  herramientas: {
    document: "../herramientas-extras/index.html",
    assets: [
      { href: "../herramientas-extras/css/herramientas-extras.css", as: "style" },
      { href: "../herramientas-extras/js/herramientas-extras.js", as: "script" }
    ]
  }
};

// Obtiene y coloca el nombre del usuario autenticado en la cabecera.
function loadUsername() {
  const username = getCurrentUsername();

  if (!usernameDisplay) {
    return;
  }

  if (username) {
    usernameDisplay.textContent = username; // Muestra el nombre real si existe.
  } else {
    usernameDisplay.textContent = "Usuario"; // Valor por defecto cuando no hay nombre.
  }
}

// Renderiza los módulos accesibles del dashboard con sus enlaces definitivos.
function configureModuleCards() {
  moduleCards.forEach((card) => {
    switch (card.dataset.module) {
      case "costos": {
        card.setAttribute("href", "../costos/index.html");
        break;
      }
      case "catalogo": {
        card.setAttribute("href", "../catalogo/index.html");
        break;
      }
      case "estrategias": {
        card.setAttribute("href", "../estrategias/index.html");
        break;
      }
      case "crm": {
        card.setAttribute("href", "../crm-pro/index.html");
        break;
      }
      case "herramientas": {
        card.setAttribute("href", "../herramientas-extras/index.html");
        break;
      }
      default: {
        break;
      }
    }
  });
}

function prefetchModule(entry) {
  if (!entry) {
    return;
  }
  if (entry.document) {
    warmDocument(entry.document);
  }
  if (entry.assets?.length) {
    prefetchAssets(entry.assets);
  }
}

function setupModulePrefetching() {
  if (!moduleCards || moduleCards.length === 0) {
    return;
  }

  const idleEntries = [];

  moduleCards.forEach((card) => {
    const moduleId = card.dataset.module;
    const entry = MODULE_PREFETCH_MAP[moduleId];

    if (!entry) {
      return;
    }

    if (entry.idle) {
      idleEntries.push(entry);
    }

    let triggered = false;
    const trigger = () => {
      if (triggered) {
        return;
      }
      triggered = true;
      prefetchModule(entry);
    };

    card.addEventListener("mouseenter", trigger, { once: true });
    card.addEventListener("focus", trigger, { once: true });
    card.addEventListener("touchstart", trigger, { once: true, passive: true });
    card.addEventListener("click", trigger, { once: true });
  });

  if (idleEntries.length > 0) {
    const performIdlePrefetch = () => {
      idleEntries.forEach(prefetchModule);
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(performIdlePrefetch, { timeout: 2000 });
    } else {
      window.setTimeout(performIdlePrefetch, 2000);
    }
  }
}

function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }
}

requireAuth();
loadUsername();
configureModuleCards();
setupModulePrefetching();
registerEventListeners();
