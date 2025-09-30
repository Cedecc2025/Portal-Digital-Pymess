// dashboard-carousel.js
// Gestiona el carrusel de tareas del dashboard con interacciones accesibles.

const TRANSITION_DURATION = 360;
const SWIPE_THRESHOLD_PX = 40;

const PRIORITY_CLASS_MAP = {
  baja: "task-card__badge--priority-baja",
  media: "task-card__badge--priority-media",
  alta: "task-card__badge--priority-alta"
};

const STATUS_CLASS_MAP = {
  pendiente: "task-card__status--pendiente",
  completado: "task-card__status--completado",
  "en-progreso": "task-card__status--en-progreso",
  progreso: "task-card__status--en-progreso",
  cancelado: "task-card__status--cancelado"
};

// Formatea la fecha en el formato solicitado (ej. 28 sept 2025).
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

// Normaliza la prioridad a una etiqueta legible.
function formatPriorityLabel(priority) {
  if (!priority) {
    return "Media";
  }

  const normalized = String(priority).trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Determina la clase CSS adecuada para el badge de prioridad.
function resolvePriorityClass(priority) {
  const normalized = String(priority || "").trim().toLowerCase();
  return PRIORITY_CLASS_MAP[normalized] ?? PRIORITY_CLASS_MAP.media;
}

// Normaliza el estado de la tarea para mostrarlo como texto.
function formatStatusLabel(status) {
  if (!status) {
    return "Pendiente";
  }

  const normalized = String(status).replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Selecciona la clase CSS para el estado de la tarea.
function resolveStatusClass(status) {
  const normalized = String(status || "").trim().toLowerCase().replaceAll("_", "-");
  return STATUS_CLASS_MAP[normalized] ?? STATUS_CLASS_MAP.pendiente;
}

// Construye el contenido visual de una tarjeta de tarea.
function createTaskSlide(task, index) {
  const item = document.createElement("li");
  item.className = "carousel-slide";
  item.setAttribute("role", "listitem");
  item.dataset.index = String(index);

  const card = document.createElement("article");
  card.className = "task-card";

  const header = document.createElement("header");
  header.className = "task-card__header";

  const title = document.createElement("h3");
  title.className = "task-card__title";
  title.textContent = task.title || "Tarea sin título";

  const deadline = document.createElement("p");
  deadline.className = "task-card__deadline";
  deadline.textContent = formatDate(task.due_date);

  header.append(title, deadline);

  const assignments = document.createElement("dl");
  assignments.className = "task-card__assignments";

  const ownerTitle = document.createElement("dt");
  ownerTitle.className = "task-card__meta-label";
  ownerTitle.textContent = "Asignado a";

  const ownerValue = document.createElement("dd");
  ownerValue.className = "task-card__meta-value";
  ownerValue.textContent = task.owner || "Sin responsable";

  const priorityTitle = document.createElement("dt");
  priorityTitle.className = "task-card__meta-label";
  priorityTitle.textContent = "Prioridad";

  const priorityValue = document.createElement("dd");
  priorityValue.className = `task-card__badge ${resolvePriorityClass(task.priority)}`;
  priorityValue.textContent = formatPriorityLabel(task.priority);

  assignments.append(ownerTitle, ownerValue, priorityTitle, priorityValue);

  const description = document.createElement("p");
  description.className = "task-card__description";
  description.textContent = task.description || "Sin descripción disponible.";

  const footer = document.createElement("footer");
  footer.className = "task-card__footer";

  const status = document.createElement("span");
  status.className = `task-card__status ${resolveStatusClass(task.status)}`;
  status.textContent = formatStatusLabel(task.status);

  footer.appendChild(status);

  card.append(header, assignments, description, footer);
  item.appendChild(card);

  return item;
}

// Inicializa y devuelve la API pública del carrusel de tareas.
export function initTasksCarousel({ containerSelector, loop = false } = {}) {
  const container =
    typeof containerSelector === "string"
      ? document.querySelector(containerSelector)
      : containerSelector;

  if (!container) {
    return null;
  }

  const viewport = container.querySelector("[data-carousel-viewport]");
  const track = container.querySelector("[data-carousel-track]");
  const status = container.querySelector("[data-carousel-status]");
  const prevButton = container.querySelector("[data-carousel-prev]");
  const nextButton = container.querySelector("[data-carousel-next]");
  const dotsContainer = container.querySelector("[data-carousel-dots]");
  const currentCounter = container.querySelector("[data-carousel-current]");
  const totalCounter = container.querySelector("[data-carousel-total]");

  const state = {
    currentIndex: 0,
    total: 0,
    loop,
    isAnimating: false,
    slides: [],
    pointerId: null,
    dragStartX: 0,
    dragDeltaX: 0
  };

  function getViewportWidth() {
    if (!viewport) {
      return 0;
    }

    return Math.round(viewport.getBoundingClientRect().width);
  }

  // Actualiza el mensaje visible o del lector de pantalla según el estado del carrusel.
  function showStatusMessage(message, mode = "message") {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.mode = mode;
    status.hidden = false;
  }

  // Oculta el mensaje de estado cuando hay tarjetas para mostrar.
  function hideStatusMessage() {
    if (!status) {
      return;
    }

    status.hidden = true;
    status.dataset.mode = "announce";
  }

  // Actualiza los contadores visibles.
  function updateCounters() {
    if (currentCounter) {
      currentCounter.textContent = state.total ? String(state.currentIndex + 1) : "0";
    }

    if (totalCounter) {
      totalCounter.textContent = String(state.total);
    }
  }

  // Marca los indicadores activos y actualiza aria-current.
  function updateIndicators() {
    if (!dotsContainer) {
      return;
    }

    Array.from(dotsContainer.children).forEach((dot, index) => {
      const button = dot;

      if (index === state.currentIndex) {
        button.setAttribute("aria-current", "true");
        button.classList.add("is-active");
      } else {
        button.removeAttribute("aria-current");
        button.classList.remove("is-active");
      }
    });
  }

  // Habilita o deshabilita los botones según el índice actual.
  function updateControls() {
    const disablePrev = !state.loop && state.currentIndex === 0;
    const disableNext = !state.loop && state.currentIndex === state.total - 1;

    if (prevButton) {
      prevButton.disabled = state.total <= 1 || disablePrev;
      prevButton.setAttribute("aria-disabled", prevButton.disabled ? "true" : "false");
    }

    if (nextButton) {
      nextButton.disabled = state.total <= 1 || disableNext;
      nextButton.setAttribute("aria-disabled", nextButton.disabled ? "true" : "false");
    }
  }

  // Anuncia el slide actual en el área en vivo para lectores de pantalla.
  function announceCurrentSlide() {
    if (!status) {
      return;
    }

    const activeSlide = state.slides[state.currentIndex];
    const title = activeSlide?.querySelector(".task-card__title")?.textContent ?? "";
    status.dataset.mode = "announce";
    status.hidden = false;
    status.textContent = `Tarea ${state.currentIndex + 1} de ${state.total}${
      title ? `: ${title}` : ""
    }`;
  }

  // Aplica transformaciones y clases a las tarjetas según el índice activo.
  function updateSlides(animate = true) {
    if (!track || !viewport) {
      return;
    }

    const width = getViewportWidth();
    const baseOffset = -state.currentIndex * width;

    if (animate) {
      track.style.transition = `transform ${TRANSITION_DURATION}ms ease`;
    } else {
      track.style.transition = "none";
    }

    track.style.transform = `translateX(${baseOffset}px)`;

    if (!animate) {
      // Restablece la transición después de aplicar el desplazamiento instantáneo.
      requestAnimationFrame(() => {
        track.style.transition = `transform ${TRANSITION_DURATION}ms ease`;
      });
    }

    state.slides.forEach((slide, index) => {
      const isActive = index === state.currentIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  // Sincroniza todos los elementos visuales tras un cambio de índice.
  function updateUI({ animate = true } = {}) {
    updateSlides(animate);
    updateCounters();
    updateIndicators();
    updateControls();
    announceCurrentSlide();
  }

  // Calcula el índice objetivo respetando los límites o el loop.
  function normalizeIndex(index) {
    if (state.total === 0) {
      return 0;
    }

    if (state.loop) {
      return (index + state.total) % state.total;
    }

    return Math.min(Math.max(index, 0), state.total - 1);
  }

  // Mueve el carrusel al slide indicado.
  function goTo(index, { animate = true } = {}) {
    if (state.isAnimating || state.total === 0) {
      updateUI({ animate: false });
      return;
    }

    const targetIndex = normalizeIndex(index);

    if (targetIndex === state.currentIndex) {
      updateUI({ animate: false });
      return;
    }

    state.currentIndex = targetIndex;
    state.isAnimating = true;
    updateUI({ animate });

    window.setTimeout(() => {
      state.isAnimating = false;
    }, TRANSITION_DURATION);
  }

  // Avanza al slide siguiente.
  function next() {
    goTo(state.currentIndex + 1, { animate: true });
  }

  // Retrocede al slide anterior.
  function prev() {
    goTo(state.currentIndex - 1, { animate: true });
  }

  // Construye los indicadores interactivos.
  function buildIndicators() {
    if (!dotsContainer) {
      return;
    }

    dotsContainer.innerHTML = "";

    if (state.total <= 1) {
      return;
    }

    state.slides.forEach((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dot";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-label", `Ir a la tarea ${index + 1}`);
      button.addEventListener("click", () => {
        goTo(index, { animate: true });
      });

      dotsContainer.appendChild(button);
    });
  }

  // Termina el gesto táctil devolviendo la pista a su posición final.
  function finishDrag(shouldNavigate) {
    if (!track || !viewport) {
      return;
    }

    track.style.transition = `transform ${TRANSITION_DURATION}ms ease`;

    if (shouldNavigate) {
      if (state.dragDeltaX < 0) {
        next();
      } else {
        prev();
      }
    } else {
      updateSlides(true);
    }

    state.pointerId = null;
    state.dragStartX = 0;
    state.dragDeltaX = 0;
  }

  // Inicia el seguimiento del gesto táctil o de mouse.
  function handlePointerDown(event) {
    if (!viewport || !track) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (state.total <= 1) {
      return;
    }

    state.pointerId = event.pointerId;
    state.dragStartX = event.clientX;
    state.dragDeltaX = 0;
    track.style.transition = "none";
    viewport.setPointerCapture(event.pointerId);
  }

  // Actualiza la posición de la pista mientras se arrastra.
  function handlePointerMove(event) {
    if (!viewport || !track) {
      return;
    }

    if (state.pointerId !== event.pointerId) {
      return;
    }

    state.dragDeltaX = event.clientX - state.dragStartX;
    const baseOffset = -state.currentIndex * getViewportWidth();
    track.style.transform = `translateX(${baseOffset + state.dragDeltaX}px)`;
  }

  // Finaliza el gesto y decide si se navega a otra tarjeta.
  function handlePointerUp(event) {
    if (!viewport) {
      return;
    }

    if (state.pointerId !== event.pointerId) {
      return;
    }

    const shouldNavigate = Math.abs(state.dragDeltaX) >= SWIPE_THRESHOLD_PX;

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    finishDrag(shouldNavigate);
  }

  // Cancela el gesto ante cualquier interrupción externa.
  function handlePointerCancel(event) {
    if (!viewport) {
      return;
    }

    if (state.pointerId !== event.pointerId) {
      return;
    }

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    finishDrag(false);
  }

  // Gestiona los atajos de teclado para navegar el carrusel.
  function handleKeyDown(event) {
    switch (event.key) {
      case "ArrowRight": {
        event.preventDefault();
        next();
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        prev();
        break;
      }
      case "Home": {
        event.preventDefault();
        goTo(0, { animate: true });
        break;
      }
      case "End": {
        event.preventDefault();
        goTo(state.total - 1, { animate: true });
        break;
      }
      default: {
        break;
      }
    }
  }

  // Recalcula el offset cuando cambian las dimensiones del viewport.
  function handleResize() {
    goTo(state.currentIndex, { animate: false });
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      prev();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      next();
    });
  }

  if (viewport) {
    viewport.addEventListener("keydown", handleKeyDown);
    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", handlePointerCancel);
    viewport.addEventListener("lostpointercapture", handlePointerCancel);
  }

  window.addEventListener("resize", handleResize);

  requestAnimationFrame(() => {
    container.dataset.ready = "true";
  });

  // Expone la API necesaria para que dashboard.js gestione los datos.
  return {
    // Muestra el mensaje de carga inicial.
    showLoading(message = "Cargando tus tareas...") {
      showStatusMessage(message, "message");
    },
    // Muestra un mensaje de error o vacío.
    showMessage(message) {
      showStatusMessage(message, "message");
      state.slides = [];
      state.total = 0;
      state.currentIndex = 0;
      updateCounters();
      updateControls();
      if (dotsContainer) {
        dotsContainer.innerHTML = "";
      }
    },
    // Renderiza las tareas dentro del carrusel.
    setSlides(tasks) {
      if (!track) {
        return;
      }

      track.innerHTML = "";
      state.slides = [];
      state.total = Array.isArray(tasks) ? tasks.length : 0;
      state.currentIndex = 0;

      if (!state.total) {
        this.showMessage("Aún no tienes tareas registradas.");
        return;
      }

      const fragment = document.createDocumentFragment();

      tasks.forEach((task, index) => {
        fragment.appendChild(createTaskSlide(task, index));
      });

      track.appendChild(fragment);
      state.slides = Array.from(track.children);

      hideStatusMessage();
      buildIndicators();
      updateUI({ animate: false });
    }
  };
}
