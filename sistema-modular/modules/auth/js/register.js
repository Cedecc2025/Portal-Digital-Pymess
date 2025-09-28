// register.js
// Gestiona la creación de nuevos usuarios en Supabase.

import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";
import { supabaseClient } from "/lib/supabaseClient.js";

const registerForm = document.querySelector("#registerForm");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const usernameFeedback = document.querySelector("#usernameFeedback");
const passwordFeedback = document.querySelector("#passwordFeedback");
const generalFeedback = document.querySelector("#generalFeedback");

// Inicializa la pantalla asegurando que no existan mensajes previos.
function initializeForm() {
  usernameFeedback.textContent = "";
  passwordFeedback.textContent = "";
  generalFeedback.textContent = "";
}

// Verifica que el username cumpla con la política establecida.
function validateUsername(username) {
  const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/;

  if (usernamePattern.test(username) === false) {
    usernameFeedback.textContent = "El usuario debe tener entre 3 y 20 caracteres alfanuméricos, guion o guion bajo.";
    return false;
  }

  usernameFeedback.textContent = "";
  return true;
}

// Valida que la contraseña tenga la longitud mínima requerida.
function validatePassword(password) {
  if (password.length < 8) {
    passwordFeedback.textContent = "La contraseña debe tener al menos 8 caracteres.";
    return false;
  }

  passwordFeedback.textContent = "";
  return true;
}

// Inserta al nuevo usuario en Supabase con contraseña hasheada.
async function registerUser(username, password) {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const { error } = await supabaseClient.from("usuarios").insert({
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
function showSuccessMessage() {
  generalFeedback.style.color = "#bbf7d0";
  generalFeedback.textContent = "Registro exitoso. Ahora puedes iniciar sesión.";
  registerForm.reset();
}

// Maneja el envío del formulario de registro.
async function handleRegisterSubmit(event) {
  event.preventDefault();
  generalFeedback.style.color = "#fca5a5";
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
    await registerUser(username, password);
    showSuccessMessage();
  } catch (error) {
    generalFeedback.textContent = error.message;
  }
}

initializeForm();
registerForm.addEventListener("submit", handleRegisterSubmit);
