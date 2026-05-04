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

// === Badge source météo ===
function setWeatherSource(state) {
  const tag = document.getElementById('weatherSource');
  tag.classList.remove('real', 'mock', 'loading');
  tag.classList.add(state);
  tag.textContent = state === 'real'    ? 'Météo réelle · OpenWeather'
                  : state === 'loading' ? 'Chargement…'
                  :                       'Météo simulée';
}

// === Résumé météo dans le topbar ===
function renderWeatherSummary(weather, isReal) {
  const w = weather || getMockWeather();
  const temps    = w.map(s => s.temperature);
  const minT     = Math.min(...temps);
  const maxT     = Math.max(...temps);
  const maxRain  = Math.max(...w.map(s => s.rainProbability));

  const firstDesc = w[0]?.description;
  const desc = firstDesc
    ? capitalise(firstDesc)
    : maxRain >= 60 ? 'Pluie probable PM'
    : maxRain >= 30 ? 'Variable · averses possibles'
    :                 'Journée stable';

  document.getElementById('weatherTemp').textContent  = `${minT}° → ${maxT}°C`;
  document.getElementById('weatherDesc').textContent  = desc;
  document.getElementById('weatherIcon').textContent  = maxRain >= 60 ? '🌧' : maxRain >= 30 ? '⛅' : '☀';

  const sourceDetail = document.getElementById('weatherSourceDetail');
  if (sourceDetail) {
    sourceDetail.textContent = isReal
      ? 'Saint-Jean-sur-Richelieu · OpenWeather'
      : 'Données simulées — clé API non configurée';
  }
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
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
  const msg         = generateClientMessage(job, decision);
  const slotWeather = decision.suggestedTime ? weatherByHour[decision.suggestedTime] : null;
  const meteoScore  = slotWeather ? evaluateJobWeather(job, slotWeather).score : 0;
  const scoreCls    = scoreBarClass(meteoScore);
  const icon        = ACTION_ICONS[decision.action] || '•';
  const descLine    = slotWeather?.description
    ? `<div>→ Conditions : ${escapeHtml(capitalise(slotWeather.description))}</div>`
    : '';

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
      ${descLine}
      <div>→ Message technique : ${escapeHtml(decision.message)}</div>
    </div>
    <div class="client-msg-block">
      <div class="client-msg-header">
        <div class="client-msg-label">Message client prêt à envoyer</div>
        <button type="button" class="copy-btn" data-msg="${escapeHtml(msg)}" aria-label="Copier le message client">
          <span class="copy-icon">📋</span><span class="copy-text">Copier</span>
        </button>
      </div>
      <div class="client-msg">${escapeHtml(msg)}</div>
    </div>
  `;
  return card;
}

// === Toast de confirmation ===
function showToast(text, variant = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.remove('error', 'success');
  toast.classList.add(variant, 'show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 1800);
}

async function handleCopyClick(btn) {
  const msg = btn.dataset.msg || '';
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(msg);
    } else {
      const ta = document.createElement('textarea');
      ta.value = msg;
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    btn.classList.add('copied');
    btn.querySelector('.copy-text').textContent = 'Copié';
    showToast('Message copié', 'success');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.querySelector('.copy-text').textContent = 'Copier';
    }, 1600);
  } catch {
    showToast('Échec de la copie', 'error');
  }
}

// === Bannière fallback météo simulée ===
function showFallbackBanner(reason) {
  const existing = document.getElementById('fallbackBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'fallbackBanner';
  banner.style.cssText = `
    margin-bottom: 18px; padding: 12px 16px;
    background: rgba(245,158,11,0.10);
    border: 1px solid rgba(245,158,11,0.35);
    border-radius: 12px; font-size: 0.86rem;
    color: #fbbf24; display: flex; align-items: center; gap: 10px;
  `;
  banner.innerHTML = `<span>⚠️</span><span>Météo simulée utilisée — ${escapeHtml(reason)}. <a href="https://openweathermap.org/api/one-call-3" target="_blank" rel="noopener" style="color:#fbbf24;text-decoration:underline;">Obtenir une clé API</a></span>`;
  document.getElementById('results').before(banner);
}

function hideFallbackBanner() {
  const b = document.getElementById('fallbackBanner');
  if (b) b.remove();
}

// === Simulation complète ===
async function runSimulation() {
  setWeatherSource('loading');
  let weather;
  let isReal = false;

  try {
    weather = await fetchRealWeather(DEFAULT_LAT, DEFAULT_LON);
    isReal  = true;
    hideFallbackBanner();
    setWeatherSource('real');
  } catch (err) {
    console.warn('Fallback météo simulée :', err.message);
    weather = getMockWeather();
    setWeatherSource('mock');
    showFallbackBanner(err.message);
  }

  renderWeatherSummary(weather, isReal);

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
  renderWeatherSummary(getMockWeather(), false);
  document.getElementById('runBtn').addEventListener('click', runSimulation);

  // Délégation : tous les boutons "Copier" des cartes
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (btn) handleCopyClick(btn);
  });
});
