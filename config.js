/**
 * ════════════════════════════════════════════════════════════════════════════
 *  CONFIGURAÇÃO CENTRAL — Sistema Refrigeração Eliezer
 * ════════════════════════════════════════════════════════════════════════════
 *  Este é o ÚNICO lugar do sistema inteiro onde o link precisa ser
 *  configurado. Todas as páginas (agenda, configurações, orçamento,
 *  garantias, receber, login, impressões...) carregam este arquivo e usam
 *  a mesma URL a partir daqui.
 *
 *  IMPORTANTE: a partir de agora, esta URL NÃO é mais o link direto do
 *  Google Apps Script — é o link do Cloudflare Worker que funciona como
 *  proxy. A URL real da planilha fica guardada em segredo dentro do
 *  Cloudflare (variável de ambiente "secret"), e nunca aparece aqui nem
 *  em nenhum arquivo do site.
 * ════════════════════════════════════════════════════════════════════════════
 */

const APP_CONFIG = {
  // Cole aqui a URL do seu Worker no Cloudflare (termina em ".workers.dev"
  // ou no seu domínio próprio, se configurar uma rota customizada).
  API_URL: "https://eliezer-refrigeracao-prox.refrigeracaoeliezeer.workers.dev"
};

/**
 * Monta a URL final para um "módulo" do sistema.
 * Ex: apiURL('agenda')                 -> ...workers.dev?pagina=agenda
 *     apiURL('os', 'deleteID=003')     -> ...workers.dev?pagina=os&deleteID=003
 *     apiURL('login', 'action=login')  -> ...workers.dev?pagina=login&action=login
 */
function apiURL(pagina, extraParams) {
  var url = APP_CONFIG.API_URL + "?pagina=" + encodeURIComponent(pagina);
  if (extraParams) url += "&" + extraParams;
  return url;
}

/**
 * Busca (uma única vez por carregamento de página, com cache em memória) os
 * dados de configuração da empresa: nome, cnpj, pix, endereço, responsável,
 * telefone, logo, serviços, clientes e observações — tudo que está salvo nas
 * abas "empresa", "servicos", "clientes" e "observacoes" da planilha.
 */
let _configCache = null;
async function buscarConfigEmpresa() {
  if (_configCache) return _configCache;
  try {
    const resp = await fetch(apiURL('config'));
    const data = await resp.json();
    _configCache = data;
    return data;
  } catch (err) {
    console.error('Erro ao buscar configurações da empresa:', err);
    return null;
  }
}

/**
 * Aplica automaticamente a logo salva na planilha (aba "empresa", campo
 * emp_logo) em qualquer elemento da página marcado com id="logo-img" ou
 * atributo data-logo-empresa. Se ainda não houver logo salva na planilha,
 * a imagem padrão que já está no HTML continua sendo exibida normalmente.
 *
 * A logo é buscada como base64 (data URI) através do backend, e não usando
 * a URL direta — isso é necessário porque as páginas de impressão (orçamento
 * e O.S.) usam html2canvas/html2pdf para gerar o PDF, e essa ferramenta não
 * consegue capturar imagens hospedadas em outro domínio sem cabeçalhos CORS
 * (que blogger, Google Drive, etc. não enviam). Buscando em base64, a logo
 * funciona tanto na tela quanto dentro do PDF gerado.
 */
let _logoPromise = null;
async function buscarLogoBase64() {
  if (_logoPromise) return _logoPromise;
  _logoPromise = fetch(apiURL('logo'))
    .then(resp => resp.json())
    .then(data => data && data.dataUri)
    .catch(err => { console.error('Erro ao buscar logo:', err); return null; });
  return _logoPromise;
}

async function aplicarLogoEmpresa() {
  const todos = document.querySelectorAll('#logo-img, [data-logo-empresa]');
  if (todos.length === 0) return null;

  // Se a imagem já vier com uma logo em base64 fixada diretamente no HTML,
  // ela é respeitada e não deve ser substituída pela logo buscada na planilha.
  const alvos = Array.prototype.filter.call(todos, function (img) {
    return !(img.getAttribute('src') || '').trim().startsWith('data:');
  });
  if (alvos.length === 0) return null;

  const dataUri = await buscarLogoBase64();
  if (dataUri) {
    alvos.forEach(function (img) { img.src = dataUri; });
  }
  return dataUri || null;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', aplicarLogoEmpresa);
}
