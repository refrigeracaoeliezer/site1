// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
const SW_VERSION = 'v1.6-firebase';
const CACHE_NAME = 'Refrigeração Eliezer';
const FLAG_CACHE = 'notif-flags-v1';
importScripts('./config.js'); // carrega APP_CONFIG.API_URL e apiURL() — mesmo arquivo usado pelas páginas
const URL_AGENDA = apiURL('agenda');

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCxV-kcyBJXIpD-o-_NU8kLwntp8Tl8IMA",
  authDomain:        "refrigeracao-eliezer.firebaseapp.com",
  projectId:         "refrigeracao-eliezer",
  storageBucket:     "refrigeracao-eliezer.firebasestorage.app",
  messagingSenderId: "320066098066",
  appId:             "1:320066098066:web:42a8ce4b3372a85060a74b"
});

const messaging = firebase.messaging();

// ─── NOTIFICAÇÃO EM BACKGROUND (app fechado) ──────────────────────────────────
messaging.onBackgroundMessage(payload => {
  console.log('[SW Firebase] Mensagem recebida em background:', payload);

  const data  = payload.data || payload.notification || {};
  const title = data.title || '📋 Refrigeração Eliezer';
  const body  = data.body  || 'Você tem serviços hoje.';
  const tag   = data.tag   || 'agenda';

  return self.registration.showNotification(title, {
    body,
    icon:               'https://blogger.googleusercontent.com/img/a/AVvXsEjvyHVCZolj28lEOEFo6M63izh7RcOq9tc7jph7e_Or-jSWVQ5TjRb0hcc-168k9rTwL9XnC9FdUti7imfIyv6QTbWgHDZB7zroM2I3nvUK58Zf6_sARve9qfBkasedBGsBkLahFohBhq2fbLB-hPSlFVrk5haPLt0Uy2jDnTszkHq0Qn3NfzkmK8vhNLI=w192-h192',
    badge:              'https://blogger.googleusercontent.com/img/a/AVvXsEjvyHVCZolj28lEOEFo6M63izh7RcOq9tc7jph7e_Or-jSWVQ5TjRb0hcc-168k9rTwL9XnC9FdUti7imfIyv6QTbWgHDZB7zroM2I3nvUK58Zf6_sARve9qfBkasedBGsBkLahFohBhq2fbLB-hPSlFVrk5haPLt0Uy2jDnTszkHq0Qn3NfzkmK8vhNLI=w192-h192',
    vibrate:            [300, 100, 300],
    tag,
    renotify:           true,
    requireInteraction: true,
    data:               { url: self.location.origin + '/agenda.html' }
  });
});

// ─── CLIQUE NA NOTIFICAÇÃO ────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.location.origin + '/agenda.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client)
          return client.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── INSTALAÇÃO / ATIVAÇÃO ────────────────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== FLAG_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── INTERCEPTAÇÃO DE REDE ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── PERIODIC SYNC (backup) ───────────────────────────────────────────────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'verificar-agenda') event.waitUntil(verificarAgendaLocal());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'VERIFICAR_AGORA') verificarAgendaLocal();
  // O Worker do Cloudflare agora exige "Authorization: Bearer <token>" em
  // toda chamada (validação de sessão Supabase). O Service Worker não tem
  // acesso ao localStorage/sessão da página, então a própria página
  // (auth-guard.js) envia o token de acesso atual sempre que ele estiver
  // disponível/for renovado, e guardamos aqui via Cache Storage — assim o
  // token sobrevive mesmo que o Service Worker "durma" e reinicie entre o
  // recebimento da mensagem e o disparo do periodicsync.
  if (event.data?.type === 'SET_AUTH_TOKEN' && event.data.token) {
    salvarToken(event.data.token);
  }
});

