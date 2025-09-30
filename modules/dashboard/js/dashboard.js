// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import { requireAuth, getCurrentUsername, logout } from "../../../lib/authGuard.js";

const usernameDisplay = document.querySelector("#usernameDisplay");
const logoutButton = document.querySelector("#logoutButton");
const moduleCards = document.querySelectorAll(".module-card");
const activeModulesCountElement = document.querySelector("#activeModulesCount");
const activeModulesListElement = document.querySelector("#activeModulesList");

// Carga la información del usuario autenticado en el encabezado.
function loadUsername() {
  const username = getCurrentUsername();

  if (username) {
    usernameDisplay.textContent = username;
  } else {
    usernameDisplay.textContent = "Usuario";
  }
}

// Configura los listeners necesarios para la pantalla.
function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  moduleCards.forEach((card) => {
    // Se asegura que cada tarjeta mantenga un href correcto y sea navegable.
    switch (card.dataset.module) {
      case "costos": {
        card.setAttribute("href", "../costos/index.html");
        break;
      }
      case "estrategias": {
        card.setAttribute("href", "../estrategias/index.html");
        break;
      }
      default: {
        break;
      }
    }
  });
}

// Actualiza el KPI con el estado de los módulos activos.
function updateActiveModulesKpi() {
  if (!activeModulesCountElement || !activeModulesListElement) {
    return;
  }

  const activeModules = Array.from(moduleCards).map((card) => {
    const title = card.querySelector("h2");
    return title ? title.textContent.trim() : "";
  }).filter(Boolean);

  activeModulesCountElement.textContent = String(activeModules.length);

  if (activeModules.length > 0) {
    activeModulesListElement.textContent = activeModules.join(", ");
  } else {
    activeModulesListElement.textContent = "No hay módulos activos disponibles en este momento.";
  }
}

requireAuth();
loadUsername();
registerEventListeners();
updateActiveModulesKpi();
