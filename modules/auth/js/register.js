// register.js
// Gestiona la creación de nuevos usuarios en Supabase.

import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";
import { supabaseClient } from "../../../lib/supabaseClient.js";
import { gotoFromModule } from "../../../lib/pathUtil.js";

let registerForm = null;
let usernameInput = null;
let passwordInput = null;
let usernameFeedback = null;
let passwordFeedback = null;
let registerFeedback = null;
let usernameWrapper = null;
let passwordWrapper = null;
let usernameAvailability = null;
let strengthBar = null;
let strengthCopy = null;
let registerSubmitButton = null;
let navigationHandler = (relativeTarget) => {
  // Utiliza la ruta del módulo actual para calcular el destino final.
  gotoFromModule(import.meta.url, relativeTarget);
};

if (typeof document !== "undefined") {
  registerForm = document.querySelector("#registerForm");
  usernameInput = document.querySelector("#username");
  passwordInput = document.querySelector("#password");
  usernameFeedback = document.querySelector("#usernameFeedback");
  passwordFeedback = document.querySelector("#passwordFeedback");
  registerFeedback = document.querySelector("#registerFeedback");
  usernameWrapper = document.querySelector("#usernameWrapper");
  passwordWrapper = document.querySelector("#passwordWrapper");
  usernameAvailability = document.querySelector("#usernameAvailability");
  strengthBar = document.querySelector(".strength-bar");
  strengthCopy = document.querySelector("#strengthCopy");
  registerSubmitButton = document.querySelector("#registerSubmit");
}

// Inicializa la pantalla asegurando que no existan mensajes previos.
export function initializeForm(feedbackElements = {}) {
  const usernameElement = feedbackElements.usernameFeedback ?? usernameFeedback;
  const passwordElement = feedbackElements.passwordFeedback ?? passwordFeedback;
  const registerElement = feedbackElements.registerFeedback ?? registerFeedback;

  if (usernameElement) {
    usernameElement.textContent = "";
  }

  if (passwordElement) {
    passwordElement.textContent = "";
  }

  if (registerElement) {
    registerElement.textContent = "";
    registerElement.classList.remove("error");
  }

  if (usernameWrapper) {
    usernameWrapper.classList.remove("input-valid", "input-invalid");
  }

  if (passwordWrapper) {
    passwordWrapper.classList.remove("input-valid", "input-invalid");
  }

  if (usernameAvailability) {
    usernameAvailability.textContent = "";
    usernameAvailability.classList.remove("available", "unavailable");
  }

  updatePasswordStrengthDisplay(0);
}

// Verifica que el username cumpla con la política establecida.
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

// Valida que la contraseña tenga la longitud mínima requerida.
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

