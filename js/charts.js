// ============================================================
//  charts.js — Lógica dos gráficos do Dashboard Biométrico NUBUS
// ============================================================

// ── Instâncias dos gráficos ──────────────────────────────────
let mainChart, ncLineChart, ncDonutChart, cameraChart, dailyChart;
let currentYear = '2025';

// ── Utilitários ──────────────────────────────────────────────
function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function fmt(n)   { return n.toLocaleString('pt-BR'); }
function pct(a,b) { return Math.round(a / b * 100); }

// ── Seletor de mês ───────────────────────────────────────────
function populateMonthSelect(year) {
  const sel = document.getElementById('monthSelect');
  sel.innerHTML = '';
  const meses2025 = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const meses2026 = ['Jan','Fev','Mar','Abr'];

  if (year === '2025' || year === 'geral')
    meses2025.forEach(m => { const o = document.createElement('option'); o.value = m+'/2025'; o.textContent = m+'/2025'; sel.appendChild(o); });
  if (year === '2026' || year === 'geral')
    meses2026.forEach(m => { const o = document.createElement('option'); o.value = m+'/2026'; o.textContent = m+'/2026'; sel.appendChild(o); });

  sel.value = (year === '2025') ? 'Dez/2025' : 'Abr/2026';
}

// ── Métricas ──────────────────────────────────────────────────
function renderMetrics(year) {
  const d = DB_MENSAL[year];
  const tot  = sum(d.total);
  const bot  = sum(d.botoneira);
  const conf = sum(d.conferencia);
  const nc   = sum(d.naoEstudante) + sum(d.naoComum) + sum(d.naoGratuidade) + sum(d.naoDuvida);

  document.getElementById('metrics-area').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Total processado</div>
      <div class="metric-value">${fmt(tot)}</div>
      <div class="metric-sub">${d.meses.length} meses em ${d.label}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Fila conferência</div>
      <div class="metric-value">${fmt(conf)}</div>
      <div class="metric-sub">${pct(conf,tot)}% do total</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Fila botoneira</div>
      <div class="metric-value">${fmt(bot)}</div>
      <div class="metric-sub">${pct(bot,tot)}% do total</div>
    </div>
    <div class="metric-card danger">
      <div class="metric-label">Uso indevido detectado</div>
      <div class="metric-value">${fmt(nc)}</div>
      <div class="metric-sub">ocorrências "não confere"</div>
    </div>
  `;
}

// ── Gráfico mensal principal ──────────────────────────────────
function renderMain(year) {
  const d = DB_MENSAL[year];
  document.getElementById('main-chart-title').textContent =
    `Volume mensal de registros processados — ${d.label}`;

  if (mainChart) mainChart.destroy();
  mainChart = new Chart(document.getElementById('mainChart'), {
    type: 'bar',
    data: {
      labels: d.meses,
      datasets: [
        { label:'Total',       data: d.total,       backgroundColor:'#B5D4F4', borderColor:'#185FA5', borderWidth:1, borderRadius:3, order:2 },
        { label:'Conferência', data: d.conferencia,  type:'line', borderColor:'#3B6D11', backgroundColor:'rgba(59,109,17,0.08)',  fill:true, tension:0.3, pointRadius:3, order:1 },
        { label:'Botoneira',   data: d.botoneira,    type:'line', borderColor:'#BA7517', backgroundColor:'rgba(186,117,23,0.08)', fill:true, tension:0.3, pointRadius:3, order:1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font:{size:10}, autoSkip:false, maxRotation:45 }, grid: { display:false } },
        y: { ticks: { font:{size:10}, callback: v => v>=1000 ? Math.round(v/1000)+'k' : v }, grid: { color:'rgba(128,128,128,0.1)' } }
      }
    }
  });
}

// ── Seção Não Confere ─────────────────────────────────────────
function renderNcSection(year) {
  const d    = DB_MENSAL[year];
  const est  = sum(d.naoEstudante);
  const com  = sum(d.naoComum);
  const grat = sum(d.naoGratuidade);
  const duv  = sum(d.naoDuvida);
  const total = est + com + grat + duv;

  document.getElementById('nc-alerta-text').textContent =
    `${fmt(total)} ocorrências detectadas em ${d.label} — biometria facial não corresponde ao titular do cartão`;

  document.getElementById('nc-cards-area').innerHTML = `
    <div class="nc-card estudante">
      <div class="nc-card-label">Não confere — Estudante</div>
      <div class="nc-card-value">${fmt(est)}</div>
      <div class="nc-card-desc">${pct(est,total)}% das ocorrências · Cartão de estudante usado por terceiros</div>
    </div>
    <div class="nc-card comum">
      <div class="nc-card-label">Não confere — Comum</div>
      <div class="nc-card-value">${fmt(com)}</div>
      <div class="nc-card-desc">${pct(com,total)}% das ocorrências · Cartão comum usado por terceiros</div>
    </div>
    <div class="nc-card gratuidade">
      <div class="nc-card-label">Não confere — Gratuidade</div>
      <div class="nc-card-value">${fmt(grat)}</div>
      <div class="nc-card-desc">${pct(grat,total)}% das ocorrências · Cartão de gratuidade usado por terceiros</div>
    </div>
    <div class="nc-card duvida">
      <div class="nc-card-label">Dúvida</div>
      <div class="nc-card-value">${fmt(duv)}</div>
      <div class="nc-card-desc">${pct(duv,total)}% das ocorrências · Casos pendentes de confirmação</div>
    </div>
  `;
}

function renderNcLine(year) {
  const d = DB_MENSAL[year];
  if (ncLineChart) ncLineChart.destroy();
  ncLineChart = new Chart(document.getElementById('ncLineChart'), {
    type: 'line',
    data: {
      labels: d.meses,
      datasets: [
        { label:'Estudante',  data:d.naoEstudante,  borderColor:'#D85A30', backgroundColor:'rgba(216,90,48,0.08)',  fill:true, tension:0.35, pointRadius:3, borderWidth:2 },
        { label:'Comum',      data:d.naoComum,      borderColor:'#185FA5', backgroundColor:'rgba(24,95,165,0.08)',  fill:true, tension:0.35, pointRadius:3, borderWidth:2 },
        { label:'Gratuidade', data:d.naoGratuidade, borderColor:'#3B6D11', backgroundColor:'rgba(59,109,17,0.08)', fill:true, tension:0.35, pointRadius:3, borderWidth:2 },
        { label:'Dúvida',     data:d.naoDuvida,     borderColor:'#7D3C98', backgroundColor:'rgba(125,60,152,0.08)', fill:true, tension:0.35, pointRadius:3, borderWidth:2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display:true, position:'bottom', labels:{ font:{size:10}, padding:8, boxWidth:10 } } },
      scales: {
        x: { ticks: { font:{size:10}, autoSkip:false, maxRotation:45 }, grid: { display:false } },
        y: { ticks: { font:{size:10} }, grid: { color:'rgba(128,128,128,0.1)' } }
      }
    }
  });
}

function renderNcDonut(year) {
  const d    = DB_MENSAL[year];
  const est  = sum(d.naoEstudante);
  const com  = sum(d.naoComum);
  const grat = sum(d.naoGratuidade);
  const duv  = sum(d.naoDuvida);
  const total = est + com + grat + duv;

  if (ncDonutChart) ncDonutChart.destroy();
  ncDonutChart = new Chart(document.getElementById('ncDonutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Estudante','Comum','Gratuidade','Dúvida'],
      datasets: [{ data:[est,com,grat,duv], backgroundColor:['#D85A30','#185FA5','#3B6D11','#7D3C98'], borderWidth:2, borderColor:'transparent' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display:true, position:'bottom', labels:{ font:{size:11}, padding:10, boxWidth:12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.parsed)} (${pct(ctx.parsed,total)}%)` } }
      },
      cutout: '60%'
    }
  });
}

