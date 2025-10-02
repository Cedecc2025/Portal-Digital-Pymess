// charts.js
// Crea visualizaciones simples para los KPIs utilizando Chart.js.

import { loadChartJs } from "../../../lib/assetLoader.js";

let trackingChart = null;

// Destruye un gráfico previo si existe.
function disposeChart() {
  if (trackingChart) {
    trackingChart.destroy();
    trackingChart = null;
  }
}

// Dibuja el gráfico de barras con los datos de tracking mensual.
export async function renderTrackingChart(canvasElement, months) {
  disposeChart();
  if (!canvasElement) {
    return;
  }

  const labels = months.map((month) => month.label);
  const totals = months.map((month) =>
    month.metrics.reduce((acc, metric) => acc + Number(metric.actual ?? 0), 0)
  );

  const targets = months.map((month) =>
    month.metrics.reduce((acc, metric) => acc + Number(metric.target ?? 0), 0)
  );

  try {
    const Chart = await loadChartJs();
    trackingChart = new Chart(canvasElement.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Resultado",
            backgroundColor: "#3b82f6",
            borderRadius: 6,
            data: totals
          },
          {
            label: "Meta",
            backgroundColor: "#10b981",
            borderRadius: 6,
            data: targets
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  } catch (error) {
    console.error("No se pudo renderizar el gráfico de seguimiento", error);
  }
}
