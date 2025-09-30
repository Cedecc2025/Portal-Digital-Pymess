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
const activeModulesCountElement = document.querySelector("#activeModulesCount");
const activeModulesListElement = document.querySelector("#activeModulesList");
const tasksPreviewListElement = document.querySelector("#tasksPreviewList");
const tasksPreviewStatusElement = document.querySelector("#tasksPreviewStatus");

// Carga la información del usuario autenticado en el encabezado.
function loadUsername() {
  const username = getCurrentUsername();

  if (username) {
    usernameDisplay.textContent = username;
  } else {
    usernameDisplay.textContent = "Usuario";
  }
}

// Configura los listeners necesarios para la pantalla.
function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  moduleCards.forEach((card) => {
    // Se asegura que cada tarjeta mantenga un href correcto y sea navegable.
    switch (card.dataset.module) {
      case "costos": {
        card.setAttribute("href", "../costos/index.html");
        break;
      }
      case "estrategias": {
        card.setAttribute("href", "../estrategias/index.html");
        break;
      }
      case "tareas": {
        card.setAttribute("href", "../tareas/index.html");
        break;
      }
      default: {
        break;
      }
    }
  });
}

// Actualiza el KPI con el estado de los módulos activos.
function updateActiveModulesKpi() {
  if (!activeModulesCountElement || !activeModulesListElement) {
    return;
  }

  const activeModules = Array.from(moduleCards).map((card) => {
    const title = card.querySelector("h2");
    return title ? title.textContent.trim() : "";
  }).filter(Boolean);

  activeModulesCountElement.textContent = String(activeModules.length);

  if (activeModules.length > 0) {
    activeModulesListElement.textContent = activeModules.join(", ");
  } else {
    activeModulesListElement.textContent = "No hay módulos activos disponibles en este momento.";
  }
}

function formatDate(dateString) {
  if (!dateString) {
    return "Sin fecha";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderTasksPreview(tasks) {
  if (!tasksPreviewListElement || !tasksPreviewStatusElement) {
    return;
  }

  tasksPreviewListElement.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    tasksPreviewStatusElement.textContent = "Aún no tienes tareas registradas.";
    return;
  }

  tasksPreviewStatusElement.textContent = "";

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "tasks-preview__item";

    const copyContainer = document.createElement("div");
    copyContainer.className = "tasks-preview__copy";

    const titleElement = document.createElement("h3");
    titleElement.textContent = task.title;

    const metaElement = document.createElement("p");
    metaElement.className = "tasks-preview__meta";
    metaElement.textContent = `${task.owner} · Prioridad ${task.priority}`;

    copyContainer.appendChild(titleElement);
    copyContainer.appendChild(metaElement);

    const badgesContainer = document.createElement("div");
    badgesContainer.className = "tasks-preview__badges";

    const statusBadge = document.createElement("span");
    statusBadge.className = "tasks-preview__badge tasks-preview__badge--status";
    statusBadge.textContent = task.status;

    const dateElement = document.createElement("p");
    dateElement.className = "tasks-preview__date";
    dateElement.textContent = formatDate(task.due_date);

    badgesContainer.appendChild(statusBadge);
    badgesContainer.appendChild(dateElement);

    item.appendChild(copyContainer);
    item.appendChild(badgesContainer);

    tasksPreviewListElement.appendChild(item);
  });
}

async function loadTasksPreview() {
  if (!tasksPreviewListElement || !tasksPreviewStatusElement) {
    return;
  }

  tasksPreviewStatusElement.textContent = "Cargando tus tareas...";

  const userId = await resolveCurrentUserId();

  if (!userId) {
    tasksPreviewStatusElement.textContent = "No se pudo obtener tu información de usuario.";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("tareas")
      .select("id, title, owner, priority, status, due_date")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .limit(4);

    if (error) {
      throw error;
    }

    renderTasksPreview(data ?? []);
  } catch (error) {
    console.error("Error al cargar las tareas del dashboard", error);
    tasksPreviewStatusElement.textContent = "No fue posible cargar tus tareas.";
  }
}

requireAuth();
loadUsername();
registerEventListeners();
updateActiveModulesKpi();
loadTasksPreview();
