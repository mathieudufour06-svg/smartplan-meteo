// === Helpers UI ===
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

function scoreBarClass(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'bad';
}

// === Tag de source météo (real / mock / loading) ===
function setWeatherSource(state) {
  const tag = document.getElementById('weatherSource');
  tag.classList.remove('real', 'mock', 'loading');
  tag.classList.add(state);
  tag.textContent = state === 'real'    ? 'Météo réelle'
                  : state === 'loading' ? 'Chargement…'
                  :                       'Météo simulée';
}

// === Résumé météo affiché dans le pill du topbar ===
function renderWeatherSummary(weather) {
  const w = weather || getMockWeather();
  const temps = w.map(s => s.temperature);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const maxRain = Math.max(...w.map(s => s.rainProbability));
  const desc = maxRain >= 60 ? 'Matin clair · pluie probable PM'
             : maxRain >= 30 ? 'Variable · averses possibles'
             :                 'Journée stable';
  document.getElementById('weatherTemp').textContent = `${minT}° → ${maxT}°C`;
  document.getElementById('weatherDesc').textContent = desc;
}

// === Stats agrégées ===
function updateStats(decisions) {
  document.getElementById('statTotal').textContent      = decisions.length;
  document.getElementById('statMaintain').textContent   = decisions.filter(d => d.action === 'maintain').length;
  document.getElementById('statRisky').textContent      = decisions.filter(d => d.action === 'risky').length;
  document.getElementById('statReschedule').textContent = decisions.filter(d => d.action === 'reschedule').length;
}

// === Rendu d'une carte chantier ===
function renderJobCard(job, decision, weatherByHour) {
  const msg = generateClientMessage(job, decision);
  const slotWeather = decision.suggestedTime ? weatherByHour[decision.suggestedTime] : null;
  const meteoScore = slotWeather ? evaluateJobWeather(job, slotWeather).score : 0;
  const scoreCls = scoreBarClass(meteoScore);
  const icon = ACTION_ICONS[decision.action] || '•';

  const card = document.createElement('div');
  card.className = 'job-card';
  card.innerHTML = `
    <div class="job-header">
      <div>
        <h2>${escapeHtml(job.client)}</h2>
        <div class="type">${escapeHtml(TYPE_LABELS[job.type] || job.type)} — priorité ${escapeHtml(job.priority)}</div>
      </div>
      <div class="job-icon ${decision.action}">${icon}</div>
    </div>
    <div class="score-row">
      <div class="score-label">Score météo</div>
      <div class="score-bar"><div class="score-fill ${scoreCls}" style="width:${meteoScore}%"></div></div>
      <div class="score-value">${meteoScore}/100</div>
    </div>
    <div class="decision">
      <div>→ Action : <span class="badge ${decision.action}">${escapeHtml(decision.action)}</span></div>
      <div>→ Heure : ${escapeHtml(decision.suggestedTime || 'aucune')}</div>
      <div>→ Message technique : ${escapeHtml(decision.message)}</div>
    </div>
    <div class="client-msg-block">
      <div class="client-msg-label">Message client prêt à envoyer</div>
      <div class="client-msg">${escapeHtml(msg)}</div>
    </div>
  `;
  return card;
}

// === Simulation complète ===
async function runSimulation() {
  setWeatherSource('loading');
  let weather;
  try {
    weather = await fetchRealWeather(DEFAULT_LAT, DEFAULT_LON);
    setWeatherSource('real');
  } catch (err) {
    console.warn('Fallback météo simulée :', err.message);
    weather = getMockWeather();
    setWeatherSource('mock');
  }
  renderWeatherSummary(weather);

  const weatherByHour = {};
  for (const s of weather) weatherByHour[s.time] = s;

  const decisions = rescheduleJobs(JOBS, weatherByHour);
  const root = document.getElementById('results');
  root.innerHTML = '';

  for (const d of decisions) {
    const job = JOBS.find(j => j.id === d.jobId);
    root.appendChild(renderJobCard(job, d, weatherByHour));
  }

  updateStats(decisions);
}

// === Initialisation ===
document.addEventListener('DOMContentLoaded', () => {
  renderWeatherSummary();
  document.getElementById('runBtn').addEventListener('click', runSimulation);
});
