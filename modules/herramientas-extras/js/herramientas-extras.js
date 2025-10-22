const STORAGE_KEY = "simplePosts";
let posts = [];
let currentImageData = null;

const uploadArea = document.querySelector("#uploadArea");
const imageUploadInput = document.querySelector("#imageUpload");
const previewImage = document.querySelector("#previewImage");
const postForm = document.querySelector("#postForm");
const postDateInput = document.querySelector("#postDate");
const networkSelect = document.querySelector("#network");
const descriptionInput = document.querySelector("#description");
const postsList = document.querySelector("#postsList");
const promptSearchInput = document.querySelector("#promptSearch");
const promptCategoriesContainer = document.querySelector(".prompt-categories");

function asElement(target) {
  return target instanceof Element ? target : null;
}

function loadSavedData() {
  const savedPosts = localStorage.getItem(STORAGE_KEY);
  if (!savedPosts) {
    return;
  }

  try {
    posts = JSON.parse(savedPosts);
  } catch (error) {
    console.error("No se pudo parsear la data guardada", error);
    posts = [];
  }

  renderPosts();
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function handleFileRead(file) {
  if (!file || file.type.startsWith("image/") === false) {
    alert("Por favor selecciona un archivo de imagen válido");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    currentImageData = event.target?.result ?? null;

    if (currentImageData && previewImage) {
      previewImage.src = currentImageData;
      previewImage.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
}

function handleImageInputChange(event) {
  const file = event.target.files?.[0];
  handleFileRead(file);
}

function handleUploadAreaClick() {
  imageUploadInput?.click();
}

function handleDragOver(event) {
  event.preventDefault();
  uploadArea?.classList.add("dragover");
}

function handleDragLeave(event) {
  event.preventDefault();
  uploadArea?.classList.remove("dragover");
}

function handleDrop(event) {
  event.preventDefault();
  uploadArea?.classList.remove("dragover");

  const file = event.dataTransfer?.files?.[0];
  handleFileRead(file);
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }
  const options = { day: "numeric", month: "long", year: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}

function getNetworkEmoji(network) {
  const emojis = {
    instagram: "📷",
    facebook: "👤",
    linkedin: "💼",
    twitter: "🐦",
    tiktok: "🎵"
  };

  return emojis[network] ?? "📱";
}

function clearForm() {
  if (postDateInput) {
    postDateInput.value = "";
  }
  if (descriptionInput) {
    descriptionInput.value = "";
  }
  if (previewImage) {
    previewImage.style.display = "none";
    previewImage.removeAttribute("src");
  }
  currentImageData = null;
}

function renderEmptyState() {
  if (!postsList) {
    return;
  }
  postsList.innerHTML =
    '<p class="posts-empty" role="status">No hay publicaciones guardadas</p>';
}

function renderPosts() {
  if (!postsList) {
    return;
  }

  if (posts.length === 0) {
    renderEmptyState();
    return;
  }

  postsList.innerHTML = posts
    .map(
      (post) => `
        <div class="post-item">
          <img src="${post.image}" alt="Imagen de la publicación">
          <div class="post-info">
            <h4>${formatDate(post.date)}</h4>
            <p>${getNetworkEmoji(post.network)} ${
        post.description.length > 50
          ? `${post.description.substring(0, 50)}...`
          : post.description
      }</p>
          </div>
          <div class="post-actions">
            <button class="btn-delete" type="button" data-id="${post.id}">Eliminar</button>
          </div>
        </div>
      `
    )
    .join("");
}

function handlePostSubmit(event) {
  event.preventDefault();

  const date = postDateInput?.value ?? "";
  const network = networkSelect?.value ?? "";
  const description = descriptionInput?.value.trim() ?? "";

  if (!date || !description) {
    alert("Por favor completa la fecha y descripción");
    return;
  }

  if (!currentImageData) {
    alert("Por favor sube una imagen");
    return;
  }

  const post = {
    id: Date.now(),
    date,
    network,
    description,
    image: currentImageData
  };

  posts.push(post);
  posts.sort((a, b) => new Date(a.date) - new Date(b.date));

  savePosts();
  renderPosts();
  clearForm();
  alert("✅ Publicación agregada exitosamente");
}

function handlePostsListClick(event) {
  const target = asElement(event.target);
  if (!target) {
    return;
  }

  const deleteButton = target.closest(".btn-delete");
  if (!deleteButton) {
    return;
  }

  const id = Number.parseInt(deleteButton.dataset.id ?? "", 10);
  if (Number.isNaN(id)) {
    return;
  }

  const shouldDelete = confirm("¿Seguro que quieres eliminar esta publicación?");
  if (!shouldDelete) {
    return;
  }

  posts = posts.filter((post) => post.id !== id);
  savePosts();
  renderPosts();
}

function toggleCategory(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector("span:last-child");

  if (!content) {
    return;
  }

  const isActive = content.classList.toggle("active");
  if (arrow) {
    arrow.textContent = isActive ? "▲" : "▼";
  }
}

function extractPromptText(promptItem) {
  const number = promptItem.querySelector(".prompt-number")?.textContent ?? "";
  const text = promptItem.textContent.replace("Copiar", "").trim();
  return text.replace(number, "").trim();
}

function updateCopyButtonState(button, text) {
  const originalText = button.textContent;
  button.textContent = text;
  button.dataset.originalText = originalText;
}

function restoreCopyButton(button) {
  const originalText = button.dataset.originalText ?? "Copiar";
  button.textContent = originalText;
  delete button.dataset.originalText;
}

function handlePromptCopy(promptItem) {
  const text = extractPromptText(promptItem);
  const copyButton = promptItem.querySelector(".copy-btn");

  if (!text || !copyButton) {
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    updateCopyButtonState(copyButton, "✅ Copiado");
    copyButton.style.background = "#10b981";

    setTimeout(() => {
      restoreCopyButton(copyButton);
      copyButton.style.background = "#10b981";
    }, 2000);
  });
}

function handlePromptInteraction(event) {
  const target = asElement(event.target);
  if (!target) {
    return;
  }

  const header = target.closest(".category-header");
  if (header) {
    toggleCategory(header);
    return;
  }

  const promptItem = target.closest(".prompt-item");
  if (promptItem) {
    handlePromptCopy(promptItem);
  }
}

function handlePromptSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const promptItems = promptCategoriesContainer?.querySelectorAll(".prompt-item") ?? [];

  promptItems.forEach((item) => {
    const text = item.textContent.toLowerCase();
    const matches = text.includes(searchTerm);
    item.style.display = matches ? "block" : "none";
  });

  const categories = promptCategoriesContainer?.querySelectorAll(".prompt-category") ?? [];
  categories.forEach((category) => {
    const content = category.querySelector(".category-content");
    const arrow = category.querySelector(".category-header span:last-child");
    if (!content) {
      return;
    }

    const visibleItems = content.querySelectorAll(
      ".prompt-item:not([style*='display: none'])"
    );

    if (searchTerm && visibleItems.length > 0) {
      content.classList.add("active");
      if (arrow) {
        arrow.textContent = "▲";
      }
    } else if (!searchTerm) {
      if (arrow) {
        arrow.textContent = content.classList.contains("active") ? "▲" : "▼";
      }
    } else if (visibleItems.length === 0) {
      content.classList.remove("active");
      if (arrow) {
        arrow.textContent = "▼";
      }
    }
  });
}

function setDefaultDate() {
  if (!postDateInput) {
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  postDateInput.value = today;
}

function registerEventListeners() {
  if (uploadArea) {
    uploadArea.addEventListener("click", handleUploadAreaClick);
    uploadArea.addEventListener("dragover", handleDragOver);
    uploadArea.addEventListener("dragleave", handleDragLeave);
    uploadArea.addEventListener("drop", handleDrop);
  }

  imageUploadInput?.addEventListener("change", handleImageInputChange);

  postForm?.addEventListener("submit", handlePostSubmit);

  postsList?.addEventListener("click", handlePostsListClick);

  promptCategoriesContainer?.addEventListener("click", handlePromptInteraction);

  promptSearchInput?.addEventListener("input", handlePromptSearch);
}

function initialize() {
  loadSavedData();
  setDefaultDate();
  registerEventListeners();
  if (posts.length === 0) {
    renderEmptyState();
  }
}

document.addEventListener("DOMContentLoaded", initialize);
// Slider functionality
let currentSlide = 0;
let totalSlides = 0;
let slideWidth = 340; // 320px card + 20px margin

function getVisibleSlides() {
  const containerWidth = document.querySelector('.slider-container')?.offsetWidth || 1200;
  if (window.innerWidth <= 768) {
    return 1;
  } else if (window.innerWidth <= 1024) {
    return Math.floor(containerWidth / slideWidth) || 2;
  } else {
    return Math.floor(containerWidth / slideWidth) || 3;
  }
}

function moveSlider(direction) {
  const slider = document.getElementById('aiSlider');
  if (!slider) return;

  const visibleSlides = getVisibleSlides();
  const maxSlide = Math.max(0, totalSlides - visibleSlides);
  
  currentSlide += direction;
  
  if (currentSlide < 0) {
    currentSlide = 0;
  } else if (currentSlide > maxSlide) {
    currentSlide = maxSlide;
  }
  
  const translateX = -(currentSlide * slideWidth);
  slider.style.transform = `translateX(${translateX}px)`;
  
  updateSliderButtons();
}

function updateSliderButtons() {
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  
  if (prevBtn) {
    prevBtn.disabled = currentSlide === 0;
  }
  
  if (nextBtn) {
    const visibleSlides = getVisibleSlides();
    const maxSlide = Math.max(0, totalSlides - visibleSlides);
    nextBtn.disabled = currentSlide >= maxSlide;
  }
}

function initializeSlider() {
  const slider = document.getElementById('aiSlider');
  if (!slider) return;
  
  totalSlides = slider.children.length;
  updateSliderButtons();
  
  // Auto-slide every 6 seconds
  setInterval(() => {
    const visibleSlides = getVisibleSlides();
    const maxSlide = Math.max(0, totalSlides - visibleSlides);
    if (currentSlide >= maxSlide) {
      currentSlide = -1;
    }
    moveSlider(1);
  }, 6000);
}

// Make moveSlider globally available
window.moveSlider = moveSlider;

// Initialize slider when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeSlider, 200);
});

// Update slider on window resize
window.addEventListener('resize', () => {
  updateSliderButtons();
  // Recalculate position without moving
  const slider = document.getElementById('aiSlider');
  if (slider) {
    const translateX = -(currentSlide * slideWidth);
    slider.style.transform = `translateX(${translateX}px)`;
  }
});

