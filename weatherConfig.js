// === API OpenWeather ===
const API_KEY = "PASTE_OPENWEATHER_KEY_HERE";
const DEFAULT_LAT = 45.5017;
const DEFAULT_LON = -73.5673;
const WANTED_HOURS = [7, 8, 9, 10, 11, 13, 14, 15];

// === Règles météo par type de travail ===
const JOB_RULES = {
  pose_tourbe: { maxRain: 30, maxWind: 40, minTemp: 5,  maxTemp: 30, maxHum: 90 },
  peinture:    { maxRain: 10, maxWind: 25, minTemp: 10, maxTemp: 32, maxHum: 70 },
  pavage:      { maxRain: 20, maxWind: 50, minTemp: 5,  maxTemp: 35, maxHum: 95 },
  excavation:  { maxRain: 50, maxWind: 60, minTemp: -5, maxTemp: 35, maxHum: 100 },
};

// === Pondérations par type de travail (somme = 100) ===
const JOB_WEIGHTS = {
  pose_tourbe: { rain: 35, wind: 20, temp: 25, hum: 20 },
  peinture:    { rain: 30, wind: 15, temp: 20, hum: 35 },
  pavage:      { rain: 35, wind: 20, temp: 30, hum: 15 },
  excavation:  { rain: 15, wind: 30, temp: 25, hum: 30 },
};

// === Pondérations du score final ===
const FINAL_WEIGHTS = { weather: 0.7, priority: 0.2, deadline: 0.1 };

// === Libellés et icônes UI ===
const TYPE_LABELS = {
  pose_tourbe: 'pose de tourbe',
  peinture:    'peinture',
  pavage:      'pavage',
  excavation:  'excavation',
};
const ACTION_ICONS = { maintain: '✅', risky: '⚠️', reschedule: '🌧️' };

// === Liste des chantiers à planifier ===
const JOBS = [
  { id: 1, client: 'Tremblay', type: 'pose_tourbe', priority: 'high',   deadline: '2026-06-10' },
  { id: 2, client: 'Gagnon',   type: 'peinture',    priority: 'urgent', deadline: '2026-06-05' },
  { id: 3, client: 'Roy',      type: 'excavation',  priority: 'medium', deadline: '2026-06-15' },
  { id: 4, client: 'Bouchard', type: 'pavage',      priority: 'low',    deadline: '2026-06-20' },
];
