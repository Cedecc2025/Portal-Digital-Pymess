// login.js
// Controla la lógica de autenticación del formulario de inicio de sesión.

import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";
import { supabaseClient } from "../../../lib/supabaseClient.js";
import { saveSession } from "../../../lib/authGuard.js";

let loginForm = null;
let usernameInput = null;
let passwordInput = null;
let rememberMeInput = null;
let usernameFeedback = null;
let passwordFeedback = null;
let generalFeedback = null;
let navigationTarget = null;

if (typeof document !== "undefined") {
  loginForm = document.querySelector("#loginForm");
  usernameInput = document.querySelector("#username");
  passwordInput = document.querySelector("#password");
  rememberMeInput = document.querySelector("#rememberMe");
  usernameFeedback = document.querySelector("#usernameFeedback");
  passwordFeedback = document.querySelector("#passwordFeedback");
  generalFeedback = document.querySelector("#generalFeedback");
}

if (typeof window !== "undefined" && window.location) {
  navigationTarget = window.location;
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
    saveSession(user.username, rememberValue);
    redirectToDashboard();
  } catch (error) {
    if (generalFeedback) {
      generalFeedback.textContent = error.message;
    }
  }
}

// Permite configurar el destino de navegación (útil para pruebas unitarias).
export function setNavigationTarget(target) {
  navigationTarget = target;
}

// Redirige al Dashboard utilizando el destino configurado.
export function redirectToDashboard(target = navigationTarget) {
  if (target && typeof target.replace === "function") {
    target.replace("/modules/dashboard/index.html");
  }
}

if (typeof document !== "undefined") {
  initializeForm();

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }
}

export default {
  initializeForm,
  validateUsername,
  validatePassword,
  fetchUserByUsername,
  handleLoginSubmit,
  setNavigationTarget,
  redirectToDashboard
};
