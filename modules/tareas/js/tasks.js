// tasks.js
// Controla las operaciones de lectura y escritura del módulo de tareas.

import {
  requireAuth,
  logout,
  resolveCurrentUserId
} from "../../../lib/authGuard.js";
import { supabaseClient } from "../../../lib/supabaseClient.js";

const logoutButton = document.querySelector("#logoutButton");
const refreshButton = document.querySelector("#refreshButton");
const taskForm = document.querySelector("#taskForm");
const taskTitleInput = document.querySelector("#taskTitle");
const taskOwnerInput = document.querySelector("#taskOwner");
const taskDueDateInput = document.querySelector("#taskDueDate");
const taskPrioritySelect = document.querySelector("#taskPriority");
const taskStatusSelect = document.querySelector("#taskStatus");
const taskDescriptionInput = document.querySelector("#taskDescription");
const formFeedbackElement = document.querySelector("#formFeedback");
const listFeedbackElement = document.querySelector("#listFeedback");
const tasksListElement = document.querySelector("#tasksList");
const cancelEditButton = document.querySelector("#cancelEditButton");
const submitButton = document.querySelector("#submitButton");
const formTitleElement = document.querySelector("#formTitle");

let currentUserId = null;
let editingTaskId = null;
let tasksCache = [];

requireAuth();

function setFeedback(element, message, type) {
  if (!element) {
    return;
  }

  element.textContent = message ?? "";
  element.classList.remove("tasks-feedback--success", "tasks-feedback--error");

  if (!message) {
    return;
  }

  if (type === "success") {
    element.classList.add("tasks-feedback--success");
  } else if (type === "error") {
    element.classList.add("tasks-feedback--error");
  }
}

function formatDateForInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function renderTasks(tasks) {
  if (!tasksListElement) {
    return;
  }

  tasksListElement.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    setFeedback(listFeedbackElement, "Aún no has registrado tareas.");
    return;
  }

  setFeedback(listFeedbackElement, "");

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "tasks-list__item";
    card.dataset.taskId = String(task.id);

    const mainColumn = document.createElement("div");
    mainColumn.className = "tasks-list__main";

    const titleElement = document.createElement("h3");
    titleElement.className = "tasks-list__title";
    titleElement.textContent = task.title;

    mainColumn.appendChild(titleElement);

    if (task.description) {
      const descriptionElement = document.createElement("p");
      descriptionElement.className = "tasks-list__description";
      descriptionElement.textContent = task.description;
      mainColumn.appendChild(descriptionElement);
    }

    const metaRow = document.createElement("div");
    metaRow.className = "tasks-list__meta";
    metaRow.innerHTML = `👤 ${task.owner} · 📅 ${new Date(task.due_date).toLocaleDateString("es-CR")}`;
    mainColumn.appendChild(metaRow);

    const badgesRow = document.createElement("div");
    badgesRow.className = "tasks-list__meta";

    const statusBadge = document.createElement("span");
    statusBadge.className = "tasks-badge tasks-badge--status";
    statusBadge.textContent = `Estado: ${task.status}`;

    const priorityBadge = document.createElement("span");
    priorityBadge.className = "tasks-badge tasks-badge--priority";
    priorityBadge.textContent = `Prioridad: ${task.priority}`;

    badgesRow.appendChild(statusBadge);
    badgesRow.appendChild(priorityBadge);

    mainColumn.appendChild(badgesRow);

    const actionsColumn = document.createElement("div");
    actionsColumn.className = "tasks-list__actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "tasks-action tasks-action--edit";
    editButton.dataset.action = "edit";
    editButton.dataset.taskId = String(task.id);
    editButton.textContent = "✏️ Editar";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "tasks-action tasks-action--delete";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.taskId = String(task.id);
    deleteButton.textContent = "🗑️ Eliminar";

    actionsColumn.appendChild(editButton);
    actionsColumn.appendChild(deleteButton);

    card.appendChild(mainColumn);
    card.appendChild(actionsColumn);

    tasksListElement.appendChild(card);
  });
}

async function logTaskHistory(taskId, action, notes = null) {
  try {
    await supabaseClient.from("tareas_historial").insert([
      {
        tarea_id: taskId,
        action,
        notes
      }
    ]);
  } catch (error) {
    console.warn("No fue posible registrar el historial de la tarea", error);
  }
}

async function fetchTasks() {
  if (!currentUserId) {
    return;
  }

  setFeedback(listFeedbackElement, "Cargando tareas...");

  try {
    const { data, error } = await supabaseClient
      .from("tareas")
      .select("id, title, description, owner, priority, status, due_date, updated_at")
      .eq("user_id", currentUserId)
      .order("due_date", { ascending: true });

    if (error) {
      throw error;
    }

    tasksCache = data ?? [];
    renderTasks(tasksCache);
  } catch (error) {
    console.error("Error al cargar las tareas", error);
    setFeedback(listFeedbackElement, "No fue posible cargar las tareas registradas.", "error");
  }
}

function resetForm() {
  if (!taskForm) {
    return;
  }

  taskForm.reset();
  taskPrioritySelect.value = "media";
  taskStatusSelect.value = "pendiente";
  editingTaskId = null;

  if (submitButton) {
    submitButton.textContent = "Guardar tarea";
  }

  if (formTitleElement) {
    formTitleElement.textContent = "Registrar tarea";
  }

  if (cancelEditButton) {
    cancelEditButton.classList.add("tasks-secondary--hidden");
  }
}

