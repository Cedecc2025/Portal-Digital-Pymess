// dashboard.js
// Administra la vista principal tras un inicio de sesión válido y carga el slider de tareas.

import { supabaseClient } from "../../../lib/supabaseClient.js";
import { requireAuth, getCurrentUsername, getCurrentUser, logout } from "../../../lib/authGuard.js";

const usernameDisplay = document.querySelector("#usernameDisplay");
const logoutButton = document.querySelector("#logoutButton");
const moduleCards = document.querySelectorAll(".module-card");
const sliderTrack = document.querySelector("#task-slider-track");
const sliderViewport = document.querySelector("#taskSliderViewport");
const sliderEmptyState = document.querySelector("#taskSliderEmpty");
const sliderStatus = document.querySelector("#taskSliderStatus");
const sliderPrevButton = document.querySelector("#taskSliderPrev");
const sliderNextButton = document.querySelector("#taskSliderNext");

const TASKS_LIMIT = 20;

// Formatea una fecha en formato local legible para la tarjeta.
function formatDueDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Inserta el nombre del usuario autenticado en el encabezado.
function loadUsername() {
  const username = getCurrentUsername();
  usernameDisplay.textContent = username ?? "Usuario";
}

// Recupera las tareas del usuario autenticado desde Supabase.
async function fetchUserTasks(userId) {
  const { data, error } = await supabaseClient
    .from("tareas")
    .select("id, title, priority, status, due_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(TASKS_LIMIT);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

// Actualiza el estado visual del slider con los datos proporcionados.
function renderTaskSlider(tasks) {
  if (!sliderTrack || !sliderEmptyState || !sliderStatus) {
    return;
  }

  if (!tasks.length) {
    sliderTrack.innerHTML = "";
    sliderEmptyState.hidden = false;
    sliderStatus.textContent = "Registra nuevas tareas para visualizar su avance desde el dashboard.";
    return;
  }

  const taskCards = tasks
    .map((task) => {
      const priority = (task.priority ?? "media").toLowerCase();
      const priorityClass = priority.replace(/[^a-z]/gi, "");
      const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
      const status = task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : "Pendiente";
      const dueLabel = formatDueDate(task.due_date);

      return `
        <article class="task-card" role="listitem" tabindex="0" data-id="${task.id}">
          <header>
            <span class="badge badge--${priorityClass || "media"}">${priorityLabel || "Media"}</span>
            <h4>${task.title}</h4>
          </header>
          <p class="meta">${status} • ${dueLabel}</p>
        </article>
      `;
    })
    .join("");

  sliderTrack.innerHTML = taskCards;
  sliderEmptyState.hidden = true;
  sliderStatus.textContent = `Mostrando ${Math.min(tasks.length, TASKS_LIMIT)} tareas recientes.`;

  if (sliderViewport) {
    sliderViewport.scrollLeft = 0;
  }
}

// Ejecuta el desplazamiento del slider en la dirección solicitada.
function scrollSlider(direction) {
  if (!sliderViewport) {
    return;
  }

  const offset = direction * 320;
  sliderViewport.scrollBy({ left: offset, behavior: "smooth" });
}

// Configura enlaces, botones y navegación de tarjetas.
function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  moduleCards.forEach((card) => {
    switch (card.dataset.module) {
      case "costos": {
        card.setAttribute("href", "../costos/index.html");
        break;
      }
      case "tareas": {
        card.setAttribute("href", "../tareas/index.html");
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

  if (sliderPrevButton) {
    sliderPrevButton.addEventListener("click", () => {
      scrollSlider(-1);
    });
  }

  if (sliderNextButton) {
    sliderNextButton.addEventListener("click", () => {
      scrollSlider(1);
    });
  }
}

// Consulta Supabase y actualiza el slider de tareas del usuario.
async function loadTaskSlider() {
  const currentUser = getCurrentUser();

  if (!currentUser || !currentUser.userId) {
    sliderStatus.textContent = "No pudimos identificar tu sesión. Inicia sesión nuevamente.";
    sliderEmptyState.hidden = false;
    return;
  }

  try {
    const tasks = await fetchUserTasks(currentUser.userId);
    renderTaskSlider(tasks);
  } catch (error) {
    console.error("Error al cargar tareas", error);
    if (sliderStatus) {
      sliderStatus.textContent = "No fue posible cargar tus tareas. Intenta nuevamente en unos minutos.";
    }
    if (sliderEmptyState) {
      sliderEmptyState.hidden = false;
    }
  }
}

requireAuth();
loadUsername();
registerEventListeners();
loadTaskSlider();
