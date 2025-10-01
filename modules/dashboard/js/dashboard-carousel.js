// dashboard-carousel.js
// Renderiza la lista de tareas sin carrusel para el dashboard principal.

import { supabaseClient } from "../../../lib/supabaseClient.js";
import { resolveCurrentUserId } from "../../../lib/authGuard.js";

const tasksList = document.querySelector("#tasksList");
const tasksEmptyMessage = document.querySelector("#tasksEmptyMessage");
const tasksAllButton = document.querySelector("#tasksCarouselAllButton");

const STATUS_CLASS_MAP = {
  pendiente: "task-card__status--pendiente",
  completado: "task-card__status--completado",
  "en-progreso": "task-card__status--en-progreso",
  progreso: "task-card__status--en-progreso",
  cancelado: "task-card__status--cancelado"
};

const PRIORITY_EMOJI_MAP = {
  alta: "🔴",
  media: "🟡",
  baja: "🟢"
};

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

function resolveTaskTitleIcon(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "completado" ? "✅" : "📅";
}

function createPriorityBadge(priority) {
  const normalized = String(priority || "").trim().toLowerCase();
  const badge = document.createElement("span");
  badge.className = "task-card__priority-badge";

  const emoji = PRIORITY_EMOJI_MAP[normalized] ?? PRIORITY_EMOJI_MAP.media;
  badge.textContent = `${emoji} ${formatPriority(priority)}`;

  return badge;
}

function createTaskItem(task) {
  const item = document.createElement("li");
  item.className = "task-card";

  const titleRow = document.createElement("div");
  titleRow.className = "task-card__title-row";

  const titleGroup = document.createElement("div");
  titleGroup.className = "task-card__title-group";

  const titleIcon = document.createElement("span");
  titleIcon.className = "task-card__title-icon";
  titleIcon.textContent = resolveTaskTitleIcon(task.status);

  const title = document.createElement("h3");
  title.className = "task-card__title";
  title.textContent = task.title || "Tarea sin título";

  titleGroup.append(titleIcon, title);

  const priority = createPriorityBadge(task.priority);

  titleRow.append(titleGroup, priority);

  const meta = document.createElement("div");
  meta.className = "task-card__meta";

  const date = document.createElement("span");
  date.className = "task-card__meta-item";
  date.textContent = `📅 ${formatDate(task.due_date)}`;

  meta.append(date);

  const status = document.createElement("span");
  status.className = `task-card__status ${resolveStatusClass(task.status)}`;
  status.textContent = formatStatus(task.status);

  item.append(titleRow, meta, status);

  return item;
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

export async function renderTasksList() {
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

export function initializeTasksPanel() {
  if (tasksAllButton) {
    tasksAllButton.setAttribute("href", "../tareas/index.html");
  }

  renderTasksList();
}
