// costos.js
// Asegura la protección del módulo de costos mientras se implementa su funcionalidad completa.

import { requireAuth } from "../../../lib/authGuard.js";

// Inicializa el módulo validando la sesión activa.
function initializeCostos() {
  requireAuth();
}

if (typeof document !== "undefined") {
  initializeCostos();
}

export default {
  initializeCostos
};
