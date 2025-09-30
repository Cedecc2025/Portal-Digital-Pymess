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
const tasksCarouselElement = document.querySelector("#tasksCarousel");
const tasksCarouselTrackElement = document.querySelector("#tasksCarouselTrack");
const tasksCarouselViewportElement = document.querySelector("#tasksCarouselViewport");
const tasksCarouselStatusElement = document.querySelector("#tasksCarouselStatus");
const tasksCarouselIndicatorsElement = document.querySelector("#tasksCarouselIndicators");
const tasksCarouselPrevButton = document.querySelector("#tasksCarouselPrev");
const tasksCarouselNextButton = document.querySelector("#tasksCarouselNext");
const tasksCarouselAllButton = document.querySelector("#tasksCarouselAllButton");

const TASKS_CAROUSEL_AUTO_PLAY_INTERVAL = 9000;
const TASKS_CAROUSEL_SWIPE_THRESHOLD = 60;
const TASKS_RESPONSIVE_BREAKPOINTS = [
  { minWidth: 1024, slides: 3 },
  { minWidth: 768, slides: 2 },
  { minWidth: 0, slides: 1 }
];

const PRIORITY_CLASS_MAP = {
  baja: "tasks-card__badge--priority-baja",
  media: "tasks-card__badge--priority-media",
  alta: "tasks-card__badge--priority-alta"
};

const STATUS_CLASS_MAP = {
  pendiente: "tasks-card__status--pendiente",
  completado: "tasks-card__status--completado",
  "en-progreso": "tasks-card__status--en-progreso",
  progreso: "tasks-card__status--progreso",
  cancelado: "tasks-card__status--cancelado"
};

let tasksCarouselTimer = null;
let isTasksCarouselPaused = false;

const tasksCarouselState = {
  tasks: [],
  activePage: 0,
  slidesPerView: 1,
  totalPages: 0
};

const swipeState = {
  pointerId: null,
  startX: 0,
  isTracking: false
};

// Obtiene y coloca el nombre del usuario autenticado en la cabecera.
function loadUsername() {
  const username = getCurrentUsername();

  if (usernameDisplay) {
    if (username) {
      usernameDisplay.textContent = username; // Muestra el nombre real si existe.
    } else {
      usernameDisplay.textContent = "Usuario"; // Valor por defecto cuando no hay nombre.
    }
  }
}

// Determina cuántas tarjetas deben mostrarse según el ancho disponible.
function resolveSlidesPerView() {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  for (const breakpoint of TASKS_RESPONSIVE_BREAKPOINTS) {
    if (viewportWidth >= breakpoint.minWidth) {
      return breakpoint.slides; // Devuelve el número asociado al primer breakpoint que coincide.
    }
  }

  return 1; // Garantiza al menos una tarjeta visible.
}

// Traduce una prioridad a una clase CSS específica del badge.
function getPriorityClass(priority) {
  const normalizedPriority = String(priority || "").toLowerCase();
  return PRIORITY_CLASS_MAP[normalizedPriority] ?? PRIORITY_CLASS_MAP.media; // Usa media como fallback.
}

// Prepara el texto human-readable para la prioridad.
function formatPriorityLabel(priority) {
  if (!priority) {
    return "media"; // Valor por defecto si la prioridad no está definida.
  }

  const lowerPriority = priority.toLowerCase();
  return lowerPriority.charAt(0).toUpperCase() + lowerPriority.slice(1);
}

// Determina la clase CSS apropiada para el estado de la tarea.
function getStatusClass(status) {
  const normalizedStatus = String(status || "").toLowerCase().replaceAll("_", "-");
  return STATUS_CLASS_MAP[normalizedStatus] ?? STATUS_CLASS_MAP.pendiente; // Usa pendiente como fallback.
}

// Convierte el estado de la tarea a un texto con formato amigable.
function formatStatusLabel(status) {
  if (!status) {
    return "Pendiente"; // Texto por defecto cuando no hay estado.
  }

  const cleanedStatus = status.replaceAll("_", " ");
  return cleanedStatus.charAt(0).toUpperCase() + cleanedStatus.slice(1);
}