// Inserta al nuevo usuario en Supabase con contraseña hasheada.
export async function registerUser(username, password, client = supabaseClient) {
  try {
    const passwordHash = bcrypt.hashSync(password, 10);

    const { error } = await client.from("usuarios").insert({
      username: username,
      password: passwordHash
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error al registrar usuario", error);

    if (error.code === "23505") {
      throw new Error("El usuario ya se encuentra registrado. Elige otro nombre.");
    }

    throw new Error("No se pudo completar el registro. Intenta más tarde.");
  }
}

// Resetea el formulario mostrando un mensaje de éxito.
export function showSuccessMessage(form = registerForm, feedbackElement = registerFeedback) {
  if (feedbackElement) {
    feedbackElement.classList.remove("error");
    feedbackElement.textContent = "Registro exitoso. Ahora puedes iniciar sesión.";
  }

  if (usernameWrapper) {
    usernameWrapper.classList.remove("input-invalid");
    usernameWrapper.classList.add("input-valid");
  }

  if (passwordWrapper) {
    passwordWrapper.classList.remove("input-invalid");
    passwordWrapper.classList.add("input-valid");
  }

  if (form) {
    form.reset();
  }
}

// Calcula una puntuación simple para la contraseña en función de su complejidad.
export function passwordScore(password) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  return Math.min(score, 3);
}

// Actualiza la interfaz de la barra de fortaleza de contraseña.
export function updatePasswordStrengthDisplay(score) {
  if (!strengthBar || !strengthCopy) {
    return;
  }

  strengthBar.dataset.level = String(score);

  switch (score) {
    case 0:
      strengthCopy.textContent = "Fortaleza: muy débil";
      break;
    case 1:
      strengthCopy.textContent = "Fortaleza: débil";
      break;
    case 2:
      strengthCopy.textContent = "Fortaleza: media";
      break;
    case 3:
      strengthCopy.textContent = "Fortaleza: fuerte";
      break;
    default:
      strengthCopy.textContent = "Fortaleza: desconocida";
      break;
  }
}

// Cambia el estado de carga del formulario para evitar envíos duplicados.
export function setRegisterLoading(isLoading) {
  if (registerSubmitButton) {
    registerSubmitButton.toggleAttribute("disabled", isLoading);
  }

  if (usernameInput) {
    usernameInput.toggleAttribute("disabled", isLoading);
  }

  if (passwordInput) {
    passwordInput.toggleAttribute("disabled", isLoading);
  }
}

// Consulta en Supabase si el nombre de usuario ya está registrado.
export async function checkUsernameAvailability(username, client = supabaseClient) {
  if (validateUsername(username) === false) {
    return false;
  }

  try {
    const { data, error } = await client
      .from("usuarios")
      .select("id")
      .eq("username", username)
      .limit(1);

    if (error) {
      throw error;
    }

    const isAvailable = !data || data.length === 0;

    if (usernameAvailability) {
      usernameAvailability.textContent = isAvailable
        ? "Disponible"
        : "Este usuario ya está registrado.";
      usernameAvailability.classList.toggle("available", isAvailable);
      usernameAvailability.classList.toggle("unavailable", !isAvailable);
    }

    if (!isAvailable && usernameWrapper) {
      usernameWrapper.classList.remove("input-valid");
      usernameWrapper.classList.add("input-invalid");
    }

    if (!isAvailable && usernameInput) {
      usernameInput.setAttribute("aria-invalid", "true");
    }

    return isAvailable;
  } catch (error) {
    console.error("Error al validar disponibilidad", error);
    if (usernameAvailability) {
      usernameAvailability.textContent = "No pudimos validar la disponibilidad.";
      usernameAvailability.classList.remove("available");
      usernameAvailability.classList.add("unavailable");
    }
    return false;
  }
}

// Muestra mensajes generales en la parte inferior del formulario.
function showRegisterFeedback(message, type = "success") {
  if (!registerFeedback) {
    return;
  }

  registerFeedback.textContent = message;
  registerFeedback.classList.toggle("error", type === "error");
}

// Permite inyectar un manejador personalizado de navegación (útil en pruebas unitarias).
export function setNavigationHandler(handler) {
  if (typeof handler === "function") {
    navigationHandler = handler;
  }
}

// Redirige a la pantalla de login utilizando la ruta relativa adecuada.
export function redirectToLogin(handler = navigationHandler) {
  if (typeof handler === "function") {
    handler("../login.html");
  }
}

// Maneja el envío del formulario de registro.
export async function handleRegisterSubmit(event) {
  event.preventDefault();
  showRegisterFeedback("", "success");

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  const isUsernameValid = validateUsername(username);
  const isPasswordValid = validatePassword(password);

  if (isUsernameValid === false || isPasswordValid === false) {
    showRegisterFeedback("Verifica la información ingresada.", "error");
    if (!isUsernameValid && usernameWrapper) {
      usernameWrapper.classList.add("input-invalid");
    }
    if (!isPasswordValid && passwordWrapper) {
      passwordWrapper.classList.add("input-invalid");
    }
    return;
  }

  try {
    setRegisterLoading(true);
    showRegisterFeedback("Creando tu cuenta...", "success");
    const available = await checkUsernameAvailability(username);

    if (!available) {
      showRegisterFeedback("El usuario ya se encuentra registrado. Elige otro nombre.", "error");
      setRegisterLoading(false);
      return;
    }

    await registerUser(username, password);
    showSuccessMessage();
    window.setTimeout(() => {
      redirectToLogin();
    }, 1200);
  } catch (error) {
    showRegisterFeedback(error.message, "error");
    if (error.message.includes("usuario")) {
      if (usernameWrapper) {
        usernameWrapper.classList.remove("input-valid");
        usernameWrapper.classList.add("input-invalid");
      }
    }
    if (passwordWrapper) {
      passwordWrapper.classList.remove("input-valid");
      passwordWrapper.classList.add("input-invalid");
    }
  } finally {
    setRegisterLoading(false);
  }
}

if (typeof document !== "undefined") {
  initializeForm();

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }

  if (usernameInput) {
    usernameInput.addEventListener("blur", () => {
      if (usernameInput.value.trim().length >= 3) {
        checkUsernameAvailability(usernameInput.value.trim());
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", () => {
      const score = passwordScore(passwordInput.value);
      updatePasswordStrengthDisplay(score);
    });
  }
}

export default {
  initializeForm,
  validateUsername,
  validatePassword,
  passwordScore,
  updatePasswordStrengthDisplay,
  setRegisterLoading,
  checkUsernameAvailability,
  registerUser,
  showSuccessMessage,
  setNavigationHandler,
  redirectToLogin,
  handleRegisterSubmit
};
