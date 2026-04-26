# Climafix — Site PMOC & Manutenção

Site profissional para empresa de PMOC (Plano de Manutenção, Operação e Controle) de ar-condicionado.

## 🚀 Como Rodar Localmente

```bash
# Instalar dependências
npm install
# ou
pnpm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

## 📦 Deploy no GitHub Pages

### Opção 1: Automático (GitHub Actions)

1. Faça push do projeto para um repositório no GitHub
2. No repositório, vá em **Settings → Pages**
3. Em **Source**, selecione **GitHub Actions**
4. O workflow em `.github/workflows/deploy.yml` fará o deploy automaticamente a cada push na branch `main`

### Opção 2: Manual

```bash
npm run build
# Faça upload da pasta /dist para o GitHub Pages manualmente
```

### ⚠️ Configuração do `base` no `vite.config.ts`

- Se o repositório for `username.github.io` → deixe `base: './'`
- Se for um repositório de projeto (ex: `github.com/user/pmoc-site`) → mude para `base: '/pmoc-site/'`

## 🛠 Tecnologias

- **React 18** + **TypeScript**
- **Vite 6** (bundler)
- **CSS Puro** com variáveis customizadas (sem Tailwind necessário)
- Google Fonts: Barlow Condensed, Barlow, Space Mono

## 📋 Seções do Site

- **Hero** — Apresentação com animações
- **Stats** — Números com animação de contagem
- **Serviços** — 6 cards de serviços oferecidos
- **Sobre** — História da empresa + certificações
- **Processo** — Passo-a-passo do trabalho
- **Depoimentos** — Carousel de clientes
- **Contato** — Formulário + informações + WhatsApp
- **Footer** — Links e informações legais

## 📝 Personalização

Edite os seguintes arquivos para personalizar o conteúdo:

| Arquivo | O que editar |
|---------|-------------|
| `src/components/Navbar.tsx` | Nome da empresa, logo |
| `src/components/Hero.tsx` | Headline, números de destaque |
| `src/components/Services.tsx` | Serviços oferecidos |
| `src/components/About.tsx` | Texto sobre a empresa, certificações |
| `src/components/Testimonials.tsx` | Depoimentos de clientes |
| `src/components/Contact.tsx` | Telefone, e-mail, endereço |
| `src/components/Footer.tsx` | CNPJ, links |
