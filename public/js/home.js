// home.js
// Gestiona la portada principal con el carrusel de KPIs y el micro-formulario de demo.

import { supabaseClient } from "../../lib/supabaseClient.js";

const AUTO_PLAY_INTERVAL = 6000;
let currentSlideIndex = 0;
let autoPlayHandle = null;

const demoForm = document.querySelector("#demoForm");
const demoEmailInput = document.querySelector("#demoEmail");
const demoFeedback = document.querySelector("#demoFeedback");
const demoSubmitButton = document.querySelector("#demoSubmit");
const demoInputWrapper = document.querySelector("#demoInputWrapper");

const carouselElement = document.querySelector("#kpiCarousel");
const carouselTrack = document.querySelector("#kpiTrack");
const dotControls = document.querySelectorAll("#kpiControls .dot");
const slides = document.querySelectorAll(".kpi-card");

// Valida el formato del correo electrónico con un patrón sencillo.
function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return emailPattern.test(email);
}

// Actualiza la interfaz del formulario mostrando mensajes accesibles.
function showDemoFeedback(message, type = "success") {
  if (!demoFeedback) {
    return;
  }

  demoFeedback.textContent = message;
  demoFeedback.className = `form-feedback ${type}`;
}

// Activa o desactiva el estado de carga del botón del formulario.
function setDemoLoading(isLoading) {
  if (!demoSubmitButton) {
    return;
  }

  const spinner = demoSubmitButton.querySelector(".spinner");

  if (isLoading) {
    demoSubmitButton.classList.add("is-loading");
    demoSubmitButton.setAttribute("disabled", "true");
    if (spinner) {
      spinner.hidden = false;
    }
  } else {
    demoSubmitButton.classList.remove("is-loading");
    demoSubmitButton.removeAttribute("disabled");
    if (spinner) {
      spinner.hidden = true;
    }
  }
}

// Guarda el lead en Supabase y retorna true cuando la inserción fue exitosa.
async function saveLead(email) {
  try {
    const { error } = await supabaseClient.from("leads_demo").insert({ email });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error al guardar lead", error);
    return false;
  }
}

// Maneja el envío del formulario validando y persistiendo el correo.
async function handleDemoSubmit(event) {
  event.preventDefault();

  if (!demoEmailInput) {
    return;
  }

  const emailValue = demoEmailInput.value.trim();

  if (isValidEmail(emailValue) === false) {
    demoEmailInput.setAttribute("aria-invalid", "true");
    if (demoInputWrapper) {
      demoInputWrapper.classList.add("input-invalid");
      demoInputWrapper.classList.remove("input-valid");
    }
    showDemoFeedback("Ingresa un correo válido para recibir la demo.", "error");
    return;
  }

  demoEmailInput.setAttribute("aria-invalid", "false");
  if (demoInputWrapper) {
    demoInputWrapper.classList.remove("input-invalid");
    demoInputWrapper.classList.add("input-valid");
  }

  setDemoLoading(true);
  showDemoFeedback("Guardando tu solicitud...", "info");

  const saved = await saveLead(emailValue);

  if (saved) {
    showDemoFeedback("¡Listo! Te enviaremos la demo a tu correo.", "success");
    demoEmailInput.value = "";
    if (demoInputWrapper) {
      demoInputWrapper.classList.remove("input-valid");
    }
  } else {
    showDemoFeedback("No pudimos registrar tu correo. Intenta nuevamente en unos minutos.", "error");
  }

  setDemoLoading(false);
}

// Cambia el slide activo del carrusel y actualiza la posición del track.
function setActiveSlide(index) {
  if (!carouselTrack || slides.length === 0) {
    return;
  }

  const boundedIndex = (index + slides.length) % slides.length;
  currentSlideIndex = boundedIndex;

  const offset = boundedIndex * -100;
  carouselTrack.style.transform = `translateX(${offset}%)`;

  dotControls.forEach((dot) => {
    const isActive = Number(dot.dataset.target) === boundedIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-selected", String(isActive));
  });
}

// Avanza el carrusel al siguiente slide disponible.
function goToNextSlide() {
  setActiveSlide(currentSlideIndex + 1);
}

// Inicia la reproducción automática del carrusel.
function startAutoPlay() {
  stopAutoPlay();
  autoPlayHandle = window.setInterval(goToNextSlide, AUTO_PLAY_INTERVAL);
}

// Detiene la reproducción automática del carrusel.
function stopAutoPlay() {
  if (autoPlayHandle !== null) {
    window.clearInterval(autoPlayHandle);
    autoPlayHandle = null;
  }
}

// Configura los controles del carrusel, incluyendo navegación y autoplay.
function initializeCarousel() {
  if (!carouselElement) {
    return;
  }

  dotControls.forEach((dot) => {
    dot.addEventListener("click", () => {
      const targetIndex = Number(dot.dataset.target ?? 0);
      setActiveSlide(targetIndex);
      startAutoPlay();
    });
  });

  carouselElement.addEventListener("mouseenter", stopAutoPlay);
  carouselElement.addEventListener("mouseleave", startAutoPlay);
  carouselElement.addEventListener("focusin", stopAutoPlay);
  carouselElement.addEventListener("focusout", startAutoPlay);

  setActiveSlide(0);
  startAutoPlay();
}

// Registra los manejadores del formulario de demo si existe en la página.
function initializeDemoForm() {
  if (!demoForm) {
    return;
  }

  demoForm.addEventListener("submit", handleDemoSubmit);
}

// Ejecuta las inicializaciones cuando el DOM está listo.
function init() {
  initializeCarousel();
  initializeDemoForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
