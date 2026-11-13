# Juris — Gestão para Advocacia (versão de demonstração)

Cópia genérica do sistema, sem dados de clientes e sem a identidade de nenhum escritório,
para gravar vídeos e apresentar a outras advocacias.

Módulos: Dashboard · Clientes · Processos (consulta ao CNJ/DataJud) · Corretores · Financeiro
(parcelamentos e contas a pagar) · Documentos (editor de modelos, modelos prontos e formulários
oficiais em PDF) · Usuários (permissões por perfil) · PWA.

## Configurar o projeto Firebase da demonstração

1. Crie um projeto novo no console do Firebase e um app Web nele.
2. Copie a configuração do app (apiKey, authDomain, projectId...) para `src/lib/firebase.ts`
   (onde está `PREENCHER`), o ID do projeto para `src/lib/servidor.ts` e para `.firebaserc`.
3. Ative **Authentication → E-mail/senha**, crie o **Firestore** e o **Storage**.
4. Publique as regras: `firestore.rules` (Firestore → Regras) e `storage.rules` (Storage → Regras).
5. Publique o site pelo **App Hosting**, ligado ao repositório do GitHub desta pasta.
6. No primeiro acesso, a tela de login pede para criar o administrador. Depois, no Dashboard,
   o botão **Carregar dados de exemplo** preenche clientes, processos e lançamentos fictícios.

Os modelos prontos usam os dados de **Configurações → Dados da empresa** (advogado responsável,
OAB, endereço, cidade, telefone e e-mail).

## Rodar localmente

```bash
npm install
npm run dev
npm run build
```
