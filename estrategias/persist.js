window.strategyStorage = (function () {
  var STORAGE_KEY = "estrategia:pyme:v1";

  function save(state) {
    try {
      var serialized = JSON.stringify(state);
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn("No se pudo guardar la estrategia en localStorage:", error);
    }
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.warn("No se pudo recuperar la estrategia guardada:", error);
      return null;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("No se pudo limpiar la estrategia almacenada:", error);
    }
  }

  return {
    save: save,
    load: load,
    clear: clear
  };
})();
