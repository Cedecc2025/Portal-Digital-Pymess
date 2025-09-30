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
const tasksEmptyMessage = document.querySelector("#tasksEmptyMessage");
const tasksAllButton = document.querySelector("#tasksAllButton");

const PRIORITY_ICON_MAP = {
  baja: "🟢",
  media: "🟡",
  alta: "🔴"
};

const STATUS_CLASS_MAP = {
  pendiente: "task-card__status--pendiente",
  completado: "task-card__status--completado",
  "en-progreso": "task-card__status--en-progreso",
  progreso: "task-card__status--en-progreso",
  cancelado: "task-card__status--cancelado"
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
    switch (card.dataset.module) {
      case "costos": {
        card.setAttribute("href", "../costos/index.html");
        break;
      }
      case "estrategias": {
        card.setAttribute("href", "../estrategias/index.html");
        break;
      }
      default: {
        break;
      }
    }
  });
}

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

function formatPriority(priority) {
  if (!priority) {
    return "Media";
  }

  const normalized = String(priority).trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function resolvePriorityIcon(priority) {
  const normalized = String(priority || "").trim().toLowerCase();
  return PRIORITY_ICON_MAP[normalized] ?? PRIORITY_ICON_MAP.media;
}

function formatStatus(status) {
  if (!status) {
    return "Pendiente";
  }

  const normalized = String(status).replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function resolveStatusClass(status) {
  const normalized = String(status || "").trim().toLowerCase().replaceAll("_", "-");
  return STATUS_CLASS_MAP[normalized] ?? STATUS_CLASS_MAP.pendiente;
}

function createTaskItem(task) {
  const item = document.createElement("li");
  item.className = "task-card";

  const header = document.createElement("div");
  header.className = "task-card__header";

  const title = document.createElement("h3");
  title.className = "task-card__title";
  title.textContent = task.title || "Tarea sin título";

  const priority = document.createElement("span");
  priority.className = `task-card__priority ${resolvePriorityClass(task.priority)}`;
  priority.textContent = `${resolvePriorityIcon(task.priority)} ${formatPriority(task.priority)}`;

  header.append(title, priority);

  const meta = document.createElement("div");
  meta.className = "task-card__meta";

  const date = document.createElement("span");
  date.className = "task-card__meta-item";
  date.textContent = `📅 ${formatDate(task.due_date)}`;

  meta.append(date);

  const status = document.createElement("span");
  status.className = `task-card__status ${resolveStatusClass(task.status)}`;
  status.textContent = formatStatus(task.status);

  item.append(header, meta, status);

  return item;
}

function resolvePriorityClass(priority) {
  const normalized = String(priority || "").trim().toLowerCase();

  if (normalized === "alta") {
    return "task-card__priority--alta";
  }

  if (normalized === "baja") {
    return "task-card__priority--baja";
  }

  return "task-card__priority--media";
}

function showTasksLoading() {
  if (!tasksList) {
    return;
  }

  tasksList.innerHTML = "";
  const loadingItem = document.createElement("li");
  loadingItem.className = "task-card task-card--loading";
  loadingItem.textContent = "Cargando tus tareas...";
  tasksList.appendChild(loadingItem);

  if (tasksEmptyMessage) {
    tasksEmptyMessage.hidden = true;
  }
}

// Solicita las tareas al backend y las muestra en la lista.
async function loadTasks() {
  if (!tasksList) {
    return;
  }

  showTasksLoading();

  const userId = await resolveCurrentUserId();

  if (!userId) {
    tasksList.innerHTML = "";
    const errorItem = document.createElement("li");
    errorItem.className = "task-card task-card--loading";
    errorItem.textContent = "No se pudo obtener tu información de usuario.";
    tasksList.appendChild(errorItem);
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

    const tasks = Array.isArray(data) ? data.slice(0, 3) : [];

    tasksList.innerHTML = "";

    if (tasks.length === 0) {
      if (tasksEmptyMessage) {
        tasksEmptyMessage.hidden = false;
      }

      return;
    }

    if (tasksEmptyMessage) {
      tasksEmptyMessage.hidden = true;
    }

    tasks.forEach((task) => {
      tasksList.appendChild(createTaskItem(task));
    });
  } catch (error) {
    console.error("Error al cargar las tareas del dashboard", error);
    tasksList.innerHTML = "";
    const errorItem = document.createElement("li");
    errorItem.className = "task-card task-card--loading";
    errorItem.textContent = "No fue posible cargar tus tareas.";
    tasksList.appendChild(errorItem);
  }
}

function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  if (tasksAllButton) {
    tasksAllButton.setAttribute("href", "../tareas/index.html");
  }
}

requireAuth();
loadUsername();
configureModuleCards();
registerEventListeners();
loadTasks();
