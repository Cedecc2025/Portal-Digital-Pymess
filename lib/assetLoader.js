// assetLoader.js
// Provee utilidades para cargar librerías pesadas bajo demanda y reutilizarlas entre módulos.

const loaders = new Map();

function createLoader(key, importer) {
  if (!loaders.has(key)) {
    loaders.set(
      key,
      importer()
        .then((module) => module)
        .catch((error) => {
          loaders.delete(key);
          throw error;
        })
    );
  }
  return loaders.get(key);
}

function resolveChartExport(module) {
  if (module?.Chart) {
    return module.Chart;
  }
  if (module?.default?.Chart) {
    return module.default.Chart;
  }
  if (typeof module?.default === "function") {
    return module.default;
  }
  if (typeof module === "function") {
    return module;
  }
  throw new Error("No se pudo cargar Chart.js");
}

function resolveJsPdfExport(module) {
  if (module?.jsPDF) {
    return module.jsPDF;
  }
  if (module?.default?.jsPDF) {
    return module.default.jsPDF;
  }
  if (typeof module?.default === "function") {
    return module.default;
  }
  throw new Error("No se pudo cargar jsPDF");
}

export async function loadChartJs() {
  const module = await createLoader("chartjs", () =>
    import("https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.esm.js")
  );
  return resolveChartExport(module);
}

export async function loadJsPdf() {
  const module = await createLoader("jspdf", () =>
    import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js")
  );
  return resolveJsPdfExport(module);
}
