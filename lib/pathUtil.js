// pathUtil.js
// Provee utilidades para construir rutas relativas seguras entre módulos.

// Redirige utilizando la ubicación actual del archivo que invoca la función.
export function gotoFromModule(currentFileUrl, relativeTarget) {
  // Calcula la URL final tomando como base el archivo actual.
  const url = new URL(relativeTarget, currentFileUrl);
  window.location.href = url.href;
}
