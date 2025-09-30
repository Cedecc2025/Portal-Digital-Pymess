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

const TASKS_CAROUSEL_INTERVAL = 2200;
let tasksCarouselTimer = null;

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

function startTasksCarousel(tasks, elements = {}, interval = TASKS_CAROUSEL_INTERVAL) {
  const trackElement = elements.track ?? tasksCarouselTrackElement;

  if (!trackElement || !Array.isArray(tasks) || tasks.length <= 1) {
    stopTasksCarousel();
    return;
  }

  stopTasksCarousel();

  let activeIndex = 0;

  tasksCarouselTimer = setInterval(() => {
    activeIndex = (activeIndex + 1) % tasks.length;
    trackElement.style.transform = `translateX(-${activeIndex * 100}%)`;
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
    renderTasksCarousel(tasks);
    startTasksCarousel(tasks);
  } catch (error) {
    console.error("Error al cargar las tareas del dashboard", error);
    tasksCarouselStatusElement.textContent = "No fue posible cargar tus tareas.";
  }
}

requireAuth();
loadUsername();
registerEventListeners();
loadTasksCarousel();