function hydrateForm(task) {
  if (!task) {
    return;
  }

  editingTaskId = task.id;

  if (taskTitleInput) {
    taskTitleInput.value = task.title ?? "";
  }

  if (taskOwnerInput) {
    taskOwnerInput.value = task.owner ?? "";
  }

  if (taskDueDateInput) {
    taskDueDateInput.value = formatDateForInput(task.due_date);
  }

  if (taskPrioritySelect) {
    taskPrioritySelect.value = task.priority ?? "media";
  }

  if (taskStatusSelect) {
    taskStatusSelect.value = task.status ?? "pendiente";
  }

  if (taskDescriptionInput) {
    taskDescriptionInput.value = task.description ?? "";
  }

  if (submitButton) {
    submitButton.textContent = "Actualizar tarea";
  }

  if (formTitleElement) {
    formTitleElement.textContent = "Editar tarea";
  }

  if (cancelEditButton) {
    cancelEditButton.classList.remove("tasks-secondary--hidden");
  }
}

function validateForm() {
  const title = taskTitleInput ? taskTitleInput.value.trim() : "";
  const owner = taskOwnerInput ? taskOwnerInput.value.trim() : "";
  const dueDate = taskDueDateInput ? taskDueDateInput.value : "";

  if (title.length < 3) {
    setFeedback(formFeedbackElement, "El título debe tener al menos 3 caracteres.", "error");
    return false;
  }

  if (owner.length < 3) {
    setFeedback(formFeedbackElement, "El responsable debe tener al menos 3 caracteres.", "error");
    return false;
  }

  if (!dueDate) {
    setFeedback(formFeedbackElement, "Selecciona una fecha límite para la tarea.", "error");
    return false;
  }

  return true;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!currentUserId) {
    setFeedback(formFeedbackElement, "No se pudo identificar al usuario actual.", "error");
    return;
  }

  if (!validateForm()) {
    return;
  }

  const payload = {
    title: taskTitleInput.value.trim(),
    owner: taskOwnerInput.value.trim(),
    due_date: taskDueDateInput.value,
    priority: taskPrioritySelect.value,
    status: taskStatusSelect.value,
    description: taskDescriptionInput.value.trim() || null,
    user_id: currentUserId
  };

  try {
    if (editingTaskId) {
      const { data, error } = await supabaseClient
        .from("tareas")
        .update(payload)
        .eq("id", editingTaskId)
        .eq("user_id", currentUserId)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      setFeedback(formFeedbackElement, "Tarea actualizada correctamente.", "success");
      await logTaskHistory(editingTaskId, "actualizada");
    } else {
      const { data, error } = await supabaseClient
        .from("tareas")
        .insert([payload])
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      setFeedback(formFeedbackElement, "Tarea creada correctamente.", "success");

      if (data && data.id) {
        await logTaskHistory(data.id, "creada");
      }
    }

    resetForm();
    await fetchTasks();
  } catch (error) {
    console.error("Error al guardar la tarea", error);
    setFeedback(formFeedbackElement, "No fue posible guardar la tarea.", "error");
  }
}

async function handleDelete(taskId) {
  if (!currentUserId) {
    setFeedback(listFeedbackElement, "No se pudo identificar al usuario actual.", "error");
    return;
  }

  const confirmation = window.confirm("¿Deseas eliminar esta tarea?");

  if (!confirmation) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("tareas")
      .delete()
      .eq("id", taskId)
      .eq("user_id", currentUserId);

    if (error) {
      throw error;
    }

    if (editingTaskId === taskId) {
      resetForm();
    }

    setFeedback(listFeedbackElement, "Tarea eliminada correctamente.", "success");
    await fetchTasks();
  } catch (error) {
    console.error("Error al eliminar la tarea", error);
    setFeedback(listFeedbackElement, "No fue posible eliminar la tarea.", "error");
  }
}

function handleListClick(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton || !tasksListElement.contains(actionButton)) {
    return;
  }

  const taskId = Number.parseInt(actionButton.dataset.taskId, 10);

  if (!Number.isFinite(taskId)) {
    return;
  }

  const task = tasksCache.find((item) => item.id === taskId);

  switch (actionButton.dataset.action) {
    case "edit": {
      if (task) {
        hydrateForm(task);
        setFeedback(formFeedbackElement, "Listo para editar la tarea seleccionada.", "success");
      }
      break;
    }
    case "delete": {
      handleDelete(taskId);
      break;
    }
    default: {
      break;
    }
  }
}

function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      fetchTasks();
    });
  }

  if (taskForm) {
    taskForm.addEventListener("submit", handleSubmit);
  }

  if (tasksListElement) {
    tasksListElement.addEventListener("click", handleListClick);
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener("click", () => {
      resetForm();
      setFeedback(formFeedbackElement, "Edición cancelada.");
    });
  }
}

async function initialize() {
  currentUserId = await resolveCurrentUserId();

  if (!currentUserId) {
    setFeedback(listFeedbackElement, "No se pudo obtener la sesión del usuario.", "error");
    setFeedback(formFeedbackElement, "No se pudo obtener la sesión del usuario.", "error");
    return;
  }

  await fetchTasks();
}

registerEventListeners();
initialize();
