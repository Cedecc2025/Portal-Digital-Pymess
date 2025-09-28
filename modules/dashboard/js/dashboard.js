// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import { requireAuth, getCurrentUsername, logout } from "../../../lib/authGuard.js";
import { gotoFromModule } from "../../../lib/pathUtil.js";

const usernameDisplay = document.querySelector("#usernameDisplay");
const logoutButton = document.querySelector("#logoutButton");
const moduleCards = document.querySelectorAll(".module-card");

// Carga la información del usuario autenticado en el encabezado.
function loadUsername() {
  const username = getCurrentUsername();

  if (username) {
    usernameDisplay.textContent = username;
  } else {
    usernameDisplay.textContent = "Usuario";
  }
}

// Redirige a la ruta correspondiente según el módulo seleccionado.
function handleModuleNavigation(event) {
  event.preventDefault();
  const moduleCard = event.currentTarget;
  const moduleKey = moduleCard.dataset.module;

  if (moduleKey === "costos") {
    gotoFromModule(import.meta.url, "../costos/index.html");
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
    card.addEventListener("click", handleModuleNavigation);
  });
}

requireAuth();
loadUsername();
registerEventListeners();
