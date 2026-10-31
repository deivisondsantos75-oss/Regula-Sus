# Atividade 2 — Repositório no GitHub ligado à Vercel

## 1. Subir o código para o GitHub

```bash
cd regulasus
git init
git add .
git commit -m "RegulaSUS: central de regulação com IA"
git branch -M main
# crie um repositório vazio em github.com/new (ex.: regulasus) e copie a URL:
git remote add origin https://github.com/SEU-USUARIO/regulasus.git
git push -u origin main
```

O `.gitignore` já impede o envio de `.env`, `.env.local` e `node_modules`. **Nunca** suba chaves ou senhas.

## 2. Importar na Vercel (liga o repositório)

1. Acesse vercel.com/new e entre com sua conta GitHub.
2. Em **Import Git Repository**, escolha `regulasus` → **Import**.
3. Framework: Next.js (detectado sozinho). Não mude build/output.
4. Antes do **Deploy**, abra **Environment Variables** (passo 3).

A partir daí, **todo `git push` na `main` gera um novo deploy automático**; branches e PRs ganham URL de preview.

## 3. Banco de dados e variáveis

1. No projeto na Vercel: **Storage → Create Database → Neon (Postgres)** → conectar ao projeto.
   Isso cria `DATABASE_URL` sozinho.
2. Em **Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `AUTH_SECRET` | resultado de `openssl rand -base64 32` |
| `PROVISIONAL_ACCESS_CODE` | código do acesso provisório (regulador/unidade) — **obrigatório em produção** |
| `PROVISIONAL_GESTOR_CODE` | código diferente, para o perfil gestor/auditoria |
| `AI_GATEWAY_API_KEY` | chave do AI Gateway (vercel.com → AI Gateway → API Keys) |

3. Crie as tabelas e os dados de exemplo, uma única vez, do seu computador:

```bash
vercel env pull .env.local     # baixa DATABASE_URL (ou copie manualmente)
pnpm install
pnpm db:setup
```

4. **Redeploy** (Deployments → ⋯ → Redeploy) para o app enxergar as variáveis.

## 4. Login gov.br (opcional, exige adesão)

O Login Único só funciona com `GOVBR_CLIENT_ID` e `GOVBR_CLIENT_SECRET`, liberados pelo governo após pedido
formal de adesão do órgão público. Quando tiver, defina também `GOVBR_ISSUER`, `APP_URL`
(ex.: `https://regulasus.vercel.app`), `GOVBR_REGULADOR_CPFS` e `GOVBR_GESTOR_CPFS`, e cadastre como
redirect URI: `https://SEU-APP.vercel.app/api/auth/govbr/callback`.
Sem essas variáveis o botão gov.br fica desativado e o **acesso provisório** continua funcionando.

## 5. Conferir

- Abra a URL `*.vercel.app` → tela de login → acesso provisório → fila com 7 pacientes fictícios.
- Clique em **Analisar com IA** em um paciente e depois em **Encaminhar**.
- Entre como **Gestor** e abra **Auditoria** para ver o registro das ações.
