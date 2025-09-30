// login.js
// Controla la lógica de autenticación del formulario de inicio de sesión.

import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";
import { supabaseClient } from "../../../lib/supabaseClient.js";
import { saveSession } from "../../../lib/authGuard.js";
import { gotoFromModule } from "../../../lib/pathUtil.js";

let loginForm = null;
let usernameInput = null;
let passwordInput = null;
let rememberMeInput = null;
let usernameFeedback = null;
let passwordFeedback = null;
let generalFeedback = null;
let moduleIconElement = null;
let moduleNameElement = null;
let moduleDescriptionElement = null;
let moduleHighlightElement = null;
let kpiRotationTimer = null;
let navigationHandler = (relativeTarget) => {
  // Navega utilizando rutas relativas calculadas desde este módulo.
  gotoFromModule(import.meta.url, relativeTarget);
};

const ACTIVE_MODULES = [
  {
    name: "Costos",
    description: "Controla gastos operativos y financieros en tiempo real.",
    icon: "💼"
  },
  {
    name: "Estrategias de Ventas",
    description: "Diseña campañas comerciales con métricas claras y accionables.",
    icon: "🚀"
  },
  {
    name: "Gestión de Tareas",
    description: "Organiza pendientes, responsables y fechas límite por proyecto.",
    icon: "🗒️"
  }
];
const KPI_ROTATION_INTERVAL = 1400;

if (typeof document !== "undefined") {
  loginForm = document.querySelector("#loginForm");
  usernameInput = document.querySelector("#username");
  passwordInput = document.querySelector("#password");
  rememberMeInput = document.querySelector("#rememberMe");
  usernameFeedback = document.querySelector("#usernameFeedback");
  passwordFeedback = document.querySelector("#passwordFeedback");
  generalFeedback = document.querySelector("#generalFeedback");
  moduleIconElement = document.querySelector("#moduleIcon");
  moduleNameElement = document.querySelector("#moduleName");
  moduleDescriptionElement = document.querySelector("#moduleDescription");
  moduleHighlightElement = document.querySelector("#moduleHighlight");
}

// Inicializa la pantalla limpiando cualquier mensaje previo.
export function initializeForm(feedbackElements = {}) {
  // Se asegura que todos los contenedores de feedback estén vacíos.
  const usernameElement = feedbackElements.usernameFeedback ?? usernameFeedback;
  const passwordElement = feedbackElements.passwordFeedback ?? passwordFeedback;
  const generalElement = feedbackElements.generalFeedback ?? generalFeedback;

  if (usernameElement) {
    usernameElement.textContent = "";
  }

  if (passwordElement) {
    passwordElement.textContent = "";
  }

  if (generalElement) {
    generalElement.textContent = "";
  }

  startModuleRotation();
}

// Valida si el username cumple los criterios.
export function validateUsername(username, feedbackElement = usernameFeedback) {
  const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/;

  if (usernamePattern.test(username) === false) {
    if (feedbackElement) {
      feedbackElement.textContent = "El usuario debe tener entre 3 y 20 caracteres alfanuméricos, guion o guion bajo.";
    }
    return false;
  }

  if (feedbackElement) {
    feedbackElement.textContent = "";
  }
  return true;
}

// Valida si el password es suficientemente largo.
export function validatePassword(password, feedbackElement = passwordFeedback) {
  if (password.length < 8) {
    if (feedbackElement) {
      feedbackElement.textContent = "La contraseña debe tener al menos 8 caracteres.";
    }
    return false;
  }

  if (feedbackElement) {
    feedbackElement.textContent = "";
  }
  return true;
}

// Busca al usuario en Supabase y retorna sus datos.
export async function fetchUserByUsername(username, client = supabaseClient) {
  try {
    const { data, error } = await client
      .from("usuarios")
      .select("id, username, password")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error al consultar usuario", error);
    throw new Error("Ocurrió un error al validar las credenciales. Intenta nuevamente.");
  }
}

// Procesa el envío del formulario de login.
export async function handleLoginSubmit(event) {
  event.preventDefault();
  if (generalFeedback) {
    generalFeedback.textContent = "";
  }

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  const isUsernameValid = validateUsername(username);
  const isPasswordValid = validatePassword(password);

  if (isUsernameValid === false || isPasswordValid === false) {
    if (generalFeedback) {
      generalFeedback.textContent = "Verifica la información ingresada.";
    }
    return;
  }

  try {
    const user = await fetchUserByUsername(username);

    if (!user) {
      if (generalFeedback) {
        generalFeedback.textContent = "Usuario o contraseña incorrectos.";
      }
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (passwordMatches === false) {
      if (generalFeedback) {
        generalFeedback.textContent = "Usuario o contraseña incorrectos.";
      }
      return;
    }

    const rememberValue = rememberMeInput ? rememberMeInput.checked : false;
    saveSession({ username: user.username, id: user.id }, rememberValue);
    redirectToDashboard();
  } catch (error) {
    if (generalFeedback) {
      generalFeedback.textContent = error.message;
    }
  }
}

// Permite inyectar un manejador personalizado para la navegación (útil en pruebas).
export function setNavigationHandler(handler) {
  if (typeof handler === "function") {
    navigationHandler = handler;
  }
}

// Redirige al Dashboard utilizando el manejador activo.
export function redirectToDashboard(handler = navigationHandler) {
  if (typeof handler === "function") {
    handler("../../dashboard/index.html");
  }
}

if (typeof document !== "undefined") {
  initializeForm();

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }
}

export function startModuleRotation(
  modules = ACTIVE_MODULES,
  elements = {},
  interval = KPI_ROTATION_INTERVAL
) {
  const targetElements = {
    icon: moduleIconElement,
    name: moduleNameElement,
    description: moduleDescriptionElement,
    container: moduleHighlightElement,
    ...elements
  };

  if (!targetElements.name || !targetElements.description || modules.length === 0) {
    return;
  }

  let moduleIndex = 0;

  const updateModule = () => {
    const moduleData = modules[moduleIndex];

    if (targetElements.icon) {
      targetElements.icon.textContent = moduleData.icon ?? "";
    }

    targetElements.name.textContent = moduleData.name;
    targetElements.description.textContent = moduleData.description;

    if (targetElements.container) {
      targetElements.container.classList.remove("is-visible");
      void targetElements.container.offsetWidth;
      targetElements.container.classList.add("is-visible");
    }

    moduleIndex = (moduleIndex + 1) % modules.length;
  };

  updateModule();

  if (kpiRotationTimer) {
    clearInterval(kpiRotationTimer);
  }

  kpiRotationTimer = setInterval(updateModule, interval);
}

export default {
  initializeForm,
  validateUsername,
  validatePassword,
  fetchUserByUsername,
  handleLoginSubmit,
  setNavigationHandler,
  redirectToDashboard,
  startModuleRotation
};
