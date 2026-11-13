# Juris — Gestão para Advocacia (versão de demonstração)

Versão de demonstração do sistema, **sem banco de dados e sem servidor**: é um site estático
publicado no GitHub Pages. Serve para gravar vídeos e apresentar o sistema a outras advocacias.

- Não tem dados de nenhum cliente real. Tudo o que aparece é fictício.
- Os dados ficam **só no navegador de quem abre o site** (IndexedDB). Cada pessoa vê a sua cópia,
  e nada é enviado para servidor nenhum.
- Na primeira visita, o sistema cria o acesso de demonstração e carrega dados de exemplo:
  **E-mail:** `demo@juris.com.br` · **Senha:** `demo123`.
- Na tela de login, **Reiniciar demonstração** apaga tudo e volta aos dados de exemplo.

Módulos: Dashboard · Clientes · Processos · Corretores · Financeiro (parcelamentos e contas a
pagar) · Documentos (editor de modelos, modelos prontos e formulários oficiais em PDF) ·
Usuários (permissões por perfil) · instalação como aplicativo (PWA).

Diferenças em relação à versão completa:
- A consulta ao tribunal (CNJ) é **simulada** e traz andamentos fictícios.
- O documento gerado fica salvo já formatado. Para ter o PDF, use **Imprimir → Salvar como PDF**.
- Não há envio de e-mail (redefinição de senha).

## Publicar no GitHub Pages

1. Envie este repositório para o GitHub (branch `main`).
2. No GitHub, abra **Settings → Pages → Source** e escolha **GitHub Actions**.
3. A cada envio, o workflow `.github/workflows/pages.yml` gera e publica o site em
   `https://<usuario>.github.io/<repositorio>/`.

## Rodar localmente

```bash
npm install
npm run dev
```