// ─── VERIFICAÇÃO LOCAL (fallback com app aberto) ──────────────────────────────
async function verificarAgendaLocal() {
  try {
    const token   = await obterToken();
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const res     = await fetch(URL_AGENDA + '&t=' + Date.now(), { headers });

    if (res.status === 401) {
      // Token ausente/expirado — nada a fazer aqui (o SW não consegue
      // renovar sozinho); a próxima vez que a página abrir, o
      // auth-guard.js manda um token novo automaticamente.
      console.warn('[SW] Sem token válido para checar a agenda (401).');
      return;
    }

    const agenda = await res.json();

    // ✅ FIX: Usar sempre horário de Brasília (UTC-3) de forma explícita
    // O dispositivo pode estar em qualquer fuso — usamos offset fixo UTC-3
    const agoraBR   = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const hojeStr   = agoraBR.toISOString().slice(0, 10); // "YYYY-MM-DD" em horário BR
    const horaAtual = agoraBR.getUTCHours();   // hora BR via UTC
    const minAtual  = agoraBR.getUTCMinutes();

    const servicosHoje = agenda.filter(item => {
      if (item.STATUS === 'concluido') return false;
      const d = parseDataItem(item.DATA_DO_SERVICO);
      if (!d || isNaN(d)) return false;
      return d === hojeStr;
    });

    if (servicosHoje.length === 0) return;

    // ── Aviso único das 7h ────────────────────────────────────────────────────
    // ✅ FIX: janela reduzida para 5 min (evita disparo antecipado)
    if (horaAtual === 7 && minAtual < 10) {
      const tag = 'notif_manha_' + hojeStr;
      if (!(await checarFlag(tag))) {
        const temServico  = servicosHoje.some(s => !(s.DESCRICAO || '').includes('[Orçamento]'));
        const temOrcamento = servicosHoje.some(s =>  (s.DESCRICAO || '').includes('[Orçamento]'));

        // ✅ FIX: Um único aviso unificado
        let titulo = '📋 Refrigeração Eliezer';
        let corpo  = '';

        if (temServico && temOrcamento) {
          titulo = '📋 Agenda do Dia';
          corpo  = 'Você tem serviços e orçamentos agendados para hoje. Verifique a agenda.';
        } else if (temServico) {
          titulo = '🔧 Serviços para Hoje';
          corpo  = 'Você tem serviços agendados para hoje. Verifique a agenda.';
        } else if (temOrcamento) {
          titulo = '💰 Orçamentos para Hoje';
          corpo  = 'Você tem orçamentos agendados para hoje. Verifique a agenda.';
        }

        await enviarNotif(titulo, corpo, tag);
        await salvarFlag(tag);
      }
    }

    // ── Lembrete 2h antes ─────────────────────────────────────────────────────
    for (const servico of servicosHoje) {
      // ✅ FIX: parseHora agora sempre trata a hora como horário local BR
      // (o Google Sheets salva como "HH:MM" ou "YYYY-MM-DDTHH:MM:SS" em horário local)
      const h = parseHoraLocal(servico.HORA);
      if (!h) continue;

      const diffMin = (h.h * 60 + h.m) - (horaAtual * 60 + minAtual);

      // Janela: entre 115 e 125 minutos antes (centro em 120 = exato 2h)
      if (diffMin >= 115 && diffMin <= 125) {
        const tag = `lembrete_${hojeStr}_${(servico.ID || servico.CLIENTE).replace(/\s/g, '_')}_${h.h}${h.m}`;
        if (!(await checarFlag(tag))) {
          const isOrc = (servico.DESCRICAO || '').includes('[Orçamento]');
          await enviarNotif(
            `⏰ Em 2 horas — ${isOrc ? '💰 Orçamento' : '🔧 Serviço'}`,
            `${servico.CLIENTE}\n📍 ${servico.ENDERECO}`,
            tag
          );
          await salvarFlag(tag);
        }
      }
    }
  } catch (err) { console.error('[SW] Erro:', err); }
}

async function enviarNotif(titulo, corpo, tag) {
  await self.registration.showNotification(titulo, {
    body: corpo,
    icon: 'https://blogger.googleusercontent.com/img/a/AVvXsEjvyHVCZolj28lEOEFo6M63izh7RcOq9tc7jph7e_Or-jSWVQ5TjRb0hcc-168k9rTwL9XnC9FdUti7imfIyv6QTbWgHDZB7zroM2I3nvUK58Zf6_sARve9qfBkasedBGsBkLahFohBhq2fbLB-hPSlFVrk5haPLt0Uy2jDnTszkHq0Qn3NfzkmK8vhNLI=w192-h192',
    vibrate: [300, 100, 300], tag, requireInteraction: true,
    data: { url: self.location.origin + '/agenda.html' }
  });
}

// ✅ FIX: parseDataItem retorna string "YYYY-MM-DD" (sem objeto Date que causa bug de fuso)
function parseDataItem(raw) {
  if (!raw) return null;
  try {
    const s = (raw instanceof Date ? raw.toISOString() : raw.toString());
    return s.slice(0, 10); // retorna "YYYY-MM-DD" puro
  } catch { return null; }
}

// ✅ FIX: parseHoraLocal — trata ISO datetime como horário LOCAL BR, não UTC
// O Google Sheets frequentemente salva "09:00" como "1899-12-30T09:00:00.000Z"
// mas em dados reais de agenda salva como "2025-01-15T09:00:00.000-03:00" ou "09:00"
function parseHoraLocal(h) {
  if (!h) return null;
  const s = h.toString();

  // Formato simples "HH:MM" ou "H:MM" — já é horário local, usar direto
  if (/^\d{1,2}:\d{2}$/.test(s.trim())) {
    const [hh, mm] = s.trim().split(':').map(Number);
    if (isNaN(hh) || isNaN(mm)) return null;
    return { h: hh, m: mm };
  }

  // Formato ISO com offset explícito ex: "2025-01-15T09:00:00.000-03:00"
  if (s.includes('-03:00') || s.includes('-0300')) {
    const parteHora = s.split('T')[1];
    const [hh, mm] = parteHora.slice(0, 5).split(':').map(Number);
    return { h: hh, m: mm };
  }

  // Formato ISO sem offset (assume que o Sheets salva em horário local BR)
  // NÃO converte fuso — usa a hora do campo T diretamente como BR
  if (s.includes('T')) {
    const parteHora = s.split('T')[1].slice(0, 5);
    const [hh, mm] = parteHora.split(':').map(Number);
    if (isNaN(hh) || isNaN(mm)) return null;
    return { h: hh, m: mm };
  }

  return null;
}

function formatarHora(h) {
  const p = parseHoraLocal(h);
  return p ? `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}` : '--:--';
}

async function checarFlag(key) { const c = await caches.open(FLAG_CACHE); return !!(await c.match('/' + key)); }
async function salvarFlag(key) { const c = await caches.open(FLAG_CACHE); await c.put('/' + key, new Response('1')); }

// ─── TOKEN DE AUTENTICAÇÃO (Supabase) ─────────────────────────────────────────
// Guardado no mesmo Cache Storage usado pelas flags de notificação, já que é
// a única forma de persistência disponível para o Service Worker.
async function salvarToken(token) {
  const c = await caches.open(FLAG_CACHE);
  await c.put('/__auth_token__', new Response(token));
}
async function obterToken() {
  try {
    const c = await caches.open(FLAG_CACHE);
    const r = await c.match('/__auth_token__');
    return r ? await r.text() : null;
  } catch { return null; }
}
