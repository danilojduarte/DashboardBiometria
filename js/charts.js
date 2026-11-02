// ============================================================
//  charts.js — Lógica dos gráficos e Tema (Clean/Dark) NUBUS
// ============================================================

let mainChart, ncLineChart, ncDonutChart, cameraChart, dailyChart;
let currentYear = "2025";
let ncFilterMode = "all";

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}
function fmt(n) {
  return n.toLocaleString("pt-BR");
}
function pct(a, b) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

function getThemeColor(varName, defaultColor) {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || defaultColor;
}

// ── Função de alternância do tema ──
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "clean";
  const newTheme = currentTheme === "dark" ? "clean" : "dark";
  setTheme(newTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("nubus_theme", theme);

  const btnText = document.querySelector(".theme-text");
  const btnIcon = document.querySelector(".theme-icon");
  if (btnText && btnIcon) {
    if (theme === "dark") {
      btnText.textContent = "Clean";
      btnIcon.textContent = "☀️";
    } else {
      btnText.textContent = "Dark";
      btnIcon.textContent = "🌙";
    }
  }

  // Aguarda um ciclo para os estilos CSS serem aplicados antes de redesenhar os gráficos
  setTimeout(() => {
    updateAllCharts();
  }, 50);
}

function initTheme() {
  const savedTheme = localStorage.getItem("nubus_theme");
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    setTheme("dark");
  } else {
    setTheme("clean");
  }
}

function updateAllCharts() {
  if (currentYear) {
    renderMain(currentYear);
    renderNcLine(currentYear);
    renderNcDonut(currentYear);
    renderCamera(currentYear);
    renderDaily();
  }
}

function populateMonthSelect(year) {
  const sel = document.getElementById("monthSelect");
  if (!sel) return;
  sel.innerHTML = "";
  const meses2025 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const meses2026 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out"];

  if (year === "2025" || year === "geral")
    meses2025.forEach((m) => {
      const o = document.createElement("option");
      o.value = m + "/2025";
      o.textContent = m + "/2025";
      sel.appendChild(o);
    });
  if (year === "2026" || year === "geral")
    meses2026.forEach((m) => {
      const o = document.createElement("option");
      o.value = m + "/2026";
      o.textContent = m + "/2026";
      sel.appendChild(o);
    });

  sel.value = year === "2025" ? "Dez/2025" : "Out/2026";
}

function populateNcMonthSelect(year) {
  const sel = document.getElementById("ncMonthSelect");
  if (!sel) return;
  sel.innerHTML = "";

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "Todos os meses";
  sel.appendChild(all);

  const meses2025 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const meses2026 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out"];

  if (year === "2025" || year === "geral")
    meses2025.forEach((m, i) => {
      const o = document.createElement("option");
      o.value = year === "geral" ? `2025-${i}` : String(i);
      o.textContent = year === "geral" ? `${m}/2025` : m;
      sel.appendChild(o);
    });
  if (year === "2026" || year === "geral")
    meses2026.forEach((m, i) => {
      const o = document.createElement("option");
      o.value = year === "geral" ? `2026-${i}` : String(i);
      o.textContent = year === "geral" ? `${m}/2026` : m;
      sel.appendChild(o);
    });

  sel.value = "all";
  ncFilterMode = "all";
}

function getNcData(year) {
  const d = DB_MENSAL[year];
  const sel = document.getElementById("ncMonthSelect");
  const val = sel ? sel.value : "all";

  if (val === "all") {
    return {
      meses: d.meses,
      naoEstudante: d.naoEstudante,
      naoComum: d.naoComum,
      naoGratuidade: d.naoGratuidade,
      naoDuvida: d.naoDuvida,
      label: d.label,
      isSingle: false,
    };
  }

  let idx;
  if (year === "geral") {
    const [yr, i] = val.split("-");
    const offset = yr === "2026" ? 12 : 0;
    idx = offset + parseInt(i);
  } else {
    idx = parseInt(val);
  }

  return {
    meses: [d.meses[idx]],
    naoEstudante: [d.naoEstudante[idx]],
    naoComum: [d.naoComum[idx]],
    naoGratuidade: [d.naoGratuidade[idx]],
    naoDuvida: [d.naoDuvida[idx]],
    label: d.meses[idx] + (year === "geral" ? "" : `/${year}`),
    isSingle: true,
  };
}

