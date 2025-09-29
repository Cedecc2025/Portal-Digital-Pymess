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
let generalFeedback = null;
let usernameWrapper = null;
let passwordWrapper = null;
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
  generalFeedback = document.querySelector("#generalFeedback");
  usernameWrapper = document.querySelector("#usernameWrapper");
  passwordWrapper = document.querySelector("#passwordWrapper");
}

// Inicializa la pantalla asegurando que no existan mensajes previos.
export function initializeForm(feedbackElements = {}) {
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
    generalElement.style.color = "#fca5a5";
  }

  if (usernameWrapper) {
    usernameWrapper.classList.remove("input-valid", "input-invalid");
  }

  if (passwordWrapper) {
    passwordWrapper.classList.remove("input-valid", "input-invalid");
  }
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
    return false;
  }

  if (feedbackElement) {
    feedbackElement.textContent = "";
  }
  if (usernameWrapper) {
    usernameWrapper.classList.remove("input-invalid");
    usernameWrapper.classList.add("input-valid");
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
    return false;
  }

  if (feedbackElement) {
    feedbackElement.textContent = "";
  }
  if (passwordWrapper) {
    passwordWrapper.classList.remove("input-invalid");
    passwordWrapper.classList.add("input-valid");
  }
  return true;
}

// Inserta al nuevo usuario en Supabase con contraseña hasheada.
export async function registerUser(username, password, client = supabaseClient) {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

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
export function showSuccessMessage(form = registerForm, feedbackElement = generalFeedback) {
  if (feedbackElement) {
    feedbackElement.style.color = "#bbf7d0";
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
  if (generalFeedback) {
    generalFeedback.style.color = "#fca5a5";
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
    if (!isUsernameValid && usernameWrapper) {
      usernameWrapper.classList.add("input-invalid");
    }
    if (!isPasswordValid && passwordWrapper) {
      passwordWrapper.classList.add("input-invalid");
    }
    return;
  }

  try {
    await registerUser(username, password);
    showSuccessMessage();
    window.setTimeout(() => {
      redirectToLogin();
    }, 1200);
  } catch (error) {
    if (generalFeedback) {
      generalFeedback.textContent = error.message;
    }
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
  }
}

if (typeof document !== "undefined") {
  initializeForm();

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }
}

export default {
  initializeForm,
  validateUsername,
  validatePassword,
  registerUser,
  showSuccessMessage,
  setNavigationHandler,
  redirectToLogin,
  handleRegisterSubmit
};
