// costos.js
// Controla la protección del módulo de costos.

import { requireAuth } from "/lib/authGuard.js";

// Inicializa la pantalla verificando si hay sesión activa.
function initializeModule() {
  requireAuth();
}

initializeModule();
