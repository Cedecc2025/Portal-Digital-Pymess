// dashboard.js
// Controla la lógica básica del panel principal del portal empresarial.

import { getCurrentUsername, logout, requireAuth } from "../../../lib/authGuard.js";

let usernameDisplay = null;
let logoutButton = null;

// Inicializa el dashboard asegurando que exista sesión válida y preparando eventos.
function initializeDashboard() {
  requireAuth();

  if (typeof document === "undefined") {
    return;
  }

  usernameDisplay = document.querySelector("#usernameDisplay");
  logoutButton = document.querySelector("#logoutButton");

  const username = getCurrentUsername();
  if (usernameDisplay && username) {
    usernameDisplay.textContent = username;
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogoutClick);
  }
}

// Atiende el evento de cierre de sesión limpiando la sesión activa.
function handleLogoutClick() {
  logout();
}

if (typeof document !== "undefined") {
  initializeDashboard();
}

export default {
  initializeDashboard,
  handleLogoutClick
};
