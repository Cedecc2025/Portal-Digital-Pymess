// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import { requireAuth, getCurrentUsername, logout } from "../../../lib/authGuard.js";
const usernameDisplay = document.querySelector("#usernameDisplay");
const logoutButton = document.querySelector("#logoutButton");
const moduleCards = document.querySelectorAll(".module-card");

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
registerEventListeners();
