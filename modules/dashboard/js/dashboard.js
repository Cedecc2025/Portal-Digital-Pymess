// dashboard.js
// Administra la vista principal tras un inicio de sesión válido.

import {
  requireAuth,
  getCurrentUsername,
  logout,
  resolveCurrentUserId
} from "../../../lib/authGuard.js";
import { supabaseClient } from "../../../lib/supabaseClient.js";
import { initTasksCarousel } from "./dashboard-carousel.js";

const usernameDisplay = document.querySelector("#usernameDisplay");
const logoutButton = document.querySelector("#logoutButton");
const moduleCards = document.querySelectorAll(".module-card");
const tasksCarouselAllButton = document.querySelector("#tasksCarouselAllButton");

const tasksCarousel = initTasksCarousel({ containerSelector: "#tasksCarousel", loop: false });

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

// Solicita las tareas al backend y las procesa para el carrusel.
async function loadTasksCarousel() {
  if (!tasksCarousel) {
    return;
  }

  tasksCarousel.showLoading();

  const userId = await resolveCurrentUserId();

  if (!userId) {
    tasksCarousel.showMessage("No se pudo obtener tu información de usuario.");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("tareas")
      .select("id, title, description, owner, priority, status, due_date")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    if (error) {
      throw error;
    }

    tasksCarousel.setSlides(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error al cargar las tareas del dashboard", error);
    tasksCarousel.showMessage("No fue posible cargar tus tareas.");
  }
}

function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  if (tasksCarouselAllButton) {
    tasksCarouselAllButton.setAttribute("href", "../tareas/index.html");
  }
}

requireAuth();
loadUsername();
configureModuleCards();
registerEventListeners();
loadTasksCarousel();
