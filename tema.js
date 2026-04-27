// tema.js

// URLs de API (ajuste conforme necessário, mas use um único ponto de verdade)

const URL_API_GLOBAL  = URL_BASE_GLOBAL + '/api/v1';

/**
 * Utility function to format dates.
 * @param {string} dateString - The date string to format.
 * @returns {string} Formatted date.
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleString('pt-BR', options);
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return dateString; // Retorna original em caso de erro
  }
}

/**
 * Returns a label for the process phase based on percentage.
 * @param {number} percentage - The completion percentage.
 * @returns {string} The phase label.
 */
function getFaseLabel(percentage) {
  const pct = parseInt(percentage, 10);
  if (pct <= 10) return 'Início do Processo';
  if (pct <= 30) return 'Fase de Conhecimento';
  if (pct <= 60) return 'Sentença / Recursos';
  if (pct <= 90) return 'Execução / Cálculos';
  if (pct >= 100) return 'Processo Finalizado';
  return 'Em Andamento';
}

/**
 * Redirects to the login page and clears session.
 */
function logout() {
  localStorage.removeItem('ADV_JWT_TOKEN');
  localStorage.removeItem('ADV_GLOBAL_THEME_MODE'); // Clear theme mode (light/dark)
  localStorage.removeItem('ADV_ACTIVE_THEME_ID'); // Clear selected theme ID
  // Redireciona para a página de login/inicial correta
  if (window.location.pathname.includes('configuracao.html')) {
    window.location.href = 'manutencao.html'; // Admin vai para login admin
  } else {
    window.location.href = 'index.html'; // Cliente vai para home
  }
}

/**
 * Toggles dark mode class on HTML and saves preference.
 */
function toggleDarkMode() {
  const html = document.documentElement;
  const themeIcon = document.getElementById('themeIcon');
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('ADV_GLOBAL_THEME_MODE', isDark ? 'dark' : 'light'); // Salva o modo (dark/light)
  if (themeIcon) {
    themeIcon.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
  }
}

/**
 * Aplica a classe do tema e do modo (claro/escuro) ao elemento <html>.
 * @param {string} themeId - O ID do tema (ex: 'feminino-q').
 * @param {string} themeMode - O modo do tema ('light' ou 'dark').
 */
function applyThemeAndMode(themeId, themeMode) {
  const html = document.documentElement;

  // Remove qualquer classe de tema existente
  html.classList.forEach(cls => {
    if (cls.startsWith('theme-')) {
      html.classList.remove(cls);
    }
  });

  // Adiciona a nova classe de tema
  if (themeId) {
    html.classList.add(`theme-${themeId}`);
  }

  // Aplica o modo escuro se necessário
  if (themeMode === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Atualiza o ícone do tema
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.classList.replace(themeMode === 'dark' ? 'fa-moon' : 'fa-sun', themeMode === 'dark' ? 'fa-sun' : 'fa-moon');
  }
}

/**
 * Verifies session, loads theme preference, and applies it to the document.
 * @param {string} pageType - 'admin', 'client', or 'login'
 * @returns {object|null} - Session data if valid, null otherwise.
 */
async function verificarSessaoComTema(pageType) {
  const token = localStorage.getItem('ADV_JWT_TOKEN');
  const storedThemeMode = localStorage.getItem('ADV_GLOBAL_THEME_MODE') || 'light'; // Pega o modo salvo

  // Aplica o modo claro/escuro inicial
  applyThemeAndMode(null, storedThemeMode);

  // Se a página é de login e não há token, tenta carregar o tema global sem autenticação
  if (pageType === 'login' && !token) {
    try {
      const res = await fetch(URL_API_GLOBAL, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_global_theme' }) // Nova ação para tema global
      });
      const data = await res.json();
      const globalThemeId = (data.status === 'ok' && data.theme) ? data.theme : 'feminino-q'; // Padrão
      applyThemeAndMode(globalThemeId, storedThemeMode);
      localStorage.setItem('ADV_ACTIVE_THEME_ID', globalThemeId);
      return { token: null, user: 'Guest', theme: globalThemeId };
    } catch (e) {
      console.error("Falha ao carregar tema global para a página de login:", e);
      applyThemeAndMode('feminino-q', storedThemeMode); // Fallback
      localStorage.setItem('ADV_ACTIVE_THEME_ID', 'feminino-q');
      return { token: null, user: 'Guest', theme: 'feminino-q' };
    }
  }

  // Para páginas autenticadas: verifica token e busca tema específico do usuário
  if (!token) {
    // Se não há token e não é página de login, redireciona para login
    window.location.href = (pageType === 'admin') ? 'manutencao.html' : 'index.html';
    return null;
  }

  try {
    const res = await fetch(URL_API_GLOBAL, {
      method: 'POST', credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'verify_token_and_get_theme', page_type: pageType })
    });
    const data = await res.json();

    if (data.status === 'ok' && data.session && data.theme) {
      applyThemeAndMode(data.theme, storedThemeMode);
      localStorage.setItem('ADV_ACTIVE_THEME_ID', data.theme);

      // Verifica se o tipo de página corresponde ao esperado pela sessão
      if ((pageType === 'admin' && data.session.type !== 'admin') ||
          (pageType === 'client' && data.session.type !== 'client')) {
        // Redireciona se a sessão não corresponde ao tipo de página
        window.location.href = (data.session.type === 'admin') ? 'configuracao.html' : 'linha-tempo.html';
        return null;
      }
      return data.session;
    } else {
      logout(); // Sessão inválida ou erro
      return null;
    }
  } catch (e) {
    console.error("Falha na verificação da sessão ou tema:", e);
    logout(); // Erro de rede ou outro problema
    return null;
  }
}
