# Changelog

## 0.2.0 — Auditoria de debug e correções

Um agente de QA revisou o projeto (35 achados: 3 críticos, 7 altos, 14 médios, 11 baixos — veja
[docs/RELATORIO-DEBUG.md](docs/RELATORIO-DEBUG.md)). Abaixo, o que foi corrigido. Status: ✅ corrigido · 🟡 parcial · ⏳ pendente.

### Segurança
- ✅ **BUG-001 (crítico)** Acesso provisório aberto: em produção agora **exige código** (`PROVISIONAL_ACCESS_CODE`; gestor tem código próprio `PROVISIONAL_GESTOR_CODE`). Sem o código configurado o perfil fica indisponível (falha fechada).
- ✅ **BUG-008** Perfil `unidade` agora é vinculado a **uma unidade** e só altera as vagas dela (validado no servidor); vagas auditadas com valor antes→depois.
- ✅ **BUG-011** Limite de 5 tentativas erradas / 10 min por IP, comparação em tempo constante, nome digitado não é gravado em tentativas negadas.
- ✅ **BUG-012** Perfil `unidade` não recebe dados de pacientes; CNS mascarado antes de sair do servidor; abertura de paciente vai para a auditoria (`paciente_visualizado`); lista de encaminhados limitada a 50.
- ✅ **BUG-013 / BUG-010c** Texto livre é higienizado (CPF, CNS, telefone, e-mail) e delimitado antes de ir à IA/agente; instruções contra prompt injection.
- ✅ **BUG-023** OIDC gov.br: `kid` obrigatório (sem “primeira chave”), cache de JWKS, timeouts, cookie de estado apagado em todos os caminhos, redirects com `APP_URL`.
- 🟡 **BUG-024** Chaves HMAC derivadas por contexto e `AUTH_SECRET` obrigatório fora de dev. ⏳ Revogação de sessão no servidor (exige tabela de sessões).
- ✅ **BUG-035** Logs só com nome/status do erro (nunca corpo/prompt). Cabeçalhos HSTS, Permissions-Policy e `Cache-Control: no-store` nas páginas. ⏳ CSP.

### Correção clínica
- ✅ **BUG-002 (crítico)** Protocolo de reserva reescrito com *discriminadores* e piso de cor: anafilaxia, PCR, AVC, convulsão, dor torácica, hemorragia digestiva, ideação suicida, politrauma, fraturas, abdome agudo, gestante (sangramento/pré-eclâmpsia), lactente febril, hipoglicemia, hipotermia, sepse, crise hipertensiva. Sem sinais vitais → no mínimo amarelo.
- ✅ **BUG-005** Regex com negação (“nega dor no peito”, “sem falta de ar”) e sem falsos positivos (“fala que…” ≠ AVC; “chiado no peito” ≠ dor torácica). Especialidade vem da regra mais grave, não da primeira.
- ✅ **BUG-007** Valor `0` é dado real (PCR); limites de entrada ampliados para aceitar casos extremos.
- ✅ **BUG-010** As regras **sempre** rodam e a IA nunca pode classificar abaixo delas (`reconcileTriage`); coerência cor↔complexidade; IA com timeout de 25 s e 1 retry; divergência registrada na auditoria e como sinal de alarme.
- ✅ **BUG-027** Limiares de sinais vitais unificados por faixa etária (`lib/vitals.ts`) para UI, regras e prompt.
- ✅ **BUG-028** “não/nega/sem comorbidades” não contam como comorbidade.
- ✅ **BUG-006** Unidades têm público (`audience`): pediátrica, materno-infantil, adulto. Criança asmática não vai mais para maternidade.
- ✅ **BUG-016/017** Município sem diferença de acento/caixa; desempate determinístico; complexidade inválida lança erro; unidade com 0 leitos ignorada; penalidade maior por usar hospital de referência sem necessidade.
- ✅ **BUG-025/026** Fila ordena por cor → prazo de Manchester estourado há mais tempo → risco (acaba o *starvation*); não analisado fica logo após os vermelhos; cor inválida não derruba a página; `waitMinutes` com `floor`.

### Concorrência e dados
- ✅ **BUG-003 (crítico)** Encaminhamento com `SELECT … FOR UPDATE` no paciente: dois reguladores no mesmo caso não consomem duas vagas (testado no navegador com 2 sessões).
- ✅ **BUG-004** Reanalisar paciente já encaminhado é bloqueado no servidor.
- ✅ **BUG-022** Auditoria de encaminhamento e vagas gravada **na mesma transação**; ações negadas viram `acao_negada`; encaminhamento diferente da recomendação é registrado.
- ✅ **BUG-029** FKs, CHECKs e índice de fila; coluna morta `recommended_unit_id` removida. 🟡 Sem migrações versionadas (drizzle-kit).
- ✅ **BUG-030** Resumo do agente por agregação SQL; fila sem `SELECT *` do histórico inteiro.
- ✅ **BUG-034** `db:reset` recusa banco remoto sem confirmação explícita; `.env.example` e README atualizados.

### Interface e acessibilidade
- ✅ **BUG-009** `error.tsx`, `global-error.tsx`, `not-found.tsx`; todas as actions retornam `{error}` (sem exceção); sessão expirada leva ao login.
- ✅ **BUG-014** Formulários mantêm o que foi digitado quando há erro de validação (cadastro e login).
- ✅ **BUG-015** Idade obrigatória (vazio não vira 0), CNS com 15 dígitos, sexo sem padrão, mensagens em português.
- ✅ **BUG-018** Erro não “vaza” para outro paciente (`key`); estado defasado recarrega os dados.
- ✅ **BUG-019/020** Atualização automática a cada 30 s; tempos calculados no servidor (sem divergência de hidratação); datas em `America/Sao_Paulo`.
- ✅ **BUG-021** Agente: histórico limitado, mensagens consecutivas mescladas, erros específicos, limite de 40 consultas/h, `aria-live`.
- ✅ **BUG-031/032** Contraste AA (vermelho/verde/laranja), sinais vitais alterados com ícone + texto para leitor de tela, `aria-current="page"`, alvos de toque maiores, ocupação sem `NaN%`.

### Projeto
- ✅ **BUG-033** Removidos `swr` e `cn` duplicado; `shadcn` movido para dev; fonte Geist local (build não depende do Google Fonts); `engines`; `.gitignore`.
- ✅ **Testes**: 44 testes (Vitest) — `pnpm test` — com casos clínicos, ordem da fila, ranking de unidades, PII.
- ⏳ ESLint e CI.

### Não verificado
IA real (sem chave do AI Gateway aqui), login gov.br real (sem credenciais) e leitores de tela.
