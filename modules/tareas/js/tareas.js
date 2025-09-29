// tareas.js
// Controla la creación básica de tareas y protege el módulo tras el inicio de sesión.

import { supabaseClient } from "../../../lib/supabaseClient.js";
import { requireAuth, getCurrentUser, logout } from "../../../lib/authGuard.js";

const TASKS_TABLE = "tareas";

let taskForm = null;
let taskFeedback = null;
let taskSubmitButton = null;
let taskResetButton = null;
let logoutButton = null;

// Obtiene y guarda las referencias a los elementos del DOM utilizados en el módulo.
function cacheElements() {
  taskForm = document.querySelector("#taskForm");
  taskFeedback = document.querySelector("#taskFeedback");
  taskSubmitButton = document.querySelector("#taskSubmit");
  taskResetButton = document.querySelector("#taskReset");
  logoutButton = document.querySelector("#logoutButton");
}

// Muestra un mensaje al usuario indicando el resultado de la operación.
function showFeedback(message, type = "success") {
  if (!taskFeedback) {
    return;
  }

  taskFeedback.textContent = message;
  taskFeedback.classList.toggle("error", type === "error");
}

// Limpia los campos del formulario y los mensajes mostrados.
function resetForm() {
  if (taskForm) {
    taskForm.reset();
  }

  showFeedback("", "success");
}

// Habilita o deshabilita los controles del formulario durante la persistencia.
function toggleFormLoading(isLoading) {
  if (taskSubmitButton) {
    taskSubmitButton.toggleAttribute("disabled", isLoading);
  }

  if (taskResetButton) {
    taskResetButton.toggleAttribute("disabled", isLoading);
  }
}

// Verifica que los campos mínimos estén presentes antes de guardar.
function validateTaskPayload(payload) {
  const requiredTextFields = ["title", "owner", "priority"];
  const emptyField = requiredTextFields.find((field) => {
    const value = payload[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (emptyField) {
    throw new Error("Completa todos los campos obligatorios antes de guardar.");
  }

  if (!payload.due_date) {
    throw new Error("Selecciona una fecha límite para la tarea.");
  }
}

// Inserta la tarea en la tabla pública de Supabase.
async function persistTask(payload) {
  validateTaskPayload(payload);

  const { error } = await supabaseClient.from(TASKS_TABLE).insert(payload);

  if (error) {
    throw error;
  }
}

// Gestiona el envío del formulario, validando y guardando en Supabase.
async function handleTaskSubmit(event) {
  event.preventDefault();
  showFeedback("", "success");

  const currentUser = getCurrentUser();

  if (!currentUser || !currentUser.userId) {
    showFeedback("No pudimos validar tu sesión. Inicia sesión nuevamente.", "error");
    requireAuth();
    return;
  }

  if (!taskForm) {
    return;
  }

  const formData = new FormData(taskForm);
  const dueDateValue = formData.get("taskDueDate");
  const normalizedDueDate = dueDateValue ? String(dueDateValue).trim() : "";

  const taskPayload = {
    user_id: currentUser.userId,
    title: String(formData.get("taskTitle" ?? "")).trim(),
    owner: String(formData.get("taskOwner" ?? "")).trim(),
    priority: String(formData.get("taskPriority" ?? "")).trim(),
    due_date: normalizedDueDate,
    description: String(formData.get("taskDescription" ?? "")).trim()
  };

  try {
    toggleFormLoading(true);
    await persistTask(taskPayload);
    resetForm();
    showFeedback("✅ Tarea guardada correctamente.");
  } catch (error) {
    console.error("Error al guardar la tarea", error);
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "No se pudo guardar la tarea. Intenta nuevamente.";
    showFeedback(message, "error");
  } finally {
    toggleFormLoading(false);
  }
}

// Configura los eventos necesarios para el módulo.
function registerEventListeners() {
  if (taskForm) {
    taskForm.addEventListener("submit", handleTaskSubmit);
  }

  if (taskResetButton) {
    taskResetButton.addEventListener("click", () => {
      resetForm();
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }
}

// Punto de entrada: valida la sesión y prepara la interfaz.
function init() {
  requireAuth();
  cacheElements();
  registerEventListeners();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
