// home.js
// Gestiona la portada principal con el carrusel de KPIs.

const AUTO_PLAY_INTERVAL = 6000;
let currentSlideIndex = 0;
let autoPlayHandle = null;

const carouselElement = document.querySelector("#kpiCarousel");
const carouselTrack = document.querySelector("#kpiTrack");
const dotControls = document.querySelectorAll("#kpiControls .dot");
const slides = document.querySelectorAll(".kpi-card");

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

// Ejecuta las inicializaciones cuando el DOM está listo.
function init() {
  initializeCarousel();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