function onNcFilterChange() {
  renderNcSection(currentYear);
  renderNcLine(currentYear);
  renderNcDonut(currentYear);
}

function renderMetrics(year) {
  const d = DB_MENSAL[year];
  const tot = sum(d.total);
  const bot = sum(d.botoneira);
  const conf = sum(d.conferencia);
  const nc =
    sum(d.naoEstudante) +
    sum(d.naoComum) +
    sum(d.naoGratuidade) +
    sum(d.naoDuvida);

  document.getElementById("metrics-area").innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Total processado</div>
      <div class="metric-value">${fmt(tot)}</div>
      <div class="metric-sub">${d.meses.length} meses em ${d.label}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Fila conferência</div>
      <div class="metric-value">${fmt(conf)}</div>
      <div class="metric-sub">${pct(conf, tot)}% do total</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Fila botoneira</div>
      <div class="metric-value">${fmt(bot)}</div>
      <div class="metric-sub">${pct(bot, tot)}% do total</div>
    </div>
    <div class="metric-card danger">
      <div class="metric-label">Uso indevido detectado</div>
      <div class="metric-value">${fmt(nc)}</div>
      <div class="metric-sub">ocorrências "não confere"</div>
    </div>
  `;
}

function renderMain(year) {
  const d = DB_MENSAL[year];
  document.getElementById("main-chart-title").textContent =
    `Volume mensal de registros processados — ${d.label}`;

  const corTotal = getThemeColor("--cor-total", "#185fa5");
  const corTotalBg = getThemeColor("--cor-total-bg", "#B5D4F4");
  const corConf = getThemeColor("--cor-conf", "#3B6D11");
  const corBot = getThemeColor("--cor-bot", "#BA7517");
  const textColor = getThemeColor("--text2", "#888888");

  if (mainChart) mainChart.destroy();
  mainChart = new Chart(document.getElementById("mainChart"), {
    type: "bar",
    data: {
      labels: d.meses,
      datasets: [
        {
          label: "Total",
          data: d.total,
          backgroundColor: corTotalBg,
          borderColor: corTotal,
          borderWidth: 1,
          borderRadius: 3,
          order: 2,
        },
        {
          label: "Conferência",
          data: d.conferencia,
          type: "line",
          borderColor: corConf,
          backgroundColor: "rgba(59,109,17,0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          order: 1,
        },
        {
          label: "Botoneira",
          data: d.botoneira,
          type: "line",
          borderColor: corBot,
          backgroundColor: "rgba(186,117,23,0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 }, autoSkip: false, maxRotation: 45 },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (v) => (v >= 1000 ? Math.round(v / 1000) + "k" : v),
          },
          grid: { color: "rgba(128,128,128,0.15)" },
        },
      },
    },
  });
}

function renderNcSection(year) {
  const nd = getNcData(year);
  const est = sum(nd.naoEstudante);
  const com = sum(nd.naoComum);
  const grat = sum(nd.naoGratuidade);
  const duv = sum(nd.naoDuvida);
  const total = est + com + grat + duv;

  const periodo = nd.isSingle
    ? `em ${nd.label}`
    : `em ${DB_MENSAL[year].label}`;
  document.getElementById("nc-alerta-text").textContent =
    `${fmt(total)} ocorrências detectadas ${periodo} — biometria facial não corresponde ao titular do cartão`;

  document.getElementById("nc-cards-area").innerHTML = `
    <div class="nc-card estudante">
      <div class="nc-card-label">Não confere — Estudante</div>
      <div class="nc-card-value">${fmt(est)}</div>
      <div class="nc-card-desc">${pct(est, total)}% das ocorrências · Cartão de estudante usado por terceiros</div>
    </div>
    <div class="nc-card comum">
      <div class="nc-card-label">Não confere — Comum</div>
      <div class="nc-card-value">${fmt(com)}</div>
      <div class="nc-card-desc">${pct(com, total)}% das ocorrências · Cartão comum usado por terceiros</div>
    </div>
    <div class="nc-card gratuidade">
      <div class="nc-card-label">Não confere — Gratuidade</div>
      <div class="nc-card-value">${fmt(grat)}</div>
      <div class="nc-card-desc">${pct(grat, total)}% das ocorrências · Cartão de gratuidade usado por terceiros</div>
    </div>
    <div class="nc-card duvida">
      <div class="nc-card-label">Dúvida</div>
      <div class="nc-card-value">${fmt(duv)}</div>
      <div class="nc-card-desc">${pct(duv, total)}% das ocorrências · Casos pendentes de confirmação</div>
    </div>
  `;
}

function renderNcLine(year) {
  const nd = getNcData(year);
  if (ncLineChart) ncLineChart.destroy();

  const textColor = getThemeColor("--text2", "#888888");
  const corEst = getThemeColor("--nc-estudante-border", "#D85A30");
  const corCom = getThemeColor("--nc-comum-border", "#185FA5");
  const corGrat = getThemeColor("--nc-gratuidade-border", "#3B6D11");
  const corDuv = getThemeColor("--nc-duvida-border", "#7D3C98");

  const tipo = nd.isSingle ? "bar" : "line";
  ncLineChart = new Chart(document.getElementById("ncLineChart"), {
    type: tipo,
    data: {
      labels: nd.meses,
      datasets: [
        {
          label: "Estudante",
          data: nd.naoEstudante,
          backgroundColor: "rgba(216,90,48,0.7)",
          borderColor: corEst,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: "Comum",
          data: nd.naoComum,
          backgroundColor: "rgba(24,95,165,0.7)",
          borderColor: corCom,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: "Gratuidade",
          data: nd.naoGratuidade,
          backgroundColor: "rgba(59,109,17,0.7)",
          borderColor: corGrat,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: "Dúvida",
          data: nd.naoDuvida,
          backgroundColor: "rgba(125,60,152,0.7)",
          borderColor: corDuv,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: textColor, font: { size: 10 }, padding: 8, boxWidth: 10 },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 }, autoSkip: false, maxRotation: 45 },
          grid: { display: false },
        },
        y: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { color: "rgba(128,128,128,0.15)" },
        },
      },
    },
  });
}

function renderNcDonut(year) {
  const nd = getNcData(year);
  const est = sum(nd.naoEstudante);
  const com = sum(nd.naoComum);
  const grat = sum(nd.naoGratuidade);
  const duv = sum(nd.naoDuvida);
  const total = est + com + grat + duv;

  const textColor = getThemeColor("--text2", "#888888");
  const corEst = getThemeColor("--nc-estudante-border", "#D85A30");
  const corCom = getThemeColor("--nc-comum-border", "#185FA5");
  const corGrat = getThemeColor("--nc-gratuidade-border", "#3B6D11");
  const corDuv = getThemeColor("--nc-duvida-border", "#7D3C98");

  if (ncDonutChart) ncDonutChart.destroy();
  ncDonutChart = new Chart(document.getElementById("ncDonutChart"), {
    type: "doughnut",
    data: {
      labels: ["Estudante", "Comum", "Gratuidade", "Dúvida"],
      datasets: [
        {
          data: [est, com, grat, duv],
          backgroundColor: [corEst, corCom, corGrat, corDuv],
          borderWidth: 2,
          borderColor: "transparent",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: textColor, font: { size: 11 }, padding: 10, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: ${fmt(ctx.parsed)} (${pct(ctx.parsed, total)}%)`,
          },
        },
      },
      cutout: "60%",
    },
  });
}

