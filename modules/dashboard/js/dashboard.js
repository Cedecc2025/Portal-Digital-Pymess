// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import { requireAuth, getCurrentUsername, logout } from "../../../lib/authGuard.js";

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

// Configura los listeners necesarios para la pantalla.
function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  moduleCards.forEach((card) => {
    // Se asegura que cada tarjeta mantenga un href correcto y sea navegable.
    if (card.dataset.module === "costos") {
      card.setAttribute("href", "../costos/index.html");
    }
  });
}

requireAuth();
loadUsername();
registerEventListeners();
