// === Météo simulée (fallback hors-ligne) ===
function getMockWeather() {
  return [
    { time: '07:00', rainProbability: 5,  windKmh: 8,  temperature: 14, humidity: 55 },
    { time: '08:00', rainProbability: 5,  windKmh: 10, temperature: 16, humidity: 58 },
    { time: '09:00', rainProbability: 10, windKmh: 12, temperature: 18, humidity: 62 },
    { time: '10:00', rainProbability: 15, windKmh: 15, temperature: 20, humidity: 66 },
    { time: '11:00', rainProbability: 25, windKmh: 18, temperature: 21, humidity: 72 },
    { time: '13:00', rainProbability: 45, windKmh: 22, temperature: 20, humidity: 80 },
    { time: '14:00', rainProbability: 60, windKmh: 28, temperature: 19, humidity: 87 },
    { time: '15:00', rainProbability: 75, windKmh: 32, temperature: 18, humidity: 92 },
  ];
}

// === Météo réelle via OpenWeather One Call API 3.0 ===
async function fetchRealWeather(lat, lon) {
  if (!API_KEY || API_KEY === 'PASTE_OPENWEATHER_KEY_HERE') {
    throw new Error('Clé API manquante');
  }
  const url = `https://api.openweathermap.org/data/3.0/onecall`
    + `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    + `&exclude=current,minutely,daily,alerts&units=metric`
    + `&appid=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OpenWeather: HTTP ' + res.status);
  const data = await res.json();
  if (!Array.isArray(data.hourly) || data.hourly.length === 0) {
    throw new Error('OpenWeather: pas de données horaires');
  }
  const seen = new Set();
  const slots = [];
  for (const h of data.hourly) {
    const date = new Date(h.dt * 1000);
    const hour = date.getHours();
    if (!WANTED_HOURS.includes(hour) || seen.has(hour)) continue;
    seen.add(hour);
    slots.push({
      hour,
      time: String(hour).padStart(2, '0') + ':00',
      rainProbability: Math.round((h.pop || 0) * 100),
      windKmh: Math.round((h.wind_speed || 0) * 3.6),
      temperature: Math.round(h.temp ?? 0),
      humidity: Math.round(h.humidity ?? 0),
    });
    if (slots.length === WANTED_HOURS.length) break;
  }
  if (!slots.length) throw new Error('OpenWeather: aucun créneau utile');
  slots.sort((a, b) => a.hour - b.hour);
  return slots.map(({ hour, ...rest }) => rest);
}
