// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import {
  requireAuth,
  getCurrentUsername,
  logout,
  resolveCurrentUserId
} from "../../../lib/authGuard.js";
import { supabaseClient } from "../../../lib/supabaseClient.js";

const usernameDisplay = document.querySelector("#usernameDisplay");
const logoutButton = document.querySelector("#logoutButton");
const moduleCards = document.querySelectorAll(".module-card");
const tasksList = document.querySelector("#tasksList");
const tasksStatus = document.querySelector("#tasksStatus");
const tasksViewAllButton = document.querySelector("#tasksViewAllButton");

const PRIORITY_ICON_MAP = {
  alta: { icon: "🔴", label: "Alta" },
  media: { icon: "🟡", label: "Media" },
  baja: { icon: "🟢", label: "Baja" }
};

const STATUS_LABEL_MAP = {
  pendiente: "Pendiente",
  completado: "Completado",
  "en-progreso": "En progreso"
};

// Obtiene y coloca el nombre del usuario autenticado en la cabecera.
function loadUsername() {
  const username = getCurrentUsername();

  if (!usernameDisplay) {
    return;
  }

  if (username) {
    usernameDisplay.textContent = username; // Muestra el nombre real si existe.
  } else {
    usernameDisplay.textContent = "Usuario"; // Valor por defecto cuando no hay nombre.
  }
}

// Renderiza los módulos accesibles del dashboard con sus enlaces definitivos.
function configureModuleCards() {
  moduleCards.forEach((card) => {
    const actionLink = card.querySelector("[data-module-link]");

    switch (card.dataset.module) {
      case "costos": {
        if (actionLink) {
          actionLink.setAttribute("href", "../costos/index.html");
        }
        break;
      }
      case "estrategias": {
        if (actionLink) {
          actionLink.setAttribute("href", "../estrategias/index.html");
        }
        break;
      }
      default: {
        break;
      }
    }
  });
}

// Formatea la fecha en un formato legible.
function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function normalizePriority(priority) {
  const key = String(priority || "media").toLowerCase().trim();
  return PRIORITY_ICON_MAP[key] ? key : "media";
}

function normalizeStatus(status) {
  const key = String(status || "pendiente").toLowerCase().trim().replaceAll("_", "-");
  return STATUS_LABEL_MAP[key] ? key : "pendiente";
}

function showTasksStatus(message) {
  if (tasksStatus) {
    tasksStatus.textContent = message;
    tasksStatus.hidden = false;
  }

  if (tasksList) {
    tasksList.innerHTML = "";
  }
}

function hideTasksStatus() {
  if (tasksStatus) {
    tasksStatus.hidden = true;
  }
}

function renderTaskItem(task) {
  const priorityKey = normalizePriority(task.priority);
  const statusKey = normalizeStatus(task.status);

  const item = document.createElement("li");
  item.className = "task-card";

  const title = document.createElement("h3");
  title.className = "task-card__title";
  title.textContent = task.title || "Tarea sin título";

  const dueDate = document.createElement("p");
  dueDate.className = "task-card__due-date";
  dueDate.textContent = formatDate(task.due_date);

  const meta = document.createElement("div");
  meta.className = "task-card__meta";

  const priority = document.createElement("span");
  priority.className = "task-card__priority";
  const priorityInfo = PRIORITY_ICON_MAP[priorityKey];
  priority.textContent = `${priorityInfo.icon} ${priorityInfo.label}`;

  const status = document.createElement("span");
  status.className = "task-card__status";
  status.textContent = STATUS_LABEL_MAP[statusKey];

  meta.append(priority, status);

  item.append(title, dueDate, meta);

  return item;
}

function renderTasksList(tasks) {
  if (!tasksList) {
    return;
  }

  const visibleTasks = Array.isArray(tasks) ? tasks.slice(0, 2) : [];

  if (visibleTasks.length === 0) {
    showTasksStatus("No tienes tareas asignadas por ahora.");
    return;
  }

  hideTasksStatus();

  tasksList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  visibleTasks.forEach((task) => {
    fragment.appendChild(renderTaskItem(task));
  });

  tasksList.appendChild(fragment);
}

// Solicita las tareas al backend y las muestra en la lista.
async function loadDashboardTasks() {
  showTasksStatus("Cargando tus tareas...");

  const userId = await resolveCurrentUserId();

  if (!userId) {
    showTasksStatus("No se pudo obtener tu información de usuario.");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("tareas")
      .select("id, title, priority, status, due_date")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    if (error) {
      throw error;
    }

    renderTasksList(data ?? []);
  } catch (error) {
    console.error("Error al cargar las tareas del dashboard", error);
    showTasksStatus("No fue posible cargar tus tareas.");
  }
}

function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  if (tasksViewAllButton) {
    tasksViewAllButton.setAttribute("href", "../tareas/index.html");
  }
}

requireAuth();
loadUsername();
configureModuleCards();
registerEventListeners();
loadDashboardTasks();
