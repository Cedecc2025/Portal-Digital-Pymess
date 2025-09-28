// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import { requireAuth, getCurrentUsername, logout } from "/lib/authGuard.js";

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
  const moduleCard = event.currentTarget;
  const moduleKey = moduleCard.dataset.module;

  if (moduleKey === "costos") {
    window.location.href = "/modules/costos/index.html";
  }
}

// Configura los listeners necesarios para la pantalla.
function registerEventListeners() {
  logoutButton.addEventListener("click", () => {
    logout();
  });

  moduleCards.forEach((card) => {
    card.addEventListener("click", handleModuleNavigation);
    const button = card.querySelector(".module-button");

    if (button) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        handleModuleNavigation({ currentTarget: card });
      });
    }
  });
}

requireAuth();
loadUsername();
registerEventListeners();
