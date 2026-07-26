/**
 * ════════════════════════════════════════════════════════════════════════════
 *  PROTEÇÃO DE PÁGINA + ENVIO AUTOMÁTICO DO TOKEN — Sistema Refrigeração Eliezer
 * ════════════════════════════════════════════════════════════════════════════
 *  Inclua este arquivo em TODA página interna do sistema — agenda.html,
 *  configuracoes.html, criar-orcamento.html, garantias.html, imp-orcamento.html,
 *  imp-ordem.html, manual.html, manutencoes.html, receber.html, sistemas.html,
 *  acervo.html — sempre DEPOIS de supabase-client.js e config.js:
 *
 *    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *    <script src="config.js"></script>
 *    <script src="supabase-client.js"></script>
 *    <script src="auth-guard.js"></script>
 *
 *  O QUE ESTE ARQUIVO FAZ:
 *  1) Verifica se existe uma sessão Supabase ativa; se não existir, redireciona
 *     imediatamente para index.html (substitui a antiga checagem de
 *     localStorage, que era facilmente falsificável pelo console do navegador).
 *  2) "Escuta" mudanças de sessão (logout em outra aba, expiração de token) e
 *     redireciona automaticamente quando a sessão cai.
 *  3) Intercepta TODAS as chamadas fetch() feitas para o Worker do Cloudflare
 *     (APP_CONFIG.API_URL) e anexa automaticamente o cabeçalho
 *     "Authorization: Bearer <token>" — assim nenhuma página precisa ser
 *     alterada individualmente para mandar o token nas chamadas de
 *     agenda/os/receber/config.
 *  4) Expõe uma função global logout() para ser usada em um botão "Sair".
 * ════════════════════════════════════════════════════════════════════════════
 */

(function () {
  // ── 1) Envio automático do token em toda chamada ao Worker ──────────────
  const fetchOriginal = window.fetch.bind(window);

  window.fetch = async function (url, opcoes) {
    const urlStr = url.toString();

    if (typeof APP_CONFIG !== 'undefined' && urlStr.indexOf(APP_CONFIG.API_URL) === 0) {
      const { data } = await supabaseClient.auth.getSession();
      const token = data && data.session ? data.session.access_token : null;

      opcoes = opcoes || {};
      opcoes.headers = Object.assign(
        {},
        opcoes.headers,
        token ? { Authorization: 'Bearer ' + token } : {}
      );
    }

    return fetchOriginal(url, opcoes);
  };

  // ── 2) Guarda de sessão: sem sessão válida, volta para o login ──────────
  async function verificarSessao() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (!data || !data.session) {
        window.location.replace('index.html');
        return;
      }
      enviarTokenAoServiceWorker(data.session.access_token);
    } catch (err) {
      console.error('[auth-guard] Erro ao verificar sessão:', err);
      window.location.replace('index.html');
    }
  }
  verificarSessao();

  // ── 3) Reage a logout/expiração em tempo real ───────────────────────────
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      window.location.replace('index.html');
    } else if (session) {
      // Cobre TOKEN_REFRESHED, SIGNED_IN etc. — mantém o Service Worker
      // sempre com o token mais recente para as checagens de agenda em
      // segundo plano (sw.js), que agora também exigem autenticação.
      enviarTokenAoServiceWorker(session.access_token);
    }
  });

  // ── 3.1) Repassa o token atual ao Service Worker (sw.js) ────────────────
  function enviarTokenAoServiceWorker(token) {
    if (!token || !('serviceWorker' in navigator)) return;
    const mandar = (sw) => sw && sw.postMessage({ type: 'SET_AUTH_TOKEN', token });
    if (navigator.serviceWorker.controller) {
      mandar(navigator.serviceWorker.controller);
    } else {
      // Ainda não há um SW controlando a página (ex: primeiro carregamento
      // após instalar) — manda assim que ele assumir o controle.
      navigator.serviceWorker.ready.then((reg) => mandar(reg.active));
    }
  }

  // ── 4) Função global de logout, para usar em um botão "Sair" ───────────
  window.logout = async function () {
    await supabaseClient.auth.signOut();
    window.location.replace('index.html');
  };
})();
