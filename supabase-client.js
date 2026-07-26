/**
 * ════════════════════════════════════════════════════════════════════════════
 *  CLIENTE SUPABASE — Sistema Refrigeração Eliezer
 * ════════════════════════════════════════════════════════════════════════════
 *  Este arquivo cria o cliente Supabase usado por TODAS as páginas do site
 *  (login, recuperação de senha, e proteção das páginas internas).
 *
 *  ORDEM DE CARREGAMENTO OBRIGATÓRIA (em toda página que usar login):
 *    1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *    2. <script src="supabase-client.js"></script>
 *    3. (nas páginas internas) <script src="auth-guard.js"></script>
 *
 *  ONDE PEGAR OS DADOS ABAIXO:
 *    No painel do Supabase → seu projeto → Project Settings → API
 *    - "Project URL"           → cole em SUPABASE_URL
 *    - "anon public" API key  → cole em SUPABASE_ANON_KEY
 *
 *  A "anon key" é uma chave PÚBLICA por natureza (o próprio Supabase a expõe
 *  no código de qualquer app cliente) — não há problema em deixá-la aqui.
 *  Ela sozinha não dá acesso a nada sensível; o controle de acesso acontece
 *  no lado do Supabase (login/senha) e no Worker do Cloudflare (validação
 *  do token antes de repassar para a planilha).
 * ════════════════════════════════════════════════════════════════════════════
 */

const SUPABASE_URL = "https://iowditdpynbnmtelvbys.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PtKnPZVwLTMOFSlxVzggkQ_4oKo3Von";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
