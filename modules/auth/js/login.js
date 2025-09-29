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
let loginFeedback = null;
let usernameWrapper = null;
let passwordWrapper = null;
let loginSubmitButton = null;
let navigationHandler = (relativeTarget) => {
  // Navega utilizando rutas relativas calculadas desde este módulo.
  gotoFromModule(import.meta.url, relativeTarget);
};

if (typeof document !== "undefined") {
  loginForm = document.querySelector("#loginForm");
  usernameInput = document.querySelector("#username");
  passwordInput = document.querySelector("#password");
  rememberMeInput = document.querySelector("#rememberMe");
  usernameFeedback = document.querySelector("#usernameFeedback");
  passwordFeedback = document.querySelector("#passwordFeedback");
  loginFeedback = document.querySelector("#loginFeedback");
  usernameWrapper = document.querySelector("#usernameWrapper");
  passwordWrapper = document.querySelector("#passwordWrapper");
  loginSubmitButton = document.querySelector("#loginSubmit");
}

// Inicializa la pantalla limpiando cualquier mensaje previo.
export function initializeForm(feedbackElements = {}) {
  // Se asegura que todos los contenedores de feedback estén vacíos.
  const usernameElement = feedbackElements.usernameFeedback ?? usernameFeedback;
  const passwordElement = feedbackElements.passwordFeedback ?? passwordFeedback;
  const formElement = feedbackElements.loginFeedback ?? loginFeedback;

  if (usernameElement) {
    usernameElement.textContent = "";
  }

  if (passwordElement) {
    passwordElement.textContent = "";
  }

  if (formElement) {
    formElement.textContent = "";
    formElement.classList.remove("error");
  }

  if (usernameWrapper) {
    usernameWrapper.classList.remove("input-valid", "input-invalid");
  }

  if (passwordWrapper) {
    passwordWrapper.classList.remove("input-valid", "input-invalid");
  }
}

// Valida si el username cumple los criterios.
export function validateUsername(username, feedbackElement = usernameFeedback) {
  const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/;

  if (usernamePattern.test(username) === false) {
    if (feedbackElement) {
      feedbackElement.textContent = "El usuario debe tener entre 3 y 20 caracteres alfanuméricos, guion o guion bajo.";
    }
    if (usernameWrapper) {
      usernameWrapper.classList.remove("input-valid");
      usernameWrapper.classList.add("input-invalid");
    }
    if (usernameInput) {
      usernameInput.setAttribute("aria-invalid", "true");
    }
    return false;
  }

  if (feedbackElement) {
    feedbackElement.textContent = "";
  }
  if (usernameWrapper) {
    usernameWrapper.classList.remove("input-invalid");
    usernameWrapper.classList.add("input-valid");
  }
  if (usernameInput) {
    usernameInput.setAttribute("aria-invalid", "false");
  }
  return true;
}

// Valida si el password es suficientemente largo.
export function validatePassword(password, feedbackElement = passwordFeedback) {
  if (password.length < 8) {
    if (feedbackElement) {
      feedbackElement.textContent = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (passwordWrapper) {
      passwordWrapper.classList.remove("input-valid");
      passwordWrapper.classList.add("input-invalid");
    }
    if (passwordInput) {
      passwordInput.setAttribute("aria-invalid", "true");
    }
    return false;
  }

  if (feedbackElement) {
    feedbackElement.textContent = "";
  }
  if (passwordWrapper) {
    passwordWrapper.classList.remove("input-invalid");
    passwordWrapper.classList.add("input-valid");
  }
  if (passwordInput) {
    passwordInput.setAttribute("aria-invalid", "false");
  }
  return true;
}

// Cambia el estado de carga del formulario para evitar envíos duplicados.
export function setLoadingState(isLoading) {
  if (loginSubmitButton) {
    loginSubmitButton.toggleAttribute("disabled", isLoading);
  }

  if (usernameInput) {
    usernameInput.toggleAttribute("disabled", isLoading);
  }

  if (passwordInput) {
    passwordInput.toggleAttribute("disabled", isLoading);
  }

  if (rememberMeInput) {
    rememberMeInput.toggleAttribute("disabled", isLoading);
  }
}

// Muestra un mensaje general en la parte inferior del formulario.
function showLoginFeedback(message, type = "success") {
  if (!loginFeedback) {
    return;
  }

  loginFeedback.textContent = message;
  loginFeedback.classList.toggle("error", type === "error");
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
  showLoginFeedback("", "success");

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  const isUsernameValid = validateUsername(username);
  const isPasswordValid = validatePassword(password);

  if (isUsernameValid === false || isPasswordValid === false) {
    showLoginFeedback("Verifica la información ingresada.", "error");
    if (!isUsernameValid && usernameWrapper) {
      usernameWrapper.classList.add("input-invalid");
    }
    if (!isPasswordValid && passwordWrapper) {
      passwordWrapper.classList.add("input-invalid");
    }
    return;
  }

  try {
    setLoadingState(true);
    showLoginFeedback("Validando tus credenciales...", "success");
    const user = await fetchUserByUsername(username);

    if (!user) {
      showLoginFeedback("Usuario o contraseña incorrectos.", "error");
      if (usernameWrapper) {
        usernameWrapper.classList.remove("input-valid");
        usernameWrapper.classList.add("input-invalid");
      }
      if (passwordWrapper) {
        passwordWrapper.classList.remove("input-valid");
        passwordWrapper.classList.add("input-invalid");
      }
      setLoadingState(false);
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (passwordMatches === false) {
      showLoginFeedback("Usuario o contraseña incorrectos.", "error");
      if (passwordWrapper) {
        passwordWrapper.classList.remove("input-valid");
        passwordWrapper.classList.add("input-invalid");
      }
      setLoadingState(false);
      return;
    }

    const rememberValue = rememberMeInput ? rememberMeInput.checked : false;
    saveSession({ username: user.username, id: user.id }, rememberValue);
    showLoginFeedback("Credenciales validadas, preparando tu panel...", "success");
    redirectToDashboard();
  } catch (error) {
    showLoginFeedback(error.message, "error");
    if (usernameWrapper) {
      usernameWrapper.classList.remove("input-valid");
      usernameWrapper.classList.add("input-invalid");
    }
    if (passwordWrapper) {
      passwordWrapper.classList.remove("input-valid");
      passwordWrapper.classList.add("input-invalid");
    }
  } finally {
    setLoadingState(false);
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

export default {
  initializeForm,
  validateUsername,
  validatePassword,
  setLoadingState,
  fetchUserByUsername,
  handleLoginSubmit,
  setNavigationHandler,
  redirectToDashboard
};
