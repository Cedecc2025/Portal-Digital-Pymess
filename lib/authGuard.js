// authGuard.js
// Este módulo centraliza la lógica de autenticación y protección de rutas del sistema.

import { gotoFromModule } from "./pathUtil.js";

const LOGIN_RELATIVE_PATH = "../modules/auth/login.html";
const SESSION_STORAGE_KEY = "sistemaModularSesion";

// Recupera la sesión almacenada en localStorage o sessionStorage.
function getStoredSession() {
  // Se intenta primero en localStorage ("Recordarme") y luego en sessionStorage.
  const localSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
  const sessionSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (localSession) {
    return JSON.parse(localSession);
  }

  if (sessionSession) {
    return JSON.parse(sessionSession);
  }

  return null;
}

// Determina si existe una sesión autenticada.
export function isAuthenticated() {
  // Se considera autenticado si hay un username almacenado.
  const session = getStoredSession();
  return Boolean(session && session.username);
}

// Valida si hay sesión activa y redirige al login en caso contrario.
export function requireAuth() {
  if (isAuthenticated()) {
    return;
  }

  gotoFromModule(import.meta.url, LOGIN_RELATIVE_PATH);
}

// Elimina cualquier sesión almacenada y redirige al login.
export function logout() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  gotoFromModule(import.meta.url, LOGIN_RELATIVE_PATH);
}

// Expone utilidades adicionales necesarias para guardar la sesión desde otros módulos.
export function saveSession(user, rememberMe) {
  const isUserObject = typeof user === "object" && user !== null;
  const username = isUserObject ? user.username : user;
  const userId = isUserObject ? user.id ?? user.userId ?? null : null;

  if (!username) {
    throw new Error("No se puede guardar la sesión sin un nombre de usuario.");
  }

  const sessionData = {
    username: username,
    userId: userId ?? null,
    loginAt: new Date().toISOString()
  };

  if (rememberMe === true) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } else {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  }
}

// Recupera el usuario actual para mostrar información contextual.
export function getCurrentUsername() {
  const session = getStoredSession();

  if (session && session.username) {
    return session.username;
  }

  return null;
}

// Recupera el usuario actual completo, incluyendo el identificador si está disponible.
export function getCurrentUser() {
  const session = getStoredSession();

  if (!session || !session.username) {
    return null;
  }

  return {
    username: session.username,
    userId: session.userId ?? null,
    loginAt: session.loginAt ?? null
  };
}