// ── Câmera ────────────────────────────────────────────────────
function renderCamera(year) {
  const d = DB_MENSAL[year];
  if (cameraChart) cameraChart.destroy();
  cameraChart = new Chart(document.getElementById('cameraChart'), {
    type: 'bar',
    data: {
      labels: d.meses,
      datasets: [{ label:'Câmera desalinhada', data:d.camera, backgroundColor:'#F0997B', borderColor:'#D85A30', borderWidth:1, borderRadius:3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display:false } },
      scales: {
        x: { ticks: { font:{size:10}, autoSkip:false, maxRotation:45 }, grid: { display:false } },
        y: { ticks: { font:{size:10} }, grid: { color:'rgba(128,128,128,0.1)' } }
      }
    }
  });
}

// ── Gráfico diário ─────────────────────────────────────────────
function renderDaily() {
  const key = document.getElementById('monthSelect').value;
  const d   = DB_DIARIO[key];
  if (!d) return;

  const totTotal = sum(d.total);
  const totBot   = sum(d.botoneira);
  const totConf  = sum(d.conferencia);
  const media    = Math.round(totTotal / d.dias.length);

  document.getElementById('daily-summary').innerHTML = `
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
      <div class="ds-value">${pct(totConf,totTotal)}% / ${pct(totBot,totTotal)}%</div>
      <div class="ds-sub">distribuição do mês</div>
    </div>
  `;

  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(document.getElementById('dailyChart'), {
    type: 'bar',
    data: {
      labels: d.dias.map(x => 'Dia ' + x),
      datasets: [
        { label:'Total',       data:d.total,       backgroundColor:'rgba(181,212,244,0.7)', borderColor:'#185FA5', borderWidth:1, borderRadius:3, order:2 },
        { label:'Conferência', data:d.conferencia, type:'line', borderColor:'#3B6D11', backgroundColor:'transparent', tension:0.3, pointRadius:3, pointBackgroundColor:'#3B6D11', borderWidth:2, order:1 },
        { label:'Botoneira',   data:d.botoneira,   type:'line', borderColor:'#BA7517', backgroundColor:'transparent', tension:0.3, pointRadius:3, pointBackgroundColor:'#BA7517', borderWidth:2, order:1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display:true, position:'bottom', labels:{ font:{size:10}, padding:10, boxWidth:10 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { font:{size:9}, autoSkip:false, maxRotation:45 }, grid: { display:false } },
        y: { ticks: { font:{size:10}, callback: v => v>=1000 ? Math.round(v/1000)+'k' : v }, grid: { color:'rgba(128,128,128,0.1)' } }
      }
    }
  });
}

// ── Controle principal ────────────────────────────────────────
function setYear(year, btn) {
  currentYear = year;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderMetrics(year);
  renderMain(year);
  renderNcSection(year);
  renderNcLine(year);
  renderNcDonut(year);
  renderCamera(year);
  populateMonthSelect(year);
  renderDaily();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setYear('2025', document.querySelector('.tab.active'));
});