// Formatea la fecha al estilo solicitado (ej. 28 sept 2025).
function formatDate(dateString) {
  if (!dateString) {
    return "Sin fecha"; // Mensaje cuando no hay fecha almacenada.
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString; // Regresa el valor original si no se puede parsear.
  }

  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Genera el contenido visual de una tarjeta de tarea.
function createTaskCard(task) {
  const item = document.createElement("li");
  item.className = "tasks-carousel__item";

  const headerElement = document.createElement("header");
  headerElement.className = "tasks-card__header";

  const titleElement = document.createElement("h3");
  titleElement.className = "tasks-card__title";
  titleElement.textContent = task.title;

  const deadlineElement = document.createElement("p");
  deadlineElement.className = "tasks-card__deadline";
  deadlineElement.textContent = formatDate(task.due_date);

  headerElement.appendChild(titleElement);
  headerElement.appendChild(deadlineElement);

  const metaElement = document.createElement("div");
  metaElement.className = "tasks-card__meta";

  const ownerBadge = document.createElement("span");
  ownerBadge.className = "tasks-card__badge tasks-card__badge--owner";

  const ownerIcon = document.createElement("span");
  ownerIcon.className = "tasks-card__badge-icon";
  ownerIcon.textContent = "👤";

  const ownerText = document.createElement("span");
  ownerText.textContent = task.owner;

  ownerBadge.append(ownerIcon, ownerText);

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `tasks-card__badge ${getPriorityClass(task.priority)}`;

  const priorityIcon = document.createElement("span");
  priorityIcon.className = "tasks-card__badge-icon";
  priorityIcon.textContent = "⚑";

  const priorityText = document.createElement("span");
  priorityText.textContent = `Prioridad ${formatPriorityLabel(task.priority)}`;

  priorityBadge.append(priorityIcon, priorityText);

  metaElement.append(ownerBadge, priorityBadge);

  const descriptionElement = document.createElement("p");
  descriptionElement.className = "tasks-card__description";
  descriptionElement.textContent = task.description || "Sin descripción disponible.";

  const footerElement = document.createElement("footer");
  footerElement.className = "tasks-card__footer";

  const statusElement = document.createElement("span");
  statusElement.className = `tasks-card__status ${getStatusClass(task.status)}`;
  statusElement.textContent = formatStatusLabel(task.status);

  footerElement.appendChild(statusElement);

  item.append(headerElement, metaElement, descriptionElement, footerElement);

  return item;
}

// Aplica o limpia la clase "is-active" según las tarjetas visibles en la página actual.
function applyActiveClasses() {
  if (!tasksCarouselTrackElement) {
    return; // Sin track no hay nada que actualizar.
  }

  const { slidesPerView, activePage, tasks } = tasksCarouselState;
  const startIndex = activePage * slidesPerView;
  const endIndex = Math.min(startIndex + slidesPerView, tasks.length);

  Array.from(tasksCarouselTrackElement.children).forEach((element, index) => {
    if (index >= startIndex && index < endIndex) {
      element.classList.add("is-active"); // Marca las tarjetas visibles.
    } else {
      element.classList.remove("is-active"); // Oculta el resto mediante la animación.
    }
  });
}

// Marca el indicador activo y actualiza su atributo aria.
function updateIndicatorState() {
  if (!tasksCarouselIndicatorsElement) {
    return; // Sin contenedor de indicadores no hay nada por hacer.
  }

  Array.from(tasksCarouselIndicatorsElement.children).forEach((indicator, index) => {
    const button = indicator;

    if (index === tasksCarouselState.activePage) {
      button.setAttribute("aria-current", "true"); // Marca el indicador actual.
    } else {
      button.removeAttribute("aria-current"); // Limpia el resto.
    }
  });
}

// Activa o desactiva los botones del carrusel dependiendo de cuántas páginas hay.
function updateTasksCarouselControls() {
  const shouldDisable = tasksCarouselState.totalPages <= 1; // No se navega si solo hay una página.

  [tasksCarouselPrevButton, tasksCarouselNextButton].forEach((button) => {
    if (!button) {
      return; // Evita errores cuando el botón no existe en el DOM.
    }

    button.disabled = shouldDisable;
    button.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
  });
}

// Construye los indicadores (puntos) según las páginas disponibles.
function buildTasksCarouselIndicators() {
  if (!tasksCarouselIndicatorsElement) {
    return; // Si no hay contenedor de indicadores se omite.
  }

  tasksCarouselIndicatorsElement.innerHTML = "";

  const { totalPages } = tasksCarouselState;

  if (totalPages <= 1) {
    return; // No se muestran puntos cuando no hay paginación.
  }

  for (let index = 0; index < totalPages; index += 1) {
    const indicatorButton = document.createElement("button");
    indicatorButton.type = "button";
    indicatorButton.className = "tasks-carousel__indicator";
    indicatorButton.setAttribute("role", "tab");
    indicatorButton.setAttribute("aria-label", `Ir al grupo ${index + 1} de tareas`);

    indicatorButton.addEventListener("click", () => {
      goToTasksPage(index, { animate: true }); // Cambia la página cuando se hace click en un punto.
      scheduleTasksCarousel(); // Reinicia el temporizador tras la interacción manual.
    });

    tasksCarouselIndicatorsElement.appendChild(indicatorButton);
  }

  updateIndicatorState();
}

// Coloca la pista del carrusel en la página indicada aplicando la animación requerida.
function goToTasksPage(targetPage, { animate = true } = {}) {
  if (!tasksCarouselTrackElement || !tasksCarouselViewportElement) {
    return; // No hay elementos esenciales del carrusel.
  }

  const { totalPages, slidesPerView, tasks } = tasksCarouselState;

  if (totalPages === 0) {
    return; // No se ejecuta nada cuando no hay tareas.
  }

  const normalizedPage = ((targetPage % totalPages) + totalPages) % totalPages; // Mantiene el índice en rango circular.
  tasksCarouselState.activePage = normalizedPage;

  const firstVisibleIndex = normalizedPage * slidesPerView;
  const referenceItem = tasksCarouselTrackElement.children[firstVisibleIndex];

  if (!referenceItem) {
    return; // Evita errores cuando la referencia no existe (por ejemplo, al reducir la lista).
  }

  const offset = referenceItem.offsetLeft;

  if (!animate) {
    tasksCarouselTrackElement.classList.add("tasks-carousel__track--no-transition"); // Deshabilita transiciones puntuales.
  }

  tasksCarouselTrackElement.style.transform = `translateX(-${offset}px)`; // Desplaza la pista hasta la tarjeta adecuada.

  if (!animate) {
    // Forzamos un reflow antes de retirar la clase para no dejar la transición deshabilitada permanentemente.
    void tasksCarouselTrackElement.offsetHeight;
    tasksCarouselTrackElement.classList.remove("tasks-carousel__track--no-transition");
  }

  applyActiveClasses();
  updateIndicatorState();
  updateTasksCarouselControls();

  if (!isTasksCarouselPaused && tasks.length > slidesPerView) {
    scheduleTasksCarousel(); // Mantiene el autoplay cuando hay más tarjetas que la vista actual.
  }
}

// Calcula páginas visibles y refresca la pista tras cambios de tamaño o datos.
function refreshTasksCarouselLayout({ animate = false } = {}) {
  if (!tasksCarouselTrackElement) {
    return; // Sin pista no es necesario recalcular.
  }

  const slidesPerView = resolveSlidesPerView();
  tasksCarouselState.slidesPerView = slidesPerView;

  const tasksCount = tasksCarouselState.tasks.length;
  tasksCarouselState.totalPages = tasksCount > 0 ? Math.ceil(tasksCount / slidesPerView) : 0;

  if (tasksCarouselState.totalPages === 0) {
    tasksCarouselState.activePage = 0; // Reinicia el estado cuando no existen tareas.
    updateTasksCarouselControls();
    buildTasksCarouselIndicators();
    return;
  }

  if (tasksCarouselState.activePage >= tasksCarouselState.totalPages) {
    tasksCarouselState.activePage = tasksCarouselState.totalPages - 1; // Ajusta el índice si quedó fuera de rango.
  }

  tasksCarouselTrackElement.style.setProperty("--tasks-visible", String(slidesPerView));

  goToTasksPage(tasksCarouselState.activePage, { animate });
  buildTasksCarouselIndicators();
}

// Renderiza el carrusel completo a partir del listado de tareas.
function renderTasksCarousel(tasks) {
  if (!tasksCarouselTrackElement || !tasksCarouselStatusElement) {
    return; // Falta contenedor principal para dibujar las tarjetas.
  }

  tasksCarouselTrackElement.innerHTML = "";
  tasksCarouselTrackElement.style.transform = "translateX(0)";
  tasksCarouselState.tasks = tasks;
  tasksCarouselState.activePage = 0;

  if (!tasks.length) {
    tasksCarouselStatusElement.hidden = false; // Muestra el mensaje cuando no hay tareas.
    tasksCarouselStatusElement.textContent = "Aún no tienes tareas registradas.";
    tasksCarouselState.totalPages = 0;
    stopTasksCarousel();
    updateTasksCarouselControls();
    buildTasksCarouselIndicators();
    return;
  }

  tasksCarouselStatusElement.hidden = true; // Oculta el mensaje al contar con resultados.

  const fragment = document.createDocumentFragment();

  tasks.forEach((task) => {
    fragment.appendChild(createTaskCard(task)); // Construye cada tarjeta y la agrega al fragmento temporal.
  });

  tasksCarouselTrackElement.appendChild(fragment);

  refreshTasksCarouselLayout({ animate: false });
  scheduleTasksCarousel();
}

// Detiene el autoplay del carrusel y limpia el intervalo.
function stopTasksCarousel() {
  if (tasksCarouselTimer) {
    clearInterval(tasksCarouselTimer); // Elimina el intervalo existente.
    tasksCarouselTimer = null;
  }
}

// Inicia nuevamente el autoplay si hay suficientes páginas y no está en pausa.
function scheduleTasksCarousel() {
  stopTasksCarousel();

  if (isTasksCarouselPaused) {
    return; // No se programa un nuevo intervalo cuando el carrusel está en pausa.
  }

  if (tasksCarouselState.totalPages <= 1) {
    return; // Sin páginas adicionales no hay autoplay.
  }

  tasksCarouselTimer = setInterval(() => {
    goToTasksPage(tasksCarouselState.activePage + 1, { animate: true }); // Avanza automáticamente al siguiente grupo.
  }, TASKS_CAROUSEL_AUTO_PLAY_INTERVAL);
}

// Pausa el autoplay y registra el estado actual.
function pauseTasksCarousel() {
  isTasksCarouselPaused = true;
  stopTasksCarousel();
}

// Reactiva el autoplay cuando el usuario deja de interactuar.
function resumeTasksCarousel() {
  isTasksCarouselPaused = false;
  scheduleTasksCarousel();
}

// Gestiona la interacción táctil o con mouse para detectar deslizamientos.
function handlePointerDown(event) {
  if (!tasksCarouselViewportElement) {
    return; // No se procesa si falta el viewport.
  }

  swipeState.pointerId = event.pointerId;
  swipeState.startX = event.clientX;
  swipeState.isTracking = true;
  tasksCarouselViewportElement.setPointerCapture(event.pointerId);
  pauseTasksCarousel(); // Evita que el autoplay avance durante el gesto.
}

// Mantiene actualizado el desplazamiento detectado en un gesto.
function handlePointerMove(event) {
  if (!swipeState.isTracking || event.pointerId !== swipeState.pointerId) {
    return; // Solo interesa el puntero activo.
  }

  // No desplazamos visualmente la pista para simplificar, únicamente evaluamos la distancia recorrida.
}

// Completa el gesto y decide si debe navegar a otra página.
function handlePointerUp(event) {
  if (!swipeState.isTracking || event.pointerId !== swipeState.pointerId) {
    return; // Ignora eventos que no pertenecen al mismo gesto.
  }

  if (tasksCarouselViewportElement && tasksCarouselViewportElement.hasPointerCapture(event.pointerId)) {
    tasksCarouselViewportElement.releasePointerCapture(event.pointerId); // Libera el control del puntero al finalizar el gesto.
  }

  const deltaX = event.clientX - swipeState.startX;

  swipeState.pointerId = null;
  swipeState.isTracking = false;

  if (Math.abs(deltaX) >= TASKS_CAROUSEL_SWIPE_THRESHOLD) {
    if (deltaX < 0) {
      goToTasksPage(tasksCarouselState.activePage + 1, { animate: true }); // Desliza hacia la derecha -> siguiente página.
    } else {
      goToTasksPage(tasksCarouselState.activePage - 1, { animate: true }); // Desliza hacia la izquierda -> página anterior.
    }
  }

  resumeTasksCarousel();
}

// Cancela el gesto cuando el puntero se pierde para evitar estados inconsistentes.
function handlePointerCancel(event) {
  if (event.pointerId !== swipeState.pointerId) {
    return; // Ignora si no es el mismo gesto.
  }

  if (tasksCarouselViewportElement && tasksCarouselViewportElement.hasPointerCapture(event.pointerId)) {
    tasksCarouselViewportElement.releasePointerCapture(event.pointerId); // Asegura que el puntero quede liberado.
  }

  swipeState.pointerId = null;
  swipeState.isTracking = false;
  resumeTasksCarousel(); // Reanuda el autoplay al cancelar la interacción.
}

// Registra listeners de botones, tarjetas y eventos globales del carrusel.
function registerEventListeners() {
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout(); // Cierra la sesión actual.
    });
  }

  if (tasksCarouselAllButton) {
    tasksCarouselAllButton.setAttribute("href", "../tareas/index.html"); // Garantiza el destino correcto.
  }

  moduleCards.forEach((card) => {
    switch (card.dataset.module) {
      case "costos": {
        card.setAttribute("href", "../costos/index.html"); // Ajusta el enlace del módulo de costos.
        break;
      }
      case "estrategias": {
        card.setAttribute("href", "../estrategias/index.html"); // Ajusta el enlace del módulo de estrategias.
        break;
      }
      default: {
        break; // Mantiene cualquier otro módulo sin cambios.
      }
    }
  });

  if (tasksCarouselPrevButton) {
    tasksCarouselPrevButton.addEventListener("click", () => {
      goToTasksPage(tasksCarouselState.activePage - 1, { animate: true }); // Retrocede manualmente.
      scheduleTasksCarousel();
    });
  }

  if (tasksCarouselNextButton) {
    tasksCarouselNextButton.addEventListener("click", () => {
      goToTasksPage(tasksCarouselState.activePage + 1, { animate: true }); // Avanza manualmente.
      scheduleTasksCarousel();
    });
  }

  if (tasksCarouselElement) {
    tasksCarouselElement.addEventListener("mouseenter", () => {
      pauseTasksCarousel(); // Pausa cuando el cursor se encuentra sobre el carrusel.
    });

    tasksCarouselElement.addEventListener("mouseleave", () => {
      resumeTasksCarousel(); // Reanuda al salir del carrusel.
    });
  }

  if (tasksCarouselViewportElement) {
    tasksCarouselViewportElement.addEventListener("pointerdown", handlePointerDown);
    tasksCarouselViewportElement.addEventListener("pointermove", handlePointerMove);
    tasksCarouselViewportElement.addEventListener("pointerup", handlePointerUp);
    tasksCarouselViewportElement.addEventListener("pointercancel", handlePointerCancel);
    tasksCarouselViewportElement.addEventListener("lostpointercapture", handlePointerCancel);
  }

  let resizeTimeoutId = null;

  window.addEventListener("resize", () => {
    if (resizeTimeoutId) {
      clearTimeout(resizeTimeoutId); // Evita ejecutar el recalculo demasiadas veces.
    }

    resizeTimeoutId = setTimeout(() => {
      refreshTasksCarouselLayout({ animate: false }); // Ajusta el carrusel tras cambiar el tamaño de la ventana.
    }, 180);
  });
}