function renderCamera(year) {
  const d = DB_MENSAL[year];
  const textColor = getThemeColor("--text2", "#888888");
  const corCamera = getThemeColor("--cor-camera", "#D85A30");

  if (cameraChart) cameraChart.destroy();
  cameraChart = new Chart(document.getElementById("cameraChart"), {
    type: "bar",
    data: {
      labels: d.meses,
      datasets: [
        {
          label: "Câmera desalinhada",
          data: d.camera,
          backgroundColor: "rgba(216,90,48,0.6)",
          borderColor: corCamera,
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 }, autoSkip: false, maxRotation: 45 },
          grid: { display: false },
        },
        y: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { color: "rgba(128,128,128,0.15)" },
        },
      },
    },
  });
}

function renderDaily() {
  const key = document.getElementById("monthSelect") ? document.getElementById("monthSelect").value : null;
  if (!key || !DB_DIARIO[key]) return;
  const d = DB_DIARIO[key];

  const totTotal = sum(d.total);
  const totBot = sum(d.botoneira);
  const totConf = sum(d.conferencia);
  const media = Math.round(totTotal / d.dias.length);

  document.getElementById("daily-summary").innerHTML = `
    <div class="ds-card">
      <div class="ds-label">Total do mês</div>
      <div class="ds-value">${fmt(totTotal)}</div>
      <div class="ds-sub">${d.dias.length} dias trabalhados</div>
    </div>
    <div class="ds-card">
      <div class="ds-label">Média diária</div>
      <div class="ds-value">${fmt(media)}</div>
      <div class="ds-sub">registros/dia</div>
    </div>
    <div class="ds-card">
      <div class="ds-label">Conferência / Botoneira</div>
      <div class="ds-value">${pct(totConf, totTotal)}% / ${pct(totBot, totTotal)}%</div>
      <div class="ds-sub">distribuição do mês</div>
    </div>
  `;

  const corTotal = getThemeColor("--cor-total", "#185fa5");
  const corTotalBg = getThemeColor("--cor-total-bg", "rgba(181,212,244,0.7)");
  const corConf = getThemeColor("--cor-conf", "#3B6D11");
  const corBot = getThemeColor("--cor-bot", "#BA7517");
  const textColor = getThemeColor("--text2", "#888888");

  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(document.getElementById("dailyChart"), {
    type: "bar",
    data: {
      labels: d.dias.map((x) => "Dia " + x),
      datasets: [
        {
          label: "Total",
          data: d.total,
          backgroundColor: corTotalBg,
          borderColor: corTotal,
          borderWidth: 1,
          borderRadius: 3,
          order: 2,
        },
        {
          label: "Conferência",
          data: d.conferencia,
          type: "line",
          borderColor: corConf,
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: corConf,
          borderWidth: 2,
          order: 1,
        },
        {
          label: "Botoneira",
          data: d.botoneira,
          type: "line",
          borderColor: corBot,
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: corBot,
          borderWidth: 2,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: textColor, font: { size: 10 }, padding: 10, boxWidth: 10 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 9 }, autoSkip: false, maxRotation: 45 },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (v) => (v >= 1000 ? Math.round(v / 1000) + "k" : v),
          },
          grid: { color: "rgba(128,128,128,0.15)" },
        },
      },
    },
  });
}

function setYear(year, btn) {
  currentYear = year;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderMetrics(year);
  renderMain(year);
  populateNcMonthSelect(year);
  renderNcSection(year);
  renderNcLine(year);
  renderNcDonut(year);
  renderCamera(year);
  populateMonthSelect(year);
  renderDaily();
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setYear("2026", document.querySelector(".tab:nth-child(2)"));
});
