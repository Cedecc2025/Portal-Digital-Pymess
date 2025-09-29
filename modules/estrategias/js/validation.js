// validation.js
// Contiene reglas de validación y utilidades para mostrar mensajes al usuario.

// Valida que un texto obligatorio no esté vacío.
export function validateRequired(value) {
  return value.trim().length > 0;
}

// Valida que un valor numérico sea mayor a cero.
export function validatePositiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

// Valida un correo electrónico.
export function validateEmail(value) {
  if (!value) {
    return true;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Crea o actualiza un mensaje de error junto al campo asociado.
export function setFieldError(element, message) {
  let feedback = element.parentElement?.querySelector(".field-feedback");
  if (!feedback) {
    feedback = document.createElement("p");
    feedback.className = "field-feedback";
    element.parentElement?.appendChild(feedback);
  }
  feedback.textContent = message;
  if (message) {
    element.classList.add("field-invalid");
  } else {
    element.classList.remove("field-invalid");
  }
}

// Limpia todos los mensajes de error de un contenedor.
export function clearFeedback(container) {
  if (!container) {
    return;
  }
  container.querySelectorAll(".field-feedback").forEach((node) => {
    node.textContent = "";
  });
  container.querySelectorAll(".field-invalid").forEach((node) => {
    node.classList.remove("field-invalid");
  });
}