// Solicita las tareas al backend y las procesa para el carrusel.
async function loadTasksCarousel() {
  if (!tasksCarouselStatusElement) {
    return; // No hay elemento para comunicar el estado al usuario.
  }

  tasksCarouselStatusElement.hidden = false;
  tasksCarouselStatusElement.textContent = "Cargando tus tareas..."; // Mensaje de carga inicial.

  const userId = await resolveCurrentUserId();

  if (!userId) {
    tasksCarouselStatusElement.textContent = "No se pudo obtener tu información de usuario.";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("tareas")
      .select("id, title, description, owner, priority, status, due_date")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })
      .limit(12); // Obtiene suficientes tareas para llenar varias páginas.

    if (error) {
      throw error; // Pasa el error al catch para el manejo centralizado.
    }

    const tasks = Array.isArray(data) ? data : [];
    renderTasksCarousel(tasks);
  } catch (error) {
    console.error("Error al cargar las tareas del dashboard", error);
    tasksCarouselStatusElement.hidden = false;
    tasksCarouselStatusElement.textContent = "No fue posible cargar tus tareas."; // Mensaje de error amigable.
    tasksCarouselState.tasks = [];
    tasksCarouselState.activePage = 0;
    tasksCarouselState.totalPages = 0;
    stopTasksCarousel();
    updateTasksCarouselControls();
    buildTasksCarouselIndicators();
  }
}

requireAuth();
loadUsername();
registerEventListeners();
updateTasksCarouselControls();
loadTasksCarousel();
