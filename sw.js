/* ============================================================
   SmartPlan Météo — Service Worker
   Gère les notifications push en arrière-plan
   ============================================================ */
var CACHE_NAME = 'spm-notif-v2';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  // Purger les anciens caches dès l'activation
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

/* ── NetworkFirst pour index.html — toujours la version fraîche ── */
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  var isHtml = e.request.destination === 'document' ||
               url.endsWith('/') || url.endsWith('/index.html');
  if (!isHtml) return; // laisser passer les autres requêtes sans interception
  e.respondWith(
    fetch(e.request).then(function(netRes) {
      var clone = netRes.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
      return netRes;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});

/* ── Réception des données depuis l'app ── */
self.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (e.data.type === 'SPM_SYNC') {
    storeSyncData(e.data.tasks, e.data.prefs);
  }
});

/* ── Periodic Background Sync (Chrome Android 80+) ── */
self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'spm-notifications') {
    e.waitUntil(runNotifCheck());
  }
});

/* ── Clic sur la notification → ouvre l'app ── */
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

/* ── Stockage persistant dans le Cache API ── */
async function storeSyncData(tasks, prefs) {
  var cache = await caches.open(CACHE_NAME);
  await cache.put('/_spm_tasks', new Response(JSON.stringify(tasks || []), {
    headers: { 'Content-Type': 'application/json' }
  }));
  await cache.put('/_spm_prefs', new Response(JSON.stringify(prefs || {}), {
    headers: { 'Content-Type': 'application/json' }
  }));
}

async function loadSyncData() {
  var cache = await caches.open(CACHE_NAME);
  var tasks = [], prefs = {};
  var tr = await cache.match('/_spm_tasks');
  var pr = await cache.match('/_spm_prefs');
  if (tr) tasks = await tr.json();
  if (pr) prefs = await pr.json();
  return { tasks: tasks, prefs: prefs };
}

/* ── Vérification et envoi des notifications ── */
async function runNotifCheck() {
  var data = await loadSyncData();
  var tasks = data.tasks;
  var prefs = data.prefs;
  if (!prefs.enabled) return;

  var now = new Date();
  var nowMin = now.getHours() * 60 + now.getMinutes();

  var morningMin = parseTime(prefs.morningTime || '07:00');
  var eveningMin = parseTime(prefs.eveningTime || '20:00');
  var win = 25; // fenêtre ±25 minutes

  var todayIso   = toIso(now);
  var tomorrow   = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowIso = toIso(tomorrow);

  if (Math.abs(nowMin - morningMin) <= win) {
    await maybeSendNotif(tasks, todayIso, 'matin');
  }
  if (Math.abs(nowMin - eveningMin) <= win) {
    await maybeSendNotif(tasks, tomorrowIso, 'veille');
  }
}

async function maybeSendNotif(tasks, dateIso, type) {
  var cache = await caches.open(CACHE_NAME);
  var sentKey = '/_spm_sent_' + type + '_' + dateIso;
  if (await cache.match(sentKey)) return; // déjà envoyé aujourd'hui

  var dayTasks = tasks.filter(function(t) {
    return t.scheduledDate === dateIso && t.status !== 'backlog';
  });
  if (!dayTasks.length) return;

  var dateObj = new Date(dateIso + 'T12:00:00');
  var dayName  = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][dateObj.getDay()];
  var months   = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  var dateStr  = dayName + ' ' + dateObj.getDate() + ' ' + months[dateObj.getMonth()];
  var label    = type === 'matin' ? "Aujourd'hui" : 'Demain · ' + dateStr;

  var names = dayTasks.slice(0, 3).map(function(t) { return t.name; }).join(', ');
  if (dayTasks.length > 3) names += ' +' + (dayTasks.length - 3);

  var title = '🏗 SmartPlan · ' + label;
  var body  = dayTasks.length + ' travaux planifiés\n' + names;

  await self.registration.showNotification(title, {
    body: body,
    tag:  'spm-' + type + '-' + dateIso,
    requireInteraction: false,
    silent: false
  });

  // Marquer comme envoyé
  await cache.put(sentKey, new Response('1'));
}

/* ── Utilitaires ── */
function parseTime(str) {
  var p = (str || '07:00').split(':');
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function toIso(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function pad(n) { return n < 10 ? '0' + n : String(n); }
