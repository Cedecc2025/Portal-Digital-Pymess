// login.js
// Controla la lógica de autenticación del formulario de inicio de sesión.

import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";
import { supabaseClient } from "/lib/supabaseClient.js";
import { saveSession } from "/lib/authGuard.js";

const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const rememberMeInput = document.querySelector("#rememberMe");
const usernameFeedback = document.querySelector("#usernameFeedback");
const passwordFeedback = document.querySelector("#passwordFeedback");
const generalFeedback = document.querySelector("#generalFeedback");

// Inicializa la pantalla limpiando cualquier mensaje previo.
function initializeForm() {
  // Se aseguran todos los contenedores de feedback estén vacíos.
  usernameFeedback.textContent = "";
  passwordFeedback.textContent = "";
  generalFeedback.textContent = "";
}

// Valida si el username cumple los criterios.
function validateUsername(username) {
  const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/;

  if (usernamePattern.test(username) === false) {
    usernameFeedback.textContent = "El usuario debe tener entre 3 y 20 caracteres alfanuméricos, guion o guion bajo.";
    return false;
  }

  usernameFeedback.textContent = "";
  return true;
}

// Valida si el password es suficientemente largo.
function validatePassword(password) {
  if (password.length < 8) {
    passwordFeedback.textContent = "La contraseña debe tener al menos 8 caracteres.";
    return false;
  }

  passwordFeedback.textContent = "";
  return true;
}

// Busca al usuario en Supabase y retorna sus datos.
async function fetchUserByUsername(username) {
  try {
    const { data, error } = await supabaseClient
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
async function handleLoginSubmit(event) {
  event.preventDefault();
  generalFeedback.textContent = "";

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  const isUsernameValid = validateUsername(username);
  const isPasswordValid = validatePassword(password);

  if (isUsernameValid === false || isPasswordValid === false) {
    generalFeedback.textContent = "Verifica la información ingresada.";
    return;
  }

  try {
    const user = await fetchUserByUsername(username);

    if (!user) {
      generalFeedback.textContent = "Usuario o contraseña incorrectos.";
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (passwordMatches === false) {
      generalFeedback.textContent = "Usuario o contraseña incorrectos.";
      return;
    }

    saveSession(user.username, rememberMeInput.checked);
    window.location.replace("/modules/dashboard/index.html");
  } catch (error) {
    generalFeedback.textContent = error.message;
  }
}

initializeForm();
loginForm.addEventListener("submit", handleLoginSubmit);
