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
const tasksButton = document.querySelector("#tasksButton");
const moduleCards = document.querySelectorAll(".module-card");
const tasksCarouselTrackElement = document.querySelector("#tasksCarouselTrack");
const tasksCarouselStatusElement = document.querySelector("#tasksCarouselStatus");
const tasksCarouselPrevButton = document.querySelector("#tasksCarouselPrev");
const tasksCarouselNextButton = document.querySelector("#tasksCarouselNext");

const TASKS_CAROUSEL_INTERVAL = 6000;
let tasksCarouselTimer = null;
const tasksCarouselState = {
  tasks: [],
  activeIndex: 0
};
let isTasksCarouselPaused = false;

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

  if (tasksButton) {
    tasksButton.setAttribute("href", "../tareas/index.html");
  }

  if (tasksCarouselTrackElement) {
    tasksCarouselTrackElement.addEventListener("pointerenter", () => {
      if (!tasksCarouselState.tasks.length) {
        return;
      }

      isTasksCarouselPaused = true;
      stopTasksCarousel();
    });

    tasksCarouselTrackElement.addEventListener("pointerleave", () => {
      if (!tasksCarouselState.tasks.length) {
        return;
      }

      isTasksCarouselPaused = false;
      scheduleTasksCarousel();
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
      default: {
        break;
      }
    }
  });

  if (tasksCarouselPrevButton) {
    tasksCarouselPrevButton.addEventListener("click", () => {
      if (!tasksCarouselState.tasks.length) {
        return;
      }

      goToTasksSlide(tasksCarouselState.activeIndex - 1);
      scheduleTasksCarousel();
    });
  }

  if (tasksCarouselNextButton) {
    tasksCarouselNextButton.addEventListener("click", () => {
      if (!tasksCarouselState.tasks.length) {
        return;
      }

      goToTasksSlide(tasksCarouselState.activeIndex + 1);
      scheduleTasksCarousel();
    });
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

function renderTasksCarousel(tasks) {
  if (!tasksCarouselTrackElement || !tasksCarouselStatusElement) {
    return;
  }

  tasksCarouselTrackElement.innerHTML = "";
  tasksCarouselTrackElement.style.transform = "translateX(0)";

  if (!tasks || tasks.length === 0) {
    tasksCarouselStatusElement.textContent = "Aún no tienes tareas registradas.";
    stopTasksCarousel();
    isTasksCarouselPaused = false;
    tasksCarouselState.tasks = [];
    tasksCarouselState.activeIndex = 0;
    updateTasksCarouselControls();
    return;
  }

  tasksCarouselStatusElement.textContent = "";

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "tasks-carousel__item";

    const titleElement = document.createElement("h3");
    titleElement.className = "tasks-carousel__title";
    titleElement.textContent = task.title;

    const metaElement = document.createElement("p");
    metaElement.className = "tasks-carousel__meta";
    metaElement.textContent = `${task.owner} · Prioridad ${task.priority}`;

    const footerElement = document.createElement("div");
    footerElement.className = "tasks-carousel__footer";

    const statusBadge = document.createElement("span");
    statusBadge.className = "tasks-carousel__badge";
    statusBadge.textContent = task.status;

    const dateElement = document.createElement("p");
    dateElement.className = "tasks-carousel__date";
    dateElement.textContent = formatDate(task.due_date);

    footerElement.appendChild(statusBadge);
    footerElement.appendChild(dateElement);

    item.appendChild(titleElement);
    item.appendChild(metaElement);
    item.appendChild(footerElement);

    tasksCarouselTrackElement.appendChild(item);
  });
}

function stopTasksCarousel() {
  if (tasksCarouselTimer) {
    clearInterval(tasksCarouselTimer);
    tasksCarouselTimer = null;
  }
}

function updateTasksCarouselControls() {
  const shouldDisable = !Array.isArray(tasksCarouselState.tasks) || tasksCarouselState.tasks.length <= 1;

  [tasksCarouselPrevButton, tasksCarouselNextButton].forEach((button) => {
    if (!button) {
      return;
    }

    button.disabled = shouldDisable;
    button.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
  });
}

function goToTasksSlide(targetIndex) {
  if (
    !tasksCarouselTrackElement ||
    !Array.isArray(tasksCarouselState.tasks) ||
    tasksCarouselState.tasks.length === 0
  ) {
    return;
  }

  const tasksCount = tasksCarouselState.tasks.length;
  const normalizedIndex = ((targetIndex % tasksCount) + tasksCount) % tasksCount;

  tasksCarouselState.activeIndex = normalizedIndex;
  tasksCarouselTrackElement.style.transform = `translateX(-${normalizedIndex * 100}%)`;
}

function scheduleTasksCarousel(interval = TASKS_CAROUSEL_INTERVAL) {
  stopTasksCarousel();

  if (isTasksCarouselPaused) {
    return;
  }

  if (!Array.isArray(tasksCarouselState.tasks) || tasksCarouselState.tasks.length <= 1) {
    return;
  }

  tasksCarouselTimer = setInterval(() => {
    goToTasksSlide(tasksCarouselState.activeIndex + 1);
  }, interval);
}

async function loadTasksCarousel() {
  if (!tasksCarouselTrackElement || !tasksCarouselStatusElement) {
    return;
  }

  tasksCarouselStatusElement.textContent = "Cargando tus tareas...";

  const userId = await resolveCurrentUserId();

  if (!userId) {
    tasksCarouselStatusElement.textContent = "No se pudo obtener tu información de usuario.";
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

    const tasks = data ?? [];
    tasksCarouselState.tasks = tasks;
    tasksCarouselState.activeIndex = 0;
    isTasksCarouselPaused = false;

    renderTasksCarousel(tasks);
    updateTasksCarouselControls();

    if (tasks.length > 0) {
      goToTasksSlide(0);
      scheduleTasksCarousel();
    } else {
      stopTasksCarousel();
    }
  } catch (error) {
    console.error("Error al cargar las tareas del dashboard", error);
    tasksCarouselStatusElement.textContent = "No fue posible cargar tus tareas.";
    tasksCarouselState.tasks = [];
    tasksCarouselState.activeIndex = 0;
    updateTasksCarouselControls();
  }
}

requireAuth();
loadUsername();
registerEventListeners();
updateTasksCarouselControls();
loadTasksCarousel();
