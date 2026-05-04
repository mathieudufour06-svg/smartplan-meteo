// === Helpers de scoring ===
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function scoreUnderMax(value, max) {
  if (value <= 0) return 1;
  if (value >= max) return 0;
  return clamp(1 - value / max, 0, 1);
}

function scoreTemp(t, min, max) {
  if (t >= min && t <= max) return 1;
  const d = t < min ? min - t : t - max;
  return clamp(1 - d / 10, 0, 1);
}

// === Évaluation météo d'un job pour un créneau ===
function evaluateJobWeather(job, w) {
  const r = JOB_RULES[job.type];
  const wt = JOB_WEIGHTS[job.type];
  const rainS = scoreUnderMax(w.rainProbability, r.maxRain);
  const windS = scoreUnderMax(w.windKmh, r.maxWind);
  const tempS = scoreTemp(w.temperature, r.minTemp, r.maxTemp);
  const humS  = scoreUnderMax(w.humidity, r.maxHum);
  const score = Math.round(rainS * wt.rain + windS * wt.wind + tempS * wt.temp + humS * wt.hum);
  let status;
  if (score >= 75) status = 'ok';
  else if (score >= 50) status = 'risk';
  else status = 'bad';
  const breakdown = { pluie: rainS, vent: windS, 'température': tempS, 'humidité': humS };
  return { status, score, breakdown };
}

function getMainIssue(breakdown) {
  let worstKey = 'pluie', worstVal = Infinity;
  for (const [k, v] of Object.entries(breakdown)) {
    if (v < worstVal) { worstVal = v; worstKey = k; }
  }
  return worstKey;
}

// === Boosts priorité et deadline ===
function getPriorityScore(job) {
  return ({ urgent: 30, high: 20, medium: 10, low: 0 })[job.priority] || 0;
}

function getDeadlineUrgency(job) {
  if (!job.deadline) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(job.deadline); d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  if (diff <= 1) return 30;
  if (diff <= 3) return 20;
  if (diff <= 7) return 10;
  return 0;
}

function computeAdjustedScore(weatherScore, pBoost, dBoost) {
  return weatherScore * FINAL_WEIGHTS.weather
    + (pBoost / 30) * 100 * FINAL_WEIGHTS.priority
    + (dBoost / 30) * 100 * FINAL_WEIGHTS.deadline;
}

// === Décision automatique : maintain / risky / reschedule ===
function rescheduleJobs(jobs, weatherByHour) {
  const hours = Object.keys(weatherByHour);
  const results = jobs.map(job => {
    const pBoost = getPriorityScore(job);
    const dBoost = getDeadlineUrgency(job);
    const isUrgent = job.priority === 'urgent';
    let bestOk = null, bestRisk = null, bestAny = null;

    for (const h of hours) {
      const e = evaluateJobWeather(job, weatherByHour[h]);
      const adj = computeAdjustedScore(e.score, pBoost, dBoost);
      const cand = { hour: h, ...e, adj };
      if (e.status === 'ok'   && (!bestOk   || adj > bestOk.adj))   bestOk   = cand;
      if (e.status === 'risk' && (!bestRisk || adj > bestRisk.adj)) bestRisk = cand;
      if (!bestAny || adj > bestAny.adj) bestAny = cand;
    }

    if (bestOk) return {
      jobId: job.id, client: job.client, action: 'maintain',
      suggestedTime: bestOk.hour,
      message: `Conditions favorables à ${bestOk.hour}`,
      pBoost, dBoost,
    };
    if (bestRisk && isUrgent) {
      const cause = getMainIssue(bestRisk.breakdown);
      return {
        jobId: job.id, client: job.client, action: 'maintain',
        suggestedTime: bestRisk.hour,
        message: `Job urgente maintenue malgré conditions risquées (${cause}) à ${bestRisk.hour}`,
        pBoost, dBoost,
      };
    }
    if (bestRisk) {
      const cause = getMainIssue(bestRisk.breakdown);
      return {
        jobId: job.id, client: job.client, action: 'risky',
        suggestedTime: bestRisk.hour,
        message: `Conditions risquées (${cause}) à ${bestRisk.hour}`,
        pBoost, dBoost,
      };
    }
    return {
      jobId: job.id, client: job.client, action: 'reschedule',
      suggestedTime: bestAny ? bestAny.hour : null,
      message: bestAny
        ? `Conditions mauvaises, meilleur créneau disponible à ${bestAny.hour}`
        : 'Aucune donnée météo disponible',
      pBoost, dBoost,
    };
  });
  results.sort((a, b) => (b.pBoost + b.dBoost) - (a.pBoost + a.dBoost));
  return results;
}

// === Génération du message client ===
function extractReason(message) {
  const m = message && message.match(/\(([^)]+)\)/);
  return m ? m[1] : null;
}

function generateClientMessage(job, decision) {
  const typeLabel = TYPE_LABELS[job.type] || job.type;
  const heure = decision.suggestedTime || 'à confirmer';
  const reason = extractReason(decision.message);
  if (decision.action === 'maintain') {
    return `Bonjour M. ${job.client},\nVotre chantier de ${typeLabel} est maintenu à ${heure} comme prévu.\nCordialement,\nL'équipe SmartPlan`;
  }
  if (decision.action === 'risky') {
    const detail = reason ? ` (${reason})` : '';
    return `Bonjour M. ${job.client},\nLes conditions météo présentent un risque${detail}.\nNous pouvons maintenir le chantier de ${typeLabel} à ${heure}, mais une confirmation de votre part sera nécessaire.\nCordialement,\nL'équipe SmartPlan`;
  }
  if (decision.action === 'reschedule') {
    const detail = reason ? ` (${reason})` : '';
    const slot = decision.suggestedTime
      ? `nous vous proposons de déplacer votre chantier au meilleur créneau disponible : ${decision.suggestedTime}.`
      : `nous vous proposons de reporter votre chantier à une date ultérieure.`;
    return `Bonjour M. ${job.client},\nEn raison des conditions météo${detail},\n${slot}\nCordialement,\nL'équipe SmartPlan`;
  }
  return '';
}
