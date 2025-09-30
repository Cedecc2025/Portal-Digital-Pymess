// dashboard-carousel.js
// Gestiona el carrusel de tareas del dashboard con un layout de tarjeta centrada.

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
export function initTasksCarousel({ containerSelector } = {}) {
  const root =
    typeof containerSelector === "string"
      ? document.querySelector(containerSelector)
      : containerSelector;

  if (!root) {
    return null;
  }

  const viewport = root.querySelector(".carousel-viewport");
  const track = root.querySelector(".carousel-track");
  const prevBtn = root.querySelector(".carousel-btn.prev");
  const nextBtn = root.querySelector(".carousel-btn.next");
  const indicators = root.querySelector(".carousel-indicators");
  const counterEl = indicators?.querySelector(".counter .current") ?? null;
  const totalEl = indicators?.querySelector(".counter .total") ?? null;
  const status = root.querySelector(".carousel-status");

  let slides = [];
  let index = 0;
  let slideWidth = 0;
  let activePointerId = null;
  let startX = 0;
  let isDragging = false;

  function parsePxValue(raw) {
    return Number.parseFloat(raw) || 0;
  }

  function varPx(name) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return Number.parseInt(value, 10) || 0;
  }

  function clamp(value, min, max) {
    if (max < min) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
  }

  // 1) Layout: fija width exacto por slide y ancho del track.
  function layout() {
    if (!viewport || !track) {
      return;
    }

    const computed = getComputedStyle(viewport);
    const paddingLeft = parsePxValue(computed.paddingLeft);
    const paddingRight = parsePxValue(computed.paddingRight);
    const availableWidth = Math.max(0, viewport.clientWidth - paddingLeft - paddingRight);

    slideWidth = Math.max(1, Math.round(availableWidth));

    slides.forEach((li) => {
      li.style.width = `${slideWidth}px`;
    });

    if (slides.length) {
      track.style.width = `${slideWidth * slides.length}px`;
    } else {
      track.style.width = "0px";
    }

    applyTransform(false);
    positionArrows(paddingLeft, paddingRight);
  }

  // 2) Posiciona flechas pegadas al borde interno del viewport (no del card).
  function positionArrows(paddingLeftOverride, paddingRightOverride) {
    if (!viewport || !prevBtn || !nextBtn) {
      return;
    }

    const vpRect = viewport.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const paddingLeft =
      typeof paddingLeftOverride === "number"
        ? paddingLeftOverride
        : parsePxValue(getComputedStyle(viewport).paddingLeft);
    const paddingRight =
      typeof paddingRightOverride === "number"
        ? paddingRightOverride
        : parsePxValue(getComputedStyle(viewport).paddingRight);
    const edge = varPx("--edge");
    const minGap = 12;

    if (prevBtn) {
      const buttonWidth = prevBtn.offsetWidth || 0;
      const marginStart = vpRect.left - rootRect.left;
      const contentStart = marginStart + paddingLeft;
      const maxLeft = contentStart - buttonWidth - minGap;
      const minLeftBase = Math.max(0, marginStart);
      const minLeft = maxLeft > edge ? Math.max(minLeftBase, edge) : minLeftBase;
      const available = Math.max(0, paddingLeft - buttonWidth);
      const natural = marginStart + available / 2;
      const safeMax = Math.max(minLeft, maxLeft);
      const finalLeft = clamp(natural, minLeft, safeMax);

      prevBtn.style.left = `${Math.max(0, finalLeft)}px`;
      prevBtn.style.right = "auto";
    }

    if (nextBtn) {
      const buttonWidth = nextBtn.offsetWidth || 0;
      const marginEnd = rootRect.right - vpRect.right;
      const contentEndFromRight = marginEnd + paddingRight;
      const maxRight = contentEndFromRight - buttonWidth - minGap;
      const minRightBase = Math.max(0, marginEnd);
      const minRight = maxRight > edge ? Math.max(minRightBase, edge) : minRightBase;
      const available = Math.max(0, paddingRight - buttonWidth);
      const natural = marginEnd + available / 2;
      const safeMax = Math.max(minRight, maxRight);
      const finalRight = clamp(natural, minRight, safeMax);

      nextBtn.style.right = `${Math.max(0, finalRight)}px`;
      nextBtn.style.left = "auto";
    }
  }

  // 3) Movimiento.
  function applyTransform(animate = true) {
    if (!track) {
      return;
    }

    if (!slides.length) {
      if (!animate) {
        track.style.transition = "none";
        track.style.transform = "translateX(0px)";
        void track.offsetHeight;
        track.style.transition = `transform ${TRANSITION_DURATION}ms ease`;
      } else {
        track.style.transform = "translateX(0px)";
      }

      updateUI();
      return;
    }

    const offset = -Math.round(index * slideWidth);

    if (!animate) {
      track.style.transition = "none";
    }

    track.style.transform = `translateX(${offset}px)`;

    if (!animate) {
      void track.offsetHeight;
      track.style.transition = `transform ${TRANSITION_DURATION}ms ease`;
    }

    updateUI();
  }

  function goTo(targetIndex, animate = true) {
    if (!slides.length) {
      updateUI();
      return;
    }

    const clamped = Math.max(0, Math.min(targetIndex, slides.length - 1));

    if (clamped === index && animate) {
      updateUI();
      return;
    }

    index = clamped;
    applyTransform(animate);
  }

  function next() {
    goTo(index + 1, true);
  }

  function prev() {
    goTo(index - 1, true);
  }

  // 4) UI.
  function updateUI() {
    const total = slides.length;

    if (prevBtn) {
      prevBtn.disabled = total <= 1 || index === 0;
    }

    if (nextBtn) {
      nextBtn.disabled = total <= 1 || index === total - 1;
    }

    if (counterEl) {
      counterEl.textContent = total ? String(index + 1) : "0";
    }

    if (totalEl) {
      totalEl.textContent = String(total);
    }

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  function handlePointerDown(event) {
    if (!viewport || !slides.length) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (slides.length <= 1) {
      return;
    }

    activePointerId = event.pointerId;
    startX = event.clientX;
    isDragging = true;

    if (track) {
      track.style.transition = "none";
    }

    viewport.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!isDragging || activePointerId !== event.pointerId || !track) {
      return;
    }

    const deltaX = event.clientX - startX;
    const base = -Math.round(index * slideWidth);
    track.style.transform = `translateX(${base + deltaX}px)`;
  }

  function handlePointerEnd(event) {
    if (!viewport || activePointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startX;
    const movedEnough = Math.abs(deltaX) >= SWIPE_THRESHOLD_PX;

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    if (track) {
      track.style.transition = `transform ${TRANSITION_DURATION}ms ease`;
    }

    isDragging = false;
    activePointerId = null;

    if (movedEnough) {
      if (deltaX < 0) {
        next();
      } else {
        prev();
      }
    } else {
      applyTransform(true);
    }
  }

  function handlePointerCancel(event) {
    if (!viewport || activePointerId !== event.pointerId) {
      return;
    }

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    if (track) {
      track.style.transition = `transform ${TRANSITION_DURATION}ms ease`;
    }

    isDragging = false;
    activePointerId = null;
    applyTransform(true);
  }

  function handleKeyDown(event) {
    if (!slides.length) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    }
  }

  window.addEventListener(
    "resize",
    () => {
      layout();
    },
    { passive: true }
  );

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      prev();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      next();
    });
  }

  if (viewport) {
    viewport.addEventListener("keydown", handleKeyDown, { passive: true });
    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", handlePointerEnd);
    viewport.addEventListener("pointercancel", handlePointerCancel);
  }

  requestAnimationFrame(() => {
    root.dataset.ready = "true";
  });

  // Expone la API necesaria para que dashboard.js gestione los datos.
  return {
    showLoading(message = "Cargando tus tareas...") {
      if (status) {
        status.textContent = message;
        status.dataset.mode = "message";
        status.hidden = false;
      }

      if (counterEl) {
        counterEl.textContent = "0";
      }

      if (totalEl) {
        totalEl.textContent = "0";
      }

      if (prevBtn) {
        prevBtn.disabled = true;
      }

      if (nextBtn) {
        nextBtn.disabled = true;
      }

      positionArrows();
    },
    showMessage(message) {
      if (status) {
        status.textContent = message;
        status.dataset.mode = "message";
        status.hidden = false;
      }

      slides = [];
      index = 0;

      if (track) {
        track.innerHTML = "";
        track.style.width = "0px";
        track.style.transform = "translateX(0px)";
      }

      if (counterEl) {
        counterEl.textContent = "0";
      }

      if (totalEl) {
        totalEl.textContent = "0";
      }

      if (prevBtn) {
        prevBtn.disabled = true;
      }

      if (nextBtn) {
        nextBtn.disabled = true;
      }

      positionArrows();
    },
    setSlides(tasks) {
      if (!track) {
        return;
      }

      track.innerHTML = "";
      slides = [];
      index = 0;

      if (!Array.isArray(tasks) || !tasks.length) {
        this.showMessage("Aún no tienes tareas registradas.");
        return;
      }

      const fragment = document.createDocumentFragment();

      tasks.forEach((task, taskIndex) => {
        fragment.appendChild(createTaskSlide(task, taskIndex));
      });

      track.appendChild(fragment);
      slides = Array.from(track.children);

      if (status) {
        status.dataset.mode = "announce";
        status.hidden = true;
      }

      if (totalEl) {
        totalEl.textContent = String(slides.length);
      }

      layout();
      goTo(0, false);
    }
  };
}
